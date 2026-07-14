@echo off
echo Setting up WorkTrack Pro Database...
echo.

REM Check if MySQL is available
mysql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo MySQL is not installed or not in PATH. Please install MySQL first.
    pause
    exit /b 1
)

echo MySQL found. Proceeding with database setup...
echo.

REM Run the schema file
mysql -u root -p < "D:\hr tracker\backend\config\schema.sql"

if %errorlevel% equ 0 (
    echo.
    echo Database setup completed successfully!
    echo.
    echo Default admin credentials:
    echo Email: admin@worktrack.com
    echo Password: admin123
    echo.
    echo IMPORTANT: Change the default password after first login!
) else (
    echo.
    echo Database setup failed. Please check your MySQL credentials.
    echo Make sure to update the .env file with your MySQL password.
)

pause
