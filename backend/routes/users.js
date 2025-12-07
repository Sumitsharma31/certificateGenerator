const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-otp');
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/users/me
// @desc    Update current user profile
// @access  Private
router.put('/me',
  [
    body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('avatarUrl').optional().isURL().withMessage('Avatar URL must be valid')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, avatarUrl } = req.body;
      const updateFields = {};

      if (name) updateFields.name = name;
      if (avatarUrl) updateFields.avatarUrl = avatarUrl;

      const user = await User.findByIdAndUpdate(
        req.user._id,
        updateFields,
        { new: true, runValidators: true }
      ).select('-otp');

      res.json({ success: true, user });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;

