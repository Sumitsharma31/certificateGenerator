const express = require('express');
const User = require('../models/User');
const Internship = require('../models/Internship');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');
const Payment = require('../models/Payment');
const PaymentWebhookLog = require('../models/PaymentWebhookLog');
const { protect, authorize } = require('../middleware/auth');
const { generateCertId, generateSignature } = require('../utils/certificate');
const { sendCertificateEmail } = require('../utils/email');
const path = require('path');
const fs = require('fs').promises;
const puppeteer = require('puppeteer');
const QRCode = require('qrcode');

const router = express.Router();

// All routes require admin role
router.use(protect);
router.use(authorize('admin'));

// ============================================================
// DASHBOARD & REPORTS
// ============================================================

// @route   GET /api/admin/dashboard
// @desc    Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalEnrollments = await Enrollment.countDocuments();
    
    // Revenue calculation
    const revenueEnrollments = await Enrollment.find({ 'payment.status': 'captured' });
    const totalRevenue = revenueEnrollments.reduce((sum, e) => sum + (e.payment?.amount || 0), 0);

    const certificatesIssued = await Certificate.countDocuments({ revoked: false });

    // Recent Payments
    const recentPaymentsData = await Enrollment.find({ 'payment.status': 'captured' })
      .populate('userId', 'name email')
      .populate('internshipId', 'title')
      .sort('-payment.capturedAt')
      .limit(10)
      .lean();

    const recentPayments = recentPaymentsData.map(p => ({
      id: p._id,
      user: p.userId ? { name: p.userId.name || 'Unknown', email: p.userId.email || '' } : null,
      internship: p.internshipId ? { title: p.internshipId.title || 'Unknown' } : null,
      amount: p.payment?.amount || 0,
      capturedAt: p.payment?.capturedAt || null
    }));

    // Recent Users
    const recentUsers = await User.find()
      .select('-otp')
      .sort('-createdAt')
      .limit(10)
      .lean();

    res.json({
      success: true,
      data: {
        totalStudents,
        totalEnrollments,
        totalRevenue,
        certificatesIssued,
        recentPayments,
        recentUsers
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ success: false, error: 'Server error', message: error.message });
  }
});

