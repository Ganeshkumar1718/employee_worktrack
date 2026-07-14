# WorkTrack Pro - Employee Monitoring & Payroll Management System

A comprehensive full-stack application for IT companies to monitor employees, track attendance, manage leaves, and calculate salaries based on worked hours.

## 🚀 Features

### Employee Features
- **Authentication**: Secure login/logout with JWT tokens
- **Profile Management**: View and update personal information
- **Attendance Tracking**: Clock in/out with work mode selection (WFO/WFH)
- **Leave Management**: Apply for sick, casual, and earned leaves
- **Salary Details**: View monthly salary based on worked hours
- **Dashboard**: View daily working hours, attendance history, and monthly reports

### Admin Features
- **Employee Management**: Add, edit, and delete employee records
- **Attendance Monitoring**: View all employee login/logout activities
- **Leave Approval**: Approve or reject leave requests
- **Salary Calculation**: Automatic salary calculation based on worked hours
- **Dashboard Analytics**: View total employees, present today, pending leaves, and total salary
- **Export Reports**: Export employee, attendance, leave, and salary data to CSV

## 🛠️ Technology Stack

### Frontend
- **React.js** - UI framework
- **React Router** - Navigation
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **moment** - Date/time handling

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher)
- MySQL Server (v5.7 or higher)
- npm or yarn

## 🗄️ Database Setup

### Option 1: Using MySQL Command Line

1. Open MySQL Command Line Client
2. Login to MySQL:
   ```bash
   mysql -u root -p
   ```
3. Create the database and tables by running the schema:
   ```bash
   source D:/hr tracker/backend/config/schema.sql
   ```
   Or manually execute:
   ```sql
   CREATE DATABASE IF NOT EXISTS worktrack_pro;
   USE worktrack_pro;
   
   -- Then run the SQL commands from schema.sql file
   ```

### Option 2: Using MySQL Workbench

1. Open MySQL Workbench
2. Connect to your MySQL server
3. Open the SQL file: `D:/hr tracker/backend/config/schema.sql`
4. Execute the SQL script

### Default Admin User

After database setup, a default admin user is created:
- **Email**: admin@worktrack.com
- **Password**: admin123

⚠️ **Important**: Change the default admin password after first login!

## 🔧 Installation

### 1. Clone/Download the Project

The project is located at: `D:\hr tracker`

### 2. Backend Setup

Navigate to the backend directory:
```bash
cd D:\hr tracker\backend
```

Install dependencies:
```bash
npm install
```

Configure environment variables in `.env`:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=worktrack_pro
JWT_SECRET=your_jwt_secret_key_here_change_in_production
NODE_ENV=development
```

Update the `.env` file with your MySQL credentials.

### 3. Frontend Setup

Navigate to the frontend directory:
```bash
cd D:\hr tracker\frontend
```

Install dependencies:
```bash
npm install
```

## 🚀 Running the Application

### Start Backend Server

Open a new terminal and navigate to the backend directory:
```bash
cd D:\hr tracker\backend
npm start
```

The backend server will start on `http://localhost:5000`

### Start Frontend Server

Open another terminal and navigate to the frontend directory:
```bash
cd D:\hr tracker\frontend
npm start
```

The frontend will open in your browser at `http://localhost:3000`

## 📱 Usage

### First Login

1. Open your browser and go to `http://localhost:3000`
2. Login with default admin credentials:
   - Email: admin@worktrack.com
   - Password: admin123

### Admin Dashboard

After logging in as admin, you can:
- **Add Employees**: Navigate to Employees tab and add new employees
- **Monitor Attendance**: View all employee attendance records
- **Approve Leaves**: Review and approve/reject leave requests
- **Calculate Salaries**: Calculate monthly salaries for all employees
- **Export Data**: Export reports to CSV format

### Employee Dashboard

Employees can:
- **Clock In/Out**: Mark attendance with work mode selection
- **View Attendance**: Check attendance history and working hours
- **Apply for Leave**: Submit leave requests
- **View Salary**: Check monthly salary details
- **View Profile**: Access personal information

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile

