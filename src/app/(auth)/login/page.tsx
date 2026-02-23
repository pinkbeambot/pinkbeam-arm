import { redirect } from 'next/navigation';

/**
 * @deprecated Use /auth instead
 * This page redirects to the unified /auth page
 */
export default function LoginPage() {
  redirect('/auth');
}
