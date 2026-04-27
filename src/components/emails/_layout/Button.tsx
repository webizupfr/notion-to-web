import { Button as REButton } from '@react-email/components';
import type { ReactNode } from 'react';

/**
 * CTA jaune Impulsion. Sobre, lisible, accessible.
 * Variant `primary` (jaune) ou `secondary` (outline).
 */
export function Button({
  href,
  children,
  variant = 'primary',
}: {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  if (variant === 'primary') {
    return (
      <REButton
        href={href}
        className="rounded-[6px] bg-[#F9D656] px-[24px] py-[12px] text-center text-[14px] font-semibold text-[#0F172A] no-underline"
      >
        {children}
      </REButton>
    );
  }
  return (
    <REButton
      href={href}
      className="rounded-[6px] border border-[#E2E8F0] bg-white px-[24px] py-[12px] text-center text-[14px] font-semibold text-[#0F172A] no-underline"
    >
      {children}
    </REButton>
  );
}
