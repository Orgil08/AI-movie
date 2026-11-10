import app, { initApp } from '../src/server/app.js';

export default async function handler(req: any, res: any) {
  // Ensure database connection is ready and reused between warm invocations
  await initApp();

  // Normalize request url if invoked through serverless rewrite
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? req.url : `/${req.url}`}`;
  }

  return app(req, res);
}
