const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const Address = require('./src/models/Address');

async function fixAddresses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sora');
    console.log('Connected to MongoDB');

    // Check current state
    const addrs = await Address.find();
    console.log('Current addresses:');
    addrs.forEach(a => {
      console.log(`- ${a._id}: ${a.street}`);
      console.log(`  provinceCode: ${a.provinceCode}, districtCode: ${a.districtCode}`);
    });

    // If provinceCode is null, try to parse from formattedAddress or set default
    // For address with "Thủ Đức" - it's TPHCM
    const result = await Address.updateMany(
      { 
        $or: [
          { provinceCode: null },
          { provinceCode: { $exists: false } }
        ]
      },
      { 
        $set: { 
          provinceCode: '79',
          provinceName: 'Thành phố Hồ Chí Minh',
          districtCode: '1542',
          districtName: 'Thành phố Thủ Đức'
        }
      }
    );
    
    console.log(`\nUpdated ${result.modifiedCount} addresses`);
    
    // Verify
    const updated = await Address.find();
    console.log('\nUpdated addresses:');
    updated.forEach(a => {
      console.log(`- ${a.street}`);
      console.log(`  provinceCode: ${a.provinceCode} (${a.provinceName})`);
      console.log(`  districtCode: ${a.districtCode} (${a.districtName})`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixAddresses();
