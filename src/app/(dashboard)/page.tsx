import { redirect } from 'next/navigation';

export default function DashboardHomePage() {
  // Redirect to agents page as the main dashboard view
  redirect('/agents');
}
