const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Address = require('./src/models/Address');

async function reset() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sora');
  await Address.updateMany({}, { $unset: { provinceCode: '', provinceName: '', districtCode: '', districtName: '' } });
  console.log('Cleared address codes');
  process.exit(0);
}

reset();
