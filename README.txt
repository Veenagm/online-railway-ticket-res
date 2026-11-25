ONLINE RAILWAY TICKET RESERVATION - NODE.JS BACKEND

Technology:
- Frontend: HTML, CSS, JavaScript (included in web folder)
- Backend: Node.js + Express.js
- Database: MySQL

IMPORTANT:
This Node.js version is separate from the Java version in your original ZIP.
It keeps the supplied website files (index.html, style.css, app.js) and uses
the same API paths expected by app.js.

SETUP (Windows):
1. Install Node.js LTS and MySQL Server (or install XAMPP and use its MySQL/MariaDB service).
2. Open MySQL Workbench or phpMyAdmin.
3. Open database/schema.sql and execute it.
   It creates railway_db and its tables. It does NOT drop an existing database.
4. Open this project folder in Visual Studio Code.
5. Open Terminal > New Terminal.
6. Run: npm install
7. Copy .env.example and rename the copy to .env.
8. Open .env and enter your MySQL username and password.
   For a default XAMPP MySQL setup, DB_USER=root and DB_PASSWORD= (leave blank).
9. Run: npm start
10. Open: http://localhost:3000

If your MySQL is not running, start the MySQL service before running the project.

API:
GET  /api/trains?from=Bengaluru&to=Hubballi&date=YYYY-MM-DD
POST /api/book
GET  /api/booking?pnr=PNR_NUMBER
POST /api/cancel
GET  /api/health

This is an educational sample project. It does not connect to the real Indian Railways
reservation system or process real payments. Add authentication and payment security
before any real-world use.
