const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  internshipId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Internship',
    required: true
  },
  enrollmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enrollment',
    default: null
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'refunded'],
    default: 'pending'
  },
  // Added support for 'offline' payments from Admin Panel
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'offline', 'bank_transfer'],
    default: 'razorpay'
  },
  transactionId: {
    type: String, // Razorpay Payment ID or Manual Reference
    default: null
  },
  notes: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

paymentSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);