// MongoDB initialization script for Docker
db = db.getSiblingDB('shirinq_connect');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['employeeId', 'firstName', 'lastName', 'email', 'password', 'role', 'department', 'designation'],
      properties: {
        employeeId: { bsonType: 'string' },
        firstName: { bsonType: 'string' },
        lastName: { bsonType: 'string' },
        email: { bsonType: 'string', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' },
        role: { enum: ['admin', 'hr_admin', 'manager', 'employee'] },
        isActive: { bsonType: 'bool' }
      }
    }
  }
});

db.createCollection('attendance', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['employee', 'date', 'checkIn'],
      properties: {
        employee: { bsonType: 'objectId' },
        date: { bsonType: 'date' },
        status: { enum: ['present', 'absent', 'half-day', 'late', 'on-leave'] }
      }
    }
  }
});

db.createCollection('leaves', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['employee', 'leaveType', 'startDate', 'endDate', 'reason'],
      properties: {
        employee: { bsonType: 'objectId' },
        leaveType: { enum: ['casual', 'sick', 'earned', 'maternity', 'paternity', 'emergency', 'unpaid'] },
        status: { enum: ['pending', 'approved', 'rejected', 'cancelled'] }
      }
    }
  }
});

db.createCollection('payrolls', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['employee', 'month', 'year', 'basicSalary'],
      properties: {
        employee: { bsonType: 'objectId' },
        month: { bsonType: 'int', minimum: 1, maximum: 12 },
        year: { bsonType: 'int', minimum: 2020 },
        status: { enum: ['draft', 'generated', 'approved', 'paid'] }
      }
    }
  }
});

db.createCollection('templates', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'type', 'content', 'createdBy'],
      properties: {
        name: { bsonType: 'string' },
        type: { enum: ['offer_letter', 'appointment_letter', 'payslip', 'contract', 'other'] },
        isActive: { bsonType: 'bool' }
      }
    }
  }
});

db.createCollection('holidays', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'date', 'type', 'createdBy'],
      properties: {
        name: { bsonType: 'string' },
        date: { bsonType: 'date' },
        type: { enum: ['national', 'regional', 'company', 'religious', 'observance'] },
        isActive: { bsonType: 'bool' }
      }
    }
  }
});

db.createCollection('organizations', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'code', 'createdBy'],
      properties: {
        name: { bsonType: 'string' },
        code: { bsonType: 'string' },
        isActive: { bsonType: 'bool' }
      }
    }
  }
});

db.createCollection('dashboardwidgets', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'type', 'title', 'createdBy'],
      properties: {
        name: { bsonType: 'string' },
        type: { enum: ['chart', 'table', 'metric', 'announcement', 'custom'] },
        isVisible: { bsonType: 'bool' }
      }
    }
  }
});

// Create indexes for better performance
db.users.createIndex({ employeeId: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ department: 1 });

db.attendance.createIndex({ employee: 1, date: 1 });
db.attendance.createIndex({ date: 1 });
db.attendance.createIndex({ status: 1 });

db.leaves.createIndex({ employee: 1, startDate: 1 });
db.leaves.createIndex({ status: 1 });
db.leaves.createIndex({ leaveType: 1 });

db.payrolls.createIndex({ employee: 1, month: 1, year: 1 });
db.payrolls.createIndex({ status: 1 });
db.payrolls.createIndex({ year: 1, month: 1 });

db.templates.createIndex({ type: 1, isActive: 1 });
db.templates.createIndex({ createdBy: 1 });

db.holidays.createIndex({ date: 1 });
db.holidays.createIndex({ type: 1 });
db.holidays.createIndex({ isActive: 1 });

db.organizations.createIndex({ code: 1 }, { unique: true });
db.organizations.createIndex({ isActive: 1 });

db.dashboardwidgets.createIndex({ type: 1, isVisible: 1 });
db.dashboardwidgets.createIndex({ createdBy: 1 });

print('Database initialization completed successfully!');
