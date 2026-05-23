const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const slugify = require('slugify');
require('dotenv').config();

const Category = require('./models/category');
const Product = require('./models/product');
const User = require('./models/User');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/furni-ecommerce');
        console.log('MongoDB Connected...');
    } catch (error) {
        console.error('MongoDB Connection Error:', error.message);
        process.exit(1);
    }
};

// Helper function to create slug
const createSlug = (name) => slugify(name, { lower: true, strict: true, locale: 'vi' });

// Categories Data
const categories = [
    {
        name: 'Sofa',
        slug: createSlug('Sofa'),
        description: 'Bộ sưu tập sofa cao cấp, hiện đại và sang trọng',
        image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400'
    },
    {
        name: 'Giường Ngủ',
        slug: createSlug('Giường Ngủ'),
        description: 'Giường ngủ gỗ tự nhiên, thiết kế tinh tế và thoải mái',
        image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400'
    },
    {
        name: 'Bàn Ăn',
        slug: createSlug('Bàn Ăn'),
        description: 'Bàn ăn gỗ cao cấp cho không gian bếp hoàn hảo',
        image: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400'
    },
    {
        name: 'Tủ Kệ',
        slug: createSlug('Tủ Kệ'),
        description: 'Tủ kệ TV, tủ giày, kệ sách thiết kế đa dạng',
        image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=400'
    },
    {
        name: 'Ghế',
        slug: createSlug('Ghế'),
        description: 'Ghế văn phòng, ghế cafe, ghế gỗ phong cách',
        image: 'https://images.unsplash.com/photo-1503602642458-232111445657?w=400'
    },
    {
        name: 'Bàn Làm Việc',
        slug: createSlug('Bàn Làm Việc'),
        description: 'Bàn làm việc gỗ, thiết kế hiện đại và tiện nghi',
        image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400'
    },
    {
        name: 'Kệ Trang Trí',
        slug: createSlug('Kệ Trang Trí'),
        description: 'Kệ trang trí, kệ treo tường thẩm mỹ cao',
        image: 'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=400'
    },
    {
        name: 'Gương',
        slug: createSlug('Gương'),
        description: 'Gương trang trí, gương phòng ngủ cao cấp',
        image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=400'
    }
];

