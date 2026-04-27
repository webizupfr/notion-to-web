import { Heading, Hr, Text } from '@react-email/components';

import { EmailLayout } from './_layout/EmailLayout';
import { Button } from './_layout/Button';

/**
 * Relance d'inactivité — envoyé quand l'apprenant n'a pas avancé depuis X jours.
 *
 * 2 variantes (ton dégressif) :
 *   - `1` : ~7 jours d'inactivité ("Tu en es où ?")
 *   - `2` : ~14 jours d'inactivité ("Dernier coup de pouce")
 *
 * Au-delà de 21 jours d'inactivité on stoppe (pas de spam).
 */

export type InactivityRelaunchEmailProps = {
  userName: string;
  programTitle: string;
  programUrl: string;
  /** Index de la prochaine unité non-terminée, ex: "Jour 3" */
  nextUnitLabel: string | null;
  /** Pourcentage d'avancement actuel, ex: 40 */
  progressPercent: number;
  variant: 1 | 2;
};

export function InactivityRelaunchEmail({
  userName,
  programTitle,
  programUrl,
  nextUnitLabel,
  progressPercent,
  variant,
}: InactivityRelaunchEmailProps) {
  const isFirst = variant === 1;
  const heading = isFirst
    ? `Tu en es où, ${userName} ?`
    : `Dernière relance — ${programTitle}`;
  const previewText = isFirst
    ? `Tu as commencé ${programTitle}, on continue ?`
    : `Pas envie d'abandonner ${programTitle} si près du but ?`;

  return (
    <EmailLayout previewText={previewText}>
      <Heading
        as="h1"
        className="m-0 text-[24px] font-bold leading-[32px] tracking-tight text-[#0F172A]"
      >
        {heading}
      </Heading>

      <Text className="mt-[16px] text-[15px] leading-[24px] text-[#475569]">
        {isFirst ? (
          <>
            Tu as démarré <strong className="text-[#0F172A]">{programTitle}</strong>{' '}
            il y a quelques jours et tu en es à{' '}
            <strong className="text-[#0F172A]">{progressPercent}%</strong>. Pas
            de pression — mais si t&apos;as 30 minutes ce week-end, c&apos;est
            le moment idéal pour te remettre dessus.
          </>
        ) : (
          <>
            Ça fait quelques semaines qu&apos;on n&apos;a pas avancé sur{' '}
            <strong className="text-[#0F172A]">{programTitle}</strong>. Tu en es
            à <strong className="text-[#0F172A]">{progressPercent}%</strong> —
            ce serait dommage de s&apos;arrêter là. Une dernière session de 30
            minutes peut suffire à remettre le pied à l&apos;étrier.
          </>
        )}
      </Text>

      {nextUnitLabel ? (
        <Text className="mt-[16px] text-[14px] leading-[22px] text-[#475569]">
          Tu reprends pile où tu t&apos;étais arrêté·e :{' '}
          <strong className="text-[#0F172A]">{nextUnitLabel}</strong>
        </Text>
      ) : null}

      <Text className="mt-[24px] mb-[24px]">
        <Button href={programUrl}>Reprendre le programme</Button>
      </Text>

      <Hr className="my-[24px] border-[#E2E8F0]" />

      <Text className="text-[14px] leading-[22px] text-[#475569]">
        {isFirst ? (
          <>
            <strong className="text-[#0F172A]">Bloqué·e quelque part ?</strong>{' '}
            Réponds à cet email avec ta question, je te débloque dans la
            journée.
          </>
        ) : (
          <>
            {' '}<strong className="text-[#0F172A]">Cet email est le dernier rappel auto.</strong>{' '}
            Si jamais tu reprends, ton avancement est intact — tout est gardé
            dans ton compte. Et si vraiment ce programme n&apos;est plus pour
            toi, dis-le-moi et on en discute.
          </>
        )}
      </Text>
    </EmailLayout>
  );
}

InactivityRelaunchEmail.PreviewProps = {
  userName: 'Arthur',
  programTitle: 'Challenge IA',
  programUrl: 'https://impulsion.studio/programs/challenge-ia',
  nextUnitLabel: 'Jour 3 — Passer à l\'action',
  progressPercent: 40,
  variant: 1,
} satisfies InactivityRelaunchEmailProps;

export default InactivityRelaunchEmail;
