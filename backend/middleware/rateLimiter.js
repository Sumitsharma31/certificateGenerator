const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// OTP request rate limiter (stricter)
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 OTP requests per hour
  message: 'Too many OTP requests. Please try again after an hour.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Payment verification rate limiter
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 payment verifications per 15 minutes
  message: 'Too many payment verification attempts. Please try again later.'
});

module.exports = {
  apiLimiter,
  otpLimiter,
  paymentLimiter
};

