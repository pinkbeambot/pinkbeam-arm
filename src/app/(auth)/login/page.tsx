'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/components/auth/AuthProvider';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signInWithMagicLink } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setIsSubmitting(false);
      return;
    }

    const { error: signInError } = await signInWithMagicLink(email);

    if (signInError) {
      setError(signInError.message || 'Failed to send magic link. Please try again.');
      setIsSubmitting(false);
      return;
    }

    setIsSuccess(true);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Back to home link */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-600">
                <span className="text-white font-bold text-lg">PB</span>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              {isSuccess ? 'Check your email' : 'Sign in to Pink Beam'}
            </CardTitle>
            <CardDescription>
              {isSuccess 
                ? `We've sent a magic link to ${email}`
                : 'Enter your email to receive a magic link'
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {isSuccess ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Click the link in your email to sign in. If you don&apos;t see it, check your spam folder.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setIsSuccess(false);
                    setEmail('');
                  }}
                >
                  Send to a different email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="text-sm">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isSubmitting}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  variant="beam"
                  disabled={isSubmitting || !email}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending magic link...
                    </>
                  ) : (
                    'Send Magic Link'
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  We&apos;ll send you a secure link to sign in without a password.
                </p>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-foreground">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
