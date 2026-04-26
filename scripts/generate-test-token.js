const jwt = require('jsonwebtoken');
require('dotenv').config();

// Get a user ID from your database first
const userId = process.env.TEST_USER_ID; // Replace with actual UUID from database
const role = 'admin';

const token = jwt.sign(
    { userId, role, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: Number.parseInt(process.env.JWT_ACCESS_EXPIRY) }
);

console.log('Access Token:', token);
console.log('\nTest with:');
console.log(`curl -X POST http://localhost:3000/api/profiles \\
  -H "X-API-Version: 1" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Michael Jackson"}'`);