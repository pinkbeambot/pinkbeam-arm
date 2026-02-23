import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not set. Email features will be disabled.');
}

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export function isResendConfigured(): boolean {
  return !!resend;
}

export const EMAIL_FROM = process.env.EMAIL_FROM || 'Pink Beam <noreply@pinkbeam.ai>';
