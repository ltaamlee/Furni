# Furni E-commerce API

A Node.js/Express.js API for a furniture e-commerce website with JWT authentication, email OTP verification, and user management.

## Team Members
- Nguyễn Thị Thu Linh - 23110254
- Nguyễn Phương Thi - 23110330
- Lê Thị Thanh Tâm - 23110312

## Features

### Authentication & Authorization
- User registration with email OTP verification
- User login with JWT tokens
- Password reset with OTP
- Account lockout after failed login attempts
- Role-based access control (Customer, Admin)

### User Management
- Profile management (view, update)
- Password change
- Admin user management (CRUD operations)

### Security
- JWT authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting
- CORS protection
- Helmet security headers
- XSS protection
- MongoDB injection protection

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Email**: Nodemailer with Gmail SMTP
- **Validation**: Express-validator
- **Security**: Helmet, CORS, express-rate-limit, express-mongo-sanitize, xss-clean

## Project Structure

```
src/
├── controllers/     # Route controllers
│   ├── authController.js
│   └── userController.js
├── middleware/      # Custom middleware
│   ├── authMiddleware.js
│   ├── errorMiddleware.js
│   └── validationMiddleware.js
├── models/          # Mongoose models
│   └── User.js
├── routes/          # API routes
│   ├── authRoutes.js
│   └── userRoutes.js
├── utils/           # Utility functions
│   ├── emailService.js
│   └── jwtUtils.js
├── config/          # Configuration files
└── server.js        # Main server file
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Gmail account (for email OTP)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd furni-ecommerce-api
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/furni-ecommerce
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=30d
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

4. Start MongoDB service

5. Run the development server
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "fullName": "Nguyễn Văn A",
  "email": "user@example.com",
  "phone": "0123456789",
  "address": "123 Đường ABC, Quận 1, TP.HCM",
  "username": "nguyenvana",
  "password": "Password123"
}
```

#### Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123"
}
```

#### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "NewPassword123"
}
```

### User Management Endpoints

#### Get Profile
```http
GET /api/users/profile
Authorization: Bearer <token>
```

#### Update Profile
```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "Nguyễn Văn B",
  "email": "newemail@example.com",
  "phone": "0987654321",
  "address": "456 Đường XYZ, Quận 2, TP.HCM"
}
```

#### Change Password
```http
PUT /api/users/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123"
}
```

### Admin Endpoints

#### Get All Users (Admin only)
```http
GET /api/users?page=1&limit=10
Authorization: Bearer <admin-token>
```

#### Get Single User (Admin only)
```http
GET /api/users/:id
Authorization: Bearer <admin-token>
```

#### Update User (Admin only)
```http
PUT /api/users/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "fullName": "Updated Name",
  "role": "admin",
  "isVerified": true
}
```

#### Delete User (Admin only)
```http
DELETE /api/users/:id
Authorization: Bearer <admin-token>
```

## Use Cases Implementation

### 1. User Registration
- Validates user input
- Checks for existing email/username
- Generates and sends OTP via email
- Requires OTP verification to activate account

### 2. Login
- Validates credentials
- Implements account lockout after 5 failed attempts
- Requires account verification
- Returns JWT token for authenticated sessions

### 3. Forgot Password
- Sends OTP to registered email
- Allows password reset with valid OTP

### 4. Profile Management
- Protected routes requiring authentication
- Input validation for profile updates
- Supports profile image uploads (framework ready)

### 5. Admin User Management
- Role-based access control
- CRUD operations for user management
- Pagination support

## Security Features

- **JWT Authentication**: Stateless authentication with expiration
- **Password Security**: Bcrypt hashing with salt rounds
- **Rate Limiting**: Prevents brute force attacks
- **Input Validation**: Comprehensive validation using express-validator
- **Data Sanitization**: Protection against NoSQL injection and XSS
- **CORS**: Configured for cross-origin requests
- **Helmet**: Security headers for production

## Development

### Available Scripts

```bash
# Start development server with nodemon
npm run dev

# Start production server
npm start

# Run tests
npm test
```

### Testing

The project includes Jest for unit testing. Add test files in a `__tests__` directory.

### Code Quality

- ESLint configuration (add as needed)
- Prettier for code formatting (add as needed)
- Husky for git hooks (add as needed)

## Deployment

1. Set `NODE_ENV=production` in environment variables
2. Use a production MongoDB instance
3. Configure production email service
4. Set strong JWT secrets
5. Enable HTTPS in production
6. Set up proper logging

## Contributing

1. Create a feature branch from `main`
2. Implement your changes
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

This project is licensed under the ISC License.