### Employees (Admin only)
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get employee by ID
- `POST /api/employees` - Create new employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Attendance
- `POST /api/attendance/login` - Clock in
- `POST /api/attendance/logout` - Clock out
- `GET /api/attendance/my` - Get my attendance
- `GET /api/attendance/my/stats` - Get my stats
- `GET /api/attendance/all` - Get all attendance (Admin)
- `GET /api/attendance/today` - Get today's attendance (Admin)

### Leaves
- `POST /api/leaves/apply` - Apply for leave
- `GET /api/leaves/my` - Get my leaves
- `GET /api/leaves/all` - Get all leaves (Admin)
- `PUT /api/leaves/approve/:leave_id` - Approve leave (Admin)
- `PUT /api/leaves/reject/:leave_id` - Reject leave (Admin)

### Salary
- `POST /api/salary/calculate` - Calculate salary (Admin)
- `POST /api/salary/calculate-all` - Calculate all salaries (Admin)
- `GET /api/salary/my` - Get my salary
- `GET /api/salary/all` - Get all salaries (Admin)
- `GET /api/salary/month/:month` - Get salaries by month (Admin)

## 💰 Salary Calculation

Salary is calculated based on:
- **Annual Package**: Employee's annual CTC
- **Monthly Salary**: Annual Package / 12
- **Hourly Rate**: Monthly Salary / (Working Days × Daily Hours)
  - Working Days: 22 days/month
  - Daily Hours: 8 hours/day
- **Final Salary**: Hourly Rate × Hours Worked

Example:
- Annual Package: ₹12,00,000
- Monthly Salary: ₹1,00,000
- Hourly Rate: ₹1,00,000 / (22 × 8) = ₹568.18/hr
- If worked 176 hours: ₹568.18 × 176 = ₹1,00,000

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for secure password storage
- **Role-Based Access Control**: Separate access for employees and admins
- **CORS Protection**: Cross-Origin Resource Sharing configured
- **Environment Variables**: Sensitive data stored in .env file

## 🐛 Troubleshooting

### Database Connection Error
- Ensure MySQL server is running
- Check DB_HOST, DB_USER, DB_PASSWORD in .env file
- Verify database name is correct

### Port Already in Use
- Change PORT in backend .env file
- Or kill the process using the port

### Frontend Not Loading
- Ensure backend server is running
- Check browser console for errors
- Verify API URLs in frontend code

### npm Install Fails
- Try using `cmd /c npm install` instead of `npm install`
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and package-lock.json, then reinstall

## 📝 Project Structure

```
hr tracker/
├── backend/
│   ├── config/
│   │   ├── db.js           # Database connection
│   │   └── schema.sql      # Database schema
│   ├── controllers/        # Route controllers
│   │   ├── authController.js
│   │   ├── attendanceController.js
│   │   ├── employeeController.js
│   │   ├── leaveController.js
│   │   └── salaryController.js
│   ├── middleware/
│   │   └── auth.js         # Authentication middleware
│   ├── models/             # Database models
│   │   ├── Attendance.js
│   │   ├── Employee.js
│   │   ├── Leave.js
│   │   └── Salary.js
│   ├── routes/             # API routes
│   │   ├── auth.js
│   │   ├── attendance.js
│   │   ├── employees.js
│   │   ├── leaves.js
│   │   └── salary.js
│   ├── .env                # Environment variables
│   ├── package.json
│   └── server.js           # Main server file
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── pages/
│   │   │   ├── AdminDashboard.js
│   │   │   ├── EmployeeDashboard.js
│   │   │   ├── Login.js
│   │   │   └── Register.js
│   │   ├── App.js
│   │   ├── index.css
│   │   └── index.js
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
└── README.md
```

## 🤝 Contributing

This is a final-year project/portfolio project. Feel free to extend it with additional features like:
- GPS-based attendance verification
- Real-time notifications
- Advanced reporting with charts
- Mobile app support
- Integration with payroll systems

## 📄 License

This project is for educational purposes.

## 👨‍💻 Author

Built as a full-stack development project demonstrating React.js, Node.js, Express.js, and MySQL integration.

## 🙏 Acknowledgments

- React.js documentation
- Express.js documentation
- MySQL documentation
- Tailwind CSS documentation
