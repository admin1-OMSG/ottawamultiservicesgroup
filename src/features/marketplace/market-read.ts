import { supabase } from "@/lib/supabase";

/** Read all ordered pages of a table-returning RPC within its role filter. */
export async function readMarketRows<T>(name: string, args: Record<string, unknown> = {}, roleFilter?: { field: string; value: boolean }): Promise<T[]> {
  const rows: T[] = [];
  const limit = 200;
  for (let offset = 0; ; offset += limit) {
    const call = supabase.rpc(name, args);
    const scoped = roleFilter ? call.eq(roleFilter.field, roleFilter.value) : call;
    const { data, error } = await scoped.range(offset, offset + limit - 1);
    if (error) throw error;
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < limit) return rows;
  }
}
