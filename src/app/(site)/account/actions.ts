'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { auth } from '@/auth';
import { db, users } from '@/lib/db';

/**
 * Server actions pour la page /account.
 *
 * Toutes les actions vérifient la session NextAuth et l'identité de l'user
 * avant toute modif. Pas de privilège escalation possible — un user ne peut
 * modifier que SON propre profil (jamais un autre).
 */

const NameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Le nom ne peut pas être vide')
    .max(80, 'Le nom est trop long (max 80 caractères)'),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Met à jour le nom de l'utilisateur connecté.
 * Le nom apparaît dans : email post-achat, certificat PDF, header.
 */
export async function updateUserName(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: 'Authentification requise' };
  }

  const parsed = NameSchema.safeParse({
    name: formData.get('name'),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Nom invalide',
    };
  }

  try {
    await db
      .update(users)
      .set({ name: parsed.data.name })
      .where(eq(users.id, session.user.id));

    revalidatePath('/account');
    return { ok: true };
  } catch (e) {
    console.error('[account] updateUserName failed', e);
    return { ok: false, error: 'Erreur serveur' };
  }
}
