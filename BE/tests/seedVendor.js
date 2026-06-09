const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env')
});

const User = require('../src/models/User');
const Shop = require('../src/models/shop');

const VENDOR = {
  fullName: 'System Vendor',
  email: 'vendor@gmail.com',
  phone: '0987654321',
  username: 'vendor01',
  password: 'Vendor123',
  role: 'vendor',
  isVerified: true
};

const SHOP = {
  name: 'Furni Official Store',
  description: 'Cửa hàng nội thất chính hãng của Furni.',
  phone: '0987654321',
  email: 'shop@gmail.com',
  address: '123 Đường Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh'
};

const seedVendor = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/furni-ecommerce'
    );

    // 1. Find or create the single vendor account.
    //    Use save() (not insertMany/updateOne) so the pre-save hook hashes the password.
    let vendor = await User.findOne({ email: VENDOR.email });

    if (vendor) {
      console.log('Vendor already exists:', vendor.email);
    } else {
      vendor = await User.create(VENDOR);
      console.log('Vendor created successfully');
      console.log('   Email:    ', VENDOR.email);
      console.log('   Password: ', VENDOR.password);
    }

    // 2. Find or create the shop owned by that vendor.
    let shop = await Shop.findOne({ owner: vendor._id });

    if (shop) {
      console.log('Shop already exists:', shop.name);
    } else {
      shop = await Shop.create({
        ...SHOP,
        slug: SHOP.name, // schema setter slugifies this value
        owner: vendor._id
      });
      console.log('Shop created successfully');
      console.log('   Name:  ', shop.name);
      console.log('   Slug:  ', shop.slug);
      console.log('   Owner: ', vendor.email);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
};

seedVendor();
