# AI MOVIE — Administrator Promotion CLI Utility

This guide explains how to use the Node.js CLI utility `scripts/promote-admin.ts` to promote an existing user account to Administrator (`role: "admin"`).

---

## 🔒 Security Principles

1. **User-Role by Default**: When users sign up via `/mn/register` or `/en/register`, they always receive `role: "user"`.
2. **No Public Role Switching**: The frontend registration and login forms never allow users to select or set their own roles.
3. **Verified Accounts Only**: The CLI utility requires that an account already exists in the database before promoting it.
4. **Immutable Audit Trail**: Every promotion action is logged into the `audit_logs` collection / database with timestamp, operator ID (`system_cli`), target user ID, and full action details.
5. **Single / Multi-Admin RBAC**: Once promoted, the user can log in via `/mn/login` or `/en/login` and the system automatically redirects them to the Admin Panel (`/admin`).

---

## 🚀 How to Run from the Terminal

### Method 1: Using npm (Recommended)

From the project root directory, run:

```bash
npm run promote-admin -- <user_email>
```

#### Example:
```bash
npm run promote-admin -- admin@aimovie.mn
```

> **Note**: The double dash `--` is required by npm to pass the email argument to the underlying script.

---

### Method 2: Using npx tsx directly

```bash
npx tsx scripts/promote-admin.ts <user_email>
```

#### Example:
```bash
npx tsx scripts/promote-admin.ts user@example.com
```

---

## 📋 Step-by-Step Procedure to Create a New Administrator

### Step 1: Register an ordinary account on the website
1. Start the development server (`npm run dev`) or visit the running website:
   - Mongolian: `http://localhost:3000/mn/register`
   - English: `http://localhost:3000/en/register`
2. Fill in the full name, email (e.g. `superuser@aimovie.mn`), password (min 8 characters), and agree to terms.
3. Submit the registration form. The user is created with `role: "user"`.

### Step 2: Run the promotion script in your terminal
```bash
npm run promote-admin -- superuser@aimovie.mn
```

Output:
```text
[PromoteAdmin] Initializing database connection...
[PromoteAdmin] Connected to MongoDB Atlas cluster successfully.
[PromoteAdmin] Searching for user with email: superuser@aimovie.mn...
[PromoteAdmin] Found user "Super User" (ID: 673..., current role: "user").
[PromoteAdmin] Promoting role to "admin"...
[PromoteAdmin] Audit log successfully recorded.

==============================================================================
  ✅ ADMINISTRATOR PROMOTION SUCCESSFUL
==============================================================================
  User ID       : 673abc123...
  Full Name     : Super User
  Email Address : superuser@aimovie.mn
  Previous Role : user
  Assigned Role : admin
  Status        : ACTIVE
  Timestamp     : 2026-11-09T11:40:00.000Z
  Audit Log     : Action 'PROMOTE_TO_ADMIN' recorded in database
------------------------------------------------------------------------------
  Next Steps:
  1. Have the user sign in at: http://localhost:3000/mn/login
  2. The system will automatically recognize role='admin' and redirect to:
     http://localhost:3000/admin
==============================================================================
```

### Step 3: Log in as Administrator
1. Navigate to `/mn/login` or `/en/login`.
2. Sign in with the promoted credentials (`superuser@aimovie.mn` and password).
3. The server validates the credentials and session role, redirecting immediately to `/admin`.

---

## 🛠️ Environment Configuration

Ensure your `.env` file contains your MongoDB Atlas connection string:

```env
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/aimovie?retryWrites=true&w=majority"
```

If `MONGODB_URI` is not provided, the utility operates safely on the integrated local memory store.

---

## ⚠️ Error Handling & Troubleshooting

| Error Message | Cause | Resolution |
| :--- | :--- | :--- |
| `Email argument is required` | No email was provided in the command line | Run with email: `npm run promote-admin -- <email>` |
| `Invalid email format` | String provided is not a valid email address | Check email spelling (e.g. `user@domain.com`) |
| `User with email "..." was not found in the database` | The account has not been registered yet | Register the account on the website first |
| `User is already an Administrator` | Account already possesses `role: "admin"` | No action needed; user is already an admin |
