const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
console.log('Checking Environment Variables...');
console.log('PORT:', process.env.PORT);
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? 'Set' : 'Not Set');
console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'Set' : 'Not Set');
console.log('MONGODB_URI:', process.env.MONGODB_URI);

try {
    const Razorpay = require('razorpay');
    const r = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID || 'test',
        key_secret: process.env.RAZORPAY_KEY_SECRET || 'test'
    });
    console.log('Razorpay initialized successfully');
} catch (error) {
    console.error('Razorpay initialization failed:', error);
}
