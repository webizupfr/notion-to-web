import NextAuth, { type NextAuthConfig } from 'next-auth';
import Resend from 'next-auth/providers/resend';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { render } from '@react-email/components';
import { db, users, accounts, sessions, verificationTokens } from '@/lib/db';
import { MagicLinkEmail } from '@/components/emails/MagicLink';

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
      // Override : on rendere notre propre template react-email plutôt que
      // le template par défaut de NextAuth (texte plain basique).
      sendVerificationRequest: async ({ identifier: email, url, provider }) => {
        const from = provider.from ?? process.env.AUTH_RESEND_FROM ?? 'noreply@impulsion.studio';
        const apiKey = provider.apiKey ?? process.env.AUTH_RESEND_KEY;
        if (!apiKey) {
          console.warn('[auth] sendVerificationRequest no-op (no AUTH_RESEND_KEY)');
          return;
        }
        const host = new URL(url).host;
        const html = await render(MagicLinkEmail({ magicLink: url, host }));
        const text = await render(MagicLinkEmail({ magicLink: url, host }), {
          plainText: true,
        });

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from,
            to: email,
            subject: 'Ton lien de connexion à Impulsion',
            html,
            text,
            tags: [{ name: 'type', value: 'magic-link' }],
          }),
        });

        if (!res.ok) {
          const errorText = await res.text().catch(() => 'unknown');
          throw new Error(`Resend API error (${res.status}): ${errorText}`);
        }
      },
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
