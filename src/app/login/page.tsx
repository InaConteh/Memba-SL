import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in · Memba' };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-4 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Memba</h1>
        <p className="text-sm text-muted-foreground">Sign in to see who to remind today.</p>
      </div>
      <LoginForm />
    </main>
  );
}
