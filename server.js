
require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");
const { randomInt } = require("crypto");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "web")));

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "railway_db",
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true
});

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") &&
    !Number.isNaN(Date.parse(value));
}

// ========================================
// USER REGISTRATION API
// ========================================

app.post("/api/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const mobile = String(req.body.mobile || "").trim();
    const password = String(req.body.password || "");

    if (
      !name || name.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !/^\d{10}$/.test(mobile) ||
      password.length < 6 || password.length > 72
    ) {
      return res.status(400).json({
        error: "Enter valid details. Password must be 6-72 characters."
      });
    }

    const [existing] = await pool.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: "Email already registered."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.execute(
      `INSERT INTO users (name, email, mobile, password)
       VALUES (?, ?, ?, ?)`,
      [name, email, mobile, hashedPassword]
    );

    res.status(201).json({
      message: "Registration successful. Please login."
    });

  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({
      error: "Registration failed. Please try again."
    });
  }
});

// ========================================
// USER LOGIN API
// ========================================

app.post("/api/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        error: "Enter your email and password."
      });
    }

    const [users] = await pool.execute(
      "SELECT id, name, email, mobile, password FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        error: "Invalid email or password."
      });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        error: "Invalid email or password."
      });
    }

    res.json({
      message: "Login successful.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      error: "Login failed. Please try again."
    });
  }
});

// ========================================
// TRAIN SEARCH API
// ========================================

app.get("/api/trains", async (req, res) => {
  try {
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();
    const date = String(req.query.date || "");

    if (!from || !to || !validDate(date)) {
      return res.status(400).json({
        error: "Enter a source, destination and valid journey date."
      });
    }

    const sql = `
      SELECT t.train_id AS trainId,
             t.train_no AS trainNo,
             t.train_name AS name,
             t.source,
             t.destination,
             TIME_FORMAT(t.departure, '%H:%i:%s') AS departure,
             TIME_FORMAT(t.arrival, '%H:%i:%s') AS arrival,
             t.fare,
             t.total_seats - COALESCE((
               SELECT SUM(b.seats)
               FROM bookings b
               WHERE b.train_id = t.train_id
                 AND b.journey_date = ?
                 AND b.status = 'CONFIRMED'
             ), 0) AS available
      FROM trains t
      WHERE LOWER(t.source) = LOWER(?)
        AND LOWER(t.destination) = LOWER(?)
      ORDER BY t.departure
    `;

    const [rows] = await pool.execute(sql, [date, from, to]);
    res.json(rows);

  } catch (err) {
    console.error("Train search error:", err);
    res.status(500).json({
      error: "Could not search trains. Check the database connection."
    });
  }
});

// ========================================
// TICKET BOOKING API
// ========================================

app.post("/api/book", async (req, res) => {
  const trainId = Number(req.body.trainId);
  const date = String(req.body.date || "");
  const name = String(req.body.name || "").trim();
  const age = Number(req.body.age);
  const gender = String(req.body.gender || "").trim();
  const seats = Number(req.body.seats);

  if (
    !Number.isInteger(trainId) || trainId < 1 ||
    !validDate(date) ||
    date < new Date().toISOString().slice(0, 10) ||
    !name || name.length > 80 ||
    !Number.isInteger(age) || age < 1 || age > 120 ||
    !["Male", "Female", "Other"].includes(gender) ||
    !Number.isInteger(seats) || seats < 1 || seats > 6
  ) {
    return res.status(400).json({
      error: "Please enter valid passenger and journey details."
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [trainRows] = await connection.execute(
      "SELECT fare, total_seats FROM trains WHERE train_id = ? FOR UPDATE",
      [trainId]
    );

    if (trainRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: "Train not found."
      });
    }

    const [countRows] = await connection.execute(
      `SELECT COALESCE(SUM(seats), 0) AS booked
       FROM bookings
       WHERE train_id = ?
         AND journey_date = ?
         AND status = 'CONFIRMED'`,
      [trainId, date]
    );

    const available =
      trainRows[0].total_seats - Number(countRows[0].booked);

    if (available < seats) {
      await connection.rollback();
      return res.status(409).json({
        error: `Only ${available} seat(s) available.`
      });
    }

    const pnr = String(randomInt(1000000000, 9999999999));
    const totalFare = Number(trainRows[0].fare) * seats;

    await connection.execute(
      `INSERT INTO bookings
       (pnr, train_id, journey_date, passenger_name,
        age, gender, seats, total_fare)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [pnr, trainId, date, name, age, gender, seats, totalFare]
    );

    await connection.commit();
    res.json({ pnr, totalFare });

  } catch (err) {
    if (connection) await connection.rollback();

    console.error("Booking error:", err);
    res.status(500).json({
      error: "Booking failed. Please check the database and try again."
    });

  } finally {
    if (connection) connection.release();
  }
});

// ========================================
// PNR STATUS API
// ========================================

app.get("/api/booking", async (req, res) => {
  try {
    const pnr = String(req.query.pnr || "").trim();

    if (!pnr) {
      return res.status(400).json({
        error: "Enter a PNR number."
      });
    }

    const [rows] = await pool.execute(
      `SELECT b.pnr,
              t.train_no AS trainNo,
              t.train_name AS trainName,
              t.source,
              t.destination,
              TIME_FORMAT(t.departure, '%H:%i:%s') AS departure,
              TIME_FORMAT(t.arrival, '%H:%i:%s') AS arrival,
              b.journey_date AS date,
              b.passenger_name AS passenger,
              b.age,
              b.gender,
              b.seats,
              b.total_fare AS totalFare,
              b.status
       FROM bookings b
       JOIN trains t ON t.train_id = b.train_id
       WHERE b.pnr = ?`,
      [pnr]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: "No booking found for this PNR."
      });
    }

    res.json(rows[0]);

  } catch (err) {
    console.error("PNR lookup error:", err);
    res.status(500).json({
      error: "Could not fetch booking details."
    });
  }
});

// ========================================
// TICKET CANCELLATION API
// ========================================

app.post("/api/cancel", async (req, res) => {
  try {
    const pnr = String(req.body.pnr || "").trim();

    if (!pnr) {
      return res.status(400).json({
        error: "Enter a PNR number."
      });
    }

    const [result] = await pool.execute(
      `UPDATE bookings
       SET status = 'CANCELLED'
       WHERE pnr = ? AND status = 'CONFIRMED'`,
      [pnr]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "No active booking found for this PNR."
      });
    }

    res.json({
      message: "Ticket cancelled successfully."
    });

  } catch (err) {
    console.error("Cancellation error:", err);
    res.status(500).json({
      error: "Could not cancel the ticket."
    });
  }
});

// ========================================
// DATABASE CONNECTION TEST
// ========================================

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      message: "Node.js backend and MySQL connection are working."
    });

  } catch (err) {
    res.status(500).json({
      error: "MySQL connection failed."
    });
  }
});

// ========================================
// START SERVER
// ========================================

app.listen(PORT, async () => {
  console.log(`Railway project running at http://localhost:${PORT}`);

  try {
    await pool.query("SELECT 1");
    console.log("MySQL connected successfully.");
  } catch (err) {
    console.log("MySQL is not connected yet:", err.message);
  }
});
