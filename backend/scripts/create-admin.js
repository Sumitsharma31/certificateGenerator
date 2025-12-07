/**
 * Create Admin User Script
 * 
 * This script creates a new admin user directly in the database.
 * Useful when you don't have any users yet or want to create an admin without OTP.
 * 
 * Usage:
 *   node scripts/create-admin.js <email> <name>
 * 
 * Example:
 *   node scripts/create-admin.js admin@example.com "Admin User"
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const connectDB = require('../config/database');

async function createAdmin(email, name) {
  try {
    // Connect to MongoDB
    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });

    if (existingUser) {
      if (existingUser.role === 'admin') {
        console.log(`✅ User "${email}" already exists and is an admin!`);
        console.log(`\nUser Details:`);
        console.log(`  - Name: ${existingUser.name}`);
        console.log(`  - Email: ${existingUser.email}`);
        console.log(`  - Role: ${existingUser.role}`);
        console.log(`  - ID: ${existingUser._id}`);
        process.exit(0);
      } else {
        // Update existing user to admin
        existingUser.role = 'admin';
        existingUser.isEmailVerified = true;
        await existingUser.save();
        
        console.log(`✅ Updated existing user "${email}" to admin!`);
        console.log(`\nUser Details:`);
        console.log(`  - Name: ${existingUser.name}`);
        console.log(`  - Email: ${existingUser.email}`);
        console.log(`  - Role: ${existingUser.role}`);
        console.log(`  - ID: ${existingUser._id}`);
        process.exit(0);
      }
    }

    // Create new admin user
    const adminUser = await User.create({
      email: email.toLowerCase().trim(),
      name: name || email.split('@')[0],
      role: 'admin',
      isEmailVerified: true
    });

    console.log(`\n✅ Successfully created admin user!`);
    console.log(`\nUser Details:`);
    console.log(`  - Name: ${adminUser.name}`);
    console.log(`  - Email: ${adminUser.email}`);
    console.log(`  - Role: ${adminUser.role}`);
    console.log(`  - ID: ${adminUser._id}`);
    console.log(`\n💡 Note: You can now login with this email using OTP.`);
    console.log(`   The user is already verified, so you can request OTP and login normally.`);

    process.exit(0);
  } catch (error) {
    if (error.code === 11000) {
      console.error('❌ Error: A user with this email already exists.');
    } else {
      console.error('❌ Error creating admin user:', error.message);
    }
    process.exit(1);
  }
}

// Get email and name from command line arguments
const email = process.argv[2];
const name = process.argv[3];

if (!email) {
  console.log('❌ Please provide an email address');
  console.log('\nUsage: node scripts/create-admin.js <email> [name]');
  console.log('Example: node scripts/create-admin.js admin@example.com "Admin User"');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.log('❌ Invalid email format');
  process.exit(1);
}

createAdmin(email, name);

