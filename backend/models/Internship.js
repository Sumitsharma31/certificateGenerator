const mongoose = require('mongoose');

const syllabusItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  attachments: [{
    url: String,
    fileName: String
  }],
  order: {
    type: Number,
    default: 0
  }
});

const internshipSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide a description']
  },
  syllabus: [syllabusItemSchema],
  modules: [{
    title: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    quiz: [{
      question: { type: String, required: true },
      options: [{ type: String, required: true }], // Array of 4 options
      correctAnswer: { type: Number, required: true } // Index 0-3
    }]
  }],
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  priceInINR: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  duration: {
    type: String,
    default: null // e.g., "3 months", "6 weeks"
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  image: {
    type: String,
    default: null
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  seats: {
    type: Number,
    default: 100,
    min: 1
  },
  enrolledCount: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null,
    validate: {
      validator: function (value) {
        if (!value || !this.startDate) return true; // Both optional
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  skills: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  certificateTemplate: {
    type: String,
    default: null // Optional custom certificate template HTML
  }
}, {
  timestamps: true
});

// Generate slug from title before saving
internshipSchema.pre('save', async function (next) {
  if (!this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Indexes
internshipSchema.index({ mentorId: 1, status: 1 });
internshipSchema.index({ status: 1, createdAt: -1 });


module.exports = mongoose.model('Internship', internshipSchema);

