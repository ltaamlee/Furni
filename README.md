# Sora - Website bán nội thất

## Danh sách các thành viên

- Nguyễn Thị Thu Linh - 23110254
- Lê Thị Thanh Tâm - 23110312
- Nguyễn Phương Thi - 23110330

## 1. Tổng quan đề tài

Sora là website thương mại điện tử chuyên kinh doanh sản phẩm nội thất, được xây dựng theo mô hình nhiều cửa hàng trên cùng một nền tảng. Hệ thống đóng vai trò kết nối giữa khách hàng có nhu cầu mua sắm nội thất, nhà bán hàng muốn quản lý gian hàng trực tuyến và quản trị viên chịu trách nhiệm vận hành toàn bộ sàn.

## 2. Mục tiêu xây dựng hệ thống

- Xây dựng một website bán nội thất có giao diện hiện đại, dễ sử dụng và phù hợp với nhiều nhóm người dùng.
- Hỗ trợ khách hàng tìm kiếm sản phẩm, xem thông tin chi tiết, đặt hàng, thanh toán và theo dõi đơn hàng trực tuyến.
- Hỗ trợ nhà bán hàng quản lý gian hàng, sản phẩm, tồn kho, đơn hàng, khuyến mãi và doanh thu.
- Hỗ trợ quản trị viên kiểm soát toàn bộ hoạt động của hệ thống, bao gồm người dùng, cửa hàng, danh mục, vận chuyển, khuyến mãi và báo cáo.
- Tổ chức hệ thống theo kiến trúc rõ ràng, có khả năng mở rộng và thuận tiện cho việc bảo trì, nâng cấp trong tương lai.

## 3. Cách hệ thống hoạt động

Hệ thống Sora được tổ chức theo mô hình Client - Server. Người dùng thao tác trên giao diện website, sau đó các yêu cầu như đăng nhập, xem sản phẩm, thêm vào giỏ hàng, đặt hàng hoặc quản lý dữ liệu sẽ được gửi đến máy chủ thông qua API.

## 4. Chức năng theo từng vai trò

### 4.1. Khách hàng

Khách hàng là nhóm người dùng trực tiếp mua sắm trên website. Hệ thống cho phép khách hàng đăng ký tài khoản, đăng nhập, xác thực OTP qua email, quên mật khẩu và cập nhật thông tin cá nhân.

Trong quá trình mua sắm, khách hàng có thể xem danh sách sản phẩm, tìm kiếm sản phẩm, lọc theo danh mục, xem chi tiết thông tin sản phẩm, theo dõi sản phẩm đã xem gần đây và thêm sản phẩm vào danh sách yêu thích. Khi có nhu cầu mua hàng, khách hàng có thể quản lý giỏ hàng, áp dụng mã giảm giá, chọn địa chỉ nhận hàng, thanh toán trực tuyến và theo dõi trạng thái đơn hàng.

Sau khi hoàn tất giao dịch, khách hàng có thể xem lịch sử mua hàng, xem chi tiết đơn hàng và đánh giá sản phẩm. Ngoài ra, hệ thống còn cung cấp phần blog để khách hàng tham khảo các bài viết liên quan đến nội thất, góp phần hỗ trợ quá trình lựa chọn sản phẩm.

### 4.2. Nhà bán hàng

Nhà bán hàng là người quản lý gian hàng và kinh doanh sản phẩm trên nền tảng. Trước khi hoạt động, nhà bán hàng có thể đăng ký gian hàng và chờ quản trị viên kiểm duyệt. Sau khi được duyệt, nhà bán hàng có thể cấu hình thông tin cửa hàng, bật hoặc tắt trạng thái hoạt động của gian hàng.

Đối với sản phẩm, nhà bán hàng có thể thêm mới, chỉnh sửa, quản lý hình ảnh, giá bán, số lượng tồn kho và các biến thể như kích thước, màu sắc hoặc chất liệu. Hệ thống hỗ trợ cập nhật tồn kho theo trạng thái sản phẩm, giúp nhà bán hàng dễ dàng kiểm soát tình trạng kinh doanh.

Đối với đơn hàng, nhà bán hàng có thể tiếp nhận, xác nhận, chuẩn bị hàng, chuyển sang trạng thái giao hàng và theo dõi kết quả xử lý. Bên cạnh đó, nhà bán hàng có thể tạo chương trình khuyến mãi riêng, quản lý bài viết blog, phản hồi đánh giá của khách hàng, nhận thông báo và theo dõi doanh thu thông qua ví điện tử và báo cáo của gian hàng.

### 4.3. Quản trị viên

Quản trị viên là người chịu trách nhiệm vận hành và kiểm soát toàn bộ hệ thống. Quản trị viên có thể quản lý tài khoản người dùng, phân quyền, khóa hoặc mở khóa tài khoản khi cần thiết.

Đối với hoạt động bán hàng, quản trị viên có quyền kiểm duyệt gian hàng, quản lý danh mục sản phẩm chung, theo dõi toàn bộ đơn hàng phát sinh trên hệ thống và hỗ trợ xử lý các vấn đề liên quan đến người mua và nhà bán hàng.

