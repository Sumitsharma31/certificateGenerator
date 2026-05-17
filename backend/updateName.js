// Run this script manually with: node updateName.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const updateName = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'csumitsharma31@gmail.com';
        const newName = 'Sumit Sharma'; // Update this to the desired name

        const user = await User.findOneAndUpdate(
            { email },
            { name: newName },
            { new: true }
        );

        if (user) {
            console.log(`✅ Successfully updated name for ${email} to "${user.name}"`);
        } else {
            console.log(`❌ User with email ${email} not found`);
            console.log('Listing all users:');
            const users = await User.find({}, 'email name');
            users.forEach(u => console.log(`- ${u.email} (${u.name})`));
        }

        process.exit(0);
    } catch (error) {
        console.error('Error updating name:', error);
        process.exit(1);
    }
};

updateName();
