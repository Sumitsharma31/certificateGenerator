const express = require('express');
const crypto = require('crypto');
const Enrollment = require('../models/Enrollment');
const PaymentWebhookLog = require('../models/PaymentWebhookLog');
const { verifyWebhookSignature } = require('../utils/razorpay');

const router = express.Router();

// Webhook endpoint (no auth middleware - uses signature verification)
router.post('/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const payload = req.body.toString();

    if (!signature) {
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Log webhook
    const webhookLog = await PaymentWebhookLog.create({
      eventType: 'payment',
      payload: JSON.parse(payload),
      razorpaySignature: signature,
      verified: false,
      processed: false
    });

    // Verify webhook signature
    const isValid = verifyWebhookSignature(payload, signature);

    if (!isValid) {
      webhookLog.verified = false;
      webhookLog.error = 'Invalid signature';
      await webhookLog.save();
      return res.status(400).json({ error: 'Invalid signature' });
    }

    webhookLog.verified = true;

    // Parse webhook payload
    const event = JSON.parse(payload);

    // Handle different event types
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      
      // Find enrollment by order ID
      const enrollment = await Enrollment.findOne({
        'payment.razorpayOrderId': payment.order_id
      });

      if (enrollment && enrollment.payment.status !== 'captured') {
        enrollment.payment.razorpayPaymentId = payment.id;
        enrollment.payment.status = 'captured';
        enrollment.payment.capturedAt = new Date();
        enrollment.status = 'active';
        enrollment.joinedAt = new Date();
        await enrollment.save();

        webhookLog.processed = true;
        await webhookLog.save();

        console.log(`✅ Payment captured for enrollment ${enrollment._id}`);
      }
    } else if (event.event === 'payment.failed') {
      const payment = event.payload.payment.entity;
      
      const enrollment = await Enrollment.findOne({
        'payment.razorpayOrderId': payment.order_id
      });

      if (enrollment) {
        enrollment.payment.status = 'failed';
        await enrollment.save();

        webhookLog.processed = true;
        await webhookLog.save();

        console.log(`❌ Payment failed for enrollment ${enrollment._id}`);
      }
    }

    // Always respond with 200 to Razorpay
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;












