import type { ReactNode } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';

export default function MyLearningLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[color:var(--surface-0)]">
      <AppHeader />
      {children}
    </div>
  );
}
