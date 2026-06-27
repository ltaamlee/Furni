/* ============================================================
   Seed dữ liệu DUY NHẤT cho dự án Furni (cập nhật theo model mới).
   Tạo: users (admin/2 vendor/customer) -> categories -> 2 shop -> ví
        -> products -> promotions -> orders -> transactions -> reviews
        -> cart -> notifications -> blogs.

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
const Transaction = require('../src/models/transaction');
const Review = require('../src/models/review');
const Notification = require('../src/models/notification');
const Blog = require('../src/models/blog');

const now = new Date();
const daysFromNow = (n) => new Date(now.getTime() + n * 86400000);

// ── Tài khoản ────────────────────────────────────────────────
const USERS = [
    { fullName: 'System Admin', email: 'admin@gmail.com', phone: '0912345678', username: 'admin01', password: 'Admin123', role: 'admin', isVerified: true },
    { fullName: 'System Vendor', email: 'vendor@gmail.com', phone: '0987654321', username: 'vendor01', password: 'Vendor123', role: 'vendor', isVerified: true },
    { fullName: 'Trần Minh Decor', email: 'vendor2@gmail.com', phone: '0978123456', username: 'vendor02', password: 'Vendor123', role: 'vendor', isVerified: true },
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

const SECOND_SHOP = {
    name: 'Mộc An Living',
    description: 'Nội thất tối giản cho căn hộ hiện đại, ưu tiên vật liệu bền vững và thiết kế linh hoạt.',
    phone: '0978123456',
    email: 'mocanliving@gmail.com',
    address: '86 Nguyễn Thị Minh Khai, Quận 3, TP. Hồ Chí Minh',
    logo: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=240',
    banner: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200'
};

// Bộ sản phẩm riêng của shop thứ hai để dữ liệu tìm kiếm/thống kê phản ánh đúng multi-vendor.
const SECOND_PRODUCTS = [
    { name: 'Sofa Vải Bouclé MÂY', _cat: 'Sofa', description: 'Sofa bouclé bo cong 3 chỗ, khung gỗ dầu và đệm mút chống xẹp.', dimensions: { width: 210, depth: 92, height: 78 }, brand: 'Mộc An', color: 'Kem', material: 'Vải Bouclé + Gỗ Dầu', style: 'Organic Modern', weight: 48, deliveryType: 'with_installation', price: 16900000, originalPrice: 18900000, quantity: 9, sold: 16, views: 388, images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600'], variants: [{ name: 'Kem', price: 16900000, stock: 5, sku: 'MA-SF-MAY-KEM' }, { name: 'Xám nhạt', price: 17200000, stock: 4, sku: 'MA-SF-MAY-XAM' }] },
    { name: 'Bàn Ăn Mở Rộng HẠT DẺ', _cat: 'Bàn Ăn', description: 'Bàn ăn có thể mở rộng từ 140 cm lên 190 cm, phù hợp căn hộ và gia đình đông người.', dimensions: { width: 140, depth: 80, height: 75 }, brand: 'Mộc An', color: 'Nâu sáng', material: 'Gỗ Tần Bì', style: 'Japandi', weight: 38, requiresAssembly: true, price: 11900000, quantity: 14, sold: 21, views: 296, images: ['https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600'] },
    { name: 'Ghế Thư Giãn Mây Đan AN NHIÊN', _cat: 'Ghế', description: 'Ghế thư giãn khung gỗ tần bì, lưng mây đan thủ công và đệm tháo giặt.', dimensions: { width: 68, depth: 76, height: 82 }, brand: 'Mộc An', color: 'Tự nhiên', material: 'Gỗ Tần Bì + Mây', style: 'Japandi', weight: 11, price: 4650000, quantity: 22, sold: 37, views: 512, images: ['https://images.unsplash.com/photo-1503602642458-232111445657?w=600'] },
    { name: 'Bàn Làm Việc Nâng Hạ FLEXI', _cat: 'Bàn Làm Việc', description: 'Bàn làm việc nâng hạ điện, ghi nhớ hai mức chiều cao và có khay đi dây.', dimensions: { width: 140, depth: 70, height: 120 }, brand: 'Mộc An', color: 'Gỗ sáng + Trắng', material: 'Gỗ Công Nghiệp + Thép', style: 'Hiện đại', weight: 32, requiresAssembly: true, price: 8900000, quantity: 7, sold: 29, views: 641, images: ['https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600'] },
    { name: 'Tủ Giày Cánh Mây BÌNH MINH', _cat: 'Tủ Kệ', description: 'Tủ giày cánh mây thoáng khí, ba tầng và một ngăn phụ kiện.', dimensions: { width: 100, depth: 35, height: 115 }, brand: 'Mộc An', color: 'Nâu mật ong', material: 'Gỗ Cao Su + Mây', style: 'Tropical', weight: 27, price: 6200000, quantity: 0, sold: 12, views: 184, images: ['https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=600'] },
    { name: 'Gương Đứng Khung Gỗ VẦNG TRĂNG', _cat: 'Gương', description: 'Gương đứng toàn thân khung gỗ bo tròn, có chân chống gập gọn.', dimensions: { width: 65, depth: 5, height: 175 }, brand: 'Mộc An', color: 'Nâu sáng', material: 'Gỗ Sồi + Kính', style: 'Organic Modern', weight: 15, price: 4900000, quantity: 11, sold: 18, views: 273, status: 'hidden', images: ['https://images.unsplash.com/photo-1618220179428-22790b461013?w=600'] },
    { name: 'Kệ Module LẮP GHÉP', _cat: 'Kệ Trang Trí', description: 'Kệ module ba khối có thể tùy biến bố cục theo không gian.', dimensions: { width: 120, depth: 30, height: 120 }, brand: 'Mộc An', color: 'Trắng ngà', material: 'Gỗ Công Nghiệp', style: 'Tối giản', weight: 21, requiresAssembly: true, price: 3900000, quantity: 16, sold: 8, views: 97, status: 'draft', images: ['https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=600'] }
];

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
            Cart.deleteMany({}),
            Transaction.deleteMany({}),
            Review.deleteMany({}),
            Notification.deleteMany({}),
            Blog.deleteMany({})
        ]);
        console.log('Cleared: users, categories, shops, wallets, products, promotions, orders, carts, transactions, reviews, notifications');

        // 2) Users (create -> hash mật khẩu)
        const users = await User.create(USERS);
        const vendor = users.find((u) => u.email === 'vendor@gmail.com');
        const secondVendor = users.find((u) => u.email === 'vendor2@gmail.com');
        console.log(`Created ${users.length} users (admin/2 vendors/customer)`);

        // 3) Categories (create -> sinh slug)
        const cats = await Category.create(CATEGORIES);
        const catId = {};
        cats.forEach((c) => { catId[c.name] = c._id; });
        console.log(`Created ${cats.length} categories`);

        // 4) Shop của vendor + ví
        const shop = await Shop.create({ ...SHOP, slug: SHOP.name, owner: vendor._id, status: 'approved' });
        const wallet = await Wallet.create({
            user: vendor._id,
            balance: 45320000,
            currency: 'VND',
            accounts: [{ type: 'bank', bankName: 'Vietcombank', accountNumber: '0123456789', accountHolder: 'NGUYEN VAN VENDOR', branch: 'TP.HCM', isDefault: true }]
        });
        const secondShop = await Shop.create({ ...SECOND_SHOP, slug: SECOND_SHOP.name, owner: secondVendor._id, status: 'approved', commissionRate: 3 });
        const secondWallet = await Wallet.create({
            user: secondVendor._id,
            balance: 18750000,
            currency: 'VND',
            accounts: [{ type: 'bank', bankName: 'Techcombank', accountNumber: '19039876543210', accountHolder: 'TRAN MINH DECOR', branch: 'TP.HCM', isDefault: true }]
        });
        console.log(`Created 2 shops ("${shop.name}", "${secondShop.name}") + wallets`);

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
        const secondProductDocs = SECOND_PRODUCTS.map(({ _cat, ...p }) => {
            const doc = { ...p, category: catId[_cat], shop: secondShop._id };
            if (doc.variants?.length) doc.quantity = doc.variants.reduce((sum, variant) => sum + (variant.stock || 0), 0);
            return doc;
        });
        const secondProducts = await Product.create(secondProductDocs);
        const byName = {};
        products.forEach((p) => { byName[p.name] = p; });
        const secondByName = {};
        secondProducts.forEach((p) => { secondByName[p.name] = p; });
        const oos = products.filter((p) => p.status === 'out_of_stock').length;
        const hidden = products.filter((p) => p.status === 'hidden').length;
        const draft = products.filter((p) => p.status === 'draft').length;
        console.log(`Created ${products.length + secondProducts.length} products (${secondProducts.length} thuộc ${secondShop.name}; shop chính hết hàng: ${oos}, ẩn: ${hidden}, nháp: ${draft})`);

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
        const secondPromos = await Promotion.create([
            { shop: secondShop._id, name: 'Mộc An Chào Bạn', description: 'Ưu đãi 12% cho sản phẩm của Mộc An Living.', type: 'coupon', discountType: 'percent', value: 12, maxDiscount: 1200000, minOrderValue: 4000000, appliesTo: 'all', startDate: daysFromNow(-3), endDate: daysFromNow(14), maxUsage: 200, usedCount: 47, status: 'running' },
            { shop: secondShop._id, name: 'Flash Sale Góc Làm Việc', description: 'Giảm trực tiếp bàn nâng hạ FLEXI trong tuần này.', type: 'flash_sale', discountType: 'fixed', value: 700000, appliesTo: 'product', products: [secondByName['Bàn Làm Việc Nâng Hạ FLEXI']._id], startDate: daysFromNow(-1), endDate: daysFromNow(6), maxUsage: 30, usedCount: 9, status: 'running' }
        ]);
        console.log(`Created ${promos.length + secondPromos.length} promotions for 2 shops`);

        // 7) Đơn hàng mẫu của khách (gắn shop cho từng dòng - Hướng B)
        const customer = users.find((u) => u.role === 'customer');
        const lineItem = (name, qty) => {
            const p = byName[name];
            return { product: p._id, shop: shop._id, shopName: shop.name, quantity: qty, price: p.price, name: p.name, image: p.images?.[0] || null };
        };
        const buildOrder = (items, status, paymentMethod, ageInDays, paymentStatus = 'pending') => {
            const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
            const shippingFee = subtotal >= 500000 ? 0 : 30000;
            const placedAt = daysFromNow(-ageInDays);
            return {
                user: customer._id,
                products: items,
                shippingAddress: { fullName: customer.fullName, phone: customer.phone, address: '123 Lê Lợi, Quận 1, TP. Hồ Chí Minh', city: 'TP. Hồ Chí Minh', note: '' },
                paymentMethod, paymentStatus,
                subtotal,
                shippingFee,
                totalPrice: subtotal + shippingFee,
                totalQuantity: items.reduce((s, it) => s + it.quantity, 0),
                status,
                orderedAt: placedAt,
                createdAt: placedAt,
                updatedAt: placedAt,
                estimatedDelivery: new Date(placedAt.getTime() + 4 * 86400000)
            };
        };
        const ORDERS = [
            buildOrder([lineItem('Sofa Gỗ Sồi 3 Chỗ CLASSIC', 1)], 'pending', 'VNPAY', 0, 'paid'),
            buildOrder([lineItem('Bàn Ăn Tròn Gỗ Keo 4 Chỗ', 1), lineItem('Ghế Ăn Gỗ Sồi Nordic', 2)], 'preparing', 'COD', 1),
            buildOrder([lineItem('Tủ TV Gỗ Sồi Minimalist', 1)], 'delivered', 'MOMO', 2, 'paid'),
            buildOrder([lineItem('Sofa Giường Đa Năng MILANO', 1)], 'cancelled', 'VNPAY', 3, 'refunded'),
            buildOrder([lineItem('Giường Ngủ Gỗ Sồi NATURE Size 1m6', 1)], 'delivered', 'COD', 4, 'paid'),
            buildOrder([lineItem('Ghế Văn Phòng Gỗ Ergonomic', 2)], 'shipping', 'COD', 6),
            buildOrder([lineItem('Tủ Giày Gỗ 4 Tầng', 1), lineItem('Ghế Bar Gỗ Óc Chó Cao Cấp', 2)], 'delivered', 'ZALOPAY', 9, 'paid'),
            buildOrder([lineItem('Bàn Ăn Gỗ Sồi 6 Chỗ ELEGANT', 1)], 'delivered', 'VNPAY', 13, 'paid'),
            buildOrder([lineItem('Kệ Sách Gỗ Sồi 5 Tầng', 2)], 'delivered', 'COD', 18, 'paid'),
            buildOrder([lineItem('Sofa Gỗ Sồi 3 Chỗ CLASSIC', 1), lineItem('Ghế Ăn Gỗ Sồi Nordic', 4)], 'cancelled', 'MOMO', 22, 'refunded'),
            buildOrder([lineItem('Giường Ngủ Gỗ Óc Chó Size 1m8', 1)], 'delivered', 'VNPAY', 27, 'paid'),
            buildOrder([lineItem('Bàn Ăn Tròn Gỗ Keo 4 Chỗ', 1)], 'delivered', 'COD', 34, 'paid'),
            buildOrder([lineItem('Tủ TV Gỗ Sồi Minimalist', 2)], 'delivered', 'MOMO', 42, 'paid'),
            buildOrder([lineItem('Ghế Ăn Gỗ Sồi Nordic', 6)], 'delivered', 'COD', 56, 'paid'),
            buildOrder([lineItem('Sofa Giường Đa Năng MILANO', 1), lineItem('Tủ Giày Gỗ 4 Tầng', 1)], 'delivered', 'ZALOPAY', 71, 'paid'),
            buildOrder([lineItem('Bàn Ăn Gỗ Sồi 6 Chỗ ELEGANT', 1), lineItem('Ghế Ăn Gỗ Sồi Nordic', 4)], 'delivered', 'VNPAY', 86, 'paid')
        ];
        // Tạo tuần tự để pre-save sinh orderNumber không trùng
        const createdOrders = [];
        for (const o of ORDERS) createdOrders.push(await Order.create(o));

        const secondLineItem = (name, qty) => {
            const p = secondByName[name];
            return { product: p._id, shop: secondShop._id, shopName: secondShop.name, quantity: qty, price: p.price, name: p.name, image: p.images?.[0] || null };
        };
        const buildSecondOrder = (items, status, paymentMethod, ageInDays, paymentStatus = 'pending') => {
            const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const shippingFee = subtotal >= 5000000 ? 0 : 35000;
            const placedAt = daysFromNow(-ageInDays);
            return {
                user: customer._id,
                products: items,
                shippingAddress: { fullName: customer.fullName, phone: customer.phone, address: '42 Võ Văn Tần, Quận 3, TP. Hồ Chí Minh', city: 'TP. Hồ Chí Minh', note: 'Gọi trước khi giao' },
                paymentMethod, paymentStatus, subtotal, shippingFee, totalPrice: subtotal + shippingFee,
                totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0), status,
                orderedAt: placedAt,
                createdAt: placedAt,
                updatedAt: placedAt,
                estimatedDelivery: new Date(placedAt.getTime() + 4 * 86400000)
            };
        };
        const SECOND_ORDERS = [
            buildSecondOrder([secondLineItem('Sofa Vải Bouclé MÂY', 1)], 'confirmed', 'VNPAY', 1, 'paid'),
            buildSecondOrder([secondLineItem('Ghế Thư Giãn Mây Đan AN NHIÊN', 2)], 'shipping', 'COD', 3),
            buildSecondOrder([secondLineItem('Bàn Ăn Mở Rộng HẠT DẺ', 1), secondLineItem('Ghế Thư Giãn Mây Đan AN NHIÊN', 1)], 'delivered', 'MOMO', 12, 'paid'),
            buildSecondOrder([secondLineItem('Bàn Làm Việc Nâng Hạ FLEXI', 1)], 'cancelled', 'ZALOPAY', 7, 'refunded'),
            buildSecondOrder([secondLineItem('Gương Đứng Khung Gỗ VẦNG TRĂNG', 1)], 'delivered', 'COD', 0, 'paid'),
            buildSecondOrder([secondLineItem('Sofa Vải Bouclé MÂY', 1), secondLineItem('Ghế Thư Giãn Mây Đan AN NHIÊN', 1)], 'delivered', 'VNPAY', 5, 'paid'),
            buildSecondOrder([secondLineItem('Bàn Làm Việc Nâng Hạ FLEXI', 1)], 'delivered', 'MOMO', 18, 'paid'),
            buildSecondOrder([secondLineItem('Bàn Ăn Mở Rộng HẠT DẺ', 1)], 'delivered', 'COD', 29, 'paid'),
            buildSecondOrder([secondLineItem('Ghế Thư Giãn Mây Đan AN NHIÊN', 2)], 'cancelled', 'VNPAY', 38, 'refunded'),
            buildSecondOrder([secondLineItem('Sofa Vải Bouclé MÂY', 1)], 'delivered', 'ZALOPAY', 52, 'paid'),
            buildSecondOrder([secondLineItem('Bàn Ăn Mở Rộng HẠT DẺ', 1), secondLineItem('Ghế Thư Giãn Mây Đan AN NHIÊN', 2)], 'delivered', 'MOMO', 74, 'paid'),
            buildSecondOrder([secondLineItem('Bàn Làm Việc Nâng Hạ FLEXI', 1), secondLineItem('Gương Đứng Khung Gỗ VẦNG TRĂNG', 1)], 'delivered', 'VNPAY', 89, 'paid')
        ];
        const secondOrders = [];
        for (const o of SECOND_ORDERS) secondOrders.push(await Order.create(o));
        console.log(`Created ${createdOrders.length + secondOrders.length} sample orders across 2 shops and the last 90 days`);

        // 8) Giao dịch ví (doanh thu / phí sàn / rút tiền)
        const TX = [
            { type: 'credit', category: 'order_income', amount: 9310000, status: 'success', description: 'Đơn hoàn thành - Tủ TV Gỗ Sồi', balanceAfter: 45320000, createdAt: daysFromNow(-1) },
            { type: 'credit', category: 'order_income', amount: 14014000, status: 'success', description: 'Đơn hoàn thành #DH240606', balanceAfter: 36010000, createdAt: daysFromNow(-3) },
            { type: 'debit', category: 'platform_fee', amount: 1784000, status: 'success', description: 'Phí sàn 2% tháng 6/2026', balanceAfter: 33000000, createdAt: daysFromNow(-4) },
            { type: 'debit', category: 'withdraw', amount: 20000000, status: 'success', description: 'Rút tiền về Vietcombank ****6789', balanceAfter: 25000000, createdAt: daysFromNow(-6) },
            { type: 'debit', category: 'withdraw', amount: 30000000, status: 'pending', description: 'Rút tiền về Vietcombank ****6789', balanceAfter: 45320000, createdAt: daysFromNow(-1) }
        ];
        await Transaction.create(TX.map((t) => ({ ...t, wallet: wallet._id, shop: shop._id })));
        const SECOND_TX = [
            { type: 'credit', category: 'order_income', amount: 16550000, status: 'success', description: 'Doanh thu đơn bàn ăn HẠT DẺ + ghế AN NHIÊN', order: secondOrders[2]._id, balanceAfter: 19246500, createdAt: daysFromNow(-10) },
            { type: 'debit', category: 'platform_fee', amount: 496500, status: 'success', description: 'Phí sàn 3% đơn bàn ăn HẠT DẺ + ghế AN NHIÊN', order: secondOrders[2]._id, balanceAfter: 18750000, createdAt: daysFromNow(-10) },
            { type: 'debit', category: 'refund', amount: 8900000, status: 'success', description: 'Hoàn tiền đơn bàn FLEXI đã hủy', order: secondOrders[3]._id, balanceAfter: 9493000, createdAt: daysFromNow(-6) },
            { type: 'debit', category: 'withdraw', amount: 5000000, status: 'pending', description: 'Yêu cầu rút tiền về Techcombank ****3210', balanceAfter: 18750000, createdAt: daysFromNow(0) }
        ];
        await Transaction.create(SECOND_TX.map((t) => ({ ...t, wallet: secondWallet._id, shop: secondShop._id })));
        console.log(`Created ${TX.length + SECOND_TX.length} wallet transactions for 2 shops`);

        // 9) Đánh giá sản phẩm của shop (vài cái đã phản hồi, 1 cái 1 sao chưa phản hồi)
        const review = (productName, rating, content, reply) => {
            const p = byName[productName];
            return {
                type: 'product', user: customer._id, targetId: p._id, product: p._id, shop: shop._id,
                rating, content,
                vendorReply: reply ? { content: reply, repliedAt: daysFromNow(-1) } : { content: '', repliedAt: null }
            };
        };
        const REVIEWS = [
            review('Sofa Gỗ Sồi 3 Chỗ CLASSIC', 5, 'Sofa rất đẹp và chắc chắn, giao hàng nhanh. Rất hài lòng!', 'Cảm ơn anh/chị đã ủng hộ shop ạ!'),
            review('Tủ TV Gỗ Sồi Minimalist', 5, 'Gỗ đẹp, đóng gói cẩn thận, thợ lắp đặt chuyên nghiệp.', 'Shop cảm ơn và chúc anh/chị sử dụng tốt!'),
            review('Bàn Làm Việc Gỗ Sồi Simple Desk', 3, 'Bàn ổn nhưng giao hơi chậm so với dự kiến.', null),
            review('Ghế Ăn Gỗ Sồi Nordic', 1, 'Ghế bị lỗi mộng, lung lay. Mong shop hỗ trợ đổi trả.', null)
        ];
        await Review.create(REVIEWS);
        const SECOND_REVIEWS = [
            { type: 'product', user: customer._id, targetId: secondByName['Bàn Ăn Mở Rộng HẠT DẺ']._id, product: secondByName['Bàn Ăn Mở Rộng HẠT DẺ']._id, shop: secondShop._id, order: secondOrders[2]._id, rating: 5, content: 'Bàn chắc chắn, cơ chế mở rộng rất mượt và màu gỗ đúng ảnh.', images: ['https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600'], vendorReply: { content: 'Mộc An cảm ơn anh/chị đã tin tưởng. Chúc gia đình có nhiều bữa cơm ấm cúng!', repliedAt: daysFromNow(-8) } },
            { type: 'product', user: customer._id, targetId: secondByName['Ghế Thư Giãn Mây Đan AN NHIÊN']._id, product: secondByName['Ghế Thư Giãn Mây Đan AN NHIÊN']._id, shop: secondShop._id, order: secondOrders[1]._id, rating: 4, content: 'Ghế đẹp và ngồi thoải mái, phần đóng gói có thể chắc chắn hơn.', vendorReply: { content: '', repliedAt: null } },
            { type: 'shop', user: customer._id, targetId: secondShop._id, shop: secondShop._id, order: secondOrders[2]._id, rating: 5, content: 'Shop tư vấn kích thước rất kỹ, đội lắp đặt lịch sự.', vendorReply: { content: 'Cảm ơn anh/chị đã chia sẻ trải nghiệm với Mộc An!', repliedAt: daysFromNow(-7) } }
        ];
        await Review.create(SECOND_REVIEWS);
        console.log(`Created ${REVIEWS.length + SECOND_REVIEWS.length} product/shop reviews for 2 shops`);

        // Giỏ hàng có sản phẩm từ hai vendor để kiểm thử luồng checkout multi-vendor.
        await Cart.create({
            user: customer._id,
            products: [
                { product: byName['Gương Trang Trí Gỗ Tròn']._id, quantity: 1, price: byName['Gương Trang Trí Gỗ Tròn'].price, name: byName['Gương Trang Trí Gỗ Tròn'].name, image: byName['Gương Trang Trí Gỗ Tròn'].images?.[0] || null },
                { product: secondByName['Sofa Vải Bouclé MÂY']._id, quantity: 1, price: secondByName['Sofa Vải Bouclé MÂY'].price, name: secondByName['Sofa Vải Bouclé MÂY'].name, image: secondByName['Sofa Vải Bouclé MÂY'].images?.[0] || null }
            ]
        });
        console.log('Created a mixed-vendor cart');

        // 10) Thông báo cho vendor
        const NOTIFS = [
            { type: 'order', title: 'Đơn hàng mới cần xác nhận', body: 'Bạn có 1 đơn hàng mới đang chờ xác nhận.', isRead: false, link: '/vendor/orders', createdAt: daysFromNow(0) },
            { type: 'review', title: 'Đánh giá 1 sao cần phản hồi', body: 'Sản phẩm "Ghế Ăn Gỗ Sồi Nordic" vừa nhận đánh giá 1 sao.', isRead: false, link: '/vendor/reviews', createdAt: daysFromNow(0) },
            { type: 'stock', title: 'Cảnh báo tồn kho thấp', body: 'Một số sản phẩm sắp hết hàng, vui lòng nhập thêm.', isRead: false, link: '/vendor/products', createdAt: daysFromNow(-1) },
            { type: 'wallet', title: 'Giao dịch ví thành công', body: '20.000.000₫ đã được giải ngân về Vietcombank ****6789.', isRead: true, link: '/vendor/wallet', createdAt: daysFromNow(-6) },
            { type: 'system', title: 'Cập nhật chính sách phí sàn', body: 'Phí sàn điều chỉnh từ 2% xuống 1.8% từ 01/07/2026.', isRead: true, link: '', createdAt: daysFromNow(-2) }
        ];
        await Notification.create(NOTIFS.map((n) => ({ ...n, user: vendor._id })));
        const SECOND_NOTIFS = [
            { type: 'order', title: 'Đơn hàng đã thanh toán', body: 'Đơn sofa MÂY đã thanh toán qua VNPAY và đang chờ xử lý.', relatedId: secondOrders[0]._id, relatedModel: 'Order', isRead: false, link: '/vendor/orders', createdAt: daysFromNow(-1) },
            { type: 'review', title: 'Bạn có đánh giá mới', body: 'Ghế AN NHIÊN vừa nhận đánh giá 4 sao chưa được phản hồi.', isRead: false, link: '/vendor/reviews', createdAt: daysFromNow(0) },
            { type: 'stock', title: 'Sản phẩm đã hết hàng', body: 'Tủ Giày Cánh Mây BÌNH MINH hiện có tồn kho bằng 0.', relatedId: secondByName['Tủ Giày Cánh Mây BÌNH MINH']._id, relatedModel: 'Product', isRead: false, link: '/vendor/products', createdAt: daysFromNow(-2) },
            { type: 'wallet', title: 'Yêu cầu rút tiền đang xử lý', body: 'Yêu cầu rút 5.000.000₫ về Techcombank đang chờ duyệt.', isRead: true, link: '/vendor/wallet', createdAt: daysFromNow(0) }
        ];
        await Notification.create(SECOND_NOTIFS.map((n) => ({ ...n, user: secondVendor._id })));
        console.log(`Created ${NOTIFS.length + SECOND_NOTIFS.length} notifications for 2 vendors`);

        // 11) Bài viết blog của shop
        const BLOGS = [
            { title: '5 cách phối sofa Nordic cho phòng khách nhỏ', category: 'inspiration', status: 'published', excerpt: 'Không gian nhỏ vẫn có thể sang trọng và ấm cúng nếu bạn biết chọn đúng kiểu sofa và cách bố trí.', content: 'Với những căn hộ diện tích khiêm tốn, việc chọn đúng kiểu sofa là yếu tố quyết định...', coverImage: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800', tags: ['sofa nordic', 'phòng khách', 'không gian nhỏ'], views: 2840, likes: 312, commentsCount: 48, isPinned: true, publishedAt: daysFromNow(-2) },
            { title: 'Chọn bàn ăn gỗ sồi hợp phong thủy gia đình', category: 'styling', status: 'published', excerpt: 'Bàn ăn không chỉ là nơi sum họp mà còn ảnh hưởng tới vận khí gia đình.', content: 'Cùng tìm hiểu cách chọn chất liệu, hình dáng và kích thước bàn ăn phù hợp...', coverImage: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800', tags: ['bàn ăn', 'gỗ sồi', 'phong thủy'], views: 1967, likes: 208, commentsCount: 33, publishedAt: daysFromNow(-6) },
            { title: 'Cách bảo quản đồ gỗ tự nhiên bền đẹp 10 năm', category: 'guide', status: 'published', excerpt: 'Gỗ tự nhiên cần được chăm sóc đúng cách để giữ màu và độ bền.', content: 'Hướng dẫn chi tiết từ vệ sinh tới đánh bóng đồ gỗ tự nhiên...', coverImage: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=800', tags: ['bảo quản', 'gỗ tự nhiên', 'mẹo'], views: 4103, likes: 521, commentsCount: 67, publishedAt: daysFromNow(-12) },
            { title: 'Nội thất xanh 2026: vật liệu tái chế lên ngôi', category: 'trend', status: 'scheduled', excerpt: 'Người tiêu dùng ngày càng quan tâm tới tính bền vững.', content: 'Điểm qua những vật liệu thân thiện môi trường đang dẫn đầu xu hướng...', coverImage: null, tags: ['xu hướng', 'bền vững'], scheduledAt: daysFromNow(5) },
            { title: 'Hành trình 15 năm của Furni Official Store', category: 'brand_story', status: 'draft', excerpt: 'Từ một xưởng mộc nhỏ tới thương hiệu nội thất được yêu thích.', content: 'Câu chuyện về đam mê với gỗ và sự tử tế...', coverImage: null, tags: ['thương hiệu', 'câu chuyện'] }
        ];
        await Blog.create(BLOGS.map((b) => ({ ...b, shop: shop._id, author: vendor._id })));
        const SECOND_BLOGS = [
            { title: 'Japandi: khi tối giản gặp sự ấm áp', category: 'inspiration', status: 'published', excerpt: 'Cách phối gỗ sáng, màu trung tính và đường nét gọn gàng cho căn hộ.', content: 'Japandi kết hợp sự tinh giản của Nhật Bản với cảm giác ấm cúng từ Bắc Âu...', coverImage: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800', tags: ['japandi', 'căn hộ', 'gỗ sáng'], products: [secondByName['Bàn Ăn Mở Rộng HẠT DẺ']._id, secondByName['Ghế Thư Giãn Mây Đan AN NHIÊN']._id], views: 1260, likes: 148, commentsCount: 19, publishedAt: daysFromNow(-5) },
            { title: 'Đo góc làm việc đúng chuẩn trước khi mua bàn', category: 'guide', status: 'published', excerpt: 'Năm phép đo nhỏ giúp bạn tránh một chiếc bàn quá lớn hoặc quá thấp.', content: 'Trước tiên hãy đo chiều rộng mảng tường, khoảng lùi ghế và vị trí ổ điện...', coverImage: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800', tags: ['bàn làm việc', 'đo kích thước', 'ergonomic'], products: [secondByName['Bàn Làm Việc Nâng Hạ FLEXI']._id], views: 843, likes: 91, commentsCount: 12, publishedAt: daysFromNow(-3) },
            { title: 'Vì sao Mộc An chọn mây đan thủ công?', category: 'brand_story', status: 'draft', excerpt: 'Câu chuyện về vật liệu địa phương và những người thợ đứng sau sản phẩm.', content: 'Mỗi tấm mây đan cần nhiều giờ hoàn thiện bằng tay...', tags: ['mây đan', 'thủ công', 'thương hiệu'], products: [secondByName['Ghế Thư Giãn Mây Đan AN NHIÊN']._id] }
        ];
        await Blog.create(SECOND_BLOGS.map((b) => ({ ...b, shop: secondShop._id, author: secondVendor._id })));
        console.log(`Created ${BLOGS.length + SECOND_BLOGS.length} blog posts for 2 shops`);

        console.log('\n==================== DONE ====================');
        console.log('Tài khoản:');
        console.log('  Admin    : admin@gmail.com    / Admin123');
        console.log('  Vendor   : vendor@gmail.com   / Vendor123');
        console.log('  Vendor 2 : vendor2@gmail.com  / Vendor123  (Mộc An Living)');
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
