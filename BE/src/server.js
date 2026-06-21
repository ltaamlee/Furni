const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const productRoutes = require('./routes/productRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const shopRoutes = require('./routes/shopRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const shippingRoutes = require('./routes/shippingRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const loyaltyRoutes = require('./routes/loyaltyRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');

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
  max: 10000, // limit each IP to 100 requests per windowMs
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
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/wishlist', wishlistRoutes);
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

// Seed shipping providers
const seedShippingProviders = async () => {
  try {
    const ShippingProvider = mongoose.model('ShippingProvider');
    const count = await ShippingProvider.countDocuments();
    if (count === 0) {
      const providers = [
        {
          name: 'Giao Hàng Tiết Kiệm',
          code: 'GHTK',
          baseFee: 25000,
          feePerKm: 0,
          freeThreshold: 500000,
          estimatedDays: { min: 2, max: 4 }
        },
        {
          name: 'Giao Hàng Nhanh',
          code: 'GHN',
          baseFee: 30000,
          feePerKm: 0,
          freeThreshold: 500000,
          estimatedDays: { min: 1, max: 3 }
        },
        {
          name: 'Viettel Post',
          code: 'VTPOST',
          baseFee: 20000,
          feePerKm: 0,
          freeThreshold: 500000,
          estimatedDays: { min: 3, max: 7 }
        },
        {
          name: 'VNPost',
          code: 'VNPOST',
          baseFee: 18000,
          feePerKm: 0,
          freeThreshold: 500000,
          estimatedDays: { min: 4, max: 10 }
        }
      ];

      for (const provider of providers) {
        await ShippingProvider.findOneAndUpdate(
          { code: provider.code },
          provider,
          { upsert: true, new: true }
        );
      }
      console.log('Shipping providers seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding shipping providers:', error);
  }
};

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/furni-ecommerce', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
  seedShippingProviders();
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