// @route   GET /api/admin/reports/payments
router.get('/reports/payments', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { 'payment.status': 'captured' };

    if (startDate || endDate) {
      query['payment.capturedAt'] = {};
      if (startDate) query['payment.capturedAt'].$gte = new Date(startDate);
      if (endDate) query['payment.capturedAt'].$lte = new Date(endDate);
    }

    const enrollments = await Enrollment.find(query)
      .populate('userId', 'name email')
      .populate('internshipId', 'title')
      .sort('-payment.capturedAt');

    const totalRevenue = enrollments.reduce((sum, e) => sum + (e.payment.amount || 0), 0);

    res.json({
      success: true,
      summary: { totalRevenue, totalCount: enrollments.length, currency: 'INR' },
      data: enrollments
    });
  } catch (error) {
    console.error('Error fetching payment reports:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// USER MANAGEMENT
// ============================================================

router.get('/users', async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const query = {};
    if (role) query.role = role;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const users = await User.find(query)
      .select('-otp')
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      count: users.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['student', 'mentor', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-otp');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// INTERNSHIP MANAGEMENT (UPDATED WITH IMAGE FIX)
// ============================================================

// @route   POST /api/admin/internships
// @desc    Create internship
router.post('/internships', async (req, res) => {
  try {
    // 1. Explicitly extract fields to ensure 'image' is captured
    const { 
        title, description, priceInINR, duration, level, 
        image, // <--- Key fix: Explicitly getting image
        seats, startDate, endDate, skills, status, modules, 
        isPublished, mentorId 
    } = req.body;

    const internshipData = {
      title,
      description,
      priceInINR,
      duration,
      level,
      image, // <--- Passing it to the object
      seats: seats || 100,
      skills,
      status: status || 'draft',
      isPublished: isPublished || false,
      mentorId: mentorId || req.user._id,
      modules: []
    };

    // Date Logic
    if (startDate) internshipData.startDate = new Date(startDate);
    if (endDate) internshipData.endDate = new Date(endDate);

    // Auto-calculate End Date
    if (startDate && duration && !endDate) {
      const start = new Date(startDate);
      const durationLower = duration.toLowerCase().trim();
      let daysToAdd = 0;
      
      if (durationLower.includes('month')) {
        daysToAdd = (parseInt(durationLower.match(/\d+/)?.[0] || '0')) * 30;
      } else if (durationLower.includes('week')) {
        daysToAdd = (parseInt(durationLower.match(/\d+/)?.[0] || '0')) * 7;
      } else if (durationLower.includes('day')) {
        daysToAdd = parseInt(durationLower.match(/\d+/)?.[0] || '0');
      } else {
        const num = parseInt(durationLower.match(/\d+/)?.[0] || '0');
        if (num > 0) daysToAdd = num;
      }
      
      if (daysToAdd > 0) {
        const calcEndDate = new Date(start);
        calcEndDate.setDate(calcEndDate.getDate() + daysToAdd);
        internshipData.endDate = calcEndDate;
      }
    }

    // Module Logic
    if (modules && Array.isArray(modules)) {
      internshipData.modules = modules.filter(
        module => module.title && module.title.trim() && module.content && module.content.trim()
      );
    }

    const internship = await Internship.create(internshipData);
    await internship.populate('mentorId', 'name email avatarUrl');

    res.status(201).json({ success: true, data: internship });
  } catch (error) {
    console.error('Error creating internship:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: 'Validation error', details: errors });
    }
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Duplicate field value. Title may already exist.' });
    }
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// @route   GET /api/admin/internships
// @desc    Get all internships
router.get('/internships', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, isPublished } = req.query;
    const query = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) query.status = status;
    if (isPublished !== undefined) query.isPublished = isPublished === 'true';

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const internships = await Internship.find(query)
      .populate('mentorId', 'name email')
      .sort('-createdAt')
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

// @route   GET /api/admin/internships/:id
// @desc    Get single internship
router.get('/internships/:id', async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id)
      .populate('mentorId', 'name email avatarUrl');

    if (!internship) return res.status(404).json({ error: 'Internship not found' });

    res.json({ success: true, data: internship });
  } catch (error) {
    console.error('Error fetching internship:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PATCH /api/admin/internships/:id
// @desc    Update internship
router.patch('/internships/:id', async (req, res) => {
  try {
    const existingInternship = await Internship.findById(req.params.id);
    if (!existingInternship) return res.status(404).json({ error: 'Internship not found' });

    const { 
        title, description, priceInINR, duration, level, 
        image, // <--- Key fix
        seats, startDate, endDate, skills, status, modules, 
        isPublished, mentorId 
    } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (priceInINR !== undefined) updateData.priceInINR = priceInINR;
    if (duration) updateData.duration = duration;
    if (level) updateData.level = level;
    if (image !== undefined) updateData.image = image; // <--- Update Image
    if (seats) updateData.seats = seats;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (skills) updateData.skills = skills;
    if (status) updateData.status = status;
    if (isPublished !== undefined) updateData.isPublished = isPublished;
    if (mentorId) updateData.mentorId = mentorId;

    // Date Logic for Update
    if ((startDate || duration) && !endDate && !updateData.endDate) {
       // Optional: Add recalculation logic here if desired, 
       // but typically updates trust the explicit inputs.
    }

    // Slug Update
    if (title && title !== existingInternship.title) {
      updateData.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    // Module Update
    if (modules && Array.isArray(modules)) {
      updateData.modules = modules.filter(
        module => module.title && module.title.trim() && module.content && module.content.trim()
      );
    }

    const internship = await Internship.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('mentorId', 'name email avatarUrl');

    res.json({ success: true, data: internship });
  } catch (error) {
    console.error('Error updating internship:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: 'Validation error', details: errors });
    }
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Duplicate field value.' });
    }
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// @route   DELETE /api/admin/internships/:id
router.delete('/internships/:id', async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id);
    if (!internship) return res.status(404).json({ error: 'Internship not found' });
    await internship.deleteOne();
    res.json({ success: true, message: 'Internship deleted successfully' });
  } catch (error) {
    console.error('Error deleting internship:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// STUDENT MANAGEMENT
// ============================================================

router.get('/students', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, isBanned } = req.query;
    const query = { role: 'student' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (isBanned !== undefined) query.isBanned = isBanned === 'true';

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const students = await User.find(query)
      .select('-otp')
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum);

    const total = await User.countDocuments(query);

    const studentsWithEnrollments = await Promise.all(
      students.map(async (student) => {
        const enrollmentCount = await Enrollment.countDocuments({ userId: student._id });
        return { ...student.toObject(), enrollmentCount };
      })
    );

    res.json({
      success: true,
      count: students.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: studentsWithEnrollments
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/students/:id', async (req, res) => {
  try {
    const student = await User.findById(req.params.id).select('-otp');
    if (!student || student.role !== 'student') return res.status(404).json({ error: 'Student not found' });

    const enrollments = await Enrollment.find({ userId: student._id })
      .populate('internshipId', 'title description priceInINR')
      .sort('-createdAt');

    res.json({ success: true, data: { student, enrollments } });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/students/:id', async (req, res) => {
  try {
    const { name, email } = req.body;
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') return res.status(404).json({ error: 'Student not found' });

    if (name) student.name = name;
    if (email) student.email = email;
    await student.save();

    res.json({ success: true, data: student });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/students/:id/ban', async (req, res) => {
  try {
    const { isBanned, reason } = req.body;
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') return res.status(404).json({ error: 'Student not found' });

    student.isBanned = isBanned === true || isBanned === 'true';
    if (student.isBanned) {
      student.bannedAt = new Date();
      student.bannedReason = reason || 'Banned by administrator';
    } else {
      student.bannedAt = null;
      student.bannedReason = null;
    }
    await student.save();

    res.json({ 
        success: true, 
        message: student.isBanned ? 'Student banned' : 'Student unbanned', 
        data: student 
    });
  } catch (error) {
    console.error('Error banning student:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// ENROLLMENT & PAYMENT & CERTIFICATE ROUTES
// ============================================================

router.get('/enrollments', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, internshipId, userId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (internshipId) query.internshipId = internshipId;
    if (userId) query.userId = userId;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const enrollments = await Enrollment.find(query)
      .populate('userId', 'name email')
      .populate('internshipId', 'title description')
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum);

    const total = await Enrollment.countDocuments(query);

    res.json({
      success: true,
      count: enrollments.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: enrollments
    });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/enrollments/manual', async (req, res) => {
  try {
    const { userId, internshipId, status = 'active', progressPercentage = 0 } = req.body;
    if (!userId || !internshipId) return res.status(400).json({ error: 'Required fields missing' });

    const existing = await Enrollment.findOne({ userId, internshipId });
    if (existing) return res.status(400).json({ error: 'Already enrolled' });

    const internship = await Internship.findById(internshipId);
    if (!internship) return res.status(404).json({ error: 'Internship not found' });

    const enrollment = await Enrollment.create({
      userId, internshipId, status, joinedAt: new Date(),
      payment: {
        amount: internship.priceInINR,
        currency: 'INR',
        status: 'captured',
        paymentMethod: 'offline',
        capturedAt: new Date()
      },
      progress: { percentage: progressPercentage }
    });
    
    await enrollment.populate('userId', 'name email');
    await enrollment.populate('internshipId', 'title description');

    res.status(201).json({ success: true, data: enrollment });
  } catch (error) {
    console.error('Manual enrollment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/enrollments/:id', async (req, res) => {
  try {
    const { status, progressPercentage, completedAt } = req.body;
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

    if (status) {
      enrollment.status = status;
      if (status === 'completed' && !enrollment.completedAt) {
        enrollment.completedAt = completedAt ? new Date(completedAt) : new Date();
      }
    }
    if (progressPercentage !== undefined) {
      enrollment.progress.percentage = Math.min(100, Math.max(0, parseInt(progressPercentage)));
    }
    await enrollment.save();
    res.json({ success: true, data: enrollment });
  } catch (error) {
    console.error('Error updating enrollment:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/enrollments/:id', async (req, res) => {
    try {
        const enrollment = await Enrollment.findById(req.params.id);
        if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
        await enrollment.deleteOne();
        res.json({ success: true, message: 'Enrollment removed' });
    } catch (error) {
        console.error('Error deleting enrollment:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/payments', async (req, res) => {
    try {
      const { page = 1, limit = 20, status, paymentMethod } = req.query;
      const query = {};
      if (status) query.status = status;
      if (paymentMethod) query.paymentMethod = paymentMethod;
  
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;
  
      const payments = await Payment.find(query)
        .populate('userId', 'name email')
        .populate('internshipId', 'title')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum);
  
      const total = await Payment.countDocuments(query);
  
      res.json({
        success: true,
        count: payments.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        data: payments
      });
    } catch (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({ error: 'Server error' });
    }
});

router.post('/payments/offline', async (req, res) => {
    try {
      const { userId, internshipId, enrollmentId, amount, paymentMethod = 'offline', transactionId, notes } = req.body;
      if (!userId || !internshipId || !amount) return res.status(400).json({ error: 'Missing fields' });
  
      const orderId = `OFFLINE_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  
      const payment = await Payment.create({
        orderId, userId, internshipId, enrollmentId, amount, status: 'success',
        paymentMethod, transactionId, notes, processedBy: req.user._id
      });
  
      if (enrollmentId) {
        const enrollment = await Enrollment.findById(enrollmentId);
        if (enrollment) {
          enrollment.payment.status = 'captured';
          enrollment.payment.capturedAt = new Date();
          enrollment.status = 'active';
          enrollment.joinedAt = new Date();
          await enrollment.save();
        }
      }
      res.status(201).json({ success: true, data: payment });
    } catch (error) {
      console.error('Error creating offline payment:', error);
      res.status(500).json({ error: 'Server error' });
    }
});

// Certificate Generation Logic (Helper)
const generateCertificatePDF = async (certificate, user, internship, mentor) => {
    const certId = certificate.certId;
    const issuedDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/certificates/verify/${certId}`;
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl);
  
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; background: #fff; padding: 40px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
          .certificate { width: 900px; padding: 60px; border: 20px solid #667eea; text-align: center; }
          h1 { color: #667eea; font-size: 48px; margin-bottom: 20px; }
          .recipient { font-size: 36px; font-weight: bold; margin: 20px 0; text-decoration: underline; }
          .title { font-size: 28px; font-style: italic; color: #667eea; margin: 20px 0; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="certificate">
          <h1>Certificate of Completion</h1>
          <p>This is to certify that</p>
          <div class="recipient">${user.name}</div>
          <p>has successfully completed the internship program</p>
          <div class="title">${internship.title}</div>
          <p>on ${issuedDate}</p>
          <div class="footer">
             <div><img src="${qrCodeDataUrl}" width="100"/><br/><small>${certId}</small></div>
             <div><p>_________________</p><p>${mentor.name}</p><p>Mentor</p></div>
          </div>
        </div>
      </body>
      </html>
    `;
  
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
  
    const uploadsDir = path.join(__dirname, '../uploads/certificates');
    await fs.mkdir(uploadsDir, { recursive: true });
    const fileName = `cert_${certId}.pdf`;
    await fs.writeFile(path.join(uploadsDir, fileName), pdfBuffer);
    
    return `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/certificates/${fileName}`;
  };

router.post('/certificates/generate', async (req, res) => {
    try {
      const { enrollmentId } = req.body;
      if (!enrollmentId) return res.status(400).json({ error: 'enrollmentId is required' });
  
      const enrollment = await Enrollment.findById(enrollmentId).populate('internshipId').populate('userId');
      if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
  
      if (enrollment.certificateId) {
        const existingCert = await Certificate.findById(enrollment.certificateId);
        if (existingCert && !existingCert.revoked) return res.status(400).json({ error: 'Certificate already exists' });
      }
  
      const mentor = await User.findById(enrollment.internshipId.mentorId) || { name: 'Admin' };
      const certId = await generateCertId();
      const signature = generateSignature(certId, enrollment.userId._id.toString(), new Date().toISOString());
  
      const certificate = await Certificate.create({
        certId, userId: enrollment.userId._id, internshipId: enrollment.internshipId._id,
        enrollmentId: enrollment._id, signature, pdfUrl: ''
      });
  
      const pdfUrl = await generateCertificatePDF(certificate, enrollment.userId, enrollment.internshipId, mentor);
      certificate.pdfUrl = pdfUrl;
      await certificate.save();
  
      enrollment.certificateId = certificate._id;
      if (enrollment.status !== 'completed') {
        enrollment.status = 'completed';
        enrollment.completedAt = new Date();
      }
      await enrollment.save();
  
      await sendCertificateEmail(enrollment.userId.email, enrollment.userId.name, pdfUrl, certId);
      res.status(201).json({ success: true, message: 'Certificate generated', data: certificate });
    } catch (error) {
      console.error('Error generating certificate:', error);
      res.status(500).json({ error: 'Server error' });
    }
});

router.post('/certificates/revoke/:certId', async (req, res) => {
    try {
      const { reason } = req.body;
      const certificate = await Certificate.findOne({ certId: req.params.certId });
      if (!certificate) return res.status(404).json({ error: 'Certificate not found' });
      if (certificate.revoked) return res.status(400).json({ error: 'Already revoked' });
  
      certificate.revoked = true;
      certificate.revokedAt = new Date();
      certificate.revokedBy = req.user._id;
      certificate.revokedReason = reason || 'Revoked by admin';
      await certificate.save();
      res.json({ success: true, message: 'Certificate revoked' });
    } catch (error) {
      console.error('Error revoking certificate:', error);
      res.status(500).json({ error: 'Server error' });
    }
});

router.post('/certificates/resend', async (req, res) => {
    try {
      const { certificateId } = req.body;
      if (!certificateId) return res.status(400).json({ error: 'ID required' });
      const certificate = await Certificate.findById(certificateId).populate('userId', 'name email');
      if (!certificate || certificate.revoked) return res.status(400).json({ error: 'Invalid certificate' });
  
      await sendCertificateEmail(certificate.userId.email, certificate.userId.name, certificate.pdfUrl, certificate.certId);
      res.json({ success: true, message: 'Email resent' });
    } catch (error) {
      console.error('Error resending email:', error);
      res.status(500).json({ error: 'Server error' });
    }
});

router.get('/webhooks', async (req, res) => {
    try {
      const { verified, processed, limit = 50 } = req.query;
      const query = {};
      if (verified !== undefined) query.verified = verified === 'true';
      if (processed !== undefined) query.processed = processed === 'true';
      const logs = await PaymentWebhookLog.find(query).sort('-receivedAt').limit(parseInt(limit));
      res.json({ success: true, count: logs.length, data: logs });
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;