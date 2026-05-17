const crypto = require('crypto');
const mongoose = require('mongoose');

// Generate certificate ID
const generateCertId = async () => {
  const year = new Date().getFullYear();
  const count = await mongoose.model('Certificate').countDocuments({
    certId: new RegExp(`^INT-${year}-`)
  });
  const serialNumber = String(count + 1).padStart(4, '0');
  return `INT-${year}-${serialNumber}`;
};

// Generate certificate signature (HMAC)
const generateSignature = (certId, userId, issuedAt) => {
  const data = `${certId}|${userId}|${issuedAt}`;
  return crypto
    .createHmac('sha256', process.env.CERT_SECRET || 'fallback_secret_key_for_dev_only')
    .update(data)
    .digest('hex');
};

// Verify certificate signature
const verifySignature = (certId, userId, issuedAt, signature) => {
  const expectedSignature = generateSignature(certId, userId, issuedAt);
  return expectedSignature === signature;
};

module.exports = {
  generateCertId,
  generateSignature,
  verifySignature
};

