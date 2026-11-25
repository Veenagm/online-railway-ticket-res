CREATE DATABASE IF NOT EXISTS railway_db;
USE railway_db;

CREATE TABLE IF NOT EXISTS trains (
  train_id INT AUTO_INCREMENT PRIMARY KEY,
  train_no VARCHAR(10) NOT NULL UNIQUE,
  train_name VARCHAR(80) NOT NULL,
  source VARCHAR(60) NOT NULL,
  destination VARCHAR(60) NOT NULL,
  departure TIME NOT NULL,
  arrival TIME NOT NULL,
  fare DECIMAL(8,2) NOT NULL,
  total_seats INT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  pnr VARCHAR(12) PRIMARY KEY,
  train_id INT NOT NULL,
  journey_date DATE NOT NULL,
  passenger_name VARCHAR(80) NOT NULL,
  age INT NOT NULL,
  gender VARCHAR(10) NOT NULL,
  seats INT NOT NULL,
  total_fare DECIMAL(10,2) NOT NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'CONFIRMED',
  booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_train FOREIGN KEY (train_id) REFERENCES trains(train_id)
);

INSERT IGNORE INTO trains
(train_no, train_name, source, destination, departure, arrival, fare, total_seats)
VALUES
('12627','Karnataka Express','Bengaluru','New Delhi','19:20:00','06:30:00',1450.00,120),
('12951','Mumbai Rajdhani','Mumbai','New Delhi','16:55:00','08:35:00',2100.00,100),
('12001','Bhopal Shatabdi','New Delhi','Bhopal','06:00:00','14:00:00',1300.00,80),
('12301','Howrah Rajdhani','New Delhi','Kolkata','16:50:00','09:55:00',2250.00,100),
('12621','Tamil Nadu Express','Chennai','New Delhi','22:00:00','07:05:00',1600.00,120),
('12259','Sealdah Duronto','New Delhi','Kolkata','20:05:00','10:10:00',1900.00,90),
('12723','Telangana Express','Hyderabad','New Delhi','06:25:00','10:50:00',1550.00,110),
('16591','Hampi Express','Bengaluru','Hubballi','22:00:00','07:00:00',480.00,150),
('12028','Shatabdi Express','Chennai','Bengaluru','06:00:00','11:00:00',900.00,80),
('12163','Mumbai Chennai Mail','Mumbai','Chennai','13:00:00','15:30:00',1250.00,130);
