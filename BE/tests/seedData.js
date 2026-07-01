/* ============================================================
   Seed data lớn cho Furni.

   Tạo đầy đủ:
   - 1 admin, 3 vendor, 5 customer
   - Mỗi vendor có 1 shop
   - Mỗi shop có 10-25 product, 30-40 order, 3-6 promotion, 4-6 blog
   - Ví điện tử, địa chỉ, coupon/voucher, transaction, review, cart, notification
   - 4 promotion toàn sàn do admin tạo (shop: null)

   Chạy: cd BE && npm run seed
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
const Coupon = require('../src/models/coupon');
const { VoucherWallet, VOUCHER_STATUS } = require('../src/models/voucherWallet');
const Order = require('../src/models/order');
const Cart = require('../src/models/cart');
const Transaction = require('../src/models/transaction');
const Review = require('../src/models/review');
const Notification = require('../src/models/notification');
const Blog = require('../src/models/blog');
const Address = require('../src/models/Address');
const { ShippingRate } = require('../src/models/shippingRate');
const BlogComment = require('../src/models/blogComment'); 

const now = new Date();
const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (n) => new Date(now.getTime() + n * DAY);
const addDays = (date, n) => new Date(new Date(date).getTime() + n * DAY);
const money = (value) => Math.max(0, Math.round(Number(value || 0) / 1000) * 1000);
const idKey = (value) => String(value?._id || value);

const USERS = [
    { fullName: 'System Admin', email: 'admin@gmail.com', phone: '0912345678', username: 'admin01', password: 'Admin123', role: 'admin', isVerified: true, gender: 'other' },
    { fullName: 'Nguyễn Thanh Furni', email: 'vendor@gmail.com', phone: '0987654321', username: 'vendor01', password: 'Vendor123', role: 'vendor', isVerified: true, gender: 'male' },
    { fullName: 'Trần Minh Decor', email: 'vendor2@gmail.com', phone: '0978123456', username: 'vendor02', password: 'Vendor123', role: 'vendor', isVerified: true, gender: 'male' },
    { fullName: 'Lê Bảo Nesta', email: 'vendor3@gmail.com', phone: '0966123456', username: 'vendor03', password: 'Vendor123', role: 'vendor', isVerified: true, gender: 'female' },
    { fullName: 'Nguyễn Văn Khang', email: 'customer@gmail.com', phone: '0909123457', username: 'customer01', password: 'Customer123', role: 'customer', isVerified: true, gender: 'male', dateOfBirth: daysFromNow(-11200) },
    { fullName: 'Lê Thị Mai Anh', email: 'maianh@gmail.com', phone: '0909555123', username: 'customer02', password: 'Customer123', role: 'customer', isVerified: true, gender: 'female', dateOfBirth: daysFromNow(-10400) },
    { fullName: 'Phạm Quang Huy', email: 'huypham@gmail.com', phone: '0918666777', username: 'customer03', password: 'Customer123', role: 'customer', isVerified: true, gender: 'male', dateOfBirth: daysFromNow(-12200) },
    { fullName: 'Đỗ Ngọc Linh', email: 'linhdo@gmail.com', phone: '0933444555', username: 'customer04', password: 'Customer123', role: 'customer', isVerified: true, gender: 'female', dateOfBirth: daysFromNow(-9900) },
    { fullName: 'Hoàng Anh Tuấn', email: 'tuannguyen@gmail.com', phone: '0944666888', username: 'customer05', password: 'Customer123', role: 'customer', isVerified: true, gender: 'male', dateOfBirth: daysFromNow(-13300) },
];

const CATEGORIES = [
    { name: 'Sofa', description: 'Sofa phòng khách từ hiện đại đến tân cổ điển.', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600' },
    { name: 'Giường Ngủ', description: 'Giường ngủ gỗ, giường bọc nệm và nội thất phòng ngủ.', image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600' },
    { name: 'Bàn Ăn', description: 'Bàn ăn gia đình, bàn tròn và bàn mở rộng.', image: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600' },
    { name: 'Tủ Kệ', description: 'Tủ TV, tủ giày, kệ sách và hệ kệ lưu trữ.', image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600' },
    { name: 'Ghế', description: 'Ghế ăn, ghế thư giãn, ghế văn phòng và ghế bar.', image: 'https://images.unsplash.com/photo-1503602642458-232111445657?w=600' },
    { name: 'Bàn Làm Việc', description: 'Bàn làm việc, bàn học và góc workstation tại nhà.', image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600' },
    { name: 'Kệ Trang Trí', description: 'Kệ treo tường, kệ module và phụ kiện trưng bày.', image: 'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=600' },
    { name: 'Gương', description: 'Gương đứng, gương trang trí và gương phòng ngủ.', image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=600' },
    { name: 'Đèn Trang Trí', description: 'Đèn sàn, đèn bàn, đèn thả và đèn decor.', image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=600' },
];

const SHOP_PROFILES = [
    {
        code: 'FHST',
        name: 'Furni Home Studio',
        description: 'Nội thất gỗ tự nhiên, thiết kế tinh gọn và dịch vụ lắp đặt trọn gói cho căn hộ hiện đại.',
        phone: '0987654321',
        email: 'shop@furnihome.vn',
        address: '123 Nguyễn Văn Cừ, Phường 4, Quận 5, TP. Hồ Chí Minh',
        provinceCode: '79',
        provinceName: 'TP. Hồ Chí Minh',
        logo: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=240',
        banner: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=1200',
        commissionRate: 2,
        productCount: 18,
        orderCount: 35,
        accent: 'gỗ sồi và walnut',
    },
    {
        code: 'MOAN',
        name: 'Moc An Living',
        description: 'Nội thất Japandi, vật liệu bền vững và những sản phẩm tối ưu diện tích cho nhà phố.',
        phone: '0978123456',
        email: 'hello@mocan.vn',
        address: '86 Nguyễn Thị Minh Khai, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh',
        provinceCode: '79',
        provinceName: 'TP. Hồ Chí Minh',
        logo: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=240',
        banner: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200',
        commissionRate: 2.5,
        productCount: 20,
        orderCount: 36,
        accent: 'mây đan và gỗ sáng',
    },
    {
        code: 'NEST',
        name: 'Nesta Decor House',
        description: 'Decor cao cấp cho phòng khách, phòng ngủ và góc làm việc với phong cách đô thị ấm áp.',
        phone: '0966123456',
        email: 'care@nesta.vn',
        address: '22 Lý Thường Kiệt, Phường Trần Hưng Đạo, Quận Hoàn Kiếm, Hà Nội',
        provinceCode: '01',
        provinceName: 'Hà Nội',
        logo: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=240',
        banner: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=1200',
        commissionRate: 3,
        productCount: 17,
        orderCount: 34,
        accent: 'kim loại đen và đá marble',
    },
];

const ADDRESS_BOOK = [
    { provinceCode: '79', provinceName: 'TP. Hồ Chí Minh', districtCode: '760', districtName: 'Quận 1', wardName: 'Phường Bến Nghé', street: '12 Lê Lợi', lat: 10.7769, lng: 106.7009 },
    { provinceCode: '79', provinceName: 'TP. Hồ Chí Minh', districtCode: '769', districtName: 'Quận 7', wardName: 'Phường Tân Phú', street: '45 Nguyễn Lương Bằng', lat: 10.7296, lng: 106.7219 },
    { provinceCode: '01', provinceName: 'Hà Nội', districtCode: '001', districtName: 'Quận Ba Đình', wardName: 'Phường Điện Biên', street: '18 Kim Mã', lat: 21.0336, lng: 105.8142 },
    { provinceCode: '01', provinceName: 'Hà Nội', districtCode: '007', districtName: 'Quận Thanh Xuân', wardName: 'Phường Nhân Chính', street: '62 Nguyễn Trãi', lat: 20.9991, lng: 105.8099 },
    { provinceCode: '48', provinceName: 'Đà Nẵng', districtCode: '490', districtName: 'Quận Hải Châu', wardName: 'Phường Hải Châu I', street: '28 Bạch Đằng', lat: 16.0678, lng: 108.2208 },
    { provinceCode: '92', provinceName: 'Cần Thơ', districtCode: '916', districtName: 'Quận Ninh Kiều', wardName: 'Phường An Cư', street: '39 Mậu Thân', lat: 10.0452, lng: 105.7469 },
];

const PRODUCT_BLUEPRINTS = [
    { category: 'Sofa', label: 'Sofa vải module', brand: 'FurniCraft', material: 'Vải linen và khung gỗ dầu', style: 'Hiện đại', color: 'Kem', price: 14500000, weight: 48, image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=700', deliveryType: 'with_installation' },
    { category: 'Sofa', label: 'Sofa góc phòng khách', brand: 'FurniCraft', material: 'Vải chống bám và gỗ thông', style: 'Đương đại', color: 'Xám khói', price: 18900000, weight: 62, image: 'https://images.unsplash.com/photo-1550254478-ead40cc54513?w=700', deliveryType: 'with_installation' },
    { category: 'Giường Ngủ', label: 'Giường gỗ sồi', brand: 'SleepNest', material: 'Gỗ sồi tự nhiên', style: 'Scandinavian', color: 'Nâu sáng', price: 16800000, weight: 70, image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=700', requiresAssembly: true },
    { category: 'Giường Ngủ', label: 'Giường bọc nệm', brand: 'SleepNest', material: 'Vải nhung và khung gỗ', style: 'Tối giản', color: 'Be', price: 13200000, weight: 58, image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=700', requiresAssembly: true },
    { category: 'Bàn Ăn', label: 'Bàn ăn mặt ceramic', brand: 'DiningLab', material: 'Gỗ cao su và mặt ceramic', style: 'Hiện đại', color: 'Trắng nâu', price: 22500000, weight: 65, image: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=700', deliveryType: 'with_installation' },
    { category: 'Bàn Ăn', label: 'Bàn ăn tròn gia đình', brand: 'DiningLab', material: 'Gỗ tần bì', style: 'Japandi', color: 'Gỗ tự nhiên', price: 8700000, weight: 31, image: 'https://images.unsplash.com/photo-1604578762246-41134e37f9cc?w=700' },
    { category: 'Tủ Kệ', label: 'Tủ kệ lưu trữ', brand: 'StoreHaus', material: 'Gỗ MDF phủ veneer', style: 'Tối giản', color: 'Nâu walnut', price: 9500000, weight: 36, image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=700' },
    { category: 'Tủ Kệ', label: 'Kệ sách mở', brand: 'StoreHaus', material: 'Gỗ sồi và thép sơn tĩnh điện', style: 'Industrial', color: 'Đen nâu', price: 6900000, weight: 28, image: 'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=700', requiresAssembly: true },
    { category: 'Ghế', label: 'Ghế ăn Nordic', brand: 'SeatWell', material: 'Gỗ sồi và nệm vải', style: 'Bắc Âu', color: 'Nâu tự nhiên', price: 2850000, weight: 7, image: 'https://images.unsplash.com/photo-1503602642458-232111445657?w=700' },
    { category: 'Ghế', label: 'Ghế thư giãn mây đan', brand: 'SeatWell', material: 'Gỗ tần bì và mây đan', style: 'Tropical', color: 'Tự nhiên', price: 5200000, weight: 12, image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=700' },
    { category: 'Bàn Làm Việc', label: 'Bàn làm việc gọn gàng', brand: 'WorkNest', material: 'Gỗ MDF chống ẩm', style: 'Hiện đại', color: 'Trắng gỗ', price: 5600000, weight: 25, image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=700', requiresAssembly: true },
    { category: 'Bàn Làm Việc', label: 'Bàn nâng hạ thông minh', brand: 'WorkNest', material: 'Gỗ công nghiệp và khung thép', style: 'Ergonomic', color: 'Đen gỗ', price: 11800000, weight: 38, image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=700', requiresAssembly: true },
    { category: 'Kệ Trang Trí', label: 'Kệ module trang trí', brand: 'DecorLine', material: 'Gỗ thông ghép', style: 'Trẻ trung', color: 'Trắng ngà', price: 4200000, weight: 18, image: 'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=700', requiresAssembly: true },
    { category: 'Kệ Trang Trí', label: 'Kệ treo tường thanh mảnh', brand: 'DecorLine', material: 'Gỗ cao su', style: 'Tối giản', color: 'Nâu mật ong', price: 2400000, weight: 9, image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=700' },
    { category: 'Gương', label: 'Gương đứng toàn thân', brand: 'MirrorLab', material: 'Gương bạc và khung gỗ', style: 'Organic', color: 'Nâu sáng', price: 4600000, weight: 16, image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=700' },
    { category: 'Gương', label: 'Gương vòm trang trí', brand: 'MirrorLab', material: 'Kính và khung kim loại', style: 'Art Deco', color: 'Đen', price: 3900000, weight: 11, image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=700' },
    { category: 'Đèn Trang Trí', label: 'Đèn sàn dáng cong', brand: 'LightHaus', material: 'Thép sơn và chụp vải', style: 'Hiện đại', color: 'Đen vàng', price: 3200000, weight: 8, image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=700' },
    { category: 'Đèn Trang Trí', label: 'Đèn bàn ánh ấm', brand: 'LightHaus', material: 'Gốm và vải linen', style: 'Soft Modern', color: 'Trắng kem', price: 1850000, weight: 4, image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=700' },
];

const PRODUCT_NAME_POOL = {
    Sofa: [
        'Sofa góc Nordic phòng khách',
        'Sofa vải mây êm ái',
        'Sofa giường đa năng Milano',
        'Sofa băng nhỏ cho căn hộ',
        'Sofa da nâu cổ điển',
        'Sofa module thư giãn Cloud',
        'Sofa văng gỗ sồi ấm áp',
        'Sofa chữ L hiện đại',
        'Sofa phòng khách màu kem',
        'Sofa tối giản cho nhà phố',
        'Sofa bo cong phong cách Hàn',
        'Sofa nhung xanh sang trọng',
    ],
    'Giường Ngủ': [
        'Giường gỗ sồi hộc kéo',
        'Giường bọc nệm đầu cong',
        'Giường ngủ kiểu Nhật thấp',
        'Giường tân cổ điển màu kem',
        'Giường gỗ óc chó sang trọng',
        'Giường đôi phong cách Bắc Âu',
        'Giường trẻ em có lan can',
        'Giường ngủ tối giản chân thấp',
        'Giường gỗ tự nhiên Queen',
        'Giường bọc vải màu xám',
        'Giường có ngăn chứa đồ',
        'Giường ngủ resort êm ái',
    ],
    'Bàn Ăn': [
        'Bàn ăn tròn gỗ tần bì',
        'Bàn ăn mặt đá sang trọng',
        'Bàn ăn mở rộng sáu ghế',
        'Bàn ăn phong cách Nhật',
        'Bàn ăn gỗ sồi gia đình',
        'Bàn ăn ceramic trắng vân mây',
        'Bàn ăn nhỏ cho căn hộ',
        'Bàn ăn tân cổ điển',
        'Bàn ăn dài cho phòng bếp',
        'Bàn ăn chân trụ hiện đại',
        'Bàn ăn ngoài trời phủ dầu',
        'Bàn ăn gỗ óc chó tám ghế',
    ],
    'Tủ Kệ': [
        'Tủ 6 ngăn gỗ tự nhiên',
        'Tủ gỗ sang trọng',
        'Tủ phong cách Pháp',
        'Tủ tân cổ điển',
        'Tủ trang trí phòng khách',
        'Kệ TV cánh lùa hiện đại',
        'Tủ giày cánh mây',
        'Kệ sách mở năm tầng',
        'Tủ rượu kính khung gỗ',
        'Tủ đầu giường nhỏ gọn',
        'Kệ console hành hành lang',
        'Tủ lưu trữ tối giản',
    ],
    Ghế: [
        'Ghế ăn gỗ Nordic',
        'Ghế thư giãn mây đan',
        'Ghế bành đọc sách',
        'Ghế bar chân cao',
        'Ghế văn phòng lưng cong',
        'Ghế đẩu gỗ tự nhiên',
        'Ghế sofa đơn màu kem',
        'Ghế mây phong cách nhiệt đới',
        'Ghế ăn bọc nệm xanh',
        'Ghế thư giãn tai thỏ',
        'Ghế phòng ngủ chân thấp',
        'Ghế cafe gỗ uốn',
    ],
    'Bàn Làm Việc': [
        'Bàn làm việc gỗ sồi',
        'Bàn nâng hạ thông minh',
        'Bàn học có kệ sách',
        'Bàn làm việc góc chữ L',
        'Bàn máy tính phong cách Nhật',
        'Bàn văn phòng tối giản',
        'Bàn làm việc có hộc kéo',
        'Bàn studio mặt rộng',
        'Bàn làm việc chân sắt',
        'Bàn gỗ nhỏ cho phòng ngủ',
        'Bàn đôi cho home office',
        'Bàn làm việc màu walnut',
    ],
    'Kệ Trang Trí': [
        'Kệ module trang trí',
        'Kệ treo tường thanh mảnh',
        'Kệ góc phòng khách',
        'Kệ cây cảnh ba tầng',
        'Kệ decor hình thang',
        'Kệ rượu treo tường',
        'Kệ trưng bày bằng gỗ',
        'Kệ sách mini để bàn',
        'Kệ trang trí phong cách Pháp',
        'Kệ console sau sofa',
        'Kệ mây trang trí',
        'Kệ tường bo cong',
    ],
    Gương: [
        'Gương đứng toàn thân',
        'Gương vòm trang trí',
        'Gương tròn khung gỗ',
        'Gương phòng ngủ viền mảnh',
        'Gương treo tường phong cách Pháp',
        'Gương trang điểm có đèn',
        'Gương oval khung đồng',
        'Gương lớn cho phòng khách',
        'Gương nghệ thuật bo cong',
        'Gương khung mây tự nhiên',
        'Gương console hành lang',
        'Gương phòng tắm chống ẩm',
    ],
    'Đèn Trang Trí': [
        'Đèn sàn dáng cong',
        'Đèn bàn ánh ấm',
        'Đèn thả bàn ăn',
        'Đèn ngủ gốm trắng',
        'Đèn cây phong cách Bắc Âu',
        'Đèn tường đồng cổ',
        'Đèn đọc sách chân mảnh',
        'Đèn mây tre đan',
        'Đèn trần tối giản',
        'Đèn decor phòng khách',
        'Đèn bàn làm việc xanh rêu',
        'Đèn ngủ vải linen',
    ],
};

const BLOG_TITLES = [
    { title: 'Cách chọn sofa đúng kích thước cho phòng khách căn hộ', category: 'guide', tags: ['sofa', 'phòng khách', 'kích thước'] },
    { title: 'Phối gỗ sáng và vải trung tính để nhà ấm hơn', category: 'styling', tags: ['gỗ sáng', 'styling', 'căn hộ'] },
    { title: 'Checklist bảo quản nội thất gỗ trong mùa mưa', category: 'guide', tags: ['bảo quản', 'gỗ tự nhiên', 'mẹo hay'] },
    { title: 'Hành trình thiết kế bộ sưu tập mới của shop', category: 'brand_story', tags: ['thương hiệu', 'xưởng mộc', 'thiết kế'] },
    { title: 'Xu hướng nội thất 2026 cho không gian nhỏ', category: 'trend', tags: ['xu hướng', '2026', 'không gian nhỏ'] },
];

const orderStatuses = ['pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'delivered', 'cancelled', 'cancel_requested'];
const paymentMethods = ['COD', 'VNPAY', 'WALLET'];
const shippingProviders = ['ghtk', 'jt', 'viettel'];

const getNaturalProductName = (category, seedIndex) => {
    const pool = PRODUCT_NAME_POOL[category] || [];
    return pool[seedIndex % pool.length] || 'Sản phẩm nội thất chọn lọc';
};

const buildProductDescription = (shopName, productName, blueprint, accent) => (
    `${productName} của ${shopName} được thiết kế cho không gian sống hiện đại, tập trung vào công năng, độ bền và cảm giác chạm thật. ` +
    `Sản phẩm sử dụng ${blueprint.material.toLowerCase()}, hoàn thiện theo phong cách ${blueprint.style.toLowerCase()} với điểm nhấn ${accent}. ` +
    'Mỗi chi tiết được mô tả rõ trong đơn hàng: kích thước, trọng lượng, vật liệu, biến thể màu sắc và thông tin lắp đặt. ' +
    'Dữ liệu seed này phù hợp để kiểm thử tìm kiếm, lọc danh mục, flash sale, checkout, tồn kho và dashboard vendor.'
);

const buildProductVariants = (shopCode, index, price, stock, material, style) => ([
    {
        name: 'Bản tiêu chuẩn',
        size: 'Standard',
        price,
        stock: Math.max(0, Math.floor(stock * 0.6)),
        sku: `${shopCode}-STD-${String(index + 1).padStart(3, '0')}`,
        color: 'Tự nhiên',
        material,
        style,
        dimensions: { length: 120 + index, width: 60 + (index % 5), depth: 45 + (index % 4), height: 75 + (index % 6) },
        weight: 12 + index,
        description: 'Biến thể phổ thông, phù hợp nhu cầu sử dụng hằng ngày.',
    },
    {
        name: 'Bản cao cấp',
        size: 'Premium',
        price: money(price * 1.12),
        stock: Math.max(0, Math.floor(stock * 0.4)),
        sku: `${shopCode}-PRE-${String(index + 1).padStart(3, '0')}`,
        color: 'Nâu đậm',
        material,
        style,
        dimensions: { length: 125 + index, width: 65 + (index % 5), depth: 48 + (index % 4), height: 78 + (index % 6) },
        weight: 14 + index,
        description: 'Biến thể hoàn thiện kỹ hơn, chất liệu dày hơn và bảo hành mở rộng.',
    },
]);

const getProductStatus = (index) => {
    if (index % 14 === 0) return { status: 'draft', quantity: 12 + index };
    if (index % 11 === 0) return { status: 'hidden', quantity: 8 + index };
    if (index % 7 === 0) return { status: 'out_of_stock', quantity: 0 };
    return { status: 'active', quantity: 10 + (index * 3) % 42 };
};

const buildStatusHistory = (status, orderedAt) => {
    const flow = ['pending'];
    if (['confirmed', 'preparing', 'shipping', 'delivered', 'cancelled', 'cancel_requested'].includes(status)) flow.push('confirmed');
    if (['preparing', 'shipping', 'delivered', 'cancelled', 'cancel_requested'].includes(status)) flow.push('preparing');
    if (['shipping', 'delivered'].includes(status)) flow.push('shipping');
    if (status === 'delivered') flow.push('delivered');
    if (status === 'cancel_requested') flow.push('cancel_requested');
    if (status === 'cancelled') flow.push('cancelled');

    return flow.map((item, index) => ({
        status: item,
        timestamp: addDays(orderedAt, Math.min(index, 6)),
        note: index === 0 ? 'Đơn hàng được tạo từ seed data.' : `Cập nhật trạng thái ${item}.`,
    }));
};

const buildBlogContent = (shopName, title, accent) => {
    const paragraphs = [
        `${title} là chủ đề được ${shopName} chuẩn bị như một cẩm nang thực hành cho khách hàng đang hoàn thiện nhà. Bài viết không chỉ dừng lại ở việc giới thiệu sản phẩm, mà còn giải thích cách đo diện tích, cách chọn vật liệu, cách cân đối ngân sách và cách tránh những lỗi phổ biến khi mua nội thất online.`,
        `Với những không gian nhỏ, yếu tố quan trọng nhất là tỷ lệ. Một chiếc sofa đẹp nhưng quá sâu có thể làm lối đi bị hẹp, một chiếc bàn ăn quá lớn có thể khiến bếp mất độ thông thoáng. Đội ngũ ${shopName} thường khuyên khách hàng chụp lại mặt bằng, đo khoảng mở cửa, đo vị trí ổ cắm và đánh dấu các đường đi chính trước khi đặt hàng.`,
        `Về vật liệu, ${accent} mang lại cảm giác ấm và có độ bền tốt nếu được bảo quản đúng cách. Bề mặt gỗ nên được lau bằng khăn ẩm mềm, tránh chất tẩy mạnh và tránh đặt sát cửa sổ bị nắng gắt liên tục. Các phần vải bọc nên được hút bụi hàng tuần, xoay đệm định kỳ và xử lý vết bẩn ngay khi vừa phát sinh.`,
        `Khi phối màu, một bảng màu có ba lớp thường dễ áp dụng hơn: màu nền cho sàn và tường, màu chính cho nội thất lớn, màu nhấn cho đèn, thảm, tranh và gối tựa. Cách làm này giúp căn phòng có chiều sâu mà không bị rối mắt. Nếu cần một điểm nhấn rõ hơn, hãy dùng chất liệu khác nhau thay vì thêm quá nhiều màu sắc.`,
        `Bài viết cũng nhắc đến trải nghiệm sau mua: kiểm tra mã đơn, chọn hình thức giao phù hợp, đọc kỹ điều kiện lắp đặt và lưu lại phiếu bảo hành. Với sản phẩm cần lắp ráp, khách nên sắp xếp sẵn không gian trước ngày giao để đội kỹ thuật có thể thao tác nhanh, an toàn và không ảnh hưởng đến đồ đạc có sẵn.`,
        `Sau cùng, ${shopName} xem mỗi căn nhà là một bộ sưu tập đáng sống. Đồ nội thất tốt không cần quá phức tạp; nó cần đúng kích thước, đúng vật liệu, đúng thời điểm và phù hợp với thói quen của người dùng. Đó là lý do các bài blog trong seed data được viết dài, có ngữ cảnh và đủ thông tin để kiểm thử giao diện đọc bài.`,
    ];

    return paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('\n');
};

const buildShippingAddress = (address, note = '') => ({
    fullName: address.fullName,
    phone: address.phone,
    address: address.street,
    city: address.provinceName,
    provinceCode: Number(address.provinceCode),
    provinceName: address.provinceName,
    districtCode: Number(address.districtCode),
    districtName: address.districtName,
    wardCode: null,
    wardName: address.wardName,
    note,
});

const calcDiscount = (coupon, subtotal, shippingFee) => {
    if (!coupon) return 0;
    if (coupon.discountType === 'freeship') return shippingFee;
    if (coupon.discountType === 'fixed') return Math.min(coupon.value, subtotal);
    const raw = Math.floor(subtotal * coupon.value / 100);
    return Math.min(raw, coupon.maxDiscount || raw);
};

const createCategories = async () => {
    const categories = await Category.create(CATEGORIES);
    return new Map(categories.map((category) => [category.name, category]));
};

const createAddresses = async (users) => {
    const addressesByUser = new Map();

    for (const [userIndex, user] of users.entries()) {
        const count = user.role === 'customer' ? 2 : 1;
        const created = [];

        for (let i = 0; i < count; i += 1) {
            const raw = ADDRESS_BOOK[(userIndex + i) % ADDRESS_BOOK.length];
            const doc = await Address.create({
                user: user._id,
                fullName: user.fullName,
                phone: user.phone,
                street: `${raw.street}, ${raw.wardName}, ${raw.districtName}`,
                provinceCode: raw.provinceCode,
                provinceName: raw.provinceName,
                districtCode: raw.districtCode,
                districtName: raw.districtName,
                wardName: raw.wardName,
                lat: raw.lat + i * 0.004,
                lng: raw.lng + i * 0.004,
                formattedAddress: `${raw.street}, ${raw.wardName}, ${raw.districtName}, ${raw.provinceName}`,
                isDefault: i === 0,
            });
            created.push(doc);
        }

        addressesByUser.set(idKey(user), created);
        await User.findByIdAndUpdate(user._id, { addresses: created.map((address) => address._id) });
    }

    return addressesByUser;
};

const createShippingRates = () => {
    const providers = ['jt', 'ghtk', 'viettel'];
    const services = ['economy', 'express'];
    const regions = ['north', 'central', 'south'];
    const rates = [];

    providers.forEach((provider, providerIndex) => {
        services.forEach((service, serviceIndex) => {
            regions.forEach((region, regionIndex) => {
                rates.push({
                    provider,
                    serviceType: service,
                    region,
                    minWeight: 0,
                    maxWeight: 30000,
                    baseFee: 22000 + providerIndex * 3500 + serviceIndex * 16000 + regionIndex * 4500,
                    feePer500g: 2500 + providerIndex * 500 + serviceIndex * 800,
                    estimatedDays: service === 'express'
                        ? { min: 1 + regionIndex, max: 2 + regionIndex }
                        : { min: 3 + regionIndex, max: 5 + regionIndex },
                    isActive: !(provider === 'viettel' && service === 'economy' && region === 'central'),
                    notes: `${provider.toUpperCase()} ${service} ${region}`,
                });
            });
        });
    });

    return ShippingRate.create(rates);
};

const createWallets = async (users) => {
    const wallets = await Wallet.create(users.map((user, index) => ({
        user: user._id,
        balance: user.role === 'customer' ? 12000000 + index * 1500000 : user.role === 'vendor' ? 45000000 + index * 5000000 : 95000000,
        currency: 'VND',
        accounts: [
            {
                type: 'bank',
                accountNumber: `970436${String(100000 + index * 1379).slice(-6)}`,
                accountHolder: user.fullName.toUpperCase(),
                bankName: index % 2 === 0 ? 'Vietcombank' : 'Techcombank',
                branch: index % 2 === 0 ? 'Hồ Chí Minh' : 'Hà Nội',
                isDefault: true,
            },
            {
                type: 'vnpay',
                accountNumber: user.phone,
                accountHolder: user.fullName,
                bankName: 'VNPay',
                branch: 'Ví điện tử',
                isDefault: false,
            },
        ],
        transactions: [
            { type: 'deposit', amount: 5000000 + index * 400000, description: 'Nạp ví ban đầu từ seed data', paymentMethod: 'BANK', status: 'completed' },
            { type: index % 3 === 0 ? 'withdraw' : 'deposit', amount: 1200000 + index * 150000, description: 'Giao dịch mẫu có trạng thái thành công', paymentMethod: 'BANK', status: 'completed' },
            { type: 'deposit', amount: 800000, description: 'Giao dịch đang xử lý để test trạng thái pending', paymentMethod: 'VNPAY', status: 'pending' },
        ],
    })));

    return new Map(wallets.map((wallet) => [idKey(wallet.user), wallet]));
};

const createShops = async (vendors) => {
    const shops = [];

    for (const [index, profile] of SHOP_PROFILES.entries()) {
        const vendor = vendors[index];
        const shop = await Shop.create({
            ...profile,
            owner: vendor._id,
            slug: profile.name,
            status: 'approved',
            isActive: true,
            shippingConfig: {
                enabledProviders: index === 2 ? ['viettel', 'ghtk'] : ['ghtk', 'jt', 'viettel'],
                freeShippingThreshold: 600000 + index * 150000,
                defaultProvider: shippingProviders[index],
                isUrbanZone: index !== 2,
            },
        });
        shops.push({ shop, vendor, profile });
    }

    return shops;
};

const createProductsForShop = async (shopRecord, categoryMap) => {
    const { shop, profile } = shopRecord;
    const shopSeedOffset = SHOP_PROFILES.findIndex((item) => item.code === profile.code);
    const payload = [];

    for (let index = 0; index < profile.productCount; index += 1) {
        const blueprint = PRODUCT_BLUEPRINTS[(index + shopSeedOffset * 4) % PRODUCT_BLUEPRINTS.length];
        const productName = getNaturalProductName(blueprint.category, shopSeedOffset * profile.productCount + index);
        const stockState = getProductStatus(index);
        const basePrice = money(blueprint.price * (1 + (index % 5) * 0.04));
        const originalPrice = index % 4 === 0 ? money(basePrice * 1.14) : null;

        payload.push({
            shop: shop._id,
            name: productName,
            description: buildProductDescription(shop.name, productName, blueprint, profile.accent),
            dimensions: {
                length: 90 + (index % 7) * 12,
                width: 45 + (index % 6) * 8,
                depth: 40 + (index % 5) * 7,
                height: 55 + (index % 8) * 6,
            },
            weight: blueprint.weight + index,
            brand: blueprint.brand,
            color: blueprint.color,
            material: blueprint.material,
            style: blueprint.style,
            requiresAssembly: blueprint.requiresAssembly || index % 3 === 0,
            deliveryType: blueprint.deliveryType || (index % 5 === 0 ? 'with_installation' : 'standard'),
            variant: index % 2 === 0 ? 'Tiêu chuẩn' : 'Cao cấp',
            variants: index % 3 === 0 ? buildProductVariants(profile.code, index, basePrice, stockState.quantity, blueprint.material, blueprint.style) : [],
            price: basePrice,
            originalPrice,
            quantity: stockState.quantity,
            sold: 6 + (index * 7) % 96,
            views: 80 + (index * 59) % 1800,
            category: categoryMap.get(blueprint.category)._id,
            images: [
                blueprint.image,
                `${blueprint.image.split('?')[0]}?w=900&auto=format`,
            ],
            totalRatings: 0,
            averageRating: 0,
            metaTitle: `${productName} tại ${shop.name}`,
            metaDescription: `Sản phẩm ${productName} của ${shop.name}, có đủ dữ liệu tồn kho, biến thể và khuyến mãi.`,
            status: stockState.status,
            isActive: stockState.status !== 'hidden',
        });
    }

    return Product.create(payload);
};

const createPlatformPromotions = async () => {
    const specs = [
        { name: 'Mega Sale toàn sàn 15%', description: 'Admin tạo voucher giảm 15% cho đơn từ 2 triệu.', type: 'coupon', discountType: 'percent', value: 15, maxDiscount: 300000, minOrderValue: 2000000, status: 'running', startDate: daysFromNow(-5), endDate: daysFromNow(15), maxUsage: 500, usedCount: 126 },
        { name: 'Freeship toàn sàn cuối tuần', description: 'Miễn phí vận chuyển cho tất cả shop khi đặt từ 800k.', type: 'freeship', discountType: 'freeship', value: 0, maxDiscount: 80000, minOrderValue: 800000, status: 'running', startDate: daysFromNow(-2), endDate: daysFromNow(4), maxUsage: 300, usedCount: 44 },
        { name: 'Voucher 100K đơn lớn', description: 'Voucher fixed amount cho đơn hàng từ 4 triệu.', type: 'coupon', discountType: 'fixed', value: 100000, maxDiscount: 100000, minOrderValue: 4000000, status: 'ended', startDate: daysFromNow(-30), endDate: daysFromNow(-2), maxUsage: 180, usedCount: 180 },
    ];

    return Promotion.create(specs.map((spec) => ({ ...spec, shop: null, appliesTo: 'all' })));
};

const createShopPromotions = async (shopRecord, products, categoryMap) => {
    const { shop, profile } = shopRecord;
    const firstCategory = products[0]?.category || categoryMap.get('Sofa')._id;
    const specs = [
        { name: `${shop.name} Flash Sale phòng khách`, description: 'Giảm nhanh nhóm sản phẩm nổi bật trong thời gian ngắn.', type: 'flash_sale', discountType: 'percent', value: 18, maxDiscount: 450000, minOrderValue: 0, appliesTo: 'product', products: products.slice(0, 5).map((product) => product._id), startDate: daysFromNow(-1), endDate: daysFromNow(6), maxUsage: 120, usedCount: 18, status: 'running' },
        { name: `${shop.name} Coupon WELCOME`, description: 'Mã giảm giá riêng của shop cho khách mới.', type: 'coupon', discountType: 'percent', value: 10, maxDiscount: 220000, minOrderValue: 1200000, appliesTo: 'all', startDate: daysFromNow(-6), endDate: daysFromNow(20), maxUsage: 200, usedCount: 35, status: 'running' },
        { name: `${shop.name} Freeship nội thành`, description: 'Miễn phí vận chuyển cho khu vực nội thành.', type: 'freeship', discountType: 'freeship', value: 0, maxDiscount: 70000, minOrderValue: 900000, appliesTo: 'all', startDate: daysFromNow(1), endDate: daysFromNow(18), maxUsage: 100, usedCount: 0, status: 'scheduled' },
        { name: `${shop.name} Combo tiết kiệm`, description: 'Mua theo bộ để tối ưu chi phí setup nhà.', type: 'bundle', discountType: 'fixed', value: 350000, maxDiscount: 350000, minOrderValue: 3500000, appliesTo: 'category', categories: [firstCategory], startDate: daysFromNow(-20), endDate: daysFromNow(-1), maxUsage: 80, usedCount: 80, status: 'ended' },
        { name: `${shop.name} Quà tặng decor`, description: `Tặng phụ kiện decor theo phong cách ${profile.accent}.`, type: 'gift', discountType: 'fixed', value: 0, maxDiscount: 0, minOrderValue: 5000000, appliesTo: 'product', products: products.slice(5, 9).map((product) => product._id), startDate: daysFromNow(5), endDate: daysFromNow(25), maxUsage: 60, usedCount: 0, status: shop.code === 'NEST' ? 'paused' : 'draft' },
    ];

    return Promotion.create(specs.map((spec) => ({ ...spec, shop: shop._id })));
};

const createCoupons = async (platformPromotions, shopPromotionMap, shopRecords) => {
    const couponPayload = [
        { code: 'MEGA15', promotion: platformPromotions[0]._id, shop: null, description: 'Voucher toàn sàn 15%', discountType: 'percent', value: 15, maxDiscount: 300000, minOrderValue: 2000000, usageLimit: 500, usedCount: 126, perUserLimit: 1, startDate: platformPromotions[0].startDate, endDate: platformPromotions[0].endDate, isActive: true },
        { code: 'FREESHIPALL', promotion: platformPromotions[1]._id, shop: null, description: 'Miễn phí vận chuyển toàn sàn', discountType: 'freeship', value: 0, maxDiscount: 80000, minOrderValue: 800000, usageLimit: 300, usedCount: 44, perUserLimit: 2, startDate: platformPromotions[1].startDate, endDate: platformPromotions[1].endDate, isActive: true },
        { code: 'FURNI100K', promotion: platformPromotions[2]._id, shop: null, description: 'Voucher toàn sàn đã hết hạn', discountType: 'fixed', value: 100000, maxDiscount: 100000, minOrderValue: 4000000, usageLimit: 180, usedCount: 180, perUserLimit: 1, startDate: platformPromotions[2].startDate, endDate: platformPromotions[2].endDate, isActive: false },
    ];

    for (const record of shopRecords) {
        const promos = shopPromotionMap.get(idKey(record.shop));
        const couponPromo = promos.find((promo) => promo.type === 'coupon');
        const freeshipPromo = promos.find((promo) => promo.type === 'freeship');
        couponPayload.push({
            code: `${record.shop.code}WELCOME10`,
            promotion: couponPromo._id,
            shop: record.shop._id,
            description: `Mã giảm 10% riêng của ${record.shop.name}`,
            discountType: 'percent',
            value: 10,
            maxDiscount: 220000,
            minOrderValue: 1200000,
            usageLimit: 200,
            usedCount: 35,
            perUserLimit: 1,
            startDate: couponPromo.startDate,
            endDate: couponPromo.endDate,
            isActive: true,
        });
        couponPayload.push({
            code: `${record.shop.code}SHIP`,
            promotion: freeshipPromo._id,
            shop: record.shop._id,
            description: `Freeship nội thành của ${record.shop.name}`,
            discountType: 'freeship',
            value: 0,
            maxDiscount: 70000,
            minOrderValue: 900000,
            usageLimit: 100,
            usedCount: 0,
            perUserLimit: 2,
            startDate: freeshipPromo.startDate,
            endDate: freeshipPromo.endDate,
            isActive: true,
        });
    }

    return Coupon.create(couponPayload);
};

const makeOrderItems = (products, shop, seedIndex) => {
    const lineCount = 1 + (seedIndex % 3);
    const items = [];

    for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
        const product = products[(seedIndex * 2 + lineIndex) % products.length];
        const variant = product.variants?.length && lineIndex % 2 === 1 ? product.variants[lineIndex % product.variants.length] : null;
        const originalPrice = variant?.price || product.originalPrice || product.price;
        const discount = (seedIndex + lineIndex) % 5 === 0 ? 10 + (seedIndex % 3) * 5 : 0;
        const price = money(originalPrice * (1 - discount / 100));
        const quantity = 1 + ((seedIndex + lineIndex) % 3);

        items.push({
            product: product._id,
            shop: shop._id,
            shopName: shop.name,
            shopCode: shop.code,
            quantity,
            price,
            originalPrice,
            discount,
            variant: variant?.name || null,
            variantId: variant?._id || null,
            variantSku: variant?.sku || null,
            variantSize: variant?.size || null,
            variantColor: variant?.color || null,
            variantMaterial: variant?.material || null,
            variantStyle: variant?.style || null,
            variantDimensions: variant?.dimensions || { length: 0, width: 0, depth: 0, height: 0 },
            variantWeight: variant?.weight || 0,
            variantDescription: variant?.description || null,
            name: product.name,
            image: product.images?.[0] || null,
        });
    }

    return items;
};

const resolvePaymentStatus = (status, method, seedIndex) => {
    const isOnline = method !== 'COD';
    if (status === 'cancelled') return isOnline ? 'refunded' : 'failed';
    if (status === 'pending') return isOnline && seedIndex % 4 !== 0 ? 'paid' : 'pending';
    if (status === 'delivered') return 'paid';
    if (isOnline) return 'paid';
    return 'pending';
};

const createOrdersForShop = async ({ shopRecord, products, customers, addressesByUser, coupons, shopIndex }) => {
    const { shop, profile } = shopRecord;
    const shopCoupons = coupons.filter((coupon) => !coupon.shop || idKey(coupon.shop) === idKey(shop));
    const orders = [];

    for (let index = 0; index < profile.orderCount; index += 1) {
        const customer = customers[(index + shopIndex) % customers.length];
        const customerAddresses = addressesByUser.get(idKey(customer));
        const address = customerAddresses[index % customerAddresses.length];
        const orderedAt = daysFromNow(-1 * (profile.orderCount - index + shopIndex * 6));
        const status = orderStatuses[(index + shopIndex) % orderStatuses.length];
        const paymentMethod = paymentMethods[(index * 2 + shopIndex) % paymentMethods.length];
        const paymentStatus = resolvePaymentStatus(status, paymentMethod, index);
        const items = makeOrderItems(products, shop, index + shopIndex * 3);
        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const shippingFee = 28000 + (index % 4) * 9000 + shopIndex * 4000;
        const coupon = index % 4 === 0 ? shopCoupons[(index + shopIndex) % shopCoupons.length] : null;
        const couponDiscount = money(calcDiscount(coupon, subtotal, shippingFee));
        const totalPrice = money(subtotal + shippingFee - couponDiscount);
        const onlinePaid = paymentStatus === 'paid' || paymentStatus === 'refunded';
        const refunded = status === 'cancelled' && onlinePaid;
        const shippingTier = index % 3 === 0 ? 'economy' : 'express';
        const voucherPlatformAmount = coupon && !coupon.shop ? couponDiscount : 0;
        const shopCouponDiscount = Math.max(0, couponDiscount - voucherPlatformAmount);
        const taxableRevenue = Math.max(0, subtotal - shopCouponDiscount);
        const commissionAmount = money(taxableRevenue * Number(shop.commissionRate || 2) / 100);
        const vendorTakeHome = Math.max(0, taxableRevenue - commissionAmount);
        const platformFeeAmount = ['delivered', 'shipping'].includes(status) ? commissionAmount : 0;

        const order = await Order.create({
            user: customer._id,
            shop: shop._id,
            shopName: shop.name,
            shopCode: shop.code,
            checkoutGroupId: index % 9 === 0 ? new mongoose.Types.ObjectId().toString() : null,
            products: items,
            shippingAddress: buildShippingAddress(address, index % 5 === 0 ? 'Gọi trước khi giao 30 phút.' : ''),
            paymentMethod,
            paymentStatus,
            payosOrderCode: paymentMethod === 'VNPAY' ? Number(`${Date.now()}${shopIndex}${index}`.slice(-10)) : null,
            status,
            subtotal,
            shippingFee,
            shippingTier,
            shippingProvider: shippingProviders[(index + shopIndex) % shippingProviders.length],
            trackingNumber: ['shipping', 'delivered'].includes(status) ? `${shop.code}${String(index + 10000).padStart(7, '0')}` : null,
            couponDiscount,
            shopCouponDiscount,
            couponCode: coupon?.code || null,
            totalPrice,
            walletUsedAmount: paymentMethod === 'WALLET' ? totalPrice : 0,
            payableAmount: paymentMethod === 'WALLET' ? 0 : totalPrice,
            walletRefundedAmount: refunded ? totalPrice : 0,
            refundedToWalletAt: refunded ? addDays(orderedAt, 3) : null,
            totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
            statusHistory: buildStatusHistory(status, orderedAt),
            cancelRequest: ['cancel_requested', 'cancelled'].includes(status)
                ? {
                    reason: index % 2 === 0 ? 'Khách đổi kích thước sản phẩm.' : 'Khách muốn đổi phương thức thanh toán.',
                    requestedAt: addDays(orderedAt, 1),
                    processedAt: status === 'cancelled' ? addDays(orderedAt, 2) : null,
                    processedBy: status === 'cancelled' ? shopRecord.vendor._id : null,
                    status: status === 'cancelled' ? 'approved' : 'pending',
                }
                : undefined,
            orderedAt,
            confirmedAt: ['confirmed', 'preparing', 'shipping', 'delivered', 'cancelled', 'cancel_requested'].includes(status) ? addDays(orderedAt, 1) : undefined,
            deliveredAt: status === 'delivered' ? addDays(orderedAt, 5) : undefined,
            cancelledAt: status === 'cancelled' ? addDays(orderedAt, 2) : undefined,
            estimatedDelivery: addDays(orderedAt, shippingTier === 'express' ? 3 : 6),
            paymentExpiresAt: paymentMethod === 'VNPAY' && paymentStatus === 'pending' ? addDays(orderedAt, 1) : null,
            voucherSponsorType: coupon ? (coupon.shop ? 'shop' : 'platform') : null,
            voucherPlatformAmount,
            platformDiscountAmount: voucherPlatformAmount,
            shippingSponsorType: coupon?.discountType === 'freeship' ? (coupon.shop ? 'shop' : 'platform') : null,
            shippingPlatformAmount: coupon?.discountType === 'freeship' && !coupon.shop ? couponDiscount : 0,
            taxableRevenue,
            commissionRate: Number(shop.commissionRate || 2),
            commissionAmount,
            vendorTakeHome,
            platformFeeAmount,
            platformFeePercent: Number(shop.commissionRate || 2),
            payoutStatus: status === 'cancelled' ? 'reversed' : status === 'delivered' && index % 3 === 0 ? 'paid' : 'pending',
            payoutAt: status === 'delivered' && index % 3 === 0 ? addDays(orderedAt, 8) : null,
            voucherRolledBack: refunded && Boolean(coupon),
        });

        orders.push(order);
    }

    return orders;
};

const createRevenueDemoOrdersForShop = async ({ shopRecord, products, customers, addressesByUser, coupons, shopIndex }) => {
    const { shop } = shopRecord;
    const shopCoupons = coupons.filter((coupon) => coupon.shop && idKey(coupon.shop) === idKey(shop));
    const orders = [];
    const demoOrderCount = 60;

    for (let index = 0; index < demoOrderCount; index += 1) {
        const customer = customers[(index * 2 + shopIndex) % customers.length];
        const customerAddresses = addressesByUser.get(idKey(customer));
        const address = customerAddresses[(index + shopIndex) % customerAddresses.length];
        const payoutAt = daysFromNow(-1 * ((index + shopIndex * 3) % 45));
        const orderedAt = addDays(payoutAt, -7 - (index % 3));
        const deliveredAt = addDays(payoutAt, -2);
        const paymentMethod = paymentMethods[(index + shopIndex) % paymentMethods.length];
        const items = makeOrderItems(products, shop, 500 + index + shopIndex * 17);
        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const shippingFee = 30000 + (index % 5) * 8000;
        const coupon = index % 5 === 0 && shopCoupons.length ? shopCoupons[(index + shopIndex) % shopCoupons.length] : null;
        const couponDiscount = money(calcDiscount(coupon, subtotal, shippingFee));
        const totalPrice = money(subtotal + shippingFee - couponDiscount);
        const taxableRevenue = Math.max(0, subtotal - couponDiscount);
        const commissionRate = Number(shop.commissionRate || 2);
        const commissionAmount = money(taxableRevenue * commissionRate / 100);
        const vendorTakeHome = Math.max(0, taxableRevenue - commissionAmount);
        const shippingTier = index % 4 === 0 ? 'economy' : 'express';

        const order = await Order.create({
            user: customer._id,
            shop: shop._id,
            shopName: shop.name,
            shopCode: shop.code,
            checkoutGroupId: index % 12 === 0 ? new mongoose.Types.ObjectId().toString() : null,
            products: items,
            shippingAddress: buildShippingAddress(address, index % 6 === 0 ? 'Đơn demo doanh thu, ưu tiên giao giờ hành chính.' : ''),
            paymentMethod,
            paymentStatus: 'paid',
            payosOrderCode: paymentMethod === 'VNPAY' ? Number(`${Date.now()}${shopIndex}${index}`.slice(-10)) : null,
            status: 'delivered',
            subtotal,
            shippingFee,
            shippingTier,
            shippingProvider: shippingProviders[(index + shopIndex) % shippingProviders.length],
            trackingNumber: `${shop.code}${String(index + 50000).padStart(7, '0')}`,
            couponDiscount,
            shopCouponDiscount: couponDiscount,
            couponCode: coupon?.code || null,
            totalPrice,
            walletUsedAmount: paymentMethod === 'WALLET' ? totalPrice : 0,
            payableAmount: paymentMethod === 'WALLET' ? 0 : totalPrice,
            walletRefundedAmount: 0,
            refundedToWalletAt: null,
            totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
            statusHistory: buildStatusHistory('delivered', orderedAt),
            orderedAt,
            confirmedAt: addDays(orderedAt, 1),
            deliveredAt,
            cancelledAt: null,
            estimatedDelivery: addDays(orderedAt, shippingTier === 'express' ? 3 : 6),
            paymentExpiresAt: null,
            voucherSponsorType: coupon ? 'shop' : null,
            voucherPlatformAmount: 0,
            platformDiscountAmount: 0,
            shippingSponsorType: null,
            shippingPlatformAmount: 0,
            taxableRevenue,
            commissionRate,
            commissionAmount,
            vendorTakeHome,
            platformFeeAmount: commissionAmount,
            platformFeePercent: commissionRate,
            payoutStatus: 'paid',
            payoutAt,
            voucherRolledBack: false,
            createdAt: orderedAt,
            updatedAt: payoutAt,
        });

        orders.push(order);
    }

    return orders;
};

const createVouchers = async ({ customers, coupons, orders, shopRecords }) => {
    const shopNameById = new Map(shopRecords.map((record) => [idKey(record.shop), record.shop.name]));
    const payload = [];

    customers.forEach((customer, customerIndex) => {
        const customerOrders = orders.filter((order) => idKey(order.user) === idKey(customer));
        for (let index = 0; index < 3; index += 1) {
            const coupon = coupons[(customerIndex * 3 + index) % coupons.length];
            const status = index === 1 ? VOUCHER_STATUS.USED : index === 3 ? VOUCHER_STATUS.EXPIRED : VOUCHER_STATUS.ACTIVE;
            payload.push({
                user: customer._id,
                coupon: coupon._id,
                code: coupon.code,
                description: coupon.description,
                discountType: coupon.discountType,
                value: coupon.value,
                maxDiscount: coupon.maxDiscount,
                minOrderValue: coupon.minOrderValue,
                endDate: status === VOUCHER_STATUS.EXPIRED ? daysFromNow(-3) : coupon.endDate,
                shopId: coupon.shop || null,
                shopName: coupon.shop ? shopNameById.get(idKey(coupon.shop)) || '' : '',
                status,
                usedForOrder: status === VOUCHER_STATUS.USED ? customerOrders[index % Math.max(1, customerOrders.length)]?._id || null : null,
                claimedAt: daysFromNow(-15 + index),
                usedAt: status === VOUCHER_STATUS.USED ? daysFromNow(-4 + index) : null,
            });
        }
    });

    return VoucherWallet.create(payload);
};

const createWalletTransactionsFromOrders = async ({ orders, walletByUser, shopRecords }) => {
    const transactionPayload = [];
    const ordersByShop = new Map();
    orders.forEach((order) => {
        const key = idKey(order.shop);
        ordersByShop.set(key, [...(ordersByShop.get(key) || []), order]);
    });

    for (const record of shopRecords) {
        const wallet = walletByUser.get(idKey(record.vendor));
        let balance = wallet.balance;
        const embeddedTransactions = [...wallet.transactions];
        const shopOrders = ordersByShop.get(idKey(record.shop)) || [];

        for (const order of shopOrders) {
            if (order.status === 'delivered') {
                const income = money(order.vendorTakeHome || (order.totalPrice - order.shippingFee - order.platformFeeAmount));
                const payoutCompleted = order.payoutStatus === 'paid';
                if (payoutCompleted) balance += income;
                transactionPayload.push({
                    wallet: wallet._id,
                    shop: record.shop._id,
                    type: 'credit',
                    category: 'order_income',
                    amount: income,
                    status: payoutCompleted ? 'success' : 'pending',
                    description: `Doanh thu đơn ${order.orderNumber}`,
                    order: order._id,
                    balanceAfter: payoutCompleted ? balance : null,
                });
                embeddedTransactions.push({
                    type: 'deposit',
                    amount: income,
                    description: `Ghi nhận doanh thu đơn ${order.orderNumber}`,
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    paymentMethod: order.paymentMethod,
                    status: payoutCompleted ? 'completed' : 'pending',
                });
            }

            if (order.walletRefundedAmount > 0) {
                balance = Math.max(0, balance - order.walletRefundedAmount);
                transactionPayload.push({
                    wallet: wallet._id,
                    shop: record.shop._id,
                    type: 'debit',
                    category: 'refund',
                    amount: order.walletRefundedAmount,
                    status: 'success',
                    description: `Hoàn tiền đơn hủy ${order.orderNumber}`,
                    order: order._id,
                    balanceAfter: balance,
                });
            }
        }

        await Wallet.findByIdAndUpdate(wallet._id, { balance, transactions: embeddedTransactions });
    }

    for (const order of orders) {
        const wallet = walletByUser.get(idKey(order.user));
        if (!wallet) continue;

        const pushed = [];
        if (order.paymentMethod === 'WALLET') {
            pushed.push({
                type: 'payment',
                amount: order.totalPrice,
                description: `Thanh toán đơn ${order.orderNumber}`,
                orderId: order._id,
                orderNumber: order.orderNumber,
                paymentMethod: 'WALLET',
                status: order.paymentStatus === 'pending' ? 'pending' : 'completed',
            });
        }
        if (order.walletRefundedAmount > 0) {
            pushed.push({
                type: 'cancellation_refund',
                amount: order.walletRefundedAmount,
                description: `Hoàn tiền đơn hủy ${order.orderNumber}`,
                orderId: order._id,
                orderNumber: order.orderNumber,
                paymentMethod: order.paymentMethod,
                status: 'completed',
            });
        }
        if (pushed.length) {
            await Wallet.findByIdAndUpdate(wallet._id, { $push: { transactions: { $each: pushed } } });
        }
    }

    return Transaction.create(transactionPayload);
};

const createReviews = async ({ orders, productsByShop, customers }) => {
    const deliveredOrders = orders.filter((order) => order.status === 'delivered');
    const payload = [];

    deliveredOrders.slice(0, 24).forEach((order, index) => {
        const item = order.products[index % order.products.length];
        payload.push({
            type: 'product',
            status: index % 9 === 0 ? 'pending' : index % 13 === 0 ? 'rejected' : 'approved',
            user: order.user,
            targetId: item.product,
            product: item.product,
            shop: order.shop,
            order: order._id,
            rating: 3 + (index % 3),
            content: index % 5 === 0
                ? 'Sản phẩm đúng mô tả, đóng gói cẩn thận nhưng thời gian giao còn có thể cải thiện.'
                : 'Chất liệu đẹp, màu sắc hợp không gian và shop tư vấn rất kỹ trước khi giao.',
            images: index % 4 === 0 ? [item.image].filter(Boolean) : [],
            vendorReply: index % 2 === 0
                ? { content: 'Shop cảm ơn anh/chị đã đánh giá, chúng em sẽ tiếp tục cải thiện dịch vụ.', repliedAt: daysFromNow(-1) }
                : { content: '', repliedAt: null },
            createdAt: daysFromNow(-20 + index),
        });
    });

    for (const [shopId, products] of productsByShop.entries()) {
        const customer = customers[payload.length % customers.length];
        const product = products[0];
        payload.push({
            type: 'shop',
            status: 'approved',
            user: customer._id,
            targetId: shopId,
            shop: shopId,
            rating: 5,
            content: 'Trải nghiệm mua hàng tốt, shop phản hồi nhanh và có nhiều sản phẩm để phối đồng bộ.',
            vendorReply: { content: 'Cảm ơn anh/chị đã tin tưởng shop.', repliedAt: daysFromNow(-2) },
            product: null,
            order: null,
        });
        payload.push({
            type: 'product',
            status: 'approved',
            user: customer._id,
            targetId: product._id,
            product: product._id,
            shop: shopId,
            rating: 5,
            content: 'Sản phẩm mẫu đẹp và tỷ lệ rất vừa với căn hộ.',
            vendorReply: { content: '', repliedAt: null },
        });
    }

    const reviews = await Review.create(payload);
    const ratingByProduct = new Map();

    reviews.filter((review) => review.type === 'product' && review.status === 'approved').forEach((review) => {
        const key = idKey(review.product);
        ratingByProduct.set(key, [...(ratingByProduct.get(key) || []), review]);
    });

    for (const [productId, productReviews] of ratingByProduct.entries()) {
        const averageRating = productReviews.reduce((sum, review) => sum + review.rating, 0) / productReviews.length;
        await Product.findByIdAndUpdate(productId, {
            averageRating: Number(averageRating.toFixed(1)),
            totalRatings: productReviews.length,
            ratings: productReviews.map((review) => ({
                star: review.rating,
                postedBy: review.user,
                comment: review.content,
                createdAt: review.createdAt,
            })),
        });
    }

    return reviews;
};

const createCarts = async ({ customers, productsByShop, shopRecords }) => {
    const allProducts = Array.from(productsByShop.values()).flat();
    const carts = [];

    for (const [index, customer] of customers.entries()) {
        const products = [0, 1, 2].map((offset) => allProducts[(index * 4 + offset) % allProducts.length]);
        const cartProducts = products.map((product, offset) => {
            const shopRecord = shopRecords.find((record) => idKey(record.shop) === idKey(product.shop));
            const variant = product.variants?.[0] || null;
            return {
                product: product._id,
                quantity: 1 + ((index + offset) % 2),
                price: variant?.price || product.price,
                originalPrice: product.originalPrice || product.price,
                name: product.name,
                image: product.images?.[0] || null,
                shop: product.shop,
                shopName: shopRecord?.shop.name || 'Shop',
                shopAvatar: shopRecord?.shop.logo || null,
                discount: offset === 0 ? 10 : 0,
                variant: variant?.name || null,
                variantId: variant?._id || null,
                variantIndex: variant ? 0 : null,
                variantSku: variant?.sku || null,
                variantSize: variant?.size || null,
                variantPrice: variant?.price || null,
                variantStock: variant?.stock || null,
                variantColor: variant?.color || null,
                variantMaterial: variant?.material || null,
                variantStyle: variant?.style || null,
                variantDimensions: variant?.dimensions || undefined,
                variantWeight: variant?.weight || null,
                variantDescription: variant?.description || null,
            };
        });

        carts.push(await Cart.create({ user: customer._id, products: cartProducts }));
    }

    return carts;
};

const createBlogs = async ({ shopRecords, productsByShop }) => {
    const payload = [];

    for (const [shopIndex, record] of shopRecords.entries()) {
        const products = productsByShop.get(idKey(record.shop));
        BLOG_TITLES.forEach((blog, index) => {
            const status = index === 3 ? 'draft' : index === 4 && shopIndex === 1 ? 'scheduled' : 'published';
            payload.push({
                shop: record.shop._id,
                author: record.vendor._id,
                title: `${blog.title} - ${record.shop.name}`,
                excerpt: `Gợi ý thực tế từ ${record.shop.name} về ${blog.tags.join(', ')}.`,
                content: buildBlogContent(record.shop.name, blog.title, record.profile.accent),
                coverImage: products[(index * 2) % products.length]?.images?.[0] || record.shop.banner,
                category: blog.category,
                tags: [...blog.tags, record.profile.code.toLowerCase()],
                products: products.slice(index, index + 3).map((product) => product._id),
                status,
                publishedAt: status === 'published' ? daysFromNow(-14 + index * 2) : null,
                scheduledAt: status === 'scheduled' ? daysFromNow(7 + index) : null,
                views: status === 'published' ? 500 + shopIndex * 300 + index * 220 : 0,
                likes: status === 'published' ? 40 + index * 27 : 0,
                commentsCount: status === 'published' ? 5 + index * 3 : 0,
                allowComments: index !== 3,
                allowLikes: true,
                isPinned: index === 0,
                likedBy: [],
            });
        });
    }

    return Blog.create(payload);
};
const createBlogComments = async (blogs, customers, vendors) => {
    const topLevelComments = [];
    const contents = [
        'Bài viết rất chi tiết và hữu ích! Mình đang setup lại phòng khách và bài này giải quyết đúng vấn đề mình thắc mắc.',
        'Cho mình hỏi thêm về chất liệu được nhắc đến trong bài, độ bền thực tế khoảng bao nhiêu năm vậy shop?',
        'Cách phối màu này đẹp quá, lưu lại để mốt làm nhà áp dụng liền.',
        'Mùa mưa ở Sài Gòn nhà mình hay bị ẩm, bài viết lưu ý đúng cái mình đang cần tìm cách khắc phục cho tủ kệ gỗ.',
        'Shop cho mình hỏi bộ sưu tập mới này chừng nào có sẵn tại showroom để ghé xem thực tế ạ?'
    ];

    for (const [index, blog] of blogs.entries()) {
        if (blog.status !== 'published') continue; 

        const numComments = 2 + (index % 3); 

        for (let j = 0; j < numComments; j++) {
            const customer = customers[(index + j) % customers.length];
            const content = contents[(index + j) % contents.length];
            
            const comment = await BlogComment.create({
                blog: blog._id,
                author: customer._id,
                content: content,
                parentComment: null, 
                createdAt: daysFromNow(-10 + j), 
            });
            
            topLevelComments.push({ comment, blog });
        }
    }

    const replies = [];
    for (const [index, parent] of topLevelComments.entries()) {
        if (index % 2 === 0) { 
            replies.push({
                blog: parent.blog._id,
                author: parent.blog.author,
                content: 'Chào bạn, cảm ơn bạn đã quan tâm bài viết! Bên mình đã xử lý vật liệu kỹ càng nên bạn hoàn toàn yên tâm sử dụng nhé.',
                parentComment: parent.comment._id,
                createdAt: addDays(parent.comment.createdAt, 1), 
            });
        }
    }

    if (replies.length > 0) {
        await BlogComment.create(replies);
    }

    return topLevelComments.length + replies.length;
};

const createNotifications = async ({ users, customers, shopRecords, orders, productsByShop, promotions, transactions }) => {
    const payload = [];
    const latestOrders = [...orders].sort((a, b) => b.orderedAt - a.orderedAt);

    users.filter((user) => user.role === 'admin').forEach((admin) => {
        payload.push(
            { user: admin._id, type: 'promotion', title: 'Khuyến mãi toàn sàn đang chạy', body: 'Mega Sale toàn sàn 15% đang có lượt sử dụng cao.', relatedId: promotions[0]._id, relatedModel: 'Promotion', isRead: false, link: '/admin/promotions' },
            { user: admin._id, type: 'wallet', title: 'Giao dịch payout mới', body: 'Có giao dịch vendor đang chờ đối soát.', relatedId: transactions[0]?._id || null, relatedModel: transactions[0] ? 'Transaction' : null, isRead: true, link: '/admin/transactions' },
        );
    });

    shopRecords.forEach((record, index) => {
        const products = productsByShop.get(idKey(record.shop));
        const shopOrders = latestOrders.filter((order) => idKey(order.shop) === idKey(record.shop));
        payload.push(
            { user: record.vendor._id, type: 'order', title: 'Đơn hàng mới cần xử lý', body: `${record.shop.name} có đơn mới đang chờ xác nhận.`, relatedId: shopOrders[0]?._id || null, relatedModel: shopOrders[0] ? 'Order' : null, isRead: false, link: '/vendor/orders' },
            { user: record.vendor._id, type: 'stock', title: 'Cảnh báo tồn kho', body: `${products.find((product) => product.quantity === 0)?.name || products[0].name} đang hết hoặc sắp hết hàng.`, relatedId: products[0]._id, relatedModel: 'Product', isRead: false, link: '/vendor/products' },
            { user: record.vendor._id, type: 'review', title: 'Đánh giá mới từ khách hàng', body: 'Khách vừa gửi đánh giá sản phẩm, hãy phản hồi để tăng uy tín shop.', isRead: index % 2 === 0, link: '/vendor/reviews' },
            { user: record.vendor._id, type: 'wallet', title: 'Payout đang đối soát', body: 'Doanh thu đơn delivered đã được ghi nhận vào ví vendor.', isRead: false, link: '/vendor/wallet' },
            { user: record.vendor._id, type: 'promotion', title: 'Khuyến mãi sắp diễn ra', body: 'Freeship nội thành đã được lên lịch cho shop.', relatedId: promotions.find((promo) => idKey(promo.shop) === idKey(record.shop) && promo.type === 'freeship')?._id || null, relatedModel: 'Promotion', isRead: true, link: '/vendor/promotions' },
        );
    });

    customers.forEach((customer, index) => {
        const customerOrders = latestOrders.filter((order) => idKey(order.user) === idKey(customer));
        const paidOrder = customerOrders.find((order) => order.paymentStatus === 'paid') || customerOrders[0];
        const refundOrder = customerOrders.find((order) => order.walletRefundedAmount > 0);
        payload.push(
            { user: customer._id, type: 'order', title: 'Đặt hàng thành công', body: `Đơn ${paidOrder?.orderNumber || ''} đã được tạo và đang xử lý.`, relatedId: paidOrder?._id || null, relatedModel: paidOrder ? 'Order' : null, isRead: false, link: paidOrder ? `/orders/${paidOrder._id}` : '/orders' },
            { user: customer._id, type: 'order', title: 'Đơn hàng cập nhật trạng thái', body: 'Một đơn hàng của bạn vừa được cập nhật trạng thái giao hàng.', relatedId: customerOrders[1]?._id || null, relatedModel: customerOrders[1] ? 'Order' : null, isRead: index % 2 === 0, link: customerOrders[1] ? `/orders/${customerOrders[1]._id}` : '/orders' },
            { user: customer._id, type: 'wallet', title: refundOrder ? 'Hoàn tiền về ví thành công' : 'Ví điện tử sẵn sàng', body: refundOrder ? `Đơn ${refundOrder.orderNumber} đã được hoàn ${refundOrder.walletRefundedAmount.toLocaleString('vi-VN')} VND.` : 'Bạn có thể dùng ví điện tử để thanh toán đơn tiếp theo.', relatedId: refundOrder?._id || null, relatedModel: refundOrder ? 'Order' : null, isRead: false, link: refundOrder ? `/orders/${refundOrder._id}` : '/profile' },
            { user: customer._id, type: 'promotion', title: 'Voucher mới trong ví', body: 'Bạn có voucher toàn sàn và voucher riêng của shop đang khả dụng.', relatedId: promotions[index % promotions.length]._id, relatedModel: 'Promotion', isRead: true, link: '/vouchers' },
            { user: customer._id, type: 'system', title: 'Cảm ơn bạn đã mua sắm tại Furni', body: 'Hãy theo dõi thông báo để cập nhật giao hàng và khuyến mãi mới.', isRead: true, link: '' },
        );
    });

    return Notification.create(payload);
};

const clearDatabase = async () => {
    await Promise.all([
        User.deleteMany({}),
        Category.deleteMany({}),
        Shop.deleteMany({}),
        Wallet.deleteMany({}),
        Product.deleteMany({}),
        Promotion.deleteMany({}),
        Coupon.deleteMany({}),
        VoucherWallet.deleteMany({}),
        Order.deleteMany({}),
        Cart.deleteMany({}),
        Transaction.deleteMany({}),
        Review.deleteMany({}),
        Notification.deleteMany({}),
        Blog.deleteMany({}),
        Address.deleteMany({}),
        ShippingRate.deleteMany({}),
        BlogComment.deleteMany({}),
    ]);

    await mongoose.connection.collection('ordercounters').deleteMany({}).catch(() => {});
};

const seed = async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/furni-ecommerce');
    console.log('Connected to MongoDB');

    await clearDatabase();
    console.log('Cleared old seed data');

    const users = await User.create(USERS);
    const admin = users.find((user) => user.role === 'admin');
    const vendors = users.filter((user) => user.role === 'vendor');
    const customers = users.filter((user) => user.role === 'customer');
    console.log(`Created users: 1 admin, ${vendors.length} vendors, ${customers.length} customers`);

    const addressesByUser = await createAddresses(users);
    console.log('Created addresses for all users');

    const categoryMap = await createCategories();
    await createShippingRates();
    console.log(`Created ${categoryMap.size} categories and 18 shipping rates`);

    const walletByUser = await createWallets(users);
    console.log(`Created ${walletByUser.size} wallets with bank/e-wallet accounts`);

    const shopRecords = await createShops(vendors);
    console.log(`Created ${shopRecords.length} shops`);

    const productsByShop = new Map();
    for (const record of shopRecords) {
        const products = await createProductsForShop(record, categoryMap);
        productsByShop.set(idKey(record.shop), products);
        console.log(`Created ${products.length} products for ${record.shop.name}`);
    }

    const platformPromotions = await createPlatformPromotions();
    const shopPromotionMap = new Map();
    for (const record of shopRecords) {
        const promotions = await createShopPromotions(record, productsByShop.get(idKey(record.shop)), categoryMap);
        shopPromotionMap.set(idKey(record.shop), promotions);
        console.log(`Created ${promotions.length} promotions for ${record.shop.name}`);
    }
    const allPromotions = [...platformPromotions, ...Array.from(shopPromotionMap.values()).flat()];
    const coupons = await createCoupons(platformPromotions, shopPromotionMap, shopRecords);
    console.log(`Created ${platformPromotions.length} platform promotions, ${allPromotions.length - platformPromotions.length} shop promotions and ${coupons.length} coupons`);

    const allOrders = [];
    for (const [shopIndex, record] of shopRecords.entries()) {
        const orders = await createOrdersForShop({
            shopRecord: record,
            products: productsByShop.get(idKey(record.shop)),
            customers,
            addressesByUser,
            coupons,
            shopIndex,
        });
        allOrders.push(...orders);
        console.log(`Created ${orders.length} orders for ${record.shop.name}`);

        const revenueDemoOrders = await createRevenueDemoOrdersForShop({
            shopRecord: record,
            products: productsByShop.get(idKey(record.shop)),
            customers,
            addressesByUser,
            coupons,
            shopIndex,
        });
        allOrders.push(...revenueDemoOrders);
        console.log(`Created ${revenueDemoOrders.length} revenue demo orders for ${record.shop.name}`);
    }

    await createVouchers({ customers, coupons, orders: allOrders, shopRecords });
    console.log('Created voucher wallets for customers');

    const transactions = await createWalletTransactionsFromOrders({ orders: allOrders, walletByUser, shopRecords });
    console.log(`Created ${transactions.length} ledger transactions`);

    const reviews = await createReviews({ orders: allOrders, productsByShop, customers });
    console.log(`Created ${reviews.length} reviews`);

    const carts = await createCarts({ customers, productsByShop, shopRecords });
    console.log(`Created ${carts.length} carts`);

    const blogs = await createBlogs({ shopRecords, productsByShop });
    console.log(`Created ${blogs.length} long blog posts`);

    const totalComments = await createBlogComments(blogs, customers, vendors);
    console.log(`Created ${totalComments} comments and replies for blogs`);

    const notifications = await createNotifications({
        users,
        customers,
        shopRecords,
        orders: allOrders,
        productsByShop,
        promotions: allPromotions,
        transactions,
    });
    console.log(`Created ${notifications.length} notifications`);

    console.log('\n==================== DONE ====================');
    console.log(`Admin   : ${admin.email} / Admin123`);
    vendors.forEach((vendor, index) => console.log(`Vendor ${index + 1}: ${vendor.email} / Vendor123`));
    customers.forEach((customer, index) => console.log(`Customer ${index + 1}: ${customer.email} / Customer123`));
    console.log('Summary : 3 shops, 55 products, 285 orders, 19 promotions, 15 blogs');
    console.log('=============================================');
};

seed()
    .catch((error) => {
        console.error('Seed error:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect().catch(() => {});
    });