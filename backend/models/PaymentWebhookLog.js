const mongoose = require('mongoose');

const webhookLogSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  razorpaySignature: {
    type: String,
    default: null
  },
  receivedAt: {
    type: Date,
    default: Date.now
  },
  verified: {
    type: Boolean,
    default: false
  },
  processed: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
webhookLogSchema.index({ receivedAt: -1 });
webhookLogSchema.index({ eventType: 1, processed: 1 });

module.exports = mongoose.model('PaymentWebhookLog', webhookLogSchema);

