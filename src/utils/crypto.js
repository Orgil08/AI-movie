import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
const LEGACY_SALT = 'streamline_sodon_ai_movie_secret_salt_2026';
export function hashPassword(password) {
    return bcrypt.hashSync(password, 10);
}
export function verifyPassword(password, hash) {
    if (!password || !hash)
        return false;
    if (hash.startsWith('$2')) {
        try {
            return bcrypt.compareSync(password, hash);
        }
        catch {
            return false;
        }
    }
    // Backward compatibility with legacy pbkdf2 hashes
    const legacyHash = crypto.pbkdf2Sync(password, LEGACY_SALT, 1000, 32, 'sha256').toString('hex');
    return legacyHash === hash;
}