Ngoài ra, quản trị viên còn quản lý các chương trình khuyến mãi toàn sàn, cấu hình tỷ lệ chiết khấu, quản lý phí vận chuyển, đơn vị vận chuyển, cấu hình nền tảng và theo dõi báo cáo doanh thu tổng thể. Các chức năng này giúp quản trị viên nắm được tình hình hoạt động của toàn hệ thống và đưa ra điều chỉnh phù hợp.

## 5. Kết quả đạt được

Hệ thống đã xây dựng được các chức năng cơ bản của một website thương mại điện tử nội thất theo mô hình nhiều cửa hàng. Các nghiệp vụ chính như quản lý tài khoản, sản phẩm, giỏ hàng, đơn hàng, thanh toán, khuyến mãi, ví điện tử, đánh giá, blog và báo cáo doanh thu đã được phân chia theo từng vai trò cụ thể.

Giao diện hệ thống được tổ chức thành các khu vực riêng cho khách hàng, nhà bán hàng và quản trị viên. Điều này giúp người dùng thao tác thuận tiện hơn, đồng thời bảo đảm mỗi nhóm người dùng chỉ truy cập đúng phạm vi chức năng được cấp.

## 6. Hạn chế và hướng phát triển

Hệ thống hiện tập trung phát triển trên nền tảng web, chưa có ứng dụng riêng cho thiết bị di động. Một số chức năng nâng cao như gợi ý sản phẩm theo hành vi người dùng, tìm kiếm thông minh, hỗ trợ đa ngôn ngữ hoặc hiển thị sản phẩm bằng mô hình 3D chưa được triển khai.

Trong tương lai, hệ thống có thể mở rộng theo hướng phát triển ứng dụng di động hoặc Progressive Web App, bổ sung công nghệ gợi ý sản phẩm, tối ưu trải nghiệm tìm kiếm, mở rộng báo cáo dự báo doanh thu và tồn kho. Bên cạnh đó, hệ thống cũng cần được tăng cường kiểm thử hiệu năng, bảo mật, sao lưu và phục hồi dữ liệu trước khi triển khai thực tế.

## 7. Công nghệ sử dụng

| Thành phần | Công nghệ |
| --- | --- |
| Giao diện | ReactJS, Vite, Tailwind CSS, React Router |
| Máy chủ | Node.js, Express.js |
| Cơ sở dữ liệu | MongoDB, Mongoose |
| Xác thực | JWT, OTP qua email, Google Login |
| Thanh toán | PayOS |
| Lưu trữ hình ảnh | Cloudinary |
| Bảo mật | Helmet, CORS, Rate Limit, bcrypt, chống NoSQL Injection và XSS |

## 8. Cấu trúc

```text
Furni/
|-- BE/                 # Mã nguồn back-end
|   |-- src/
|   |   |-- config/      # Cấu hình hệ thống
|   |   |-- controllers/ # Xử lý nghiệp vụ
|   |   |-- middleware/  # Xác thực, phân quyền, validate, upload
|   |   |-- models/      # Mô hình dữ liệu MongoDB
|   |   |-- routes/      # Định nghĩa API
|   |   |-- services/    # Dịch vụ xử lý phụ trợ
|   |   `-- utils/       # Hàm tiện ích
|   `-- tests/           # Kiểm thử và dữ liệu mẫu
|
|-- FE/                 # Mã nguồn front-end
|   |-- public/          # Tài nguyên tĩnh
|   `-- src/
|       |-- components/  # Component dùng chung và layout
|       |-- pages/       # Các trang khách hàng, nhà bán hàng, quản trị
|       |-- styles/      # Tập tin giao diện dùng chung
|       `-- utils/       # Cấu hình gọi API
|
`-- README.md
```

## 9. Hướng dẫn cài đặt và chạy dự án

### 9.1. Yêu cầu môi trường

- Node.js
- MongoDB
- Tài khoản email dùng để gửi OTP
- Tài khoản PayOS và Cloudinary nếu sử dụng đầy đủ chức năng thanh toán và upload ảnh

### 9.2. Chạy Back-end

```bash
cd BE
npm install
npm run dev
```

Tạo file `.env` trong thư mục `BE` với các biến môi trường cơ bản:

```env
PORT=8386
MONGODB_URI=mongodb://localhost:27017/furni-ecommerce
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRE=7d
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
PAYOS_CLIENT_ID=your_payos_client_id
PAYOS_API_KEY=your_payos_api_key
PAYOS_CHECKSUM_KEY=your_payos_checksum_key
PAYOS_CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

Back-end mặc định chạy tại:

```text
http://localhost:8386
```

### 9.3. Chạy Front-end

```bash
cd FE
npm install
npm run dev
```

Tạo file `.env` trong thư mục `FE`:

```env
VITE_BE_URL=http://localhost:8386
VITE_API_URL=http://localhost:8386
VITE_MAPVINA_KEY=your_mapvina_key
VITE_GEOAPIFY_KEY=your_geoapify_key
```

Front-end mặc định chạy tại:

```text
http://localhost:5173
```
