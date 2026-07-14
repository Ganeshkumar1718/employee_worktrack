-- Create database
CREATE DATABASE IF NOT EXISTS worktrack_pro;
USE worktrack_pro;

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  employee_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_name VARCHAR(100) NOT NULL,
  employee_email VARCHAR(100) UNIQUE NOT NULL,
  employee_password VARCHAR(255) NOT NULL,
  department VARCHAR(50),
  designation VARCHAR(50),
  annual_package DECIMAL(12, 2),
  hourly_rate DECIMAL(10, 2),
  role ENUM('employee', 'admin') DEFAULT 'employee',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  attendance_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT,
  login_time DATETIME,
  logout_time DATETIME,
  total_hours DECIMAL(5, 2),
  attendance_date DATE,
  work_mode ENUM('WFO', 'WFH') DEFAULT 'WFO',
  device_info VARCHAR(255),
  ip_address VARCHAR(50),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
);

-- Leaves table
CREATE TABLE IF NOT EXISTS leaves (
  leave_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT,
  leave_type ENUM('sick', 'casual', 'earned') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
);

-- Salary table
CREATE TABLE IF NOT EXISTS salary (
  salary_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT,
  month VARCHAR(7),
  worked_hours DECIMAL(6, 2),
  hourly_rate DECIMAL(10, 2),
  salary_amount DECIMAL(12, 2),
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
);

-- Insert default admin user (password: admin123)
INSERT INTO employees (employee_name, employee_email, employee_password, department, designation, annual_package, hourly_rate, role)
VALUES ('Admin User', 'admin@worktrack.com', '$2a$10$X7Opf6Wl.6qZ7ZqZ7ZqZ7ZeX7Opf6Wl.6qZ7ZqZ7ZqZ7ZeX7Opf6Wl.6', 'Administration', 'System Administrator', 2400000, 1369.86, 'admin')
ON DUPLICATE KEY UPDATE employee_email=employee_email;
