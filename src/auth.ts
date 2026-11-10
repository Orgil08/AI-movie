import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { Storage, connectDB } from './db/storage.js';
import { verifyPassword } from './utils/crypto.js';

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || 'ai_movie_secret_dev_key_change_in_production_32b',
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  pages: {
    signIn: '/mn/login',
    error: '/mn/login'
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        await connectDB();

        const user = await Storage.getUserByEmail(email);
        if (!user || !user.passwordHash) {
          return null;
        }

        if (user.status === 'suspended') {
          throw new Error('ACCOUNT_SUSPENDED');
        }

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role === 'admin' ? 'admin' : 'user'
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || 'user';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string);
        (session.user as any).role = (token.role as string) || 'user';
      }
      return session;
    }
  }
});
