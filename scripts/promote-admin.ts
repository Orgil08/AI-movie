/**
 * ==============================================================================
 * AI MOVIE — Promote Admin Script
 * ==============================================================================
 * This script connects to the MongoDB instance defined in .env using Mongoose,
 * searches for a user by email, and updates their role field to 'admin'.
 *
 * ------------------------------------------------------------------------------
 * HOW TO RUN THIS SCRIPT:
 * ------------------------------------------------------------------------------
 *
 * 1. Using 'npx tsx' (Recommended, modern ESM TypeScript runner):
 *    npx tsx scripts/promote-admin.ts <email>
 *    Example:
 *      npx tsx scripts/promote-admin.ts admin@aimovie.mn
 *
 * 2. Using 'ts-node' (with ESM support):
 *    npx ts-node --esm scripts/promote-admin.ts <email>
 *    Example:
 *      npx ts-node --esm scripts/promote-admin.ts user@example.com
 *
 * 3. Using npm script:
 *    npm run promote-admin -- <email>
 *    Example:
 *      npm run promote-admin -- admin@aimovie.mn
 *
 * Pre-requisites:
 * - Ensure MONGODB_URI is configured in your .env file:
 *   MONGODB_URI="mongodb+srv://<user>:<password>@cluster.mongodb.net/aimovie"
 * - The target user must already exist in the database (e.g. registered via /register).
 * ==============================================================================
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { UserModel } from '../src/db/models.js';
import { Storage, connectDB, isMemoryFallbackPermitted } from '../src/db/storage.js';

// Load environment variables from .env when running outside isolated unit tests
if (!process.env.NODE_TEST_CONTEXT) {
  dotenv.config();
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Connect to MongoDB instance defined in .env using Mongoose.
 */
async function connectMongoose(): Promise<boolean> {
  if (isMemoryFallbackPermitted()) {
    return false;
  }

  const uri = process.env.MONGODB_URI;

  if (uri && uri.trim() !== '' && !uri.includes('<') && !uri.includes('>')) {
    if (mongoose.connection.readyState === 1) {
      return true;
    }
    try {
      console.log(`[promote-admin] Connecting to MongoDB via Mongoose...`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000
      });
      console.log(`[promote-admin] Successfully connected to MongoDB at ${mongoose.connection.host || 'remote cluster'}`);
      return true;
    } catch (err: any) {
      console.warn(`[promote-admin] Mongoose connection attempt failed: ${err.message}`);
    }
  } else {
    console.log(`[promote-admin] MONGODB_URI not set or contains placeholders in .env; checking internal storage...`);
  }

  // Delegate to app's storage connection handler (throws 503 if unavailable)
  return await connectDB();
}

/**
 * Searches for a user by email, updates their role to 'admin', and logs the action.
 *
 * @param emailArg Target user email address
 */
