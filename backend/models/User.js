const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  role: {
    type: String,
    enum: ['student', 'mentor', 'admin'],
    default: 'student'
  },
  avatarUrl: {
    type: String,
    default: null
  },
  // OTP logic for authentication
  otp: {
    codeHash: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
    requestedAt: { type: Date, default: null }
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  // Helpful for Admin Dashboard stats
  enrollmentCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Methods for OTP (Keep existing logic)
userSchema.methods.setOTP = async function(otpCode) {
  const salt = await bcrypt.genSalt(10);
  this.otp.codeHash = await bcrypt.hash(otpCode.toString(), salt);
  this.otp.expiresAt = new Date(Date.now() + 10 * 60 * 1000); 
  this.otp.attempts = 0;
  this.otp.requestedAt = new Date();
  await this.save();
};

userSchema.methods.verifyOTP = async function(otpCode) {
  if (!this.otp.codeHash || !this.otp.expiresAt || new Date() > this.otp.expiresAt) return false;
  const isMatch = await bcrypt.compare(otpCode.toString(), this.otp.codeHash);
  if (!isMatch) {
    this.otp.attempts += 1;
    await this.save();
    return false;
  }
  this.otp.codeHash = null;
  this.otp.expiresAt = null;
  this.otp.attempts = 0;
  this.isEmailVerified = true;
  this.lastLogin = new Date();
  await this.save();
  return true;
};

module.exports = mongoose.model('User', userSchema);