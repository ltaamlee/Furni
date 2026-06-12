/* ============================================================
   Seed dữ liệu DUY NHẤT cho dự án Furni (cập nhật theo model mới).
   Tạo: users (admin/vendor/customer) -> categories -> shop -> ví
        -> products (gán shop, ảnh tham khảo từ src/seedProducts.js)
        -> promotions (đủ flash / coupon / combo / freeship).

   Dùng Model.create() (KHÔNG dùng insertMany) để các hook chạy:
     - User: hash mật khẩu
     - Category/Product: tự sinh slug
     - Product: tự đồng bộ status theo tồn kho (quantity = 0 -> out_of_stock)

   Chạy:  cd BE && node tests/seedData.js   (hoặc: npm run seed)
   ============================================================ */
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const User = require('../src/models/User');
const Category = require('../src/models/category');
const Shop = require('../src/models/shop');
const Wallet = require('../src/models/wallet');
const Product = require('../src/models/product');
const Promotion = require('../src/models/promotion');
const Order = require('../src/models/order');
const Cart = require('../src/models/cart');

const now = new Date();
const daysFromNow = (n) => new Date(now.getTime() + n * 86400000);

// ── Tài khoản ────────────────────────────────────────────────
const USERS = [
    { fullName: 'System Admin', email: 'admin@gmail.com', phone: '0912345678', username: 'admin01', password: 'Admin123', role: 'admin', isVerified: true },
    { fullName: 'System Vendor', email: 'vendor@gmail.com', phone: '0987654321', username: 'vendor01', password: 'Vendor123', role: 'vendor', isVerified: true },
    { fullName: 'Nguyễn Văn Khách', email: 'customer@gmail.com', phone: '0909123457', username: 'customer01', password: 'Customer123', role: 'customer', isVerified: true }
];

