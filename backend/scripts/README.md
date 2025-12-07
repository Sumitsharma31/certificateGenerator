# Admin Setup Guide

This guide will help you set up an admin user for your application.

## Method 1: Using the Setup Script (Recommended)

### Step 1: Create a User Account
First, you need to have a user account. If you don't have one yet:

1. Start your backend server: `npm run dev` (or `cd backend && npm run dev`)
2. Go to your frontend and sign up/login with your email using OTP
3. This will create a user account in the database

### Step 2: Run the Admin Setup Script

```bash
cd backend
node scripts/setup-admin.js your-email@example.com
```

Replace `your-email@example.com` with the email address you used to sign up.

**Example:**
```bash
node scripts/setup-admin.js admin@example.com
```

The script will:
- Connect to your MongoDB database
- Find the user by email
- Set their role to 'admin'
- Display confirmation

## Method 2: Using MongoDB Directly

If you prefer to use MongoDB directly:

1. Connect to your MongoDB database (using MongoDB Compass, MongoDB Shell, or any MongoDB client)
2. Find your database (usually `internship_platform` or the database name from your connection string)
3. Go to the `users` collection
4. Find the user document by email
5. Update the `role` field to `"admin"`

**MongoDB Shell Example:**
```javascript
use internship_platform
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

## Method 3: Using the API (If you already have an admin)

If you already have an admin user, you can use the API to promote other users:

1. Login as admin and get your JWT token
2. Make a PUT request to `/api/admin/users/:userId/role`:

```bash
curl -X PUT http://localhost:5000/api/admin/users/USER_ID/role \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

## Verify Admin Access

After setting up admin:

1. Login with your admin email using OTP
2. You should now have access to:
   - Admin dashboard at `/admin/dashboard`
   - Admin API endpoints at `/api/admin/*`

## Troubleshooting

- **Can't find user**: Make sure you've logged in at least once to create the user account
- **Script fails to connect**: Check your `.env` file has correct `MONGODB_URI`
- **Permission denied**: Make sure the user exists and email is correct (case-insensitive)

