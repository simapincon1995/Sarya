const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config({ path: './config.env' });

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leaves');
const payrollRoutes = require('./routes/payroll');
const templateRoutes = require('./routes/templates');
const dashboardRoutes = require('./routes/dashboard');
const holidayRoutes = require('./routes/holidays');
const organizationRoutes = require('./routes/organization');

const app = express();
const server = createServer(app);
// Parse CORS origins from environment variable
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ["http://localhost:3000"];

const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shirinq_connect', {
  // useNewUrlParser and useUnifiedTopology are deprecated in Node.js Driver 4.0.0+
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);
  
  socket.on('join-dashboard', (userId) => {
    socket.join('dashboard');
    console.log(`👤 User ${userId} joined dashboard`);
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/organization', organizationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'ShirinQ Connect API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 ShirinQ Connect server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, io };
