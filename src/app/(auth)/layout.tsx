export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // AuthProvider is already provided by root layout
  return children;
}
