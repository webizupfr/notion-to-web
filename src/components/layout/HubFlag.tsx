"use client";

import { useEffect } from 'react';

export function HubFlag({ value }: { value: boolean }) {
  useEffect(() => {
    try {
      const el = document.documentElement;
      if (value) el.setAttribute('data-hub', '1');
      else el.removeAttribute('data-hub');
      return () => {
        // Cleanup only if we set it; avoid removing if another page sets it true
        if (value) {
          el.removeAttribute('data-hub');
        }
      };
    } catch {
      // ignore SSR
    }
  }, [value]);
  return null;
}

