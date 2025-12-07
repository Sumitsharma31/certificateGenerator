const express = require('express');
const { body, validationResult } = require('express-validator');
const Enrollment = require('../models/Enrollment');
const { protect, authorize } = require('../middleware/auth');
const { verifyPayment } = require('../utils/razorpay');
const { paymentLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// All routes require authentication except webhook (handled separately)
router.use(protect);

// @route   POST /api/payments/verify
// @desc    Verify Razorpay payment signature and update enrollment
// @access  Private
router.post('/verify',
  paymentLimiter,
  [
    body('razorpay_order_id').notEmpty().withMessage('Order ID is required'),
    body('razorpay_payment_id').notEmpty().withMessage('Payment ID is required'),
    body('razorpay_signature').notEmpty().withMessage('Signature is required'),
    body('enrollmentId').notEmpty().withMessage('Enrollment ID is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, enrollmentId } = req.body;

      // Find enrollment
      const enrollment = await Enrollment.findById(enrollmentId);

      if (!enrollment) {
        return res.status(404).json({ error: 'Enrollment not found' });
      }

      // Check ownership
      if (enrollment.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Verify payment already processed
      if (enrollment.payment.status === 'captured') {
        return res.json({
          success: true,
          message: 'Payment already verified',
          enrollment
        });
      }

      // Verify signature
      const isValid = verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);

      if (!isValid) {
        return res.status(400).json({ error: 'Invalid payment signature' });
      }

      // Update enrollment
      enrollment.payment.razorpayPaymentId = razorpay_payment_id;
      enrollment.payment.status = 'captured';
      enrollment.payment.capturedAt = new Date();
      enrollment.status = 'active';
      enrollment.joinedAt = new Date();
      await enrollment.save();

      res.json({
        success: true,
        message: 'Payment verified successfully',
        enrollment
      });
    } catch (error) {
      console.error('Error verifying payment:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;

