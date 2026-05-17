const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const Certificate = require('../models/Certificate');
const Enrollment = require('../models/Enrollment');
const Internship = require('../models/Internship');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { generateCertId, generateSignature } = require('../utils/certificate');
const puppeteer = require('puppeteer');
const QRCode = require('qrcode');
const { sendCertificateEmail } = require('../utils/email');

const router = express.Router();

// Helper function to generate certificate PDF
const generateCertificatePDF = async (certificate, user, internship, mentor, enrollment) => {
  const certId = certificate.certId;
  /* DATE OF ISSUE */
  const issuedDate = new Date(certificate.issuedAt).toLocaleDateString(); // Default matches frontend's default

  const verificationUrl = `${process.env.FRONTEND_URL}/certificates/verify/${certId}`;

  // Generate QR code
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl);

  // Load template image from backend's own assets (included in Docker image)
  const templatePath = path.join(__dirname, '../assets/certificates/internship-template.png');
  let templateBase64 = '';
  try {
    const templateBuffer = await fs.readFile(templatePath);
    templateBase64 = `data:image/png;base64,${templateBuffer.toString('base64')}`;
  } catch (err) {
    console.error('Error loading certificate template:', err);
    // Fallback or error handling? For now, we proceed (image won't load)
  }

  // Calculate dates if available
  let dateRangeText = '';
  if (enrollment && enrollment.startDate && enrollment.endDate) {
    const start = new Date(enrollment.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const end = new Date(enrollment.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    dateRangeText = `from <strong>${start}</strong> to <strong>${end}</strong>`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        /* ... styles identical to previous step ... */
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Glacial+Indifference&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          margin: 0;
          padding: 0;
          width: 1123px;
          height: 794px;
          font-family: 'Glacial Indifference', sans-serif;
        }
        .certificate-container {
          position: relative;
          width: 1123px;
          height: 794px;
          background: white;
          overflow: hidden;
        }
        .template-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
        }
        .content-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 2;
        }
        
        /* STUDENT NAME */
        .student-name {
          position: absolute;
          top: 290px;
          left: 0;
          width: 100%;
          font-size: 68px;
          font-family: 'Cormorant Garamond', serif;
          font-weight: 600;
          color: #d6b25e;
          text-align: center;
        }

        /* COURSE DETAILS */
        .course-details {
          position: absolute;
          top: 434px;
          left: 117px;
          width: 856px;
          font-size: 20px;
          font-family: 'Glacial Indifference', sans-serif;
          color: #1e3a5f;
          text-align: center;
          line-height: 1.5;
        }

        /* CERTIFICATE ID */
        .cert-id {
          position: absolute;
          bottom: 70px;
          left: 470px;
          width: auto;
          font-size: 12px;
          font-family: 'Glacial Indifference', sans-serif;
          color: #1e3a5f;
          text-align: center;
        }

        /* VERIFICATION LINK */
        .verification-link {
          display: none; 
        }

        /* QR CODE */
        .qr-code {
          position: absolute;
          bottom: 110px;
          left: 520px;
          background: white;
          padding: 4px;
          border-radius: 4px;
        }

        /* DATE OF ISSUE */
        .issue-date {
          position: absolute;
          bottom: 80px;
          right: 165px;
          font-size: 12px;
          font-family: 'Glacial Indifference', sans-serif;
          color: #1e3a5f;
          text-align: center;
        }

        strong {
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="certificate-container">
        <!-- Template Background -->
        <img src="${templateBase64}" class="template-bg" alt="Template" />

        <div class="content-layer">
          <!-- Name -->
          <div class="student-name">${certificate.studentName || user.name}</div>

          <!-- Description -->
          <div class="course-details">
            In Recognition of The Successful Completion of The Internship,
            In 
            <strong>${internship.title.toUpperCase()}</strong>,Utilizing SkillsBuild resources and the IBM Cloud Platform,  ${dateRangeText}.
            <br />
            This Program was Conducted by <strong>Certify-Now</strong> In
            Collaboration With The <strong>AICTE</strong>.
          </div>

          <!-- QR Code -->
          <div class="qr-code">
            <img src="${qrCodeDataUrl}" width="80" height="80" />
          </div>

          <!-- Certificate ID -->
          <div class="cert-id">
            Certificate-ID : ${certId}
          </div>

          <!-- Verification Link -->
          <div class="verification-link">
            Verification-link : ${verificationUrl}
          </div>

          <!-- Issue Date -->
          <div class="issue-date">
            ${issuedDate}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  // Generate PDF using Puppeteer
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const page = await browser.newPage();

  // Set viewport to match certificate dimensions
  await page.setViewport({ width: 1123, height: 794 });

  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    width: '1123px',
    height: '794px',
    printBackground: true,
    pageRanges: '1'
  });

  await browser.close();

  // Save PDF to filesystem (or upload to cloud storage)
  const uploadsDir = path.join(__dirname, '../uploads/certificates');
  await fs.mkdir(uploadsDir, { recursive: true });

  const fileName = `cert_${certId}.pdf`;
  const filePath = path.join(uploadsDir, fileName);
  await fs.writeFile(filePath, pdfBuffer);

  const pdfUrl = `${process.env.BACKEND_URL}/uploads/certificates/${fileName}`;

  return pdfUrl;
};

