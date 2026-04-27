import { Heading, Hr, Text } from '@react-email/components';

import { EmailLayout } from './_layout/EmailLayout';
import { Button } from './_layout/Button';

/**
 * Rappel de session pour les programmes `sync` (cohortes avec date de démarrage).
 *
 * 2 variantes :
 *   - `j-1` : envoyé la veille à 7h Paris ("Demain c'est le jour J")
 *   - `j0`  : envoyé le matin même à 7h Paris ("Aujourd'hui on démarre")
 */

export type SessionReminderEmailProps = {
  userName: string;
  programTitle: string;
  programUrl: string;
  /** Date formatée FR, ex: "vendredi 5 mai" */
  startDate: string;
  /** Heure formatée, ex: "10h00" — optionnel */
  startTime?: string | null;
  variant: 'j-1' | 'j0';
};

export function SessionReminderEmail({
  userName,
  programTitle,
  programUrl,
  startDate,
  startTime,
  variant,
}: SessionReminderEmailProps) {
  const isJMinus1 = variant === 'j-1';
  const heading = isJMinus1
    ? `Demain on démarre — ${programTitle}`
    : `C'est le jour J 🚀`;
  const previewText = isJMinus1
    ? `Demain on démarre ${programTitle}`
    : `Aujourd'hui on démarre ${programTitle}`;

  return (
    <EmailLayout previewText={previewText}>
      <Heading
        as="h1"
        className="m-0 text-[24px] font-bold leading-[32px] tracking-tight text-[#0F172A]"
      >
        {heading}
      </Heading>

      <Text className="mt-[16px] text-[15px] leading-[24px] text-[#475569]">
        Salut {userName},
      </Text>

      <Text className="mt-[8px] text-[15px] leading-[24px] text-[#475569]">
        {isJMinus1 ? (
          <>
            Petit rappel : <strong className="text-[#0F172A]">{programTitle}</strong>{' '}
            démarre <strong className="text-[#0F172A]">demain ({startDate}{startTime ? ` à ${startTime}` : ''})</strong>.
            Pense à bloquer le créneau dans ton agenda pour rester focus.
          </>
        ) : (
          <>
            Aujourd&apos;hui c&apos;est le jour J — on démarre{' '}
            <strong className="text-[#0F172A]">{programTitle}</strong>
            {startTime ? <> à <strong className="text-[#0F172A]">{startTime}</strong></> : null}.
            Tout est prêt côté contenu, à toi de jouer.
          </>
        )}
      </Text>

      <Text className="mt-[24px] mb-[24px]">
        <Button href={programUrl}>
          {isJMinus1 ? 'Aller sur ma page programme' : 'Démarrer maintenant'}
        </Button>
      </Text>

      <Hr className="my-[24px] border-[#E2E8F0]" />

      <Text className="text-[14px] leading-[22px] text-[#475569]">
        <strong className="text-[#0F172A]">Conseil :</strong>{' '}
        {isJMinus1
          ? 'prépare un créneau dédié sans notifs, idéalement le matin quand tu es frais. 30-45 min suffisent par session.'
          : 'avance pas à pas, fais les exercices au fur et à mesure. C\'est en pratiquant que ça rentre.'}
      </Text>

      <Text className="mt-[16px] text-[14px] leading-[22px] text-[#475569]">
        Une question ? Réponds à cet email, je te lis.
      </Text>
    </EmailLayout>
  );
}

SessionReminderEmail.PreviewProps = {
  userName: 'Arthur',
  programTitle: 'Sprint IA pour PME',
  programUrl: 'https://impulsion.studio/programs/sprint-ia-pme',
  startDate: 'lundi 5 mai',
  startTime: '10h00',
  variant: 'j-1',
} satisfies SessionReminderEmailProps;

export default SessionReminderEmail;
