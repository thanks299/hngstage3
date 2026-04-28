const jwt = require("jsonwebtoken");
require("dotenv").config();

// Replace this with the actual user ID from your database
const userId = "e2a8a64c-eec8-4d64-97aa-976b6d5df701";
const role = "admin";

const token = jwt.sign(
  { userId, role, type: "access" },
  process.env.JWT_SECRET,
  { expiresIn: "1h" },
);

console.log("\n🔑 ACCESS TOKEN:\n");
console.log(token);
console.log("\n📝 Test command:");
console.log(
  `curl -H "X-API-Version: 1" -H "Authorization: Bearer ${token}" https://hngstage3.onrender.com/api/profiles?limit=5\n`,
);
