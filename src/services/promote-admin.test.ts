import test from 'node:test';
import assert from 'node:assert/strict';
import { Storage, memDb } from '../db/storage.js';
import { promoteUserToAdmin } from '../../scripts/promote-admin.js';

test('promote-admin utility suite', async (t) => {
  // Reset demo data before tests
  memDb.clear();

  await t.test('throws error when email is empty or missing', async () => {
    await assert.rejects(
      async () => {
        await promoteUserToAdmin('');
      },
      {
        message: /Email argument is required/
      }
    );
  });

  await t.test('throws error when email format is invalid', async () => {
    await assert.rejects(
      async () => {
        await promoteUserToAdmin('invalid-email-format');
      },
      {
        message: /Invalid email format/
      }
    );
  });

  await t.test('throws error when user does not exist in the database', async () => {
    await assert.rejects(
      async () => {
        await promoteUserToAdmin('ghost_user_9999@aimovie.mn');
      },
      {
        message: /was not found in the database/
      }
    );
  });

  await t.test('detects when user is already an administrator', async () => {
    const result = await promoteUserToAdmin('admin@aimovie.mn');
    assert.equal(result.success, true);
    assert.ok(result.message.includes('already an Administrator'));
    assert.equal(result.user?.newRole, 'admin');
  });

  await t.test('successfully promotes a standard user to admin and writes audit log', async () => {
    // Create a new standard test user
    const newUser = await Storage.createUser({
      name: 'Цахим Туршилт',
      email: 'test_promote_user@aimovie.mn',
      passwordHash: 'hashed_password_123'
    });

    assert.equal(newUser.role, 'user');

    const result = await promoteUserToAdmin('test_promote_user@aimovie.mn');
    assert.equal(result.success, true);
    assert.equal(result.user?.previousRole, 'user');
    assert.equal(result.user?.newRole, 'admin');

    // Verify in storage
    const promoted = await Storage.getUserByEmail('test_promote_user@aimovie.mn');
    assert.equal(promoted?.role, 'admin');

    // Verify audit log
    const auditLogs = await Storage.getAuditLogs();
    const promoteLog = auditLogs.find(
      (log) => log.action === 'PROMOTE_TO_ADMIN' && log.target === newUser.id
    );
    assert.ok(promoteLog, 'Audit log for PROMOTE_TO_ADMIN must be present');
    assert.equal(promoteLog?.adminId, 'system_cli');
  });
});
