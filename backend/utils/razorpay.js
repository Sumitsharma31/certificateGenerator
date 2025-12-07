const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create an order
const createOrder = async (amount, receipt, notes = {}) => {
  try {
    const options = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: receipt,
      notes: notes
    };

    const order = await razorpay.orders.create(options);
    return { success: true, order };
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return { success: false, error: error.message };
  }
};

// Verify payment signature
const verifyPayment = (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
  try {
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;
    return isAuthentic;
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return false;
  }
};

// Verify webhook signature
const verifyWebhookSignature = (payload, signature) => {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
};

module.exports = {
  razorpay,
  createOrder,
  verifyPayment,
  verifyWebhookSignature
};