export async function promoteUserToAdmin(emailArg: string): Promise<{
  success: boolean;
  message: string;
  user?: { id: string; name: string; email: string; previousRole: string; newRole: string };
}> {
  if (!emailArg || typeof emailArg !== 'string' || !emailArg.trim()) {
    throw new Error(
      'Email argument is required.\n' +
      'Usage:\n' +
      '  npx tsx scripts/promote-admin.ts <email>\n' +
      '  npx ts-node --esm scripts/promote-admin.ts <email>\n' +
      '  npm run promote-admin -- <email>'
    );
  }

  const normalizedEmail = emailArg.trim().toLowerCase();

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new Error(`Invalid email format: "${normalizedEmail}". Please provide a valid email address.`);
  }

  // 1. Connect to MongoDB using Mongoose
  const mongoConnected = await connectMongoose();

  // 2. Search for user by email using Mongoose
  let foundUser: any = null;
  let userId = '';
  let userName = '';
  let previousRole = 'user';

  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      foundUser = await UserModel.findOne({ email: normalizedEmail });
      if (foundUser) {
        userId = foundUser._id ? foundUser._id.toString() : foundUser.id;
        userName = foundUser.name;
        previousRole = foundUser.role || 'user';
      }
    } catch (err: any) {
      console.warn(`[promote-admin] Mongoose findOne error: ${err.message}`);
    }
  }

  // Fallback to Storage lookup if Mongoose direct query didn't find the record
  if (!foundUser) {
    const storageUser = await Storage.getUserByEmail(normalizedEmail);
    if (storageUser && storageUser.id) {
      foundUser = storageUser;
      userId = storageUser.id;
      userName = storageUser.name;
      previousRole = storageUser.role || 'user';
    }
  }

  // Ensure the user exists
  if (!foundUser || !userId) {
    throw new Error(
      `User with email "${normalizedEmail}" was not found in the database.\n` +
      `Ensure the user exists or has already registered via the web application (/register) before running this script.`
    );
  }

  // Check if already admin
  if (previousRole === 'admin') {
    const msg = `User "${userName}" (${normalizedEmail}) is already an Administrator (role: 'admin'). No changes made.`;
    console.log(`ℹ️ ${msg}`);
    return {
      success: true,
      message: msg,
      user: {
        id: userId,
        name: userName,
        email: normalizedEmail,
        previousRole: 'admin',
        newRole: 'admin'
      }
    };
  }

  console.log(`[promote-admin] Found user "${userName}" (ID: ${userId}) with current role: '${previousRole}'.`);
  console.log(`[promote-admin] Updating role field to 'admin'...`);

  // 3. Update their role field to 'admin' using Mongoose
  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      await UserModel.findOneAndUpdate(
        { email: normalizedEmail },
        { $set: { role: 'admin' } },
        { new: true }
      );
      console.log(`[promote-admin] MongoDB document updated via Mongoose: role='admin'.`);
    } catch (err: any) {
      console.warn(`[promote-admin] Mongoose findOneAndUpdate warning: ${err.message}`);
    }
  }

  // Also update in Storage layer
  const updatedStorageUser = await Storage.setUserRole(userId, 'admin');

  // Record audit log
  await Storage.recordAuditLog({
    adminId: 'system_cli',
    adminEmail: 'cli_admin@aimovie.mn',
    action: 'PROMOTE_TO_ADMIN',
    target: userId,
    details: `CLI promote-admin script updated role for ${normalizedEmail} (${userName}) from '${previousRole}' to 'admin'.`
  });

  return {
    success: true,
    message: `User ${normalizedEmail} successfully promoted to 'admin'.`,
    user: {
      id: userId,
      name: userName,
      email: normalizedEmail,
      previousRole,
      newRole: updatedStorageUser.role || 'admin'
    }
  };
}

/**
 * Main execution function for CLI
 */
async function main() {
  const args = process.argv.slice(2);
  const targetEmail = args[0];

  if (!targetEmail) {
    console.log(`
==============================================================================
  🎬 AI MOVIE — PROMOTE USER TO ADMIN (CLI)
==============================================================================
  Usage:
    npx tsx scripts/promote-admin.ts <email>
    npx ts-node --esm scripts/promote-admin.ts <email>
    npm run promote-admin -- <email>

  Examples:
    npx tsx scripts/promote-admin.ts admin@aimovie.mn
    npm run promote-admin -- user@example.com

  Documentation:
    Connects to the MongoDB instance defined in .env via Mongoose,
    finds the user matching the given email, and updates their role to 'admin'.
==============================================================================
`);
    process.exit(1);
  }

  try {
    const result = await promoteUserToAdmin(targetEmail);

    if (result.user) {
      console.log(`
==============================================================================
  ✅ USER ROLE UPDATED TO 'admin'
==============================================================================
  User ID       : ${result.user.id}
  Name          : ${result.user.name}
  Email         : ${result.user.email}
  Previous Role : ${result.user.previousRole}
  New Role      : ${result.user.newRole}
  Timestamp     : ${new Date().toISOString()}
------------------------------------------------------------------------------
  The user can now sign in at /mn/login or /en/login and will have full
  access to the Admin Dashboard at: /admin
==============================================================================
`);
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    process.exit(0);
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message || error}\n`);

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    process.exit(1);
  }
}

// Execute when invoked directly from command line
if (
  process.argv[1] &&
  (process.argv[1].endsWith('promote-admin.ts') || process.argv[1].endsWith('promote-admin.js'))
) {
  main();
}
