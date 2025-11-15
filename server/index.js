const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Load environment variables
if (fs.existsSync('./config.env')) {
  require('dotenv').config({ path: './config.env' });
} else {
  require('dotenv').config();
}

const app = express();

// -------------------- Middleware Setup --------------------
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// -------------------- CORS Configuration --------------------
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ["http://localhost:3000"];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow non-browser clients
    if (corsOrigins.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV === 'development') {
      const localNetworkPattern = /^https?:\/\/(192\.168|10\.|172\.(1[6-9]|2[0-9]|3[01]))/;
      if (localNetworkPattern.test(origin)) return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
};
app.use(cors(corsOptions));

// -------------------- Rate Limiter --------------------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
});
app.use(limiter);

// -------------------- MongoDB Connection --------------------
const mongoUri = process.env.MONGODB_URI;
mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err.message));

// -------------------- Routes --------------------
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leaves');
const payrollRoutes = require('./routes/payroll');
const templateRoutes = require('./routes/templates');
const dashboardRoutes = require('./routes/dashboard');
const holidayRoutes = require('./routes/holidays');
const organizationRoutes = require('./routes/organization');

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/organization', organizationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Sarya Connective API is running',
    timestamp: new Date().toISOString()
  });
});

// -------------------- Serve React Frontend --------------------
const clientBuildPath = path.join(__dirname, '..', 'client', 'build');

if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));

  // Catch-all handler for React Router routes
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API route not found' });
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  console.warn('⚠️ React build directory not found. Run "npm run build" in client folder before deploying.');
  app.get('*', (req, res) => {
    res.status(404).json({ message: 'React build not found' });
  });
}

// -------------------- Error Handler --------------------
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  if (req.path.startsWith('/api/')) {
    res.status(500).json({
      message: 'Something went wrong!',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  } else {
    res.status(500).send('Internal Server Error');
  }
});

// -------------------- Start Locally Only --------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// -------------------- Export for Vercel --------------------
module.exports = app;
