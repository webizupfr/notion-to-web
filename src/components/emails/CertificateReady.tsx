import { Heading, Hr, Text } from '@react-email/components';

import { EmailLayout } from './_layout/EmailLayout';
import { Button } from './_layout/Button';

/**
 * Email envoyé quand l'apprenant complète 100% d'un programme.
 *
 * Combine la félicitation + le lien direct vers le certificat PDF.
 */

export type CertificateReadyEmailProps = {
  userName: string;
  programTitle: string;
  certificateUrl: string;
  verifyUrl: string;
};

export function CertificateReadyEmail({
  userName,
  programTitle,
  certificateUrl,
  verifyUrl,
}: CertificateReadyEmailProps) {
  return (
    <EmailLayout
      previewText={`🎉 Bravo ${userName} — ton certificat ${programTitle} est prêt`}
    >
      <Heading
        as="h1"
        className="m-0 text-[24px] font-bold leading-[32px] tracking-tight text-[#0F172A]"
      >
        Bravo {userName}, tu l&apos;as fait 🎯
      </Heading>

      <Text className="mt-[16px] text-[15px] leading-[24px] text-[#475569]">
        Tu viens de terminer{' '}
        <strong className="text-[#0F172A]">{programTitle}</strong>. Sincèrement
        : c&apos;est rare de finir un programme jusqu&apos;au bout. Tu peux être
        fier·ère de toi.
      </Text>

      <Text className="mt-[16px] text-[15px] leading-[24px] text-[#475569]">
        Ton certificat de complétion est dispo en téléchargement :
      </Text>

      <Text className="mt-[24px] mb-[24px]">
        <Button href={certificateUrl}>📜 Télécharger mon certificat</Button>
      </Text>

      <Hr className="my-[24px] border-[#E2E8F0]" />

      <Text className="text-[14px] leading-[22px] text-[#475569]">
        <strong className="text-[#0F172A]">Et maintenant ?</strong>
      </Text>
      <Text className="mt-[8px] text-[14px] leading-[22px] text-[#475569]">
        Le vrai test, c&apos;est l&apos;application sur le terrain. Donne-toi
        une semaine pour appliquer ce que tu as appris dans ton activité, puis
        viens me dire ce qui a marché (ou pas).
      </Text>

      <Text className="mt-[16px] text-[13px] leading-[20px] text-[#64748B]">
        Le certificat est vérifiable publiquement à cette adresse :{' '}
        <span className="break-all text-[#94A3B8]">{verifyUrl}</span>
      </Text>
    </EmailLayout>
  );
}

CertificateReadyEmail.PreviewProps = {
  userName: 'Arthur',
  programTitle: 'Challenge IA',
  certificateUrl: 'https://impulsion.studio/api/certificates/challenge-ia',
  verifyUrl: 'https://impulsion.studio/cert/verify/abc123def456',
} satisfies CertificateReadyEmailProps;

export default CertificateReadyEmail;
