# ShirinQ Connect - Intelligent HR & Payroll Management System

A comprehensive, production-ready HR & Payroll Management System built with modern web technologies, featuring real-time monitoring, role-based access control, and multi-theme support.

## 🌟 Key Features

### 👥 User Management & Authentication
- **Role-based Access Control**: Admin, HR Admin, Manager, Employee
- **JWT Authentication**: Secure login with token-based authentication
- **User Profiles**: Complete employee information management
- **Password Management**: Secure password handling with bcrypt

### ⏰ Attendance Management
- **Real-time Check-in/out**: GPS-based location tracking
- **Break Management**: Start/end break tracking with reasons
- **Late Arrival Detection**: Automatic late arrival notifications
- **Overtime Calculation**: Automatic overtime computation
- **Live Dashboard**: Real-time attendance monitoring

### 🏖️ Leave Management
- **Leave Applications**: Multiple leave types (Casual, Sick, Earned, etc.)
- **Approval Workflow**: Manager → HR Admin approval chain
- **Leave Balance**: Automatic balance calculation and tracking
- **Conflict Detection**: Prevents overlapping leave applications

### 💰 Payroll Management
- **Automated Generation**: Monthly payroll with one-click generation
- **Template System**: Reusable payslip templates with dynamic fields
- **Salary Calculations**: Basic salary, allowances, deductions, taxes
- **PDF Generation**: Professional payslip PDF export

### 📄 Template Management
- **Dynamic Templates**: Offer letters, appointment letters, payslips
- **Variable System**: Placeholder support ({{name}}, {{salary}}, etc.)
- **Template Categories**: Organized by document type
- **Usage Tracking**: Template usage statistics

### 📅 Holiday Calendar
- **Holiday Management**: National, regional, company holidays
- **Calendar View**: Visual holiday calendar
- **Upcoming Holidays**: Dashboard notifications
- **Holiday Types**: Categorized holiday management

### 📊 Live Dashboard (TV Mode)
- **Real-time Monitoring**: Live employee activity display
- **Department Analytics**: Department-wise attendance statistics
- **Custom Widgets**: Manager-created custom data tables
- **Fullscreen Mode**: TV-optimized display
- **Auto-refresh**: Configurable refresh intervals

### 🎨 UI/UX Features
- **Multi-theme Support**: 7+ themes (Light, Dark, Ocean Blue, etc.)
- **Responsive Design**: Mobile, tablet, desktop optimized
- **Localization**: Multi-language support (English, Hindi)
- **Timezone Support**: Organization-wide timezone configuration
- **Dark/Light Mode**: Automatic theme switching

### 🖥️ Desktop Application
- **Electron Wrapper**: Native desktop application
- **Auto-update**: Automatic application updates
- **Cross-platform**: Windows, macOS, Linux support
- **Offline Support**: Limited offline functionality

## 🛠️ Tech Stack

### Frontend
- **React 18**: Modern React with hooks and context
- **PrimeReact**: Professional UI component library
- **React Router**: Client-side routing
- **Socket.io Client**: Real-time communication
- **Axios**: HTTP client for API calls

### Backend
- **Node.js**: JavaScript runtime
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database with Mongoose ODM
- **Socket.io**: Real-time bidirectional communication
- **JWT**: JSON Web Token authentication
- **bcrypt**: Password hashing

### Desktop
- **Electron**: Cross-platform desktop app framework
- **Electron Builder**: Application packaging and distribution

