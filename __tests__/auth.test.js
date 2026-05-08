const request = require('supertest');
const app = require('./src/server');

describe('API Health Check', () => {
  it('should return 200 for health check', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
  });
});

describe('Authentication Endpoints', () => {
  it('should register a new user', async () => {
    const userData = {
      fullName: 'Test User',
      email: 'test@example.com',
      phone: '0123456789',
      address: '123 Test Street',
      username: 'testuser',
      password: 'TestPassword123'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  it('should not register with existing email', async () => {
    const userData = {
      fullName: 'Test User 2',
      email: 'test@example.com', // Same email
      phone: '0987654321',
      address: '456 Test Street',
      username: 'testuser2',
      password: 'TestPassword123'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});