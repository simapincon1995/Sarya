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
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ["http://localhost:3000"];

// Enhanced CORS configuration with better local network support
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in the allowed list
    if (corsOrigins.includes(origin)) {
      callback(null, true);
    } 
    // In development, allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    else if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      const localNetworkPattern = /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+)(:\d+)?$/;
      if (localNetworkPattern.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
};

const io = new Server(server, {
  cors: corsOptions,
  allowEIO3: true
});

app.use(helmet());
app.use(cors(corsOptions));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200 // limit each IP to 200 requests per windowMs (increased for dashboard)
});

const dashboardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500 // Higher limit for dashboard API calls
});

app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sarya_connective', {
})
.then(() => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ MongoDB connected successfully');
  }
})
.catch(err => console.error('❌ MongoDB connection error:', err));

io.on('connection', (socket) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔌 User connected:', socket.id);
  }
  
  socket.on('join-dashboard', (userId) => {
    try {
      socket.join('dashboard');
      if (process.env.NODE_ENV !== 'production') {
        console.log(`👤 User ${userId} joined dashboard`);
      }
    } catch (error) {
      console.error('Error joining dashboard:', error);
    }
  });

  // Handle generic room management
  socket.on('join-room', (roomName) => {
    try {
      if (roomName && typeof roomName === 'string') {
        socket.join(roomName);
        if (process.env.NODE_ENV !== 'production') {
          console.log(`👤 User ${socket.id} joined room: ${roomName}`);
        }
      }
    } catch (error) {
      console.error('Error joining room:', error);
    }
  });

  socket.on('leave-room', (roomName) => {
    try {
      if (roomName && typeof roomName === 'string') {
        socket.leave(roomName);
        if (process.env.NODE_ENV !== 'production') {
          console.log(`👤 User ${socket.id} left room: ${roomName}`);
        }
      }
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  });
  
  socket.on('disconnect', () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔌 User disconnected:', socket.id);
    }
  });

  // Handle connection errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/organization', organizationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Sarya Connective API is running',
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🚀 Sarya Connective server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  }
});

module.exports = { app, io };
