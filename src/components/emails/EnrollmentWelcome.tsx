import { Heading, Hr, Text } from '@react-email/components';

import { EmailLayout } from './_layout/EmailLayout';
import { Button } from './_layout/Button';

/**
 * Email de bienvenue à l'inscription (gratuite ou via paywall pour la 1re fois).
 *
 * Trigger : `/api/progress/start` — uniquement si nouvelle inscription
 * (idempotent : pas envoyé sur les ré-enroll).
 *
 * Pour les inscriptions PAYANTES, c'est `PurchaseConfirmationEmail` qui est envoyé
 * via le webhook Stripe (avec récap commande + facture). Cet email est uniquement
 * pour le flow gratuit.
 */

export type EnrollmentWelcomeEmailProps = {
  userName: string;
  programTitle: string;
  programUrl: string;
  /** Type de programme — pour adapter le wording ("jour"/"module"/"session") */
  programKind: 'days' | 'modules';
};

export function EnrollmentWelcomeEmail({
  userName,
  programTitle,
  programUrl,
  programKind,
}: EnrollmentWelcomeEmailProps) {
  const unitWording =
    programKind === 'days'
      ? 'Chaque jour se débloque à ton rythme, 24h après le précédent.'
      : 'Tous les modules sont accessibles dès maintenant — avance comme tu veux.';

  return (
    <EmailLayout
      previewText={`Ton inscription à ${programTitle} est confirmée`}
    >
      <Heading
        as="h1"
        className="m-0 text-[24px] font-bold leading-[32px] tracking-tight text-[#0F172A]"
      >
        Bienvenue dans {programTitle} 🎯
      </Heading>

      <Text className="mt-[16px] text-[15px] leading-[24px] text-[#475569]">
        Salut {userName},
      </Text>

      <Text className="mt-[8px] text-[15px] leading-[24px] text-[#475569]">
        Ton inscription à{' '}
        <strong className="text-[#0F172A]">{programTitle}</strong> est bien
        enregistrée. Tu peux commencer dès maintenant.
      </Text>

      <Text className="mt-[8px] text-[15px] leading-[24px] text-[#475569]">
        {unitWording}
      </Text>

      <Text className="mt-[24px] mb-[24px]">
        <Button href={programUrl}>Démarrer le programme</Button>
      </Text>

      <Hr className="my-[24px] border-[#E2E8F0]" />

      <Text className="text-[14px] leading-[22px] text-[#475569]">
        <strong className="text-[#0F172A]">Comment ça se passe ?</strong>
      </Text>
      <Text className="mt-[8px] text-[14px] leading-[22px] text-[#475569]">
        • Ton avancement est sauvegardé automatiquement.
        <br />
        • Tu peux y revenir autant de fois que tu veux.
        <br />
        • À la fin, tu reçois ton certificat de complétion.
      </Text>

      <Text className="mt-[16px] text-[14px] leading-[22px] text-[#475569]">
        Une question ? Réponds simplement à cet email, je te lis.
      </Text>
    </EmailLayout>
  );
}

EnrollmentWelcomeEmail.PreviewProps = {
  userName: 'Arthur',
  programTitle: 'Challenge IA',
  programUrl: 'https://impulsion.studio/programs/challenge-ia',
  programKind: 'days',
} satisfies EnrollmentWelcomeEmailProps;

export default EnrollmentWelcomeEmail;
