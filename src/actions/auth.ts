'use server';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { SignInSchema } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/server';

export type SignInState = { error?: string; email?: string };

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim();
  const parsed = SignInSchema.safeParse({ email, password: formData.get('password') ?? '' });
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    const message = error?.code === 'invalid_credentials'
      ? 'Email or password is incorrect.'
      : 'Could not sign in. Check your connection and try again.';
    return { error: message, email };
  }

  await logAuthEvent(supabase, data.user.id, 'auth.signed_in');
  redirect('/today');
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await logAuthEvent(supabase, user.id, 'auth.signed_out');
  await supabase.auth.signOut();
  redirect('/login');
}

/** Events need a business_id (RLS), so the event goes to the user's business. */
async function logAuthEvent(supabase: SupabaseClient<Database>, userId: string, type: string) {
  const { data: membership } = await supabase
    .from('memberships')
    .select('business_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (!membership) return;

  const { error } = await supabase
    .from('events')
    .insert({ business_id: membership.business_id, actor_id: userId, type });
  // An audit gap shouldn't block signing in or out, but it must be visible in the server logs
  if (error) console.error(`Could not record ${type} for user ${userId}:`, error.message);
}
