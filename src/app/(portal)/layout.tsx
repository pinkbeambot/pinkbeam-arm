import { redirect } from "next/navigation";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Check authentication on the server
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  // Redirect to login if not authenticated
  if (!session) {
    redirect('/login');
  }

  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
