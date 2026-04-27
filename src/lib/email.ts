import { Resend } from 'resend';

const apiKey = process.env.AUTH_RESEND_KEY;

if (!apiKey) {
  throw new Error('AUTH_RESEND_KEY is not set');
}

export const resend = new Resend(apiKey);

export const DEFAULT_FROM = process.env.AUTH_RESEND_FROM ?? 'onboarding@resend.dev';
