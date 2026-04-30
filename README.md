# HNG Stage 3 - User Profiles API

A Node.js/Express REST API with role-based access control, GitHub OAuth integration, and profile management.

## 🚀 Quick Start

### Get Test Tokens

For grading purposes, obtain pre-issued tokens for testing:

```bash
curl http://localhost:3000/test-tokens
```

**Response:**

```json
{
  "status": "success",
  "admin": {
    "access_token": "JWT_TOKEN",
    "refresh_token": "REFRESH_TOKEN",
    "user": { "id": "...", "username": "test_admin", "role": "admin" }
  },
  "analyst": {
    "access_token": "JWT_TOKEN",
    "user": { "id": "...", "username": "test_analyst", "role": "analyst" }
  }
}
```

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env` file with:

```
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your_secret_key
JWT_ACCESS_EXPIRY=1800
JWT_REFRESH_EXPIRY=3000
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
```

### Run Server

```bash
npm start
# Server runs on http://localhost:3000
```

## 🔐 Authentication

### GitHub OAuth Flow

1. **Get OAuth URL** (supports PKCE for CLI):

```bash
GET /auth/github?is_cli=true&code_verifier=<verifier>&redirect_uri=<uri>
```

2. **Handle Callback**:

```bash
GET /auth/github/callback?code=<code>&state=<state>
```

3. **Refresh Token**:

```bash
POST /auth/refresh
Content-Type: application/json

{"refresh_token": "token"}
```

4. **Logout**:

```bash
POST /auth/logout
Authorization: Bearer <access_token>
```

## 📋 API Endpoints

### Profiles API (v1)

All endpoints require `X-API-Version: 1` header and authentication.

**Get Profiles:**

```bash
GET /api/profiles?limit=10&offset=0
Authorization: Bearer <token>
X-API-Version: 1
```

**Create Profile:**

```bash
POST /api/profiles
Authorization: Bearer <token>
X-API-Version: 1
Content-Type: application/json

{"name": "John Doe"}
```

**Search Profiles:**

```bash
GET /api/profiles/search?q=query
Authorization: Bearer <token>
X-API-Version: 1
```

**Export Profiles (CSV):**

```bash
GET /api/profiles/export/csv
Authorization: Bearer <token>
X-API-Version: 1
```

### User Management

**Get Current User:**

```bash
GET /api/users/me
Authorization: Bearer <token>
X-API-Version: 1
```

## 👥 Roles & Permissions

- **Admin**: Full access (create, read, update, delete)
- **Analyst**: Read-only and export access

## ⚡ Features

- ✅ GitHub OAuth with PKCE support
- ✅ JWT-based authentication
- ✅ Refresh token lifecycle management
- ✅ Role-based access control (RBAC)
- ✅ API versioning (X-API-Version header)
- ✅ Rate limiting
- ✅ CSV export functionality
- ✅ CORS support for web & CLI
- ✅ PostgreSQL persistence

## 🧪 Testing

```bash
npm test
```

Runs Jest test suite with coverage reporting.

## 📊 Grading Token Submission

Use the tokens from `GET /test-tokens`:

1. **Admin Test Token**: `admin.access_token` from response
2. **Analyst Test Token**: `analyst.access_token` from response
3. **Refresh Test Token**: `admin.refresh_token` from response
4. **Language**: JavaScript (JS)

## 📝 Implementation Notes

- Access tokens expire in 30 minutes (1800s)
- Refresh tokens expire in ~50 minutes (3000s)
- All user data stored in PostgreSQL
- Tokens signed with HS256 algorithm
- Rate limiting: 10 req/min for auth, 60 req/min for API
