import { Heading, Hr, Text } from '@react-email/components';

import { EmailLayout } from './_layout/EmailLayout';
import { Button } from './_layout/Button';

/**
 * Email de félicitation à la complétion d'un programme.
 *
 * Note : aujourd'hui on combine ce mail avec CertificateReady (un seul mail).
 * Ce template reste dispo pour les cas où il n'y a pas de certificat
 * (ex: programme `event` sans completion criteria) ou pour usage futur.
 */

export type ProgramCompletedEmailProps = {
  userName: string;
  programTitle: string;
  /** Nombre d'unités complétées */
  unitsCompleted: number;
  /** Total d'unités du programme */
  totalUnits: number;
  /** URL d'autres programmes à découvrir */
  programsUrl: string;
};

export function ProgramCompletedEmail({
  userName,
  programTitle,
  unitsCompleted,
  totalUnits,
  programsUrl,
}: ProgramCompletedEmailProps) {
  return (
    <EmailLayout
      previewText={`Bravo ${userName} — tu as terminé ${programTitle}`}
    >
      <Heading
        as="h1"
        className="m-0 text-[24px] font-bold leading-[32px] tracking-tight text-[#0F172A]"
      >
        Tu as terminé {programTitle} 🏁
      </Heading>

      <Text className="mt-[16px] text-[15px] leading-[24px] text-[#475569]">
        Salut {userName},
      </Text>

      <Text className="mt-[8px] text-[15px] leading-[24px] text-[#475569]">
        Tu viens de boucler{' '}
        <strong className="text-[#0F172A]">
          {unitsCompleted}/{totalUnits} unités
        </strong>{' '}
        de <strong className="text-[#0F172A]">{programTitle}</strong>. Vraiment,
        félicitations — terminer un programme jusqu&apos;au bout, c&apos;est
        rare et ça compte.
      </Text>

      <Hr className="my-[24px] border-[#E2E8F0]" />

      <Text className="text-[14px] leading-[22px] text-[#475569]">
        <strong className="text-[#0F172A]">Et maintenant ?</strong>
      </Text>
      <Text className="mt-[8px] text-[14px] leading-[22px] text-[#475569]">
        Le contenu reste accessible à vie sur ton compte — tu peux y revenir
        autant de fois que tu veux. Si jamais tu veux pousser plus loin, voici
        d&apos;autres programmes qui pourraient te parler :
      </Text>

      <Text className="mt-[24px] mb-[24px]">
        <Button href={programsUrl} variant="secondary">
          Voir tous les programmes
        </Button>
      </Text>

      <Text className="mt-[16px] text-[14px] leading-[22px] text-[#475569]">
        Et si tu as 2 minutes — réponds-moi à cet email pour me dire ce que ça
        t&apos;a apporté. Tes retours m&apos;aident à améliorer chaque
        programme.
      </Text>
    </EmailLayout>
  );
}

ProgramCompletedEmail.PreviewProps = {
  userName: 'Arthur',
  programTitle: 'Challenge IA',
  unitsCompleted: 5,
  totalUnits: 5,
  programsUrl: 'https://impulsion.studio/programs',
} satisfies ProgramCompletedEmailProps;

export default ProgramCompletedEmail;
