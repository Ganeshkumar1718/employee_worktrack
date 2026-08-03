const db = require('./config/db');
const authController = require('./controllers/authController');
const employeeController = require('./controllers/employeeController');
const Employee = require('./models/Employee');

async function testEmployerStorage() {
  console.log('--- Starting Employer & Employee DB Storage Test ---');

  // Wait a bit for db initialization
  await new Promise(resolve => setTimeout(resolve, 500));

  const testEmployerEmail = 'test.employer.' + Date.now() + '@company.com';
  
  // Mock req & res for employer registration
  const reqRegisterEmployer = {
    body: {
      employee_name: 'Tech Corp Employer',
      employee_email: testEmployerEmail,
      employee_password: 'Password123!',
      department: 'Executive Board',
      designation: 'Managing Director & Founder',
      annual_package: 3600000,
      role: 'admin'
    }
  };

  let registeredData = null;
  const resRegisterEmployer = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      registeredData = data;
      return this;
    }
  };

  console.log('1. Registering Employer...');
  await authController.register(reqRegisterEmployer, resRegisterEmployer);
  console.log('Registration response status:', resRegisterEmployer.statusCode || 200);
  console.log('Registration response message:', registeredData?.message);
  console.log('Registered User Role:', registeredData?.employee?.role);

  // Query database directly to verify all employer details are stored
  console.log('\n2. Verifying Employer details in Database...');
  const employerRow = await Employee.findByEmail(testEmployerEmail);
  console.log('Employer in DB:', {
    id: employerRow.employee_id,
    name: employerRow.employee_name,
    email: employerRow.employee_email,
    role: employerRow.role,
    department: employerRow.department,
    designation: employerRow.designation,
    annual_package: employerRow.annual_package,
    hourly_rate: employerRow.hourly_rate,
    status: employerRow.status
  });

  if (employerRow && employerRow.role === 'admin' && employerRow.employee_name === 'Tech Corp Employer') {
    console.log('✅ Employer details successfully saved in DB with role "admin"!');
  } else {
    console.error('❌ Employer details failed verification!');
    process.exit(1);
  }

  // Test creating employee under admin
  console.log('\n3. Creating Employee under Employer/Admin...');
  const testEmployeeEmail = 'test.employee.' + Date.now() + '@company.com';
  const reqCreateEmployee = {
    body: {
      employee_name: 'Developer Alice',
      employee_email: testEmployeeEmail,
      employee_password: 'AlicePassword123!',
      department: 'Engineering',
      designation: 'Senior Full Stack Engineer',
      annual_package: 1200000,
      role: 'employee'
    }
  };

  let createdEmployeeData = null;
  const resCreateEmployee = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      createdEmployeeData = data;
      return this;
    }
  };

  await employeeController.createEmployee(reqCreateEmployee, resCreateEmployee);
  console.log('Create Employee response:', createdEmployeeData);

  const employeeRow = await Employee.findByEmail(testEmployeeEmail);
  console.log('Employee in DB:', {
    id: employeeRow.employee_id,
    name: employeeRow.employee_name,
    email: employeeRow.employee_email,
    role: employeeRow.role,
    department: employeeRow.department,
    designation: employeeRow.designation,
    annual_package: employeeRow.annual_package,
    hourly_rate: employeeRow.hourly_rate
  });

  if (employeeRow && employeeRow.role === 'employee' && employeeRow.employee_name === 'Developer Alice') {
    console.log('✅ Employee details successfully saved in DB with role "employee"!');
  } else {
    console.error('❌ Employee details failed verification!');
    process.exit(1);
  }

  // Clean up test records
  await Employee.delete(employerRow.employee_id);
  await Employee.delete(employeeRow.employee_id);
  console.log('\n✅ Cleaned up temporary test records.');
  console.log('--- All DB Storage Tests Passed Successfully! ---');
  process.exit(0);
}

testEmployerStorage().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
