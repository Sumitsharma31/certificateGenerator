const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const generateOTP = require('../utils/generateOTP');
const sendOTPEmail = require('../utils/email').sendOTPEmail;
const generateToken = require('../utils/generateToken');
const { otpLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// @route   POST /api/auth/request-otp
// @desc    Request OTP for login/signup
// @access  Public
router.post('/request-otp', 
  otpLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;

      // Check for recent OTP request (throttle)
      let user = await User.findOne({ email });
      if (user && user.otp.requestedAt) {
        const timeSinceLastRequest = Date.now() - new Date(user.otp.requestedAt).getTime();
        const oneHour = 60 * 60 * 1000;
        
        if (timeSinceLastRequest < oneHour && user.otp.attempts >= 3) {
          const remainingTime = Math.ceil((oneHour - timeSinceLastRequest) / (60 * 1000));
          return res.status(429).json({ 
            error: `Too many OTP requests. Please try again in ${remainingTime} minutes.` 
          });
        }
      }

      // Generate OTP
      const otp = generateOTP();

      // Create or update user
      if (!user) {
        user = await User.create({
          email,
          name: email.split('@')[0] // Default name from email
        });
      }

      // Set OTP
      await user.setOTP(otp);

      // Send OTP email
      const emailResult = await sendOTPEmail(email, otp);
      
      if (!emailResult.success) {
        console.error('Email sending failed:', emailResult.error);
        return res.status(500).json({ 
          error: 'Failed to send OTP email',
          details: process.env.NODE_ENV === 'development' ? emailResult.error : undefined
        });
      }

      res.json({
        success: true,
        message: 'OTP sent to your email',
        expiresIn: '10 minutes'
      });
    } catch (error) {
      console.error('Error requesting OTP:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and get JWT token
// @access  Public
router.post('/verify-otp',
  [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, otp } = req.body;

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ error: 'User not found. Please request OTP first.' });
      }

      // Verify OTP
      const isValid = await user.verifyOTP(otp);
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
      }

      // Generate JWT token
      const token = generateToken(user._id);

      res.json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl
        }
      });
    } catch (error) {
      console.error('Error verifying OTP:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', require('../middleware/auth').protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-otp');
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout (client-side token removal, server can add token blacklist if needed)
// @access  Private
router.post('/logout', require('../middleware/auth').protect, (req, res) => {
  // For JWT, logout is typically handled client-side by removing token
  // If implementing refresh tokens or sessions, invalidate them here
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;

