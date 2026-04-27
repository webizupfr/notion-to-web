import Link from 'next/link';
import { signIn, auth } from '@/auth';
import { redirect } from 'next/navigation';
import { brand } from '@/config/brand';

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const sp = (await Promise.resolve(searchParams)) ?? {};
  const next = (sp.next as string | undefined) || '/my-learning';
  const error = (sp.error as string | undefined) || null;

  // Si déjà connecté, redirect
  const session = await auth();
  if (session?.user) {
    redirect(next);
  }

  async function loginAction(formData: FormData) {
    'use server';
    const email = formData.get('email') as string;
    if (!email) return;
    // ⚠️ NextAuth v5 + Resend + Server Action : le redirect auto pointe vers
    // /api/auth/verify-request qui n'est pas géré → on désactive le redirect
    // auto (`redirect: false`) et on fait nous-mêmes la redirection vers
    // notre page /login/verify (cohérent avec pages.verifyRequest).
    try {
      await signIn('resend', {
        email,
        redirectTo: next,
        redirect: false,
      });
    } catch (error) {
      // L'erreur "NEXT_REDIRECT" est normale (NextAuth fait son propre redirect),
      // on la re-throw. Toute autre erreur = vrai problème → redirige sur /login?error
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        throw error;
      }
      console.error('[login] signIn failed', error);
      redirect('/login?error=EmailSignin&next=' + encodeURIComponent(next));
    }
    // Redirige manuellement vers /login/verify (avec next preservé pour info user)
    redirect('/login/verify?next=' + encodeURIComponent(next));
  }

  return (
    <div className="min-h-dvh bg-[color:var(--surface-0)]">
      <header className="border-b border-[color:var(--border-subtle)]">
        <div className="learning-shell flex items-center justify-between py-4">
          <Link href="/" className="eyebrow-pill">
            <span className="eyebrow-pill__dot" aria-hidden />
            {brand.privateArea.title} · {brand.privateArea.appName}
          </Link>
          <Link href="/" className="btn btn-ghost" style={{ height: 36, padding: '0 14px', fontSize: 14 }}>
            ← Accueil
          </Link>
        </div>
      </header>

      <main className="learning-shell flex min-h-[calc(100dvh-65px)] flex-col items-center justify-center py-16">
        <section className="w-full max-w-[28rem]">
          <div className="mb-[var(--space-lg)] text-center">
            <span className="eyebrow-pill">
              <span className="eyebrow-pill__dot" aria-hidden />
              Espace apprenant
            </span>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-[clamp(1.6rem,3vw,2rem)] leading-[1.1] tracking-[-0.03em] font-bold text-[color:var(--text-primary)]">
              Se connecter
            </h1>
            <p className="mt-3 text-[0.98rem] leading-[1.6] text-[color:var(--text-secondary)]">
              Tu reçois un lien magique par email — pas de mot de passe à gérer.
            </p>
          </div>

          {error ? (
            <div
              className="mb-[var(--space-md)] rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-[color:var(--signal-danger-bg)] px-4 py-3"
              role="alert"
            >
              <p className="m-0 text-[0.92rem] leading-[1.55] text-[color:var(--text-primary)]">
                {error === 'OAuthSignin' || error === 'EmailSignin'
                  ? "Impossible d'envoyer l'email. Réessaie dans quelques minutes."
                  : "Erreur de connexion. Réessaie."}
              </p>
            </div>
          ) : null}

          <form action={loginAction} className="space-y-[var(--space-md)]">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-[0.85rem] font-medium text-[color:var(--text-primary)]"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                placeholder="toi@exemple.fr"
                className="w-full rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] px-3 py-2.5 text-[0.98rem] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-bg)]"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full"
              style={{ height: 44 }}
            >
              Recevoir le lien magique
            </button>
          </form>

          <p className="mt-6 text-center text-[0.85rem] text-[color:var(--text-tertiary)]">
            Pas encore inscrit ?{' '}
            <Link href={brand.contactUrl} className="underline hover:text-[color:var(--accent-edge)]">
              {brand.contactLabel}
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