// Products Data (will be matched with category IDs after creation)
const products = [
    // SOFA
    {
        name: 'Sofa Gỗ Sồi 3 Chỗ CLASSIC',
        description: 'Sofa gỗ sồi tự nhiên 3 chỗ ngồi, bọc nỉ cao cấp. Thiết kế cổ điển sang trọng, phù hợp phòng khách hiện đại.',
        dimensions: { width: 200, depth: 85, height: 90 },
        brand: 'FurniWood',
        color: 'Nâu Cổ Điển',
        material: 'Gỗ Sồi Tự Nhiên',
        price: 18500000,
        quantity: 15,
        sold: 28,
        views: 456,
        isStock: true,
        isActive: true,
        images: [
            'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600',
            'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=600'
        ]
    },
    {
        name: 'Sofa Giường Đa Năng MILANO',
        description: 'Sofa giường 2 trong 1, có thể gập thành giường ngủ. Phù hợp cho căn hộ nhỏ, phòng khách nhỏ.',
        dimensions: { width: 180, depth: 90, height: 85 },
        brand: 'FurniWood',
        color: 'Xám',
        material: 'Gỗ Keo Tự Nhiên',
        price: 12900000,
        quantity: 20,
        sold: 42,
        views: 678,
        isStock: true,
        isActive: true,
        images: [
            'https://images.unsplash.com/photo-1550254478-ead40cc54513?w=600',
            'https://images.unsplash.com/photo-1558211583-d26f610c1eb1?w=600'
        ]
    },
    {
        name: 'Sofa Gỗ Teak 2 Chỗ PREMIUM',
        description: 'Sofa 2 chỗ bằng gỗ teak cao cấp, bọc da Pu sang trọng. Chân gỗ teak tự nhiên chắc chắn.',
        dimensions: { width: 150, depth: 80, height: 82 },
        brand: 'FurniWood',
        color: 'Đen',
        material: 'Gỗ Teak',
        price: 22500000,
        quantity: 8,
        sold: 12,
        views: 234,
        isStock: true,
        isActive: true,
        images: [
            'https://images.unsplash.com/photo-1550581190-9c1c48d21d6c?w=600'
        ]
    },

    // GIƯỜNG NGỦ
    {
        name: 'Giường Ngủ Gỗ Sồi NATURE Size 1m6',
        description: 'Giường ngủ gỗ sồi tự nhiên size 1m6, đầu giường bọc nỉ êm ái. Thiết kế tối giản phong cách Nhật Bản.',
        dimensions: { width: 166, depth: 205, height: 110 },
        brand: 'FurniWood',
        color: 'Tự Nhiên',
        material: 'Gỗ Sồi',
        price: 15800000,
        quantity: 25,
        sold: 35,
        views: 890,
        isStock: true,
        isActive: true,
        images: [
            'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600',
            'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600'
        ]
    },
    {
        name: 'Giường Ngủ Gỗ Óc Chó Size 1m8',
        description: 'Giường ngủ gỗ óc chó cao cấp size 1m8, đầu giường da PU sang trọng. Phong cách châu Âu hiện đại.',
        dimensions: { width: 186, depth: 215, height: 120 },
        brand: 'FurniWood',
        color: 'Nâu Đậm',
        material: 'Gỗ Óc Chó',
        price: 28500000,
        quantity: 10,
        sold: 15,
        views: 567,
        isStock: true,
        isActive: true,
        images: [
            'https://images.unsplash.com/photo-1588046130717-0eb0c9a3ba15?w=600'
        ]
    },
    {
        name: 'Giường Tầng Gỗ Thông Trẻ Em',
        description: 'Giường tầng gỗ thông tự nhiên cho bé, thiết kế an toàn với lan can bảo vệ. Màu sắc tươi sáng.',
        dimensions: { width: 100, depth: 190, height: 170 },
        brand: 'FurniWood',
        color: 'Trắng Sữa',
        material: 'Gỗ Thông',
        price: 12500000,
        quantity: 18,
        sold: 22,
        views: 345,
        isStock: true,
        isActive: true,
        images: [
            'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=600'
        ]
    },

    // BÀN ĂN
    {
        name: 'Bàn Ăn Gỗ Sồi 6 Chỗ ELEGANT',
        description: 'Bàn ăn gỗ sồi tự nhiên 6 chỗ ngồi, mặt bàn ceramic trắng sang trọng. Phù hợp phòng ăn hiện đại.',
        dimensions: { width: 160, depth: 90, height: 75 },
        brand: 'FurniWood',
        color: 'Trắng + Nâu',
        material: 'Gỗ Sồi + Ceramic',
        price: 22500000,
        quantity: 12,
        sold: 18,
        views: 432,
        isStock: true,
        isActive: true,
        images: [
            'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600',
            'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600'
        ]
    },
    {
        name: 'Bàn Ăn Tròn Gỗ Keo 4 Chỗ',
        description: 'Bàn ăn tròn gỗ keo tự nhiên 4 chỗ ngồi, thiết kế bo tròn an toàn. Phù hợp không gian nhỏ.',
        dimensions: { width: 110, depth: 110, height: 75 },
        brand: 'FurniWood',
        color: 'Tự Nhiên',
        material: 'Gỗ Keo',
        price: 8500000,
        quantity: 30,
        sold: 45,
        views: 567,
        isStock: true,
        isActive: true,
        images: [
            'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600'
        ]
    },
    {
        name: 'Bàn Ăn Gỗ Óc Chó 8 Chỗ LUXURY',
        description: 'Bàn ăn gỗ óc chó cao cấp 8 chỗ ngồi, mặt bàn đá marble trắng Ý. Biểu tượng của sự sang trọng.',
        dimensions: { width: 220, depth: 100, height: 78 },
        brand: 'FurniWood',
        color: 'Đen + Trắng',
        material: 'Gỗ Óc Chó + Đá Marble',
        price: 45000000,
        quantity: 5,
        sold: 8,
        views: 234,
        isStock: true,
        isActive: true,
        images: [
            'https://images.unsplash.com/photo-1503602642458-232111445657?w=600'
        ]
    },

    // TỦ KỆ
    {
        name: 'Tủ TV Gỗ Sồi Minimalist',
        description: 'Tủ TV gỗ sồi thiết kế tối giản, có ngăn đựng đầu máy và khoang kính trưng bày. Phong cách Nhật Bản.',
        dimensions: { width: 180, depth: 45, height: 50 },
        brand: 'FurniWood',
        color: 'Tự Nhiên',
        material: 'Gỗ Sồi',
        price: 9500000,
        quantity: 35,
        sold: 52,
        views: 789,
        isStock: true,
        isActive: true,
        images: [
            'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600',
            'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600'
        ]
    },
    {
        name: 'Tủ Giày Gỗ 4 Tầng',
        description: 'Tủ giày gỗ thông 4 tầng, thiết kế thông thoáng giúp giày không bị ẩm mốc. Có ngăn để khóa giày.',
        dimensions: { width: 80, depth: 35, height: 120 },
        brand: 'FurniWood',
        color: 'Tự Nhiên',
        material: 'Gỗ Thông',
        price: 4500000,
        quantity: 50,
        sold: 78,
        views: 456,
        isStock: true,
        isActive: true,
        images: [
            'https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=600'
        ]
    },
    {
        name: 'Kệ Sách Gỗ Sồi 5 Tầng',
        description: 'Kệ sách gỗ sồi 5 tầng, có thể treo tường hoặc đứng độc lập. Phong cách Scandinavian tối giản.',
        dimensions: { width: 100, depth: 30, height: 180 },
        brand: 'FurniWood',
        color: 'Tự Nhiên',
        material: 'Gỗ Sồi',
        price: 7200000,
        quantity: 28,
        sold: 35,
        views: 567,
        isStock: true,
        isActive: true,
        images: [
            'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=600'
        ]
    },

    // GHẾ
    {
        name: 'Ghế Ăn Gỗ Sồi Nordic',
        description: 'Ghế ăn gỗ sồi thiết kế Nordic hiện đại, lưng ghế cong ergonomic êm ái. Set 4 ghế.',
        dimensions: { width: 45, depth: 50, height: 85 },
        brand: 'FurniWood',
        color: 'Tự Nhiên',
        material: 'Gỗ Sồi',
        price: 2800000,
        quantity: 60,
        sold: 95,
        views: 678,
        isStock: true,
        isActive: true,
        images: [
            'https://images.unsplash.com/photo-1503602642458-232111445657?w=600'
        ],
        variant: 'Set 4 ghế'
    },
    {
        name: 'Ghế Bar Gỗ Óc Chó Cao Cấp',
        description: 'Ghế bar gỗ óc chó cao cấp, chân sắt sơn tĩnh điện đen. Chiều cao có thể điều chỉnh.',
        dimensions: { width: 40, depth: 40, height: 95 },
        brand: 'FurniWood',
        color: 'Nâu + Đen',
        material: 'Gỗ Óc Chó + Sắt',
        price: 3500000,
        quantity: 25,
        sold: 32,
        views: 345,
        isStock: true,
        isActive: true,
        images: [
            'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=600'
        ]
    },
    {
        name: 'Ghế Văn Phòng Gỗ Ergonomic',
        description: 'Ghế văn phòng gỗ thiết kế ergonomic, có tựa lưng và đệm ngồi êm ái. Phù hợp làm việc lâu.',
        dimensions: { width: 55, depth: 60, height: 100 },
        brand: 'FurniWood',
        color: 'Đen',
        material: 'Gỗ Công Nghiệp + Nỉ',
        price: 4200000,
        quantity: 40,
        sold: 55,
        views: 432,
        isStock: true,
        isActive: true,
        images: [
            'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=600'
        ]
    },

    // BÀN LÀM VIỆC
    {
        name: 'Bàn Làm Việc Gỗ Sồi Simple Desk',
        description: 'Bàn làm việc gỗ sồi tối giản, có 2 ngăn kéo tiện dụng. Phong cách Nhật Bản tinh tế.',
        dimensions: { width: 120, depth: 60, height: 75 },
        brand: 'FurniWood',
        color: 'Tự Nhiên',
        material: 'Gỗ Sồi',
        price: 6500000,
        quantity: 30,
        sold: 42,
        views: 567,
        isStock: true,
        isActive: true,
        images: [
            'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600',
            'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600'
        ]
    },
    {
        name: 'Bàn Làm Việc Gỗ Óc Chó Lớn',
        description: 'Bàn làm việc gỗ óc chó cao cấp, rộng rãi với 3 ngăn kéo. Phù hợp phòng làm việc chuyên nghiệp.',
        dimensions: { width: 160, depth: 70, height: 76 },
        brand: 'FurniWood',
        color: 'Nâu Đậm',
        material: 'Gỗ Óc Chó',
        price: 18500000,
        quantity: 12,
        sold: 18,
        views: 345,
        isStock: true,
        isActive: true,
        images: [
            'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600'
        ]
    },
    {
        name: 'Bàn Góc Chữ L Gỗ Thông',
        description: 'Bàn góc chữ L gỗ thông, tận dụng góc phòng hiệu quả. Có kệ giá sách tích hợp.',
        dimensions: { width: 140, depth: 140, height: 75 },
        brand: 'FurniWood',
        color: 'Tự Nhiên',
        material: 'Gỗ Thông',
        price: 8900000,
        quantity: 20,
        sold: 25,
        views: 432,
        isStock: true,
        isActive: true,
        images: [
            'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600'
        ]
    },

    // KỆ TRANG TRÍ
    {
        name: 'Kệ Trang Trí Gỗ Nhỏ Treo Tường',
        description: 'Kệ trang trí gỗ nhỏ gọn treo tường, phong cách tối giản. Thích hợp trưng bày cây cảnh, ảnh.',
        dimensions: { width: 60, depth: 15, height: 20 },
        brand: 'FurniWood',
        color: 'Tự Nhiên',
        material: 'Gỗ Sồi',
        price: 850000,
        quantity: 80,
        sold: 120,
        views: 890,
        isStock: true,
        isActive: true,
        images: [
            'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=600'
        ]
    },
    {
        name: 'Kệ Trang Trí Gỗ 5 Ngăn',
        description: 'Kệ trang trí gỗ 5 ngăn treo tường, thiết kế đa tầng độc đáo. Có nhiều kích thước.',
        dimensions: { width: 90, depth: 20, height: 90 },
        brand: 'FurniWood',
        color: 'Trắng',
        material: 'Gỗ Sồi Sơn Trắng',
        price: 2200000,
        quantity: 45,
        sold: 65,
        views: 567,
        isStock: true,
        isActive: true,
        images: [
            'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=600'
        ]
    },
    {
        name: 'Kệ Gốm Trang Trí Cao Cấp',
        description: 'Kệ gốm trang trí cao cấp, kết hợp gỗ và gốm. Thiết kế nghệ thuật độc đáo.',
        dimensions: { width: 40, depth: 40, height: 100 },
        brand: 'FurniWood',
        color: 'Trắng + Nâu',
        material: 'Gỗ + Gốm',
        price: 3500000,
        quantity: 15,
        sold: 18,
        views: 234,
        isStock: true,
        isActive: true,
        images: [
            'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=600'
        ]
    },

    // GƯƠNG
    {
        name: 'Gương Phòng Ngủ Gỗ Treo Tường',
        description: 'Gương phòng ngủ gỗ sồi treo tường hình oval thanh lịch. Viền gỗ tự nhiên ép cong.',
        dimensions: { width: 50, depth: 5, height: 70 },
        brand: 'FurniWood',
        color: 'Tự Nhiên',
        material: 'Gỗ Sồi + Kính',
        price: 1800000,
        quantity: 35,
        sold: 48,
        views: 456,
        isStock: true,
        isActive: true,
        images: [
            'https://images.unsplash.com/photo-1618220179428-22790b461013?w=600'
        ]
    },
    {
        name: 'Gương Toàn Thân Gỗ Cao Cấp',
        description: 'Gương toàn thân gỗ óc chó cao cấp, thiết kế khung gỗ chắc chắn. Phù hợp phòng ngủ, phòng thay đồ.',
        dimensions: { width: 60, depth: 8, height: 170 },
        brand: 'FurniWood',
        color: 'Nâu Đậm',
        material: 'Gỗ Óc Chó + Kính',
        price: 5500000,
        quantity: 20,
        sold: 28,
        views: 345,
        isStock: true,
        isActive: true,
        images: [
            'https://images.unsplash.com/photo-1618220179428-22790b461013?w=600'
        ]
    },
    {
        name: 'Gương Trang Trí Gỗ Tròn',
        description: 'Gương trang trí gỗ tròn treo tường, thiết kế tối giản phong cách Nhật. Đường kính 60cm.',
        dimensions: { width: 60, depth: 5, height: 60 },
        brand: 'FurniWood',
        color: 'Tự Nhiên',
        material: 'Gỗ Sồi + Kính',
        price: 1200000,
        quantity: 50,
        sold: 72,
        views: 567,
        isStock: true,
        isActive: true,
        images: [
            'https://images.unsplash.com/photo-1618220179428-22790b461013?w=600'
        ]
    }
];

