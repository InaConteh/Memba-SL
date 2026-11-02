import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/database.types';
import { createClient } from '@/lib/supabase/server';

export type Member = {
  supabase: SupabaseClient<Database>;
  user: User;
  /** From the user's membership, never from the client. */
  businessId: string;
};

export type MemberResult = { member: Member; error?: undefined } | { member?: undefined; error: string };

/** The signed-in user and their business, checked with auth.getUser() as CLAUDE.md requires. */
export async function requireMember(): Promise<MemberResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in again.' };

  const { data: membership, error } = await supabase
    .from('memberships')
    .select('business_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (error) return { error: 'Could not reach Memba. Check your connection and try again.' };
  if (!membership) return { error: 'Your account isn’t linked to a business yet. Please contact support.' };

  return { member: { supabase, user, businessId: membership.business_id } };
}

/** Appends to the audit trail. A failure is logged, not shown: the owner's change has already been saved. */
export async function logEvent(member: Member, type: string, entityId: string, data: Json = {}): Promise<void> {
  const { error } = await member.supabase.from('events').insert({
    business_id: member.businessId,
    actor_id: member.user.id,
    type,
    entity_id: entityId,
    data,
  });
  if (error) console.error(`Could not record ${type} for ${entityId}:`, error.message);
}
