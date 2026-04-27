import { Heading, Hr, Link, Section, Text } from '@react-email/components';

import { EmailLayout } from './_layout/EmailLayout';
import { Button } from './_layout/Button';

/**
 * Email post-achat. Envoyé après webhook `checkout.session.completed`.
 *
 * Récap commande + accès programme + lien facture Stripe.
 */

export type PurchaseConfirmationEmailProps = {
  /** Prénom ou email de l'apprenant */
  userName: string;
  programTitle: string;
  programUrl: string;
  /** Montant en euros (déjà formaté, ex: "49,00 €") */
  amountFormatted: string;
  purchaseDate: string; // ex: "27 avril 2026"
  /** URL hosted Stripe pour télécharger la facture (peut être null si invoice pas encore prête) */
  invoiceUrl: string | null;
};

export function PurchaseConfirmationEmail({
  userName,
  programTitle,
  programUrl,
  amountFormatted,
  purchaseDate,
  invoiceUrl,
}: PurchaseConfirmationEmailProps) {
  return (
    <EmailLayout
      previewText={`Ton accès à "${programTitle}" est activé`}
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
        Ton paiement a bien été reçu. Ton accès au programme est activé{' '}
        <strong className="text-[#0F172A]">à vie</strong> — tu peux y revenir
        autant de fois que tu veux, à ton rythme.
      </Text>

      <Text className="mt-[24px] mb-[24px]">
        <Button href={programUrl}>Démarrer le programme</Button>
      </Text>

      <Hr className="my-[24px] border-[#E2E8F0]" />

      {/* Récap commande */}
      <Section>
        <Text className="m-0 text-[12px] font-mono uppercase tracking-[0.08em] text-[#94A3B8]">
          Récap de ta commande
        </Text>
        <table
          cellPadding="0"
          cellSpacing="0"
          border={0}
          className="mt-[8px] w-full"
        >
          <tr>
            <td className="py-[6px] text-[14px] text-[#475569]">Programme</td>
            <td className="py-[6px] text-right text-[14px] font-semibold text-[#0F172A]">
              {programTitle}
            </td>
          </tr>
          <tr>
            <td className="py-[6px] text-[14px] text-[#475569]">Montant</td>
            <td className="py-[6px] text-right text-[14px] font-semibold text-[#0F172A]">
              {amountFormatted}
            </td>
          </tr>
          <tr>
            <td className="py-[6px] text-[14px] text-[#475569]">Date</td>
            <td className="py-[6px] text-right text-[14px] text-[#0F172A]">
              {purchaseDate}
            </td>
          </tr>
        </table>

        {invoiceUrl ? (
          <Text className="mt-[12px] text-[13px] text-[#475569]">
            <Link
              href={invoiceUrl}
              className="text-[#0F172A] underline"
            >
              📄 Télécharger ma facture
            </Link>
          </Text>
        ) : null}
      </Section>

      <Hr className="my-[24px] border-[#E2E8F0]" />

      <Text className="text-[14px] leading-[22px] text-[#475569]">
        <strong className="text-[#0F172A]">Comment ça se passe ?</strong>
      </Text>
      <Text className="mt-[8px] text-[14px] leading-[22px] text-[#475569]">
        • Tu peux commencer dès maintenant — clique sur le bouton ci-dessus.
        <br />
        • Ton avancement est sauvegardé automatiquement.
        <br />
        • À la fin, tu reçois ton certificat de complétion.
      </Text>

      <Text className="mt-[16px] text-[14px] leading-[22px] text-[#475569]">
        Une question ? Réponds simplement à cet email, je te lis.
      </Text>
    </EmailLayout>
  );
}

PurchaseConfirmationEmail.PreviewProps = {
  userName: 'Arthur',
  programTitle: 'Challenge IA — 5 jours pour dompter l\'IA',
  programUrl: 'https://impulsion.studio/programs/challenge-ia',
  amountFormatted: '49,00 €',
  purchaseDate: '27 avril 2026',
  invoiceUrl: 'https://invoice.stripe.com/i/acct_xxx/test_xxx',
} satisfies PurchaseConfirmationEmailProps;

export default PurchaseConfirmationEmail;
