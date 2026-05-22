const mongoose = require('mongoose');
require('dotenv').config({
  path: '../.env'
});

const User = require('../src/models/User');

mongoose.connect(
  process.env.MONGODB_URI || 'mongodb://localhost:27017/sora'
);

const seedAdmin = async () => {
  try {
    const existingAdmin = await User.findOne({
      email: 'admin@gmail.com'
    });

    if (existingAdmin) {
      console.log('Admin already exists');
      process.exit();
    }

    await User.create({
      fullName: 'System Admin',
      email: 'admin@gmail.com',
      phone: '0912345678',
      address: 'Ho Chi Minh City',
      username: 'admin01',
      password: 'Admin123',
      role: 'admin',
      isVerified: true
    });

    console.log('Admin created successfully');

    process.exit();

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedAdmin();