const express = require('express');
const Enrollment = require('../models/Enrollment');
const Internship = require('../models/Internship');
const { protect } = require('../middleware/auth');
const { createOrder } = require('../utils/razorpay');

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/enrollments
// @desc    Get user's enrollments
// @access  Private
router.get('/', async (req, res) => {
  try {
    const query = { userId: req.user._id };

    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }

    const enrollments = await Enrollment.find(query)
      .populate('internshipId', 'title description priceInINR mentorId startDate endDate image skills level')
      .populate('certificateId', 'certId issuedAt')
      .sort('-createdAt');

    res.json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/enrollments/:id
// @desc    Get single enrollment
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate('internshipId')
      .populate('certificateId')
      .populate('userId', 'name email');

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Check if user owns this enrollment or is mentor/admin
    if (enrollment.userId._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'mentor' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    console.error('Error fetching enrollment:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/internships/:id/enroll
// @desc    Enroll in internship and create payment order if paid
// @access  Private
router.post('/internships/:id/enroll', async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id);

    if (!internship) {
      return res.status(404).json({ error: 'Internship not found' });
    }

    if (internship.status !== 'published') {
      return res.status(400).json({ error: 'Internship is not available for enrollment' });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      userId: req.user._id,
      internshipId: internship._id
    });

    if (existingEnrollment) {
      return res.status(400).json({ error: 'Already enrolled in this internship' });
    }

    // Check seats availability
    const activeEnrollments = await Enrollment.countDocuments({
      internshipId: internship._id,
      status: { $in: ['active', 'completed'] }
    });

    if (activeEnrollments >= internship.seats) {
      return res.status(400).json({ error: 'No seats available' });
    }

    // Create enrollment
    const enrollment = await Enrollment.create({
      userId: req.user._id,
      internshipId: internship._id,
      status: internship.priceInINR > 0 ? 'pending' : 'active',
      payment: {
        amount: internship.priceInINR,
        currency: 'INR',
        status: internship.priceInINR > 0 ? 'pending' : 'captured'
      },
      joinedAt: internship.priceInINR === 0 ? new Date() : null
    });

    // If free internship, no payment needed
    if (internship.priceInINR === 0) {
      return res.json({
        success: true,
        message: 'Enrolled successfully',
        enrollment
      });
    }

    // Create Razorpay order for paid internship
    const receipt = `ENROLL_${enrollment._id}`;
    const orderResult = await createOrder(
      internship.priceInINR,
      receipt,
      {
        enrollmentId: enrollment._id.toString(),
        internshipId: internship._id.toString(),
        userId: req.user._id.toString()
      }
    );

    if (!orderResult.success) {
      await enrollment.deleteOne();
      return res.status(500).json({ error: 'Failed to create payment order' });
    }

    // Update enrollment with order ID
    enrollment.payment.razorpayOrderId = orderResult.order.id;
    await enrollment.save();

    res.json({
      success: true,
      enrollment,
      razorpayOrder: {
        id: orderResult.order.id,
        amount: orderResult.order.amount,
        currency: orderResult.order.currency,
        key: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error('Error enrolling:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

