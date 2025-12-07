const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const internshipRoutes = require('./routes/internships');
const enrollmentRoutes = require('./routes/enrollments');
const paymentRoutes = require('./routes/payments');
const certificateRoutes = require('./routes/certificates');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (certificates)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/internships', internshipRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/learning', require('./routes/learning'));
app.use('/api/webhooks', require('./routes/webhooks'));

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

