const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'pending'
  },
  // Stores payment info used in Dashboard Stats
  payment: {
    amount: { type: Number, default: 0 },
    status: { type: String, default: 'pending' }, // pending, captured, failed
    capturedAt: { type: Date, default: null },
    razorpayOrderId: String,
    razorpayPaymentId: String
  },
  // Aligned with Student Dashboard ProgressBar
  progress: {
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    tasksCompleted: { type: Number, default: 0 },
    totalTasks: { type: Number, default: 0 },
    completedModules: [{ type: String }], // Store Module IDs
    quizResults: [{
      moduleId: String,
      score: Number,
      passed: Boolean,
      attempts: { type: Number, default: 0 }
    }]
  },
  // Link to Certificate if completed
  certificateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Certificate',
    default: null
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Prevent duplicate enrollments
enrollmentSchema.index({ userId: 1, internshipId: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);