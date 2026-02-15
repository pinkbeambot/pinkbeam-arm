import { SupabaseClient } from '@supabase/supabase-js';
import { generateSlug } from '@/lib/utils';

const MAX_SLUG_SUFFIX = 99;

/**
 * Generate a unique slug for an agent within a tenant.
 *
 * Starts with the base slug derived from `name`. If that slug already
 * exists for the given tenant, appends an incrementing numeric suffix
 * (e.g. `my-agent-1`, `my-agent-2`, …) up to 99 attempts.
 *
 * @returns The unique slug string.
 * @throws  An object with `{ error, status }` if no unique slug can be found.
 */
export async function generateUniqueSlug(
  name: string,
  tenantId: string,
  supabase: SupabaseClient,
): Promise<string> {
  const baseSlug = generateSlug(name);

  let slug = baseSlug;
  let suffix = 0;

  while (suffix <= MAX_SLUG_SUFFIX) {
    const candidateSlug = suffix === 0 ? baseSlug : `${baseSlug}-${suffix}`;
    const { data: existing } = await supabase
      .from('agents')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('slug', candidateSlug)
      .maybeSingle();

    if (!existing) {
      slug = candidateSlug;
      return slug;
    }

    suffix++;
  }

  throw { error: 'Unable to generate unique slug for agent', status: 409 };
}
