'use client';

import { useState, useTransition } from 'react';
import { updateUserName } from './actions';

/**
 * Form pour modifier le nom de l'utilisateur.
 * Style "Stripe Dashboard" : input inline, bouton à droite, feedback discret.
 */
export function NameForm({ currentName }: { currentName: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [name, setName] = useState(currentName);

  const isDirty = name.trim() !== currentName.trim();

  function handleSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateUserName(formData);
      if (result.ok) {
        setMessage({ type: 'success', text: 'Enregistré' });
        setTimeout(() => setMessage(null), 2500);
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1">
        <label
          htmlFor="account-name"
          className="block font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]"
        >
          Nom affiché
        </label>
        <input
          id="account-name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          required
          autoComplete="name"
          className="mt-2 w-full rounded-[var(--r-s)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] px-3 py-2 text-[0.95rem] text-[color:var(--text-primary)] focus:border-[color:var(--accent-edge)] focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={!isDirty || isPending}
        className="btn btn-primary"
        style={{ height: 38, padding: '0 16px', fontSize: 13 }}
      >
        {isPending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
      {message ? (
        <span
          role="status"
          className={`ml-2 text-[0.85rem] ${
            message.type === 'success'
              ? 'text-[color:var(--signal-success,#16A34A)]'
              : 'text-[color:var(--signal-danger,#DC2626)]'
          }`}
        >
          {message.text}
        </span>
      ) : null}
    </form>
  );
}