// Users Data
const users = [
    {
        fullName: 'Nguyễn Văn Test',
        email: 'test@furniwood.com',
        phone: '0909123457',
        username: 'testuser',
        password: 'Test1234',
        role: 'customer',
        isVerified: true
    }
];

const seedDatabase = async () => {
    try {
        // Connect to DB
        await connectDB();
        console.log('\n🔄 Bắt đầu seed database...\n');

        // Clear existing data
        console.log('🗑️  Xóa dữ liệu cũ...');
        await Category.deleteMany({});
        await Product.deleteMany({});
        await User.deleteMany({});
        console.log('   ✅ Đã xóa dữ liệu cũ');

        // Create Categories
        console.log('\n📁 Đang tạo Categories...');
        const createdCategories = await Category.insertMany(categories);
        console.log(`   ✅ Đã tạo ${createdCategories.length} categories`);

        // Map category names to IDs
        const categoryMap = {};
        createdCategories.forEach(cat => {
            categoryMap[cat.name] = cat._id;
        });
        console.log('   📋 Category Map:', Object.keys(categoryMap));

        // Assign category IDs to products
        const productCategoryMap = {
            'Sofa Gỗ Sồi 3 Chỗ CLASSIC': 'Sofa',
            'Sofa Giường Đa Năng MILANO': 'Sofa',
            'Sofa Gỗ Teak 2 Chỗ PREMIUM': 'Sofa',
            'Giường Ngủ Gỗ Sồi NATURE Size 1m6': 'Giường Ngủ',
            'Giường Ngủ Gỗ Óc Chó Size 1m8': 'Giường Ngủ',
            'Giường Tầng Gỗ Thông Trẻ Em': 'Giường Ngủ',
            'Bàn Ăn Gỗ Sồi 6 Chỗ ELEGANT': 'Bàn Ăn',
            'Bàn Ăn Tròn Gỗ Keo 4 Chỗ': 'Bàn Ăn',
            'Bàn Ăn Gỗ Óc Chó 8 Chỗ LUXURY': 'Bàn Ăn',
            'Tủ TV Gỗ Sồi Minimalist': 'Tủ Kệ',
            'Tủ Giày Gỗ 4 Tầng': 'Tủ Kệ',
            'Kệ Sách Gỗ Sồi 5 Tầng': 'Tủ Kệ',
            'Ghế Ăn Gỗ Sồi Nordic': 'Ghế',
            'Ghế Bar Gỗ Óc Chó Cao Cấp': 'Ghế',
            'Ghế Văn Phòng Gỗ Ergonomic': 'Ghế',
            'Bàn Làm Việc Gỗ Sồi Simple Desk': 'Bàn Làm Việc',
            'Bàn Làm Việc Gỗ Óc Chó Lớn': 'Bàn Làm Việc',
            'Bàn Góc Chữ L Gỗ Thông': 'Bàn Làm Việc',
            'Kệ Trang Trí Gỗ Nhỏ Treo Tường': 'Kệ Trang Trí',
            'Kệ Trang Trí Gỗ 5 Ngăn': 'Kệ Trang Trí',
            'Kệ Gốm Trang Trí Cao Cấp': 'Kệ Trang Trí',
            'Gương Phòng Ngủ Gỗ Treo Tường': 'Gương',
            'Gương Toàn Thân Gỗ Cao Cấp': 'Gương',
            'Gương Trang Trí Gỗ Tròn': 'Gương'
        };

        const productsWithCategories = products.map(product => ({
            ...product,
            category: categoryMap[productCategoryMap[product.name]]
        }));

        // Create Products
        console.log('\n📦 Đang tạo Products...');
        const createdProducts = await Product.insertMany(productsWithCategories);
        console.log(`   ✅ Đã tạo ${createdProducts.length} products`);

        // Create Users (password will be hashed by pre-save middleware)
        console.log('\n👤 Đang tạo Users...');
        const createdUsers = await User.insertMany(users);
        console.log(`   ✅ Đã tạo ${createdUsers.length} users`);

        console.log('\n' + '='.repeat(50));
        console.log('🎉 SEED DATABASE THÀNH CÔNG!');
        console.log('='.repeat(50));
        console.log('\n📊 Thống kê:');
        console.log(`   - Categories: ${createdCategories.length}`);
        console.log(`   - Products: ${createdProducts.length}`);
        console.log(`   - Users: ${createdUsers.length}`);
        console.log('\n🔑 Tài khoản test:');
        console.log('   User: test@furniwood.com / Test1234');
        console.log('\n✨ Hoàn tất! Đóng kết nối MongoDB...');

        await mongoose.connection.close();
        console.log('👋 Tạm biệt!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Lỗi seed database:', error.message);
        await mongoose.connection.close();
        process.exit(1);
    }
};

// Run seed
seedDatabase();
