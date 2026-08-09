import { supabase } from "@/lib/supabase"

export async function requireActiveAdmin() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return null

  const { data: adminUser, error: adminError } = await supabase
    .from("admin_users")
    .select("id, is_active")
    .eq("id", user.id)
    .eq("is_active", true)
    .maybeSingle()

  if (adminError || !adminUser) return null
  return user
}
