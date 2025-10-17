# ShirinQ Connect - Complete Setup & Testing Guide

This comprehensive guide will walk you through setting up and testing the complete ShirinQ Connect HR & Payroll Management System.

## 📋 Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (v4.4 or higher) - [Download here](https://www.mongodb.com/try/download/community)
- **MongoDB Compass** (Optional but recommended) - [Download here](https://www.mongodb.com/products/compass)
- **Git** - [Download here](https://git-scm.com/)

## 🚀 Quick Start

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd shirinq-connect

# Install all dependencies (root, server, and client)
npm run install-all
```

### 2. Database Setup

#### Option A: Using MongoDB Compass (Recommended)

1. **Install MongoDB Compass** and open it
2. **Create a new connection** with the following details:
   - Connection String: `mongodb://localhost:27017`
   - Database Name: `shirinq_connect`
3. **Click Connect** to establish the connection
4. **Create the database** by clicking "Create Database" and naming it `shirinq_connect`

#### Option B: Using MongoDB Shell

```bash
# Start MongoDB service
mongod

# In a new terminal, connect to MongoDB
mongo

# Create the database
use shirinq_connect

# Exit MongoDB shell
exit
```

### 3. Environment Configuration

#### Backend Configuration

1. **Navigate to server directory:**
```bash
cd server
```

2. **The `config.env` file is already configured with:**
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/shirinq_connect
JWT_SECRET=shirinq_connect_super_secret_jwt_key_2024_production_ready
JWT_EXPIRE=7d
BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:3000

# Application Settings
APP_NAME=ShirinQ Connect
APP_VERSION=1.0.0
DEFAULT_TIMEZONE=Asia/Kolkata
DEFAULT_LANGUAGE=en
DEFAULT_CURRENCY=INR
DEFAULT_DATE_FORMAT=DD/MM/YYYY
DEFAULT_TIME_FORMAT=HH:mm
```

#### Frontend Configuration

1. **Navigate to client directory:**
```bash
cd client
```

2. **Create `.env` file:**
```bash
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
```

### 4. Database Seeding

**Seed the database with sample data:**

```bash
cd server
node seed.js
```

This will create:
- Admin user: `admin@shirinq.com` / `admin123`
- HR Admin: `hr@shirinq.com` / `hr123`
- Manager: `manager@shirinq.com` / `manager123`
- Employee: `employee@shirinq.com` / `employee123`
- Sample holidays, templates, and dashboard widgets

### 5. Start the Application

#### Development Mode (Recommended)

```bash
# From the root directory
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend client on `http://localhost:3000`

#### Individual Services

**Backend only:**
```bash
cd server
npm run dev
```

**Frontend only:**
```bash
cd client
npm start
```

### 6. Desktop Application

**Run Electron app:**
```bash
cd client
npm run electron-dev
```

**Build Electron app:**
```bash
cd client
npm run build
npm run electron-build
```

## 🧪 Testing Guide

### 1. API Testing

#### Run Automated Tests

```bash
cd server
npm test
```

#### Manual API Testing with Postman/Insomnia

**Import the following collection:**

```json
{
  "info": {
    "name": "ShirinQ Connect API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{authToken}}",
        "type": "string"
      }
    ]
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:5000/api"
    },
    {
      "key": "authToken",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"admin@shirinq.com\",\n  \"password\": \"admin123\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/auth/login",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "login"]
            }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "if (pm.response.code === 200) {",
                  "    const response = pm.response.json();",
                  "    pm.collectionVariables.set('authToken', response.token);",
                  "}"
                ]
              }
            }
          ]
        },
        {
          "name": "Get Profile",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{baseUrl}}/auth/profile",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "profile"]
            }
          }
        }
      ]
    }
  ]
}
```

### 2. Frontend Testing

#### User Interface Testing

**Test all user personas:**

1. **Admin User** (`admin@shirinq.com` / `admin123`)
   - ✅ Access to all modules
   - ✅ Employee management
   - ✅ System settings
   - ✅ User role management

2. **HR Admin** (`hr@shirinq.com` / `hr123`)
   - ✅ Employee management
   - ✅ Payroll management
   - ✅ Template management
   - ✅ Holiday management
   - ❌ System settings (restricted)

3. **Manager** (`manager@shirinq.com` / `manager123`)
   - ✅ Team management
   - ✅ Leave approvals
   - ✅ Team attendance
   - ❌ Payroll management (restricted)

4. **Employee** (`employee@shirinq.com` / `employee123`)
   - ✅ Personal attendance
   - ✅ Leave applications
   - ✅ Personal profile
   - ❌ Employee management (restricted)

#### Theme Testing

**Test all available themes:**

1. **Light Theme** - Default clean interface
2. **Dark Theme** - Low-light viewing mode
3. **Ocean Blue** - Calm blue accent colors
4. **Sunset Orange** - Vibrant orange highlights
5. **Forest Green** - Professional green tones
6. **Midnight Dark** - Deep purple dark theme
7. **Corporate Blue** - Professional blue theme

**How to test:**
1. Login to the application
2. Go to Settings → Theme Settings
3. Select different themes from the dropdown
4. Verify color changes across all components
5. Test both light and dark mode variants

#### Localization Testing

**Test language support:**

1. **English** (Default)
   - All text in English
   - Date format: DD/MM/YYYY
   - Time format: 24-hour

2. **Hindi** (Basic support)
   - Navigation and common terms in Hindi
   - Fallback to English for missing translations

**How to test:**
1. Go to Settings → Language Settings
2. Select different languages
3. Verify text changes across the interface
4. Test date and time formatting

#### Timezone Testing

**Test timezone support:**

1. **India Standard Time (IST)** - Default
2. **UTC** - Coordinated Universal Time
3. **Eastern Time (ET)** - US Eastern
4. **Greenwich Mean Time (GMT)** - UK
5. **Japan Standard Time (JST)** - Japan
6. **Australian Eastern Time (AET)** - Australia

**How to test:**
1. Go to Settings → Timezone Settings
2. Select different timezones
3. Verify time display changes
4. Check attendance timestamps
5. Verify dashboard time displays

### 3. Feature Testing Checklist

#### Authentication & Authorization
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Token expiration handling
- [ ] Role-based access control
- [ ] Password change functionality
- [ ] Profile update functionality

#### Employee Management
- [ ] Create new employee
- [ ] View employee list
- [ ] Update employee information
- [ ] Deactivate employee
- [ ] Search and filter employees
- [ ] Department-wise employee listing
- [ ] Manager-employee relationship

#### Attendance Management
- [ ] Check-in functionality
- [ ] Check-out functionality
- [ ] Break start/end
- [ ] Late arrival detection
- [ ] Overtime calculation
- [ ] Attendance history
- [ ] Attendance summary
- [ ] Real-time dashboard updates

#### Leave Management
- [ ] Apply for leave
- [ ] Leave approval workflow
- [ ] Leave rejection with reason
- [ ] Leave balance calculation
- [ ] Leave history
- [ ] Manager approval interface
- [ ] Leave conflict detection

#### Payroll Management
- [ ] Generate monthly payroll
- [ ] Payroll approval workflow
- [ ] Payslip generation
- [ ] Salary calculations
- [ ] Allowance and deduction management
- [ ] Payroll history
- [ ] Export functionality

#### Template Management
- [ ] Create new templates
- [ ] Edit existing templates
- [ ] Template variable system
- [ ] Template rendering
- [ ] Template duplication
- [ ] Default template creation

#### Holiday Management
- [ ] Add new holidays
- [ ] Edit holiday information
- [ ] Holiday calendar view
- [ ] Upcoming holidays
- [ ] Holiday type categorization
- [ ] Bulk holiday import

#### Dashboard & Analytics
- [ ] Real-time attendance overview
- [ ] Department-wise statistics
- [ ] Employee status distribution
- [ ] Recent activity feed
- [ ] Live dashboard (TV mode)
- [ ] Widget customization
- [ ] Auto-refresh functionality

#### Settings & Configuration
- [ ] Theme switching
- [ ] Language selection
- [ ] Timezone configuration
- [ ] Organization settings
- [ ] User preferences
- [ ] System information

### 4. Performance Testing

#### Load Testing

**Test with multiple concurrent users:**

```bash
# Install artillery for load testing
npm install -g artillery

# Create load test configuration
cat > load-test.yml << EOF
config:
  target: 'http://localhost:5000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Login and Dashboard"
    weight: 100
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "admin@shirinq.com"
            password: "admin123"
          capture:
            - json: "$.token"
              as: "authToken"
      - get:
          url: "/api/dashboard/overview"
          headers:
            Authorization: "Bearer {{ authToken }}"
EOF

# Run load test
artillery run load-test.yml
```

#### Database Performance

**Test database operations:**

```bash
cd server
node -e "
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/shirinq_connect');

async function testPerformance() {
  console.time('User Query');
  const users = await User.find({}).limit(1000);
  console.timeEnd('User Query');
  console.log('Found', users.length, 'users');
  process.exit(0);
}

testPerformance();
"
```

### 5. Security Testing

#### Authentication Security
- [ ] JWT token validation
- [ ] Password hashing verification
- [ ] Session management
- [ ] Token expiration
- [ ] Role-based access enforcement

#### API Security
- [ ] Rate limiting
- [ ] CORS configuration
- [ ] Input validation
- [ ] SQL injection prevention
- [ ] XSS protection

#### Data Security
- [ ] Sensitive data encryption
- [ ] Secure file uploads
- [ ] Data sanitization
- [ ] Access logging

### 6. Integration Testing

#### Real-time Features
- [ ] Socket.io connection
- [ ] Live dashboard updates
- [ ] Real-time notifications
- [ ] Multi-user synchronization

#### File Operations
- [ ] Profile picture upload
- [ ] Document template generation
- [ ] Payslip PDF generation
- [ ] File download functionality

#### External Integrations
- [ ] Email notifications (if configured)
- [ ] Calendar integration
- [ ] Export functionality
- [ ] Import capabilities

## 🐛 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Issues

**Error:** `MongoServerError: connect ECONNREFUSED 127.0.0.1:27017`

**Solution:**
```bash
# Start MongoDB service
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
# or
brew services start mongodb-community
```

#### 2. Port Already in Use

**Error:** `EADDRINUSE: address already in use :::5000`

**Solution:**
```bash
# Find and kill process using port 5000
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5000 | xargs kill -9
```

#### 3. Node Modules Issues

**Error:** `Module not found` or dependency issues

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# For client
cd client
rm -rf node_modules package-lock.json
npm install

# For server
cd server
rm -rf node_modules package-lock.json
npm install
```

#### 4. Build Issues

**Error:** Build failures or compilation errors

**Solution:**
```bash
# Clear build cache
cd client
rm -rf build
npm run build

# Check for TypeScript errors
npm run type-check
```

### Debug Mode

**Enable debug logging:**

```bash
# Backend debug mode
cd server
DEBUG=* npm run dev

# Frontend debug mode
cd client
REACT_APP_DEBUG=true npm start
```

## 📊 Monitoring & Logs

### Application Logs

**Backend logs:**
```bash
cd server
tail -f logs/app.log
```

**Frontend logs:**
- Open browser Developer Tools (F12)
- Check Console tab for errors
- Check Network tab for API calls

### Database Monitoring

**MongoDB Compass:**
1. Open MongoDB Compass
2. Connect to `mongodb://localhost:27017`
3. Navigate to `shirinq_connect` database
4. Monitor collections and indexes

**MongoDB Shell:**
```bash
mongo
use shirinq_connect
db.stats()
db.users.count()
db.attendance.count()
```

## 🚀 Production Deployment

### Environment Setup

**Production configuration:**

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://your-production-db:27017/shirinq_connect
JWT_SECRET=your-production-secret-key
CORS_ORIGIN=https://your-domain.com
```

### Build for Production

```bash
# Build frontend
cd client
npm run build

# Start production server
cd server
NODE_ENV=production npm start
```

### Docker Deployment

```bash
# Build Docker image
docker build -t shirinq-connect .

# Run container
docker run -p 5000:5000 -p 3000:3000 shirinq-connect
```

## 📞 Support

If you encounter any issues:

1. **Check the logs** for error messages
2. **Verify all prerequisites** are installed
3. **Ensure MongoDB is running**
4. **Check port availability**
5. **Review environment configuration**

For additional support, please refer to the main README.md file or create an issue in the repository.

---

**Happy Testing! 🎉**

This guide covers all aspects of setting up, testing, and deploying ShirinQ Connect. Follow each section carefully to ensure a complete and successful implementation.
