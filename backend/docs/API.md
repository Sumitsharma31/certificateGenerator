# API Documentation

Base URL: `http://localhost:5000/api`

## Authentication

All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Request OTP
**POST** `/auth/request-otp`

Request an OTP code for login/signup.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your email",
  "expiresIn": "10 minutes"
}
```

### Verify OTP
**POST** `/auth/verify-otp`

Verify OTP and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "student"
  }
}
```

### Get Current User
**GET** `/auth/me`

Get current authenticated user (requires authentication).

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "student"
  }
}
```

## Internships

### List Internships
**GET** `/internships`

Get list of internships with optional filters.

**Query Parameters:**
- `status` (optional): Filter by status (draft, published, archived)
- `mentorId` (optional): Filter by mentor ID
- `search` (optional): Search in title and description
- `minPrice` (optional): Minimum price filter
- `maxPrice` (optional): Maximum price filter
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sort` (optional): Sort field (default: -createdAt)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 50,
  "page": 1,
  "pages": 5,
  "data": [...]
}
```

### Get Single Internship
**GET** `/internships/:id`

Get details of a specific internship.

### Create Internship
**POST** `/internships`

Create a new internship (requires mentor/admin role).

**Request Body:**
```json
{
  "title": "Internship Title",
  "description": "Description here",
  "priceInINR": 1000,
  "seats": 50,
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-03-01T00:00:00.000Z",
  "syllabus": [],
  "skills": ["JavaScript", "React"]
}
```

### Update Internship
**PUT** `/internships/:id`

Update an internship (requires mentor/admin role, owner only).

### Delete Internship
**DELETE** `/internships/:id`

Delete an internship (requires mentor/admin role, owner only).

### Enroll in Internship
**POST** `/internships/:id/enroll`

Enroll in an internship (requires authentication).

**Response (Free Internship):**
```json
{
  "success": true,
  "message": "Enrolled successfully",
  "enrollment": {...}
}
```

**Response (Paid Internship):**
```json
{
  "success": true,
  "enrollment": {...},
  "razorpayOrder": {
    "id": "order_id",
    "amount": 100000,
    "currency": "INR",
    "key": "razorpay_key_id"
  }
}
```

## Payments

### Verify Payment
**POST** `/payments/verify`

Verify Razorpay payment signature (requires authentication).

**Request Body:**
```json
{
  "razorpay_order_id": "order_id",
  "razorpay_payment_id": "payment_id",
  "razorpay_signature": "signature",
  "enrollmentId": "enrollment_id"
}
```

## Certificates

### Generate Certificate
**POST** `/certificates/generate`

Generate a certificate for an enrollment (requires mentor/admin role).

**Request Body:**
```json
{
  "enrollmentId": "enrollment_id"
}
```

### Get Certificate
**GET** `/certificates/:certId`

Get certificate details (public).

### Verify Certificate
**GET** `/certificates/verify/:certId`

Verify certificate validity (public).

**Response:**
```json
{
  "valid": true,
  "status": "VALID",
  "message": "This certificate is valid and verified",
  "certificate": {
    "certId": "INT-2025-0001",
    "userName": "Student Name",
    "internshipTitle": "Internship Title",
    "mentorName": "Mentor Name",
    "issuedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### Download Certificate
**GET** `/certificates/download/:certId`

Download certificate PDF (public).

## Admin

### Payment Reports
**GET** `/admin/reports/payments`

Get payment reports (requires admin role).

**Query Parameters:**
- `startDate` (optional): Start date filter
- `endDate` (optional): End date filter

### Revoke Certificate
**POST** `/admin/certificates/revoke/:certId`

Revoke a certificate (requires admin role).

**Request Body:**
```json
{
  "reason": "Reason for revocation"
}
```

### Get Users
**GET** `/admin/users`

Get all users (requires admin role).

### Update User Role
**PUT** `/admin/users/:id/role`

Update user role (requires admin role).

**Request Body:**
```json
{
  "role": "mentor"
}
```

## Webhooks

### Razorpay Webhook
**POST** `/webhooks/razorpay`

Razorpay webhook endpoint for payment events.

**Headers:**
- `x-razorpay-signature`: Webhook signature

**Note:** This endpoint requires webhook secret verification.

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message"
}
```

**Status Codes:**
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error


