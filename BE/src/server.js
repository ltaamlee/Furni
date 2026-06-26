const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const productRoutes = require('./routes/productRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const shopRoutes = require('./routes/shopRoutes');
const blogRoutes = require('./routes/blogRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const shippingRoutes = require('./routes/shippingRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const platformRoutes = require('./routes/platformRoutes');
const walletRoutes = require('./routes/walletRoutes');
const locationRoutes = require('./routes/locationRoutes');
const voucherRoutes = require('./routes/voucherRoutes');
const shippingRateRoutes = require('./routes/shippingRateRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');

// Seed shipping rates
const seedShippingRates = async () => {
  try {
    const ShippingRate = mongoose.model('ShippingRate');
    const count = await ShippingRate.countDocuments();
    if (count === 0) {
      const { REGION, SERVICE_TYPE, PROVIDER_CODE } = require('./models/shippingRate');

      const defaultRates = [
        { provider: PROVIDER_CODE.JT, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.SOUTH, baseFee: 17000, feePer500g: 3000, estimatedDays: { min: 2, max: 3 } },
        { provider: PROVIDER_CODE.JT, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.SOUTH, baseFee: 22000, feePer500g: 4000, estimatedDays: { min: 1, max: 2 } },
        { provider: PROVIDER_CODE.JT, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.CENTRAL, baseFee: 22000, feePer500g: 4000, estimatedDays: { min: 3, max: 4 } },
        { provider: PROVIDER_CODE.JT, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.CENTRAL, baseFee: 28000, feePer500g: 5000, estimatedDays: { min: 2, max: 3 } },
        { provider: PROVIDER_CODE.JT, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.NORTH, baseFee: 25000, feePer500g: 5000, estimatedDays: { min: 3, max: 5 } },
        { provider: PROVIDER_CODE.JT, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.NORTH, baseFee: 32000, feePer500g: 6000, estimatedDays: { min: 2, max: 4 } },
        { provider: PROVIDER_CODE.GHTK, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.SOUTH, baseFee: 16500, feePer500g: 2500, estimatedDays: { min: 2, max: 3 } },
        { provider: PROVIDER_CODE.GHTK, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.SOUTH, baseFee: 21000, feePer500g: 3500, estimatedDays: { min: 1, max: 2 } },
        { provider: PROVIDER_CODE.GHTK, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.CENTRAL, baseFee: 21500, feePer500g: 3500, estimatedDays: { min: 3, max: 4 } },
        { provider: PROVIDER_CODE.GHTK, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.CENTRAL, baseFee: 27500, feePer500g: 4500, estimatedDays: { min: 2, max: 3 } },
        { provider: PROVIDER_CODE.GHTK, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.NORTH, baseFee: 24000, feePer500g: 4500, estimatedDays: { min: 3, max: 5 } },
        { provider: PROVIDER_CODE.GHTK, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.NORTH, baseFee: 31000, feePer500g: 5500, estimatedDays: { min: 2, max: 4 } },
        { provider: PROVIDER_CODE.VIETTEL, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.SOUTH, baseFee: 18000, feePer500g: 3000, estimatedDays: { min: 2, max: 4 } },
        { provider: PROVIDER_CODE.VIETTEL, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.SOUTH, baseFee: 24000, feePer500g: 4500, estimatedDays: { min: 1, max: 3 } },
        { provider: PROVIDER_CODE.VIETTEL, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.CENTRAL, baseFee: 23000, feePer500g: 4500, estimatedDays: { min: 3, max: 5 } },
        { provider: PROVIDER_CODE.VIETTEL, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.CENTRAL, baseFee: 30000, feePer500g: 5500, estimatedDays: { min: 2, max: 4 } },
        { provider: PROVIDER_CODE.VIETTEL, serviceType: SERVICE_TYPE.ECONOMY, region: REGION.NORTH, baseFee: 26000, feePer500g: 5000, estimatedDays: { min: 3, max: 6 } },
        { provider: PROVIDER_CODE.VIETTEL, serviceType: SERVICE_TYPE.EXPRESS, region: REGION.NORTH, baseFee: 34000, feePer500g: 6500, estimatedDays: { min: 2, max: 5 } },
      ];

      for (const rate of defaultRates) {
        await ShippingRate.create(rate);
      }
      console.log('Shipping rates seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding shipping rates:', error);
  }
};

const app = express();

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Data sanitization
app.use(mongoSanitize());
app.use(xss());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // limit each IP to 10000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/admin/platform', platformRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/shipping-rates', shippingRateRoutes);
// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});


// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/furni-ecommerce', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('Connected to MongoDB');
  seedShippingRates();

  // === Cron: Auto-cancel PayOS orders that haven't been paid within 30 minutes ===
  cron.schedule('* * * * *', async () => {
    try {
      const Order = mongoose.model('Order');
      const Product = mongoose.model('Product');

      const expiredOrders = await Order.find({
        paymentMethod: 'PAYOS',
        paymentStatus: 'pending',
        status: 'pending',
        paymentExpiresAt: { $lt: new Date() },
      });

      for (const order of expiredOrders) {
        order.paymentStatus = 'failed';
        order.status = 'cancelled';
        order.cancelledAt = new Date();
        order.statusHistory.push({
          status: 'cancelled',
          timestamp: new Date(),
          note: 'Đơn hàng hết hạn thanh toán PayOS (30 phút)',
        });
        await order.save();

        // Hoàn tồn kho
        for (const item of order.products) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { quantity: item.quantity },
          });
        }

        console.log(`Auto-cancelled expired PayOS order: ${order.orderNumber}`);
      }
    } catch (err) {
      console.error('Cron auto-cancel error:', err);
    }
  });
  console.log('PayOS auto-cancel cron job started (runs every minute)');
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

const PORT = process.env.PORT || 8386;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

module.exports = app;