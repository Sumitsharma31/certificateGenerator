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
const generateCertificatePDF = async (certificate, user, internship, mentor) => {
  const certId = certificate.certId;
  const issuedDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const verificationUrl = `${process.env.FRONTEND_URL}/certificates/verify/${certId}`;
  
  // Generate QR code
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Times New Roman', serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        .certificate {
          background: white;
          width: 900px;
          padding: 60px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          position: relative;
          border: 20px solid #667eea;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
        }
        .header h1 {
          font-size: 48px;
          color: #667eea;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 3px;
        }
        .header p {
          font-size: 18px;
          color: #666;
        }
        .certificate-body {
          text-align: center;
          margin: 40px 0;
        }
        .certificate-body p {
          font-size: 20px;
          line-height: 1.8;
          margin: 15px 0;
        }
        .recipient-name {
          font-size: 36px;
          font-weight: bold;
          color: #333;
          margin: 20px 0;
          text-decoration: underline;
          text-decoration-color: #667eea;
        }
        .internship-title {
          font-size: 28px;
          font-style: italic;
          color: #667eea;
          margin: 20px 0;
        }
        .details {
          margin-top: 50px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .signature {
          text-align: center;
        }
        .signature p {
          margin: 5px 0;
          font-size: 16px;
        }
        .signature-name {
          font-weight: bold;
          margin-top: 30px;
        }
        .verification {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #eee;
        }
        .verification p {
          font-size: 12px;
          color: #666;
        }
        .cert-id {
          font-weight: bold;
          color: #667eea;
        }
        .qr-code {
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="certificate">
        <div class="header">
          <h1>Certificate of Completion</h1>
          <p>This is to certify that</p>
        </div>
        <div class="certificate-body">
          <div class="recipient-name">${user.name}</div>
          <p>has successfully completed the internship program</p>
          <div class="internship-title">${internship.title}</div>
          <p>offered by <strong>${mentor.name}</strong></p>
          <p>on ${issuedDate}</p>
        </div>
        <div class="details">
          <div class="signature">
            <p>Certificate ID: <span class="cert-id">${certId}</span></p>
            <div class="qr-code">
              <img src="${qrCodeDataUrl}" alt="QR Code" style="width: 100px; height: 100px;" />
            </div>
          </div>
          <div class="signature">
            <p>_______________________</p>
            <p class="signature-name">${mentor.name}</p>
            <p>Mentor</p>
          </div>
        </div>
        <div class="verification">
          <p>Verify this certificate at: ${verificationUrl}</p>
          <p>Certificate Signature: ${certificate.signature.substring(0, 16)}...</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Generate PDF using Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
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
  authorize('mentor', 'admin'),
  async (req, res) => {
    try {
      const { enrollmentId } = req.body;

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

      // Check if enrollment is completed
      if (enrollment.status !== 'completed') {
        return res.status(400).json({ error: 'Enrollment is not completed yet' });
      }

      // Check if certificate already exists
      if (enrollment.certificateId) {
        const existingCert = await Certificate.findById(enrollment.certificateId);
        if (existingCert && !existingCert.revoked) {
          return res.status(400).json({ error: 'Certificate already exists' });
        }
      }

      // Authorization check
      if (req.user.role === 'mentor') {
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
        pdfUrl: '' // Will be updated after PDF generation
      });

      // Generate PDF
      const pdfUrl = await generateCertificatePDF(
        certificate,
        enrollment.userId,
        enrollment.internshipId,
        mentor
      );

      // Update certificate with PDF URL
      certificate.pdfUrl = pdfUrl;
      await certificate.save();

      // Update enrollment with certificate ID
      enrollment.certificateId = certificate._id;
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
      res.status(500).json({ error: 'Server error' });
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
      .populate('internshipId.mentorId', 'name');

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    res.json({
      success: true,
      data: {
        certId: certificate.certId,
        userName: certificate.userId.name,
        internshipTitle: certificate.internshipId.title,
        mentorName: certificate.internshipId.mentorId.name,
        issuedAt: certificate.issuedAt,
        revoked: certificate.revoked
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

