# Setup Guide

This guide will help you set up the Online Internship Platform from scratch.

## Prerequisites

1. **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
2. **MongoDB Atlas Account** - [Sign up](https://www.mongodb.com/cloud/atlas)
3. **Razorpay Account** - [Sign up](https://razorpay.com/)
4. **Email Service** (Gmail SMTP or SendGrid/Mailgun)

## Step-by-Step Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository (if applicable)
cd online-internship-platform

# Install all dependencies
npm run install:all
```

### 2. MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier is fine for development)
3. Create a database user:
   - Go to Database Access → Add New Database User
   - Choose Password authentication
   - Save the username and password
4. Whitelist IP addresses:
   - Go to Network Access → Add IP Address
   - For development: Add `0.0.0.0/0` (allows all IPs)
   - For production: Add specific IPs only
5. Get connection string:
   - Go to Clusters → Connect → Connect your application
   - Copy the connection string
   - Replace `<password>` with your database user password

### 3. Razorpay Setup

1. Create account at [Razorpay](https://razorpay.com/)
2. Get test API keys:
   - Go to Dashboard → Settings → API Keys
   - Generate test keys (you'll get Key ID and Key Secret)
3. Set up webhooks (for production/local testing with ngrok):
   - Go to Dashboard → Settings → Webhooks
   - Add webhook URL: `{YOUR_BACKEND_URL}/api/webhooks/razorpay`
   - Select events: `payment.captured`, `payment.failed`
   - Save and copy the webhook secret

### 4. Email Service Setup

#### Option A: Gmail SMTP

1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Generate App Password:
   - Go to Security → App passwords
   - Generate a new app password for "Mail"
   - Use this as `EMAIL_SMTP_PASS`

#### Option B: SendGrid/Mailgun

1. Sign up for SendGrid or Mailgun
2. Get SMTP credentials
3. Update the email configuration accordingly

### 5. Backend Configuration

1. Create `.env` file in `backend/` directory:

```bash
cd backend
cp env.example .env
```

2. Edit `.env` with your actual values:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB - Use your MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/internship_platform?retryWrites=true&w=majority

# JWT - Generate a random secret (minimum 32 characters)
JWT_SECRET=your_random_secret_key_here_minimum_32_characters
JWT_EXPIRES_IN=7d

# Razorpay - Use your test keys
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Email Configuration
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your_email@gmail.com
EMAIL_SMTP_PASS=your_app_password
FROM_EMAIL=your_email@gmail.com

# Certificate Secret - Generate a random secret (minimum 32 characters)
CERT_SECRET=your_certificate_secret_here_minimum_32_characters

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

### 6. Frontend Configuration

1. Create `.env.local` file in `frontend/` directory:

```bash
cd frontend
cp .env.local.example .env.local
```

2. Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
```

### 7. Running the Application

#### Development Mode

Option 1: Run both together (recommended)
```bash
npm run dev
```

Option 2: Run separately
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### 8. Testing Webhooks Locally

For testing Razorpay webhooks locally:

1. Install ngrok:
```bash
npm install -g ngrok
# or download from https://ngrok.com/
```

2. Start ngrok:
```bash
ngrok http 5000
```

3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

4. Update Razorpay webhook URL:
   - Go to Razorpay Dashboard → Settings → Webhooks
   - Update webhook URL to: `https://abc123.ngrok.io/api/webhooks/razorpay`
   - Save

5. Update backend `.env`:
```env
BACKEND_URL=https://abc123.ngrok.io
```

### 9. Creating Test Users

You can create users through the sign-up flow:

1. Go to http://localhost:3000/auth/login
2. Enter an email address
3. Check your email for OTP (check spam folder if not in inbox)
4. Enter OTP to complete registration

To create admin/mentor users, you'll need to:
1. Create the user via sign-up (they'll be students by default)
2. Update the user role in MongoDB:
   ```javascript
   // In MongoDB shell or MongoDB Compass
   db.users.updateOne(
     { email: "admin@example.com" },
     { $set: { role: "admin" } }
   )
   ```

### 10. Verifying Setup

1. **Backend Health Check:**
   ```bash
   curl http://localhost:5000/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Frontend:**
   - Open http://localhost:3000
   - You should see the login page

3. **Test Authentication:**
   - Request OTP with your email
   - Check email and verify OTP

## Common Issues

### MongoDB Connection Issues

- Check your connection string format
- Verify IP whitelist in MongoDB Atlas
- Ensure database user credentials are correct

### Email Not Sending

- Check SMTP credentials
- For Gmail: Ensure app password is used (not regular password)
- Check spam folder for test emails
- Verify firewall/network allows SMTP connections

### Razorpay Payment Issues

- Verify you're using test keys (not live keys)
- Check Razorpay dashboard for payment status
- Ensure webhook URL is accessible (use ngrok for local)

### Certificate Generation Issues

- Ensure Puppeteer dependencies are installed
- Check disk space for PDF generation
- Verify CERT_SECRET is set correctly

## Next Steps

1. Explore the dashboards based on user roles
2. Create test internships
3. Test enrollment and payment flows
4. Generate test certificates
5. Verify certificates using the public verification page

## Production Deployment

See the main README.md for production deployment instructions.

For production:
- Use strong, unique secrets for JWT_SECRET and CERT_SECRET
- Use production Razorpay keys
- Set proper CORS origins
- Use HTTPS
- Configure proper database backups
- Set up monitoring and logging

