import { Heading, Text } from '@react-email/components';

import { EmailLayout } from './_layout/EmailLayout';
import { Button } from './_layout/Button';

/**
 * Magic link de connexion. Envoyé par NextAuth provider.
 *
 * Variables :
 *   - magicLink : l'URL signée NextAuth (1 click → connecté)
 *   - host : domaine du site (pour debug si user clique pas)
 */

export type MagicLinkEmailProps = {
  magicLink: string;
  host: string;
};

export function MagicLinkEmail({ magicLink, host }: MagicLinkEmailProps) {
  return (
    <EmailLayout previewText="Ton lien de connexion à Impulsion (valide 24h)">
      <Heading
        as="h1"
        className="m-0 text-[24px] font-bold leading-[32px] tracking-tight text-[#0F172A]"
      >
        Ton lien de connexion
      </Heading>

      <Text className="mt-[16px] text-[15px] leading-[24px] text-[#475569]">
        Click sur le bouton ci-dessous pour te connecter à ton espace Impulsion.
        Ce lien est valide pendant 24h.
      </Text>

      <Text className="mt-[24px] mb-[24px]">
        <Button href={magicLink}>Me connecter</Button>
      </Text>

      <Text className="text-[13px] leading-[20px] text-[#64748B]">
        Si le bouton ne fonctionne pas, copie/colle cette URL dans ton
        navigateur :
      </Text>
      <Text className="break-all text-[12px] leading-[18px] text-[#94A3B8]">
        {magicLink}
      </Text>

      <Text className="mt-[24px] text-[13px] leading-[20px] text-[#64748B]">
        Tu n&apos;as pas demandé ce lien ? Ignore cet email — personne ne pourra
        accéder à ton compte sans avoir cliqué.
      </Text>

      <Text className="mt-[8px] text-[11px] text-[#94A3B8]">
        Domaine : {host}
      </Text>
    </EmailLayout>
  );
}

MagicLinkEmail.PreviewProps = {
  magicLink: 'https://impulsion.studio/api/auth/callback/resend?token=abc&email=arthur%40example.com',
  host: 'impulsion.studio',
} satisfies MagicLinkEmailProps;

export default MagicLinkEmail;
