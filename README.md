# Online Internship Platform with Certificate

A full-stack web application where companies/mentors publish internship courses and students apply, pay, complete tasks, and receive verifiable certificates.

## Features

- 🔐 **Email OTP Authentication** - No passwords, secure OTP-based login
- 💳 **Razorpay Payment Integration** - Secure payment processing
- 📜 **Verifiable Certificates** - Digitally signed PDF certificates with verification
- 👥 **Multi-role System** - Student, Mentor, and Admin dashboards
- 📊 **Progress Tracking** - Task submission and completion tracking
- 🔍 **Certificate Verification** - Public verification endpoint for certificates

## Tech Stack

### Frontend
- Next.js 15 (React 19)
- Tailwind CSS
- TypeScript

### Backend
- Node.js with Express
- MongoDB with Mongoose
- Razorpay SDK
- Nodemailer for emails
- Puppeteer for PDF generation
- JWT for authentication

## Project Structure

```
.
├── backend/          # Express API server
├── frontend/         # Next.js frontend application
├── package.json      # Root package.json for convenience scripts
└── README.md         # This file
```

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account (or local MongoDB)
- Razorpay account (test/live keys)
- Email service credentials (SMTP or service like SendGrid)

### Installation

1. Clone the repository and install dependencies:

```bash
npm run install:all
```

Or install separately:

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Environment Variables

#### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=your_mongodb_atlas_uri

# JWT
JWT_SECRET=your_jwt_secret_key_min_32_chars
JWT_EXPIRES_IN=7d

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

# Email (Nodemailer SMTP)
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your_email@gmail.com
EMAIL_SMTP_PASS=your_email_app_password
FROM_EMAIL=your_email@gmail.com

# Certificate
CERT_SECRET=your_certificate_secret_for_hmac_min_32_chars

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

#### Frontend Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
```

### Running the Application

#### Development Mode

Run both frontend and backend concurrently:

```bash
npm run dev
```

Or run separately:

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

#### Production Build

```bash
npm run build
```

## API Endpoints

### Authentication
- `POST /api/auth/request-otp` - Request OTP for email
- `POST /api/auth/verify-otp` - Verify OTP and get JWT token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Internships
- `GET /api/internships` - List internships (with filters)
- `GET /api/internships/:id` - Get internship details
- `POST /api/internships` - Create internship (Mentor)
- `PUT /api/internships/:id` - Update internship (Mentor)
- `DELETE /api/internships/:id` - Delete internship (Mentor/Admin)

### Enrollment & Payments
- `POST /api/internships/:id/enroll` - Enroll in internship
- `POST /api/payments/verify` - Verify Razorpay payment
- `POST /api/webhooks/razorpay` - Razorpay webhook handler

### Certificates
- `POST /api/certificates/generate` - Generate certificate (Mentor/Admin)
- `GET /api/certificates/:certId` - Get certificate details (Public)
- `GET /api/certificates/download/:certId` - Download certificate PDF
- `GET /api/certificates/verify/:certId` - Verify certificate (Public)

### Admin
- `GET /api/admin/reports/payments` - Payment reports (Admin)
- `POST /api/admin/certificates/revoke/:certId` - Revoke certificate (Admin)

See `backend/docs/API.md` for detailed API documentation.

## Testing Webhooks Locally

For local development, use [ngrok](https://ngrok.com/) to expose your local server:

```bash
ngrok http 5000
```

Use the ngrok URL as your Razorpay webhook URL: `https://your-ngrok-url.ngrok.io/api/webhooks/razorpay`

## Razorpay Setup

1. Create a Razorpay account at https://razorpay.com
2. Get your test API keys from Dashboard → Settings → API Keys
3. Set up webhooks:
   - Go to Dashboard → Settings → Webhooks
   - Add webhook URL: `{BACKEND_URL}/api/webhooks/razorpay`
   - Select events: `payment.captured`, `payment.failed`
   - Copy the webhook secret and add to `.env`

## Testing

### Backend Tests

```bash
cd backend
npm test
```

### Test Accounts

After seeding (if implemented), use these roles:
- Admin: admin@test.com
- Mentor: mentor@test.com
- Student: student@test.com

## Deployment

### Backend Deployment (Heroku/Render/Railway)

1. Set all environment variables in your hosting platform
2. Deploy the backend directory
3. Ensure MongoDB Atlas allows connections from your server IP
4. Update `BACKEND_URL` and `FRONTEND_URL` in environment variables

### Frontend Deployment (Vercel)

1. Connect your repository to Vercel
2. Set environment variables:
   - `NEXT_PUBLIC_API_URL` - Your backend API URL
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID` - Razorpay key
3. Deploy

### MongoDB Atlas Setup

1. Create a cluster on MongoDB Atlas
2. Create a database user
3. Whitelist IP addresses (or use 0.0.0.0/0 for all - not recommended for production)
4. Get connection string and update `MONGODB_URI`

## Security Best Practices

- ✅ All sensitive data stored in environment variables
- ✅ OTP hashing with bcrypt
- ✅ JWT tokens with expiration
- ✅ Rate limiting on sensitive endpoints
- ✅ Input validation and sanitization
- ✅ HTTPS enforced in production
- ✅ Razorpay webhook signature verification
- ✅ Certificate signature verification with HMAC

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.

