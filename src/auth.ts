import NextAuth, { type NextAuthConfig } from 'next-auth';
import Resend from 'next-auth/providers/resend';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, users, accounts, sessions, verificationTokens } from '@/lib/db';

/**
 * NextAuth v5 — magic link via Resend.
 *
 * Safe-by-default : si DATABASE_URL n'est pas configuré, les handlers retournent
 * des erreurs propres plutôt que de crasher à l'import. Les pages publiques
 * continuent à marcher, seules /login et /my-learning demandent la DB.
 */

const hasDb = Boolean(process.env.DATABASE_URL);

const baseConfig: NextAuthConfig = {
  providers: [
    Resend({
      from: process.env.AUTH_RESEND_FROM,
      apiKey: process.env.AUTH_RESEND_KEY,
    }),
  ],
  pages: {
    signIn: '/login',
    verifyRequest: '/login/verify',
    error: '/login',
  },
  session: {
    strategy: 'database',
    maxAge: 60 * 60 * 24 * 30, // 30 jours
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
        // @ts-expect-error custom field
        session.user.role = user.role;
      }
      return session;
    },
  },
};

const config: NextAuthConfig = hasDb
  ? {
      ...baseConfig,
      adapter: DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
      }),
    }
  : baseConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: 'learner' | 'admin';
    };
  }
}