// @route   POST /api/certificates/generate
// @desc    Generate certificate for enrollment
// @access  Private (Mentor/Admin)
router.post('/generate',
  protect,
  authorize('mentor', 'admin', 'student'),
  async (req, res) => {
    try {
      const { enrollmentId, studentName } = req.body;

      if (!enrollmentId) {
        return res.status(400).json({ error: 'Enrollment ID is required' });
      }

      // Find enrollment
      const enrollment = await Enrollment.findById(enrollmentId)
        .populate('internshipId')
        .populate('userId');

      if (!enrollment) {
        return res.status(404).json({ error: 'Enrollment not found' });
      }

      // Check if enrollment is completed or active (paid)
      if (enrollment.status !== 'completed' && enrollment.status !== 'active') {
        return res.status(400).json({ error: 'Enrollment is not eligible for certificate' });
      }

      // Check if certificate already exists
      if (enrollment.certificateId) {
        const existingCert = await Certificate.findById(enrollment.certificateId);
        if (existingCert && !existingCert.revoked) {
          return res.status(400).json({ error: 'Certificate already exists' });
        }
      }

      // Authorization check
      if (req.user.role === 'student') {
        // Check if enrollment belongs to student
        if (enrollment.userId._id.toString() !== req.user._id.toString()) {
          return res.status(403).json({ error: 'Not authorized to generate certificate for this enrollment' });
        }
      } else if (req.user.role === 'mentor') {
        if (enrollment.internshipId.mentorId.toString() !== req.user._id.toString()) {
          return res.status(403).json({ error: 'Not authorized' });
        }
      }

      // Get mentor
      const mentor = await User.findById(enrollment.internshipId.mentorId);

      // Generate certificate ID and signature
      const certId = await generateCertId();
      const signature = generateSignature(
        certId,
        enrollment.userId._id.toString(),
        new Date().toISOString()
      );

      // Create certificate record
      const certificate = await Certificate.create({
        certId,
        userId: enrollment.userId._id,
        internshipId: enrollment.internshipId._id,
        enrollmentId: enrollment._id,
        signature,
        studentName: studentName || enrollment.userId.name, // Use provided name or fallback
        pdfUrl: 'PENDING_GENERATION' // Placeholder to satisfy validation
      });

      // Generate PDF
      const pdfUrl = await generateCertificatePDF(
        certificate,
        enrollment.userId,
        enrollment.internshipId,
        mentor,
        enrollment
      );

      // Update certificate with PDF URL
      certificate.pdfUrl = pdfUrl;
      await certificate.save();

      // Update enrollment with certificate ID
      enrollment.certificateId = certificate._id;

      // Ensure status is completed
      if (enrollment.status === 'active') {
        enrollment.status = 'completed';
        enrollment.progress = { ...enrollment.progress, percentage: 100 };
      }

      await enrollment.save();

      // Send email notification
      await sendCertificateEmail(
        enrollment.userId.email,
        enrollment.userId.name,
        pdfUrl,
        certId
      );

      res.status(201).json({
        success: true,
        message: 'Certificate generated successfully',
        certificate
      });
    } catch (error) {
      console.error('Error generating certificate:', error);
      try {
        require('fs').appendFileSync('backend_error.log', new Date().toISOString() + ' - ' + error.stack + '\n\n');
      } catch (e) { console.error('Could not write to error log', e); }
      res.status(500).json({ error: 'Server error: ' + error.message });
    }
  }
);

