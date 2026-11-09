# SODON AI MOVIE — Streaming Platform

Full-stack Vite + React + Express + MongoDB streaming platform featuring 4K HDR generative AI movies, role-based access control, Wire.mn payments, Mongolian/English internationalization, and an Admin Panel.

## Production deployment (Vercel)

The Vercel project root must be this directory (the folder containing `package.json`, `server.ts`, and `vercel.json`). The Express app is exported from `server.ts`; Vercel routes API and page requests through that app. `npm run build` creates the Vite client bundle in `dist/`, which is included with the Express function.

Configure these Environment Variables for **Production**, **Preview**, and any other environments you use:

- `MONGODB_URI` — MongoDB Atlas connection string.
- `AUTH_SECRET` — random secret with at least 32 characters (for example, generate one with `openssl rand -base64 48`).
- `NEXT_PUBLIC_APP_URL` — deployed site origin, e.g. `https://ai-movie-beige.vercel.app`.
- `WIRE_API_KEY` and `WIRE_WEBHOOK_SECRET` — required for live Wire.mn payments.
- `GEMINI_API_KEY` — required for AI features that call Gemini.

The production API fails closed when MongoDB or `AUTH_SECRET` is unavailable; it never authenticates against the development in-memory accounts. Deploy from the intended production Git branch after confirming the Vercel project's Root Directory and Production Branch settings.

This repository currently uses its own Express credentials authentication. It does **not** install Next.js or NextAuth/Auth.js, so there is no Next.js App Router `src/app/api/auth/[...nextauth]/route.ts` in this architecture.

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
