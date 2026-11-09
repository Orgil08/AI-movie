# SODON AI MOVIE — Streaming Platform

Next.js App Router streaming platform featuring 4K HDR generative AI movies, role-based access control, Wire.mn / QPay payments, Mongolian/English internationalization, and an Admin Panel.

---

## 🛠️ CLI Utilities

### Promote User to Administrator

To grant administrator permissions to an existing user account:

```bash
npm run promote-admin -- <user_email>
```

#### Example:
```bash
npm run promote-admin -- admin@aimovie.mn
```

Or using `npx tsx` directly:
```bash
npx tsx scripts/promote-admin.ts user@example.com
```

For full documentation and security procedures, see [docs/PROMOTE_ADMIN.md](docs/PROMOTE_ADMIN.md).

---

## 🚀 Development & Testing

```bash
# Start development server
npm run dev

# Run all test suites
npm test

# Type checking / Linting
npm run lint

# Build production bundle
npm run build
```
