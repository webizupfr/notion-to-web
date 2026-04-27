import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import type { ReactNode } from 'react';

import { Brand } from './Brand';

/**
 * Layout commun à tous les emails Impulsion.
 *
 * Style : sobre, type Substack — beaucoup de blanc, jaune en accent ponctuel,
 * contenu centré sur 580px max, font system, signature personnelle.
 *
 * Usage :
 *   <EmailLayout previewText="...">
 *     <Heading>...</Heading>
 *     <Text>...</Text>
 *   </EmailLayout>
 */

type Props = {
  /** Texte d'aperçu visible dans la liste de la boîte mail (Gmail, Apple Mail). 80 chars max. */
  previewText: string;
  children: ReactNode;
};

export function EmailLayout({ previewText, children }: Props) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-[#FAFAFA] font-sans">
          <Container className="mx-auto max-w-[580px] bg-white px-[32px] py-[40px]">
            {/* Header — logo + nom */}
            <Section className="mb-[32px]">
              <Brand />
            </Section>

            {/* Contenu */}
            <Section>{children}</Section>

            {/* Signature personnelle */}
            <Section className="mt-[40px] border-t border-[#E2E8F0] pt-[24px]">
              <Text className="m-0 text-[14px] leading-[20px] text-[#475569]">
                À très vite,
              </Text>
              <Text className="mt-[4px] mb-0 text-[14px] font-semibold leading-[20px] text-[#0F172A]">
                Arthur Maréchaux
              </Text>
              <Text className="mt-0 text-[12px] leading-[18px] text-[#64748B]">
                Fondateur d&apos;Impulsion
              </Text>
            </Section>

            {/* Footer */}
            <Section className="mt-[32px] border-t border-[#E2E8F0] pt-[16px]">
              <Text className="m-0 text-[11px] leading-[16px] text-[#94A3B8]">
                <Link
                  href="https://impulsion.studio"
                  className="text-[#94A3B8] underline"
                >
                  impulsion.studio
                </Link>
                {' · '}
                <Link
                  href="https://impulsion.studio/mentions-legales"
                  className="text-[#94A3B8] underline"
                >
                  Mentions légales
                </Link>
              </Text>
              <Text className="mt-[8px] mb-0 text-[11px] leading-[16px] text-[#94A3B8]">
                Tu reçois cet email parce que tu as un compte sur Impulsion.
                Pour ne plus recevoir ce type d&apos;email, réponds-moi
                directement.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