// ── Danh mục (ảnh tham khảo từ seedProducts.js) ──────────────
const CATEGORIES = [
    { name: 'Sofa', description: 'Bộ sưu tập sofa cao cấp, hiện đại và sang trọng', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400' },
    { name: 'Giường Ngủ', description: 'Giường ngủ gỗ tự nhiên, thiết kế tinh tế và thoải mái', image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400' },
    { name: 'Bàn Ăn', description: 'Bàn ăn gỗ cao cấp cho không gian bếp hoàn hảo', image: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400' },
    { name: 'Tủ Kệ', description: 'Tủ kệ TV, tủ giày, kệ sách thiết kế đa dạng', image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=400' },
    { name: 'Ghế', description: 'Ghế văn phòng, ghế cafe, ghế gỗ phong cách', image: 'https://images.unsplash.com/photo-1503602642458-232111445657?w=400' },
    { name: 'Bàn Làm Việc', description: 'Bàn làm việc gỗ, thiết kế hiện đại và tiện nghi', image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400' },
    { name: 'Kệ Trang Trí', description: 'Kệ trang trí, kệ treo tường thẩm mỹ cao', image: 'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=400' },
    { name: 'Gương', description: 'Gương trang trí, gương phòng ngủ cao cấp', image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=400' }
];

// ── Cửa hàng của vendor ──────────────────────────────────────
const SHOP = {
    name: 'Furni Official Store',
    description: 'Cửa hàng nội thất chính hãng của Furni — gỗ tự nhiên, bảo hành 12 tháng.',
    phone: '0987654321',
    email: 'shop@gmail.com',
    address: '123 Đường Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh',
    logo: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=240',
    banner: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=1200'
};

// ── Sản phẩm (ảnh + thông số tham khảo từ seedProducts.js) ───
// _cat: tên danh mục để map sang ObjectId khi seed.
const PRODUCTS = [
    // SOFA
    { name: 'Sofa Gỗ Sồi 3 Chỗ CLASSIC', _cat: 'Sofa', description: 'Sofa gỗ sồi tự nhiên 3 chỗ ngồi, bọc nỉ cao cấp. Thiết kế cổ điển sang trọng.', dimensions: { width: 200, depth: 85, height: 90 }, brand: 'FurniWood', color: 'Nâu Cổ Điển', material: 'Gỗ Sồi Tự Nhiên', style: 'Tân cổ điển', weight: 45, requiresAssembly: true, deliveryType: 'with_installation', price: 18500000, originalPrice: 21000000, quantity: 15, sold: 28, views: 456, images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600', 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=600'], variants: [{ name: 'Nâu cổ điển', price: 18500000, stock: 10 }, { name: 'Xám tro', price: 18900000, stock: 5 }] },
    { name: 'Sofa Giường Đa Năng MILANO', _cat: 'Sofa', description: 'Sofa giường 2 trong 1, có thể gập thành giường ngủ. Phù hợp căn hộ nhỏ.', dimensions: { width: 180, depth: 90, height: 85 }, brand: 'FurniWood', color: 'Xám', material: 'Gỗ Keo Tự Nhiên', style: 'Hiện đại', weight: 38, price: 12900000, quantity: 20, sold: 42, views: 678, images: ['https://images.unsplash.com/photo-1550254478-ead40cc54513?w=600', 'https://images.unsplash.com/photo-1558211583-d26f610c1eb1?w=600'] },
    { name: 'Sofa Gỗ Teak 2 Chỗ PREMIUM', _cat: 'Sofa', description: 'Sofa 2 chỗ bằng gỗ teak cao cấp, bọc da PU sang trọng.', dimensions: { width: 150, depth: 80, height: 82 }, brand: 'FurniWood', color: 'Đen', material: 'Gỗ Teak', style: 'Tối giản', price: 22500000, quantity: 8, sold: 12, views: 234, status: 'hidden', images: ['https://images.unsplash.com/photo-1550581190-9c1c48d21d6c?w=600'] },

    // GIƯỜNG NGỦ
    { name: 'Giường Ngủ Gỗ Sồi NATURE Size 1m6', _cat: 'Giường Ngủ', description: 'Giường ngủ gỗ sồi tự nhiên size 1m6, đầu giường bọc nỉ êm ái.', dimensions: { width: 166, depth: 205, height: 110 }, brand: 'FurniWood', color: 'Tự Nhiên', material: 'Gỗ Sồi', style: 'Scandinavian', weight: 60, requiresAssembly: true, price: 15800000, quantity: 25, sold: 35, views: 890, images: ['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600'] },
    { name: 'Giường Ngủ Gỗ Óc Chó Size 1m8', _cat: 'Giường Ngủ', description: 'Giường ngủ gỗ óc chó cao cấp size 1m8, đầu giường da PU sang trọng.', dimensions: { width: 186, depth: 215, height: 120 }, brand: 'FurniWood', color: 'Nâu Đậm', material: 'Gỗ Óc Chó', style: 'Hiện đại', weight: 72, requiresAssembly: true, deliveryType: 'with_installation', price: 28500000, quantity: 10, sold: 15, views: 567, images: ['https://images.unsplash.com/photo-1588046130717-0eb0c9a3ba15?w=600'] },
    { name: 'Giường Tầng Gỗ Thông Trẻ Em', _cat: 'Giường Ngủ', description: 'Giường tầng gỗ thông tự nhiên cho bé, thiết kế an toàn với lan can bảo vệ.', dimensions: { width: 100, depth: 190, height: 170 }, brand: 'FurniWood', color: 'Trắng Sữa', material: 'Gỗ Thông', style: 'Hiện đại', price: 12500000, quantity: 18, sold: 22, views: 345, status: 'draft', images: ['https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=600'] },

    // BÀN ĂN
    { name: 'Bàn Ăn Gỗ Sồi 6 Chỗ ELEGANT', _cat: 'Bàn Ăn', description: 'Bàn ăn gỗ sồi tự nhiên 6 chỗ ngồi, mặt bàn ceramic trắng sang trọng.', dimensions: { width: 160, depth: 90, height: 75 }, brand: 'FurniWood', color: 'Trắng + Nâu', material: 'Gỗ Sồi + Ceramic', style: 'Hiện đại', weight: 55, price: 22500000, quantity: 12, sold: 18, views: 432, images: ['https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600', 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600'] },
    { name: 'Bàn Ăn Tròn Gỗ Keo 4 Chỗ', _cat: 'Bàn Ăn', description: 'Bàn ăn tròn gỗ keo tự nhiên 4 chỗ ngồi, thiết kế bo tròn an toàn.', dimensions: { width: 110, depth: 110, height: 75 }, brand: 'FurniWood', color: 'Tự Nhiên', material: 'Gỗ Keo', style: 'Scandinavian', weight: 28, price: 8500000, quantity: 30, sold: 45, views: 567, images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600'] },
    { name: 'Bàn Ăn Gỗ Óc Chó 8 Chỗ LUXURY', _cat: 'Bàn Ăn', description: 'Bàn ăn gỗ óc chó cao cấp 8 chỗ ngồi, mặt bàn đá marble trắng Ý.', dimensions: { width: 220, depth: 100, height: 78 }, brand: 'FurniWood', color: 'Đen + Trắng', material: 'Gỗ Óc Chó + Đá Marble', style: 'Tân cổ điển', weight: 90, deliveryType: 'with_installation', price: 45000000, quantity: 0, sold: 8, views: 234, images: ['https://images.unsplash.com/photo-1503602642458-232111445657?w=600'] },

    // TỦ KỆ
    { name: 'Tủ TV Gỗ Sồi Minimalist', _cat: 'Tủ Kệ', description: 'Tủ TV gỗ sồi thiết kế tối giản, có ngăn đựng đầu máy và khoang kính trưng bày.', dimensions: { width: 180, depth: 45, height: 50 }, brand: 'FurniWood', color: 'Tự Nhiên', material: 'Gỗ Sồi', style: 'Tối giản', weight: 32, price: 9500000, quantity: 35, sold: 52, views: 789, images: ['https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600'] },
    { name: 'Tủ Giày Gỗ 4 Tầng', _cat: 'Tủ Kệ', description: 'Tủ giày gỗ thông 4 tầng, thiết kế thông thoáng giúp giày không bị ẩm mốc.', dimensions: { width: 80, depth: 35, height: 120 }, brand: 'FurniWood', color: 'Tự Nhiên', material: 'Gỗ Thông', style: 'Hiện đại', weight: 20, price: 4500000, quantity: 50, sold: 78, views: 456, images: ['https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=600'] },
    { name: 'Kệ Sách Gỗ Sồi 5 Tầng', _cat: 'Tủ Kệ', description: 'Kệ sách gỗ sồi 5 tầng, có thể treo tường hoặc đứng độc lập. Phong cách Scandinavian.', dimensions: { width: 100, depth: 30, height: 180 }, brand: 'FurniWood', color: 'Tự Nhiên', material: 'Gỗ Sồi', style: 'Scandinavian', weight: 36, requiresAssembly: true, price: 7200000, quantity: 28, sold: 35, views: 567, images: ['https://images.unsplash.com/photo-1594620302200-9a762244a156?w=600'] },

    // GHẾ
    { name: 'Ghế Ăn Gỗ Sồi Nordic', _cat: 'Ghế', description: 'Ghế ăn gỗ sồi thiết kế Nordic hiện đại, lưng ghế cong ergonomic êm ái.', dimensions: { width: 45, depth: 50, height: 85 }, brand: 'FurniWood', color: 'Tự Nhiên', material: 'Gỗ Sồi', style: 'Scandinavian', weight: 6, price: 2800000, quantity: 60, sold: 95, views: 678, images: ['https://images.unsplash.com/photo-1503602642458-232111445657?w=600'], variants: [{ name: 'Lẻ 1 ghế', price: 2800000, stock: 40 }, { name: 'Set 4 ghế', price: 9900000, stock: 20 }] },
    { name: 'Ghế Bar Gỗ Óc Chó Cao Cấp', _cat: 'Ghế', description: 'Ghế bar gỗ óc chó cao cấp, chân sắt sơn tĩnh điện đen. Chiều cao điều chỉnh.', dimensions: { width: 40, depth: 40, height: 95 }, brand: 'FurniWood', color: 'Nâu + Đen', material: 'Gỗ Óc Chó + Sắt', style: 'Industrial', weight: 8, price: 3500000, quantity: 25, sold: 32, views: 345, images: ['https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=600'] },
    { name: 'Ghế Văn Phòng Gỗ Ergonomic', _cat: 'Ghế', description: 'Ghế văn phòng gỗ thiết kế ergonomic, có tựa lưng và đệm ngồi êm ái.', dimensions: { width: 55, depth: 60, height: 100 }, brand: 'FurniWood', color: 'Đen', material: 'Gỗ Công Nghiệp + Nỉ', style: 'Hiện đại', weight: 12, price: 4200000, quantity: 40, sold: 55, views: 432, images: ['https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=600'] },

    // BÀN LÀM VIỆC
    { name: 'Bàn Làm Việc Gỗ Sồi Simple Desk', _cat: 'Bàn Làm Việc', description: 'Bàn làm việc gỗ sồi tối giản, có 2 ngăn kéo tiện dụng. Phong cách Nhật Bản.', dimensions: { width: 120, depth: 60, height: 75 }, brand: 'FurniWood', color: 'Tự Nhiên', material: 'Gỗ Sồi', style: 'Tối giản', weight: 18, price: 6500000, quantity: 30, sold: 42, views: 567, images: ['https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600', 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600'], variants: [{ name: '120cm', size: '120cm', price: 6500000, stock: 18 }, { name: '140cm', size: '140cm', price: 7200000, stock: 12 }] },
    { name: 'Bàn Làm Việc Gỗ Óc Chó Lớn', _cat: 'Bàn Làm Việc', description: 'Bàn làm việc gỗ óc chó cao cấp, rộng rãi với 3 ngăn kéo.', dimensions: { width: 160, depth: 70, height: 76 }, brand: 'FurniWood', color: 'Nâu Đậm', material: 'Gỗ Óc Chó', style: 'Hiện đại', weight: 30, price: 18500000, quantity: 12, sold: 18, views: 345, images: ['https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600'] },
    { name: 'Bàn Góc Chữ L Gỗ Thông', _cat: 'Bàn Làm Việc', description: 'Bàn góc chữ L gỗ thông, tận dụng góc phòng hiệu quả. Có kệ giá sách tích hợp.', dimensions: { width: 140, depth: 140, height: 75 }, brand: 'FurniWood', color: 'Tự Nhiên', material: 'Gỗ Thông', style: 'Industrial', weight: 26, requiresAssembly: true, price: 8900000, quantity: 20, sold: 25, views: 432, images: ['https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600'] },

    // KỆ TRANG TRÍ
    { name: 'Kệ Trang Trí Gỗ Nhỏ Treo Tường', _cat: 'Kệ Trang Trí', description: 'Kệ trang trí gỗ nhỏ gọn treo tường, phong cách tối giản.', dimensions: { width: 60, depth: 15, height: 20 }, brand: 'FurniWood', color: 'Tự Nhiên', material: 'Gỗ Sồi', style: 'Tối giản', weight: 2, price: 850000, quantity: 80, sold: 120, views: 890, images: ['https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=600'] },
    { name: 'Kệ Trang Trí Gỗ 5 Ngăn', _cat: 'Kệ Trang Trí', description: 'Kệ trang trí gỗ 5 ngăn treo tường, thiết kế đa tầng độc đáo.', dimensions: { width: 90, depth: 20, height: 90 }, brand: 'FurniWood', color: 'Trắng', material: 'Gỗ Sồi Sơn Trắng', style: 'Scandinavian', weight: 9, price: 2200000, quantity: 45, sold: 65, views: 567, images: ['https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=600'] },
    { name: 'Kệ Gốm Trang Trí Cao Cấp', _cat: 'Kệ Trang Trí', description: 'Kệ gốm trang trí cao cấp, kết hợp gỗ và gốm. Thiết kế nghệ thuật độc đáo.', dimensions: { width: 40, depth: 40, height: 100 }, brand: 'FurniWood', color: 'Trắng + Nâu', material: 'Gỗ + Gốm', style: 'Tân cổ điển', weight: 14, price: 3500000, quantity: 0, sold: 18, views: 234, images: ['https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=600'] },

    // GƯƠNG
    { name: 'Gương Phòng Ngủ Gỗ Treo Tường', _cat: 'Gương', description: 'Gương phòng ngủ gỗ sồi treo tường hình oval thanh lịch.', dimensions: { width: 50, depth: 5, height: 70 }, brand: 'FurniWood', color: 'Tự Nhiên', material: 'Gỗ Sồi + Kính', style: 'Tối giản', weight: 4, price: 1800000, quantity: 35, sold: 48, views: 456, images: ['https://images.unsplash.com/photo-1618220179428-22790b461013?w=600'] },
    { name: 'Gương Toàn Thân Gỗ Cao Cấp', _cat: 'Gương', description: 'Gương toàn thân gỗ óc chó cao cấp, thiết kế khung gỗ chắc chắn.', dimensions: { width: 60, depth: 8, height: 170 }, brand: 'FurniWood', color: 'Nâu Đậm', material: 'Gỗ Óc Chó + Kính', style: 'Hiện đại', weight: 16, price: 5500000, quantity: 20, sold: 28, views: 345, images: ['https://images.unsplash.com/photo-1618220179428-22790b461013?w=600'] },
    { name: 'Gương Trang Trí Gỗ Tròn', _cat: 'Gương', description: 'Gương trang trí gỗ tròn treo tường, thiết kế tối giản phong cách Nhật.', dimensions: { width: 60, depth: 5, height: 60 }, brand: 'FurniWood', color: 'Tự Nhiên', material: 'Gỗ Sồi + Kính', style: 'Tối giản', weight: 3, price: 1200000, quantity: 50, sold: 72, views: 567, images: ['https://images.unsplash.com/photo-1618220179428-22790b461013?w=600'] }
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/furni-ecommerce');
        console.log('Connected to MongoDB\n');

        // 1) Xoá dữ liệu cũ của các collection liên quan
        await Promise.all([
            User.deleteMany({}),
            Category.deleteMany({}),
            Shop.deleteMany({}),
            Wallet.deleteMany({}),
            Product.deleteMany({}),
            Promotion.deleteMany({}),
            Order.deleteMany({}),
            Cart.deleteMany({})
        ]);
        console.log('Cleared: users, categories, shops, wallets, products, promotions, orders, carts');

        // 2) Users (create -> hash mật khẩu)
        const users = await User.create(USERS);
        const vendor = users.find((u) => u.role === 'vendor');
        console.log(`Created ${users.length} users (admin/vendor/customer)`);

        // 3) Categories (create -> sinh slug)
        const cats = await Category.create(CATEGORIES);
        const catId = {};
        cats.forEach((c) => { catId[c.name] = c._id; });
        console.log(`Created ${cats.length} categories`);

        // 4) Shop của vendor + ví
        const shop = await Shop.create({ ...SHOP, slug: SHOP.name, owner: vendor._id });
        await Wallet.create({
            shop: shop._id,
            owner: vendor._id,
            balance: 45320000,
            pendingBalance: 8640000,
            bankAccounts: [{ bankName: 'Vietcombank', accountNumber: '0123456789', accountHolder: 'NGUYEN VAN VENDOR', branch: 'TP.HCM', isDefault: true }]
        });
        console.log(`Created shop "${shop.name}" + wallet`);

        // 5) Products (create -> sinh slug + đồng bộ status theo tồn kho)
        const productDocs = PRODUCTS.map(({ _cat, ...p }) => {
            const doc = { ...p, category: catId[_cat], shop: shop._id };
            if (doc.variants?.length) {
                doc.quantity = doc.variants.reduce((s, v) => s + (v.stock || 0), 0);
                if (doc.price == null) doc.price = doc.variants[0].price;
            }
            return doc;
        });
        const products = await Product.create(productDocs);
        const byName = {};
        products.forEach((p) => { byName[p.name] = p; });
        const oos = products.filter((p) => p.status === 'out_of_stock').length;
        const hidden = products.filter((p) => p.status === 'hidden').length;
        const draft = products.filter((p) => p.status === 'draft').length;
        console.log(`Created ${products.length} products (hết hàng: ${oos}, ẩn: ${hidden}, nháp: ${draft})`);

        // 6) Promotions — đủ 4 loại + 3 phạm vi áp dụng
        const flashProducts = ['Sofa Gỗ Sồi 3 Chỗ CLASSIC', 'Sofa Giường Đa Năng MILANO'].map((n) => byName[n]?._id).filter(Boolean);
        const comboProducts = ['Bàn Ăn Tròn Gỗ Keo 4 Chỗ', 'Ghế Ăn Gỗ Sồi Nordic'].map((n) => byName[n]?._id).filter(Boolean);

        const PROMOS = [
            { name: 'Flash Sale Cuối Tuần', description: 'Giảm 25% sofa nổi bật trong thời gian giới hạn.', type: 'flash_sale', discountType: 'percent', value: 25, maxDiscount: 2000000, appliesTo: 'product', products: flashProducts, startDate: daysFromNow(-1), endDate: daysFromNow(3), maxUsage: 100, usedCount: 38, status: 'running' },
            { name: 'Mã SUMMER20', description: 'Nhập mã giảm 20% cho đơn từ 3.000.000₫.', type: 'coupon', discountType: 'percent', value: 20, maxDiscount: 1500000, minOrderValue: 3000000, appliesTo: 'all', startDate: daysFromNow(-2), endDate: daysFromNow(7), maxUsage: 500, usedCount: 156, status: 'running' },
            { name: 'Combo Bàn + Ghế Ăn', description: 'Mua bộ bàn ăn tròn + ghế Nordic giảm ngay 500.000₫.', type: 'bundle', discountType: 'fixed', value: 500000, appliesTo: 'product', products: comboProducts, startDate: daysFromNow(-1), endDate: daysFromNow(10), maxUsage: 50, usedCount: 12, status: 'running' },
            { name: 'Freeship Danh Mục Sofa', description: 'Miễn phí vận chuyển cho danh mục Sofa, đơn từ 1.000.000₫.', type: 'freeship', discountType: 'freeship', value: 0, minOrderValue: 1000000, appliesTo: 'category', categories: [catId['Sofa']], startDate: daysFromNow(-2), endDate: daysFromNow(7), maxUsage: 0, usedCount: 0, status: 'running' }
        ];
        const promos = await Promotion.create(PROMOS.map((p) => ({ ...p, shop: shop._id })));
        console.log(`Created ${promos.length} promotions (flash / coupon / combo / freeship)`);

        // 7) Đơn hàng mẫu của khách (gắn shop cho từng dòng - Hướng B)
        const customer = users.find((u) => u.role === 'customer');
        const lineItem = (name, qty) => {
            const p = byName[name];
            return { product: p._id, shop: shop._id, shopName: shop.name, quantity: qty, price: p.price, name: p.name, image: p.images?.[0] || null };
        };
        const buildOrder = (items, status, paymentMethod) => {
            const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
            const shippingFee = subtotal >= 500000 ? 0 : 30000;
            return {
                user: customer._id,
                products: items,
                shippingAddress: { fullName: customer.fullName, phone: customer.phone, address: '123 Lê Lợi, Quận 1, TP. Hồ Chí Minh', city: 'TP. Hồ Chí Minh', note: '' },
                paymentMethod,
                subtotal,
                shippingFee,
                totalPrice: subtotal + shippingFee,
                totalQuantity: items.reduce((s, it) => s + it.quantity, 0),
                status,
                orderedAt: daysFromNow(-1)
            };
        };
        const ORDERS = [
            buildOrder([lineItem('Sofa Gỗ Sồi 3 Chỗ CLASSIC', 1)], 'pending', 'VNPAY'),
            buildOrder([lineItem('Bàn Ăn Tròn Gỗ Keo 4 Chỗ', 1), lineItem('Ghế Ăn Gỗ Sồi Nordic', 2)], 'preparing', 'COD'),
            buildOrder([lineItem('Tủ TV Gỗ Sồi Minimalist', 1)], 'delivered', 'MOMO')
        ];
        // Tạo tuần tự để pre-save sinh orderNumber không trùng
        for (const o of ORDERS) await Order.create(o);
        console.log(`Created ${ORDERS.length} sample orders (pending / preparing / delivered)`);

        console.log('\n==================== DONE ====================');
        console.log('Tài khoản:');
        console.log('  Admin    : admin@gmail.com    / Admin123');
        console.log('  Vendor   : vendor@gmail.com   / Vendor123');
        console.log('  Customer : customer@gmail.com / Customer123');
        console.log('=============================================');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        await mongoose.disconnect().catch(() => {});
        process.exit(1);
    }
};

seed();