### Development & Testing
- **Jest**: JavaScript testing framework
- **Puppeteer**: End-to-end testing
- **ESLint**: Code linting and formatting
- **Docker**: Containerization

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v4.4 or higher) - [Download](https://www.mongodb.com/try/download/community)
- **MongoDB Compass** (Recommended) - [Download](https://www.mongodb.com/products/compass)
- **Git** - [Download](https://git-scm.com/)

### 1. Clone and Install
```bash
# Clone the repository
git clone <repository-url>
cd shirinq-connect

# Install all dependencies
npm run install-all
```

### 2. Database Setup

#### Option A: MongoDB Compass (Recommended)
1. Open MongoDB Compass
2. Create connection: `mongodb://localhost:27017`
3. Create database: `shirinq_connect`

#### Option B: MongoDB Shell
```bash
# Start MongoDB service
mongod

# Connect and create database
mongo
use shirinq_connect
exit
```

### 3. Environment Configuration
The application comes pre-configured with development settings:

**Backend** (`server/config.env`):
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/shirinq_connect
JWT_SECRET=shirinq_connect_super_secret_jwt_key_2024_production_ready
DEFAULT_TIMEZONE=Asia/Kolkata
DEFAULT_LANGUAGE=en
DEFAULT_CURRENCY=INR
```

**Frontend** (`client/.env`):
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 4. Seed Database
```bash
npm run seed
```

This creates sample users and data:
- **Admin**: `admin@shirinq.com` / `admin123`
- **HR Admin**: `hr@shirinq.com` / `hr123`
- **Manager**: `manager@shirinq.com` / `manager123`
- **Employee**: `employee@shirinq.com` / `employee123`

### 5. Start Application

#### Development Mode (Recommended)
```bash
npm run dev
```
This starts both frontend (http://localhost:3000) and backend (http://localhost:5000)

#### Individual Services
```bash
npm run server  # Backend only
npm run client  # Frontend only
```

### 6. Desktop Application
```bash
npm run electron-dev  # Development
npm run electron-build  # Production build
```

## 🧪 Testing

### Comprehensive Testing Suite
```bash
# Run all tests
npm run test-all

# API testing
npm run test-api

# UI testing
npm run test-ui

# Frontend testing
npm run test-frontend
```

### Manual Testing
1. **Login with different user roles**
2. **Test all CRUD operations**
3. **Verify role-based access control**
4. **Test theme switching**
5. **Test localization**
6. **Test responsive design**

## 📱 User Personas & Access Control

### 🔑 Admin
- **Full System Access**: All modules and features
- **User Management**: Create, edit, deactivate users
- **System Settings**: Organization settings, themes, localization
- **Analytics**: System-wide reports and analytics

### 👔 HR Admin
- **Employee Management**: Full employee lifecycle
- **Payroll Management**: Generate and manage payroll
- **Template Management**: Create and manage document templates
- **Holiday Management**: Company holiday calendar
- **Leave Approvals**: Final leave approval authority

### 👨‍💼 Manager
- **Team Management**: Manage team members
- **Leave Approvals**: Approve/reject team leave requests
- **Team Analytics**: Team performance and attendance
- **Custom Dashboard**: Create custom dashboard widgets

### 👤 Employee
- **Personal Attendance**: Check-in/out, break management
- **Leave Applications**: Apply for leave, view balance
- **Personal Profile**: View and update personal information
- **Payslips**: View and download payslips

## 🎨 Themes & Customization

### Available Themes
1. **Light** - Clean, bright default theme
2. **Dark** - Low-light viewing mode
3. **Ocean Blue** - Calm blue accent colors
4. **Sunset Orange** - Vibrant orange highlights
5. **Forest Green** - Professional green tones
6. **Midnight Dark** - Deep purple dark theme
7. **Corporate Blue** - Professional blue theme

### Localization
- **English** (Default) - Complete translation
- **Hindi** (Basic) - Navigation and common terms
- **Extensible** - Easy to add more languages

### Timezone Support
- **India Standard Time (IST)** - Default
- **UTC** - Coordinated Universal Time
- **US Eastern Time** - Eastern Time
- **UK Greenwich Mean Time** - GMT
- **Japan Standard Time** - JST
- **Australian Eastern Time** - AET

## 🐳 Docker Deployment

### Quick Docker Setup
```bash
# Build and run with Docker Compose
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
# MongoDB Express: http://localhost:8081
```

### Docker Services
- **MongoDB**: Database with persistent storage
- **Backend**: Node.js API server
- **Frontend**: Nginx-served React app
- **MongoDB Express**: Database administration UI

## 📊 API Documentation

### Authentication Endpoints
```
POST /api/auth/login          # User login
GET  /api/auth/profile        # Get user profile
PUT  /api/auth/profile        # Update profile
PUT  /api/auth/password       # Change password
```

### Employee Management
```
GET    /api/employees         # Get all employees
POST   /api/employees         # Create employee
GET    /api/employees/:id     # Get employee by ID
PUT    /api/employees/:id     # Update employee
DELETE /api/employees/:id     # Deactivate employee
```

### Attendance Management
```
POST /api/attendance/checkin           # Check in
POST /api/attendance/checkout          # Check out
POST /api/attendance/break/start       # Start break
POST /api/attendance/break/end         # End break
GET  /api/attendance/today             # Today's attendance
GET  /api/attendance/history           # Attendance history
GET  /api/attendance/dashboard/overview # Dashboard overview
```

### Leave Management
```
GET  /api/leaves                    # Get leave applications
POST /api/leaves                    # Apply for leave
PUT  /api/leaves/:id/approve        # Approve leave
PUT  /api/leaves/:id/reject         # Reject leave
GET  /api/leaves/balance/:employeeId # Get leave balance
```

### Payroll Management
```
GET  /api/payroll              # Get payroll records
POST /api/payroll/generate     # Generate monthly payroll
GET  /api/payroll/:id/payslip  # Get payslip
PUT  /api/payroll/:id/approve  # Approve payroll
```

### Template Management
```
GET    /api/templates          # Get templates
POST   /api/templates          # Create template
PUT    /api/templates/:id      # Update template
DELETE /api/templates/:id      # Delete template
POST   /api/templates/:id/render # Render template
```

### Holiday Management
```
GET    /api/holidays           # Get holidays
POST   /api/holidays           # Create holiday
PUT    /api/holidays/:id       # Update holiday
DELETE /api/holidays/:id       # Delete holiday
```

### Dashboard & Analytics
```
GET /api/dashboard/overview    # Dashboard overview
GET /api/dashboard/widgets     # Dashboard widgets
POST /api/dashboard/widgets    # Create custom widget
PUT  /api/dashboard/widgets/:id # Update widget
```

### Organization Settings
```
GET /api/organization/settings # Get organization settings
PUT /api/organization/settings # Update organization settings
GET /api/organization          # Get organization info
```

## 🔧 Development

### Project Structure
```
shirinq-connect/
├── client/                 # React frontend
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── utils/         # Utility functions
│   └── package.json
├── server/                # Node.js backend
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── middleware/       # Express middleware
│   ├── tests/            # Backend tests
│   └── package.json
├── docker-compose.yml     # Docker configuration
├── Dockerfile            # Docker image
└── package.json          # Root package.json
```

### Available Scripts
```bash
# Development
npm run dev              # Start both frontend and backend
npm run server           # Start backend only
npm run client           # Start frontend only

# Building
npm run build            # Build frontend for production
npm run electron-build   # Build Electron app

# Testing
npm run test             # Run backend tests
npm run test-all         # Run comprehensive API tests
npm run test-ui          # Run UI validation tests
npm run test-frontend    # Run frontend tests

# Database
npm run seed             # Seed database with sample data

# Deployment
npm run start            # Start production server
npm run docker:build     # Build Docker image
npm run docker:run       # Run Docker container

# Utilities
npm run lint             # Run linting
npm run lint:fix         # Fix linting issues
npm run clean            # Clean node_modules
npm run reset            # Clean and reinstall everything
```

## 🚀 Production Deployment

### Environment Variables
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
npm run build

# Start production server
NODE_ENV=production npm start
```

### Docker Production
```bash
# Build production image
docker build -t shirinq-connect:latest .

# Run production container
docker run -d \
  -p 5000:5000 \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e MONGODB_URI=mongodb://your-db:27017/shirinq_connect \
  shirinq-connect:latest
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with configurable rounds
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Configurable cross-origin resource sharing
- **Input Validation**: Comprehensive input validation and sanitization
- **Role-based Access**: Granular permission system
- **Secure Headers**: Security headers for XSS and CSRF protection

## 📈 Performance Features

- **Database Indexing**: Optimized MongoDB indexes
- **Caching**: Strategic caching for better performance
- **Real-time Updates**: Efficient Socket.io implementation
- **Lazy Loading**: Component and route lazy loading
- **Code Splitting**: Optimized bundle splitting
- **Image Optimization**: Optimized asset loading

## 🐛 Troubleshooting

### Common Issues

#### MongoDB Connection Issues
```bash
# Check MongoDB status
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Check MongoDB logs
sudo journalctl -u mongod
```

#### Port Already in Use
```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 <PID>
```

#### Node Modules Issues
```bash
# Clean install
npm run clean
npm run install-all
```

#### Build Issues
```bash
# Clear build cache
cd client
rm -rf build
npm run build
```

### Debug Mode
```bash
# Backend debug
cd server
DEBUG=* npm run dev

# Frontend debug
cd client
REACT_APP_DEBUG=true npm start
```

## 📞 Support & Contributing

### Getting Help
- **Documentation**: Check this README and SETUP_GUIDE.md
- **Issues**: Create an issue in the repository
- **Email**: support@shirinq.com

### Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow ESLint configuration
- Write tests for new features
- Update documentation
- Follow semantic versioning

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **PrimeReact** - Professional UI component library
- **MongoDB** - NoSQL database
- **Socket.io** - Real-time communication
- **Electron** - Desktop application framework
- **React** - Frontend framework
- **Node.js** - Backend runtime

---

**Built with ❤️ by the ShirinQ Connect Team**

For detailed setup instructions, see [SETUP_GUIDE.md](SETUP_GUIDE.md)