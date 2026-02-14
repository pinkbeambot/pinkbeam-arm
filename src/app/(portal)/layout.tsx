import { redirect } from "next/navigation";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true';

export default async function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Skip server-side auth check in dev bypass mode
  if (!DEV_AUTH_BYPASS) {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      redirect('/login');
    }
  }

  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
