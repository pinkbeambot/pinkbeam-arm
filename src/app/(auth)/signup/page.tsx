'use client';

import { Suspense } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Mail, Loader2, CheckCircle2, ArrowLeft, Sparkles, Shield, Zap, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/components/auth/AuthProvider';

const valueProps = [
  {
    icon: Sparkles,
    title: 'Full Visibility',
    description: 'See what every AI employee is working on in real-time',
  },
  {
    icon: Shield,
    title: 'Total Control',
    description: 'Set guardrails, approve decisions, maintain oversight',
  },
  {
    icon: Zap,
    title: 'Infinite Scale',
    description: 'Add agents as you grow — no hiring overhead',
  },
];

function SignupForm() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signInWithMagicLink } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/portal';

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
    
    // Show welcome toast
    toast.success('Welcome to Pink Beam!', {
      description: 'Check your email to complete signup.',
    });
  };

  return (
    <Card className="border-border/50 shadow-xl shadow-pink-500/5">
      <CardHeader className="space-y-1 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 shadow-lg shadow-pink-500/25">
            <span className="text-white font-bold text-xl">PB</span>
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">
          {isSuccess ? 'Check your email' : 'Start managing your AI workforce'}
        </CardTitle>
        <CardDescription>
          {isSuccess 
            ? `We've sent a magic link to ${email}`
            : 'Create your account and get started in minutes'
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {isSuccess ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-6 shadow-lg">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm text-muted-foreground max-w-sm mb-2">
                Click the link in your email to complete your signup and access your portal.
              </p>
              <p className="text-xs text-muted-foreground">
                Can&apos;t find it? Check your spam folder.
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
              Use a different email
            </Button>
          </div>
        ) : (
          <>
            {/* Value Props */}
            <div className="space-y-3">
              {valueProps.map((prop) => {
                const Icon = prop.icon;
                return (
                  <div key={prop.title} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{prop.title}</p>
                      <p className="text-xs text-muted-foreground">{prop.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="text-sm">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Work email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    required
                    disabled={isSubmitting}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11"
                variant="beam"
                disabled={isSubmitting || !email}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating your account...
                  </>
                ) : (
                  'Create Free Account'
                )}
              </Button>
            </form>

            {/* Trust Elements */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span>Free tier includes 3 agents</span>
              </div>
            </div>

            {/* Social Proof */}
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-border/50">
              <div className="flex -space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-violet-500 border-2 border-background flex items-center justify-center"
                  >
                    <Users className="w-3 h-3 text-white" />
                  </div>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                Join <span className="font-medium text-foreground">100+</span> AI-native founders
              </span>
            </div>

            {/* Already have account */}
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link 
                href={`/login${redirectTo !== '/portal' ? `?redirect=${redirectTo}` : ''}`}
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Log in
              </Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-500/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Back to home link */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <Suspense fallback={
          <Card className="border-border/50 shadow-xl shadow-pink-500/5 p-8">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </Card>
        }>
          <SignupForm />
        </Suspense>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          By creating an account, you agree to our{' '}
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
