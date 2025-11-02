const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Load environment variables - check for config.env file first, otherwise use process.env
if (fs.existsSync('./config.env')) {
  require('dotenv').config({ path: './config.env' });
} else {
  require('dotenv').config();
}

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

// MongoDB connection with better error handling
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarya_connective';

// Log connection attempt (hide credentials in production)
if (process.env.NODE_ENV !== 'production') {
  const maskedUri = mongoUri.replace(/:([^:@]+)@/, ':****@');
  console.log(`🔌 Attempting to connect to MongoDB: ${maskedUri}`);
}

mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 10000, // 10 second timeout
  socketTimeoutMS: 45000,
})
.then(() => {
  const dbName = mongoose.connection.db?.databaseName || 'unknown';
  console.log(`✅ MongoDB connected successfully to database: ${dbName}`);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  
  // Provide helpful error messages based on error type
  if (err.code === 8000 || err.codeName === 'AtlasError') {
    console.error('\n💡 MongoDB Atlas Authentication Failed. Please check:');
    console.error('   1. Username and password in connection string are correct');
    console.error('   2. Database user has proper permissions');
    console.error('   3. IP address is whitelisted in Atlas Network Access');
    console.error('   4. Connection string format is correct:');
    console.error('      mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority');
  } else if (err.name === 'MongoServerSelectionError') {
    console.error('\n💡 Cannot reach MongoDB server. Please check:');
    console.error('   1. Server is running and accessible');
    console.error('   2. Network connection is active');
    console.error('   3. Firewall allows MongoDB connections');
    console.error('   4. Connection string host and port are correct');
  } else if (err.message.includes('authentication')) {
    console.error('\n💡 Authentication Failed. Please check:');
    console.error('   1. Username and password are correct');
    console.error('   2. authSource parameter if using custom auth database');
    console.error('   3. User has permissions on the database');
  }
  
  console.error('\n📝 Current connection string (masked):', 
    mongoUri.replace(/:([^:@]+)@/, ':****@'));
  
  // Don't exit in production to allow for retries/restarts
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

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

// Serve static files from React app in production
// IMPORTANT: This must come AFTER all API routes but BEFORE the catch-all route
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
  
  // Check if build directory exists
  const fs = require('fs');
  if (!fs.existsSync(clientBuildPath)) {
    console.warn('⚠️  Warning: React build directory not found at:', clientBuildPath);
    console.warn('   Make sure to run: npm run build in the client directory');
  }
  
  // Serve static files (CSS, JS, images, etc.) - must be before catch-all route
  // Only serve files that actually exist, let routes pass through to catch-all
  app.use(express.static(clientBuildPath, {
    maxAge: '1y',
    etag: false,
    index: false, // Don't serve index.html from static - we'll handle it explicitly
    fallthrough: true // Continue to next middleware if file not found (default is true, but being explicit)
  }));
  
  // Catch-all handler: Serve index.html for all non-API routes
  // This allows React Router to handle client-side routing
  // IMPORTANT: This must be the last route handler before error handlers
  app.get('*', (req, res) => {
    // Skip API routes - they should have been handled above
    if (req.path && req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API route not found' });
    }
    
    // For all non-API routes (including UI routes like /live-dashboard), serve index.html
    // React Router will handle the routing on the client side
    const indexPath = path.join(clientBuildPath, 'index.html');
    
    // Check if file exists
    if (!fs.existsSync(indexPath)) {
      console.error('❌ index.html not found at:', indexPath);
      return res.status(500).send('React build files not found. Please build the client app.');
    }
    
    // Resolve the absolute path for sendFile
    const absoluteIndexPath = path.resolve(indexPath);
    
    // Set content type to HTML
    res.setHeader('Content-Type', 'text/html');
    
    // Serve index.html - React Router will handle client-side routing
    res.sendFile(absoluteIndexPath, (err) => {
      if (err) {
        console.error('❌ Error sending index.html for route:', req.path, err);
        if (!res.headersSent) {
          res.status(500).send('Error loading application');
        }
      }
    });
  });
} else {
  // In development, return 404 for non-API routes
  // (React dev server handles these routes)
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ message: 'API route not found' });
    } else {
      res.status(404).json({ 
        message: 'Route not found. In development, use React dev server on port 3000',
        hint: 'Start the React dev server with: cd client && npm start'
      });
    }
  });
}

// Error handler - must be last
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  
  // For API routes, return JSON error
  if (req.path && req.path.startsWith('/api/')) {
    return res.status(500).json({ 
      message: 'Something went wrong!',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
  
  // For non-API routes in production, try to serve index.html
  // This prevents the app from breaking if there's an error
  if (process.env.NODE_ENV === 'production') {
    const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
    const indexPath = path.join(clientBuildPath, 'index.html');
    
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  }
  
  // Fallback error response
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🚀 Sarya Connective server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  }
});

module.exports = { app, io };
