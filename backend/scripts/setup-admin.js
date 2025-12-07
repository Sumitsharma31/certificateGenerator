/**
 * Admin Setup Script
 * 
 * This script helps you set up an admin user in the database.
 * 
 * Usage:
 *   node scripts/setup-admin.js <email>
 * 
 * Example:
 *   node scripts/setup-admin.js admin@example.com
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const connectDB = require('../config/database');

async function setupAdmin(email) {
  try {
    // Connect to MongoDB
    await connectDB();

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      console.log(`❌ User with email "${email}" not found.`);
      console.log('\n💡 Options:');
      console.log('1. First, create the user by logging in with OTP');
      console.log('2. Or use MongoDB directly to create an admin user');
      process.exit(1);
    }

    // Check if already admin
    if (user.role === 'admin') {
      console.log(`✅ User "${email}" is already an admin!`);
      process.exit(0);
    }

    // Update role to admin
    user.role = 'admin';
    await user.save();

    console.log(`\n✅ Successfully set "${email}" as admin!`);
    console.log(`\nUser Details:`);
    console.log(`  - Name: ${user.name}`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Role: ${user.role}`);
    console.log(`  - ID: ${user._id}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up admin:', error);
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.log('❌ Please provide an email address');
  console.log('\nUsage: node scripts/setup-admin.js <email>');
  console.log('Example: node scripts/setup-admin.js admin@example.com');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.log('❌ Invalid email format');
  process.exit(1);
}

setupAdmin(email);