// @route   GET /api/certificates/:certId
// @desc    Get certificate details (public)
// @access  Public
router.get('/:certId', async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ certId: req.params.certId })
      .populate('userId', 'name email')
      .populate('internshipId', 'title description mentorId')
      .populate({
        path: 'internshipId',
        populate: { path: 'mentorId', select: 'name' }
      })
      .populate('enrollmentId', 'startDate endDate');

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    let startDate = null;
    let endDate = null;

    if (certificate.enrollmentId) {
      startDate = certificate.enrollmentId.startDate;
      endDate = certificate.enrollmentId.endDate;
    }

    res.json({
      success: true,
      data: {
        certId: certificate.certId,
        userName: certificate.studentName || certificate.userId.name, // Use stored studentName
        internshipTitle: certificate.internshipId.title,
        mentorName: certificate.internshipId.mentorId.name,
        issuedAt: certificate.issuedAt,
        revoked: certificate.revoked,
        startDate: startDate ? new Date(startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null,
        endDate: endDate ? new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null
      }
    });
  } catch (error) {
    console.error('Error fetching certificate:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/certificates/verify
// @desc    Verify certificate by query parameter (public)
// @access  Public
router.get('/verify', async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        valid: false,
        status: 'INVALID',
        message: 'Certificate ID is required'
      });
    }

    const certificate = await Certificate.findOne({ certId: id })
      .populate('userId', 'name email')
      .populate('internshipId', 'title description mentorId')
      .populate('internshipId.mentorId', 'name');

    if (!certificate) {
      return res.json({
        valid: false,
        status: 'NOT_FOUND',
        message: 'Certificate not found'
      });
    }

    if (certificate.revoked) {
      return res.json({
        valid: false,
        status: 'REVOKED',
        message: 'This certificate has been revoked',
        certificate: {
          certId: certificate.certId,
          userName: certificate.userId.name,
          internshipTitle: certificate.internshipId.title,
          issuedAt: certificate.issuedAt,
          revokedAt: certificate.revokedAt,
          revokedReason: certificate.revokedReason
        }
      });
    }

    // Verify signature
    const { verifySignature } = require('../utils/certificate');
    const isValid = verifySignature(
      certificate.certId,
      certificate.userId._id.toString(),
      certificate.issuedAt.toISOString(),
      certificate.signature
    );

    if (!isValid) {
      return res.json({
        valid: false,
        status: 'INVALID',
        message: 'Certificate signature is invalid - certificate may be tampered'
      });
    }

    res.json({
      valid: true,
      status: 'VALID',
      message: 'This certificate is valid and verified',
      certificate: {
        certId: certificate.certId,
        userName: certificate.userId.name,
        internshipTitle: certificate.internshipId.title,
        mentorName: certificate.internshipId.mentorId.name,
        issuedAt: certificate.issuedAt
      }
    });
  } catch (error) {
    console.error('Error verifying certificate:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/certificates/verify/:certId
// @desc    Verify certificate (public)
// @access  Public
router.get('/verify/:certId', async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ certId: req.params.certId })
      .populate('userId', 'name email')
      .populate('internshipId', 'title description mentorId')
      .populate('internshipId.mentorId', 'name');

    if (!certificate) {
      return res.json({
        valid: false,
        status: 'NOT_FOUND',
        message: 'Certificate not found'
      });
    }

    if (certificate.revoked) {
      return res.json({
        valid: false,
        status: 'REVOKED',
        message: 'This certificate has been revoked',
        certificate: {
          certId: certificate.certId,
          userName: certificate.userId.name,
          internshipTitle: certificate.internshipId.title,
          issuedAt: certificate.issuedAt,
          revokedAt: certificate.revokedAt,
          revokedReason: certificate.revokedReason
        }
      });
    }

    // Verify signature
    const { verifySignature } = require('../utils/certificate');
    const isValid = verifySignature(
      certificate.certId,
      certificate.userId._id.toString(),
      certificate.issuedAt.toISOString(),
      certificate.signature
    );

    if (!isValid) {
      return res.json({
        valid: false,
        status: 'INVALID',
        message: 'Certificate signature is invalid - certificate may be tampered'
      });
    }

    res.json({
      valid: true,
      status: 'VALID',
      message: 'This certificate is valid and verified',
      certificate: {
        certId: certificate.certId,
        userName: certificate.userId.name,
        internshipTitle: certificate.internshipId.title,
        mentorName: certificate.internshipId.mentorId.name,
        issuedAt: certificate.issuedAt
      }
    });
  } catch (error) {
    console.error('Error verifying certificate:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/certificates/download/:certId
// @desc    Download certificate PDF (public)
// @access  Public
router.get('/download/:certId', async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ certId: req.params.certId });

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    if (certificate.revoked) {
      return res.status(403).json({ error: 'Certificate has been revoked' });
    }

    // Serve PDF file
    const filePath = path.join(__dirname, '../uploads/certificates', `cert_${certificate.certId}.pdf`);

    try {
      await fs.access(filePath);
      res.sendFile(filePath);
    } catch (error) {
      res.status(404).json({ error: 'Certificate PDF not found' });
    }
  } catch (error) {
    console.error('Error downloading certificate:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

