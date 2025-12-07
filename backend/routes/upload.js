const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/upload
// @desc    Upload an image
// @access  Private (Admin/Mentor)
router.post('/', protect, authorize('admin', 'mentor'), upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload a file' });
        }

        const protocol = req.protocol;
        const host = req.get('host');
        // Construct public URL
        // Assumes 'uploads' is served statically from root
        const fileUrl = `${protocol}://${host}/uploads/images/${req.file.filename}`;

        res.json({
            success: true,
            url: fileUrl,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Server error during upload' });
    }
});

module.exports = router;
