const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  certId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentName: {
    type: String,
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
    required: true
  },
  issuedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  pdfUrl: {
    type: String,
    required: true
  },
  signature: {
    type: String,
    required: true
  },
  revoked: {
    type: Boolean,
    default: false
  },
  revokedAt: {
    type: Date,
    default: null
  },
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  revokedReason: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes

certificateSchema.index({ userId: 1 });
certificateSchema.index({ internshipId: 1 });
certificateSchema.index({ revoked: 1 });

module.exports = mongoose.model('Certificate', certificateSchema);

