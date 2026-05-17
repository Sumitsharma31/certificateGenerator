const express = require('express');
const { body, validationResult } = require('express-validator');
const Internship = require('../models/Internship');
const Enrollment = require('../models/Enrollment');
const { protect, authorize } = require('../middleware/auth');
const { createOrder } = require('../utils/razorpay'); // Ensure this import is correct based on your project

const router = express.Router();

// ============================================================
// PUBLIC ROUTES
// ============================================================

// @route   GET /api/internships
// @desc    Get all internships (with filters)
router.get('/', async (req, res) => {
  try {
    const {
      status = 'published',
      mentorId,
      search,
      minPrice,
      maxPrice,
      page = 1,
      limit = 10,
      sort = '-createdAt'
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (mentorId) query.mentorId = mentorId;
    if (minPrice || maxPrice) {
      query.priceInINR = {};
      if (minPrice) query.priceInINR.$gte = parseFloat(minPrice);
      if (maxPrice) query.priceInINR.$lte = parseFloat(maxPrice);
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const internships = await Internship.find(query)
      .populate('mentorId', 'name email avatarUrl')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const total = await Internship.countDocuments(query);

    res.json({
      success: true,
      count: internships.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: internships
    });
  } catch (error) {
    console.error('Error fetching internships:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/internships/:id
// @desc    Get single internship
router.get('/:id', async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id)
      .populate('mentorId', 'name email avatarUrl');

    if (!internship) {
      return res.status(404).json({ error: 'Internship not found' });
    }

    const enrollmentCount = await Enrollment.countDocuments({
      internshipId: internship._id,
      status: { $in: ['active', 'completed'] }
    });

    res.json({
      success: true,
      data: {
        ...internship.toObject(),
        enrollmentCount
      }
    });
  } catch (error) {
    console.error('Error fetching internship:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// PROTECTED ROUTES (Mentor/Admin)
// ============================================================

// @route   POST /api/internships
// @desc    Create internship
router.post('/',
  protect,
  authorize('mentor', 'admin'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('priceInINR').isNumeric().withMessage('Price must be a number')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      // Explicit Destructuring to match your model
      const {
        title, description, priceInINR, duration, level,
        image, seats, startDate, endDate, skills, modules, isPublished
      } = req.body;

      const internshipData = {
        title, description, priceInINR, duration, level,
        image, seats, startDate, endDate, skills, modules, isPublished,
        mentorId: req.user.role === 'admin' ? (req.body.mentorId || req.user._id) : req.user._id
      };

      const internship = await Internship.create(internshipData);
      await internship.populate('mentorId', 'name email avatarUrl');

      res.status(201).json({ success: true, data: internship });
    } catch (error) {
      console.error('Error creating internship:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// @route   PUT /api/internships/:id
// @desc    Update internship
router.put('/:id',
  protect,
  authorize('mentor', 'admin'),
  async (req, res) => {
    try {
      let internship = await Internship.findById(req.params.id);
      if (!internship) return res.status(404).json({ error: 'Internship not found' });

      if (req.user.role !== 'admin' && internship.mentorId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const internshipUpdated = await Internship.findByIdAndUpdate(
        req.params.id,
        { $set: req.body }, // Using $set to update whatever fields are sent
        { new: true, runValidators: true }
      ).populate('mentorId', 'name email avatarUrl');

      res.json({ success: true, data: internshipUpdated });
    } catch (error) {
      console.error('Error updating internship:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// @route   DELETE /api/internships/:id
// @desc    Delete internship
router.delete('/:id',
  protect,
  authorize('mentor', 'admin'),
  async (req, res) => {
    try {
      const internship = await Internship.findById(req.params.id);
      if (!internship) return res.status(404).json({ error: 'Internship not found' });

      if (req.user.role !== 'admin' && internship.mentorId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      await internship.deleteOne();
      res.json({ success: true, message: 'Internship deleted successfully' });
    } catch (error) {
      console.error('Error deleting internship:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ============================================================
// ENROLLMENT ROUTE (FIXED LOGIC HERE)
// ============================================================

// @route   POST /api/internships/:id/enroll
// @desc    Enroll in internship and create payment order
// @route   POST /api/internships/:id/enroll
// @desc    Enroll in internship and create payment order
router.post('/:id/enroll',
  protect,
  async (req, res) => {
    try {
      const internship = await Internship.findById(req.params.id);

      if (!internship) {
        return res.status(404).json({ error: 'Internship not found' });
      }

      if (internship.status !== 'published') {
        return res.status(400).json({ error: 'Internship is not available for enrollment' });
      }

      // 1. Check for ANY existing enrollment
      let enrollment = await Enrollment.findOne({
        userId: req.user._id,
        internshipId: internship._id
      });

      // 2. Logic to handle "Already Enrolled" vs "Retry Payment"
      if (enrollment) {
        if (enrollment.status === 'active' || enrollment.status === 'completed') {
          return res.status(400).json({ error: 'You are already enrolled in this internship.' });
        }
      }

      const activeEnrollmentsCount = await Enrollment.countDocuments({
        internshipId: internship._id,
        status: { $in: ['active', 'completed'] }
      });

      if (activeEnrollmentsCount >= internship.seats) {
        return res.status(400).json({ error: 'No seats available' });
      }

      // --- SCENARIO A: Free Internship ---
      if (internship.priceInINR === 0) {
        if (enrollment) {
          enrollment.status = 'active';
          enrollment.joinedAt = new Date();
          enrollment.payment = { status: 'captured', amount: 0, currency: 'INR' };
          await enrollment.save();
        } else {
          enrollment = await Enrollment.create({
            userId: req.user._id,
            internshipId: internship._id,
            status: 'active',
            payment: { amount: 0, currency: 'INR', status: 'captured' },
            joinedAt: new Date()
          });
        }

        return res.json({
          success: true,
          message: 'Enrolled successfully',
          enrollment
        });
      }

      // --- SCENARIO B: Paid Internship (Razorpay) ---

      // Extract scheduled dates from request
      const { startDate, endDate } = req.body;

      if (!enrollment) {
        enrollment = await Enrollment.create({
          userId: req.user._id,
          internshipId: internship._id,
          status: 'pending',
          startDate: startDate || null,
          endDate: endDate || null,
          payment: {
            amount: internship.priceInINR,
            currency: 'INR',
            status: 'pending'
          }
        });
      } else if (startDate && endDate) {
        // Update dates if retrying enrollment
        enrollment.startDate = startDate;
        enrollment.endDate = endDate;
        await enrollment.save();
      }

      // *** FIX IS HERE: Shortened Receipt ID ***
      const receipt = `rcpt_${enrollment._id.toString().slice(-6)}_${Date.now()}`;

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
        if (enrollment.createdAt > new Date(Date.now() - 5000)) {
          await enrollment.deleteOne();
        }
        console.error("Razorpay Error:", orderResult.error); // Log error for debugging
        return res.status(500).json({ error: 'Failed to create payment order' });
      }

      enrollment.payment.razorpayOrderId = orderResult.order.id;
      enrollment.payment.amount = internship.priceInINR;
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
  }
);
module.exports = router;