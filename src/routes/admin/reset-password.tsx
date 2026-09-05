import { createFileRoute, Link } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export const Route = createFileRoute("/admin/reset-password")({
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let mounted = true

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession()
      if (!mounted) return
      if (error) {
        setError(error.message)
        return
      }
      if (data.session) setReady(true)
    }

    void checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true)
        setError("")
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      setPassword("")
      setConfirmPassword("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update password.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <section className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">
          <div className="text-center">
            <div className="mx-auto inline-flex rounded-full bg-white px-5 py-2 text-sm font-bold text-slate-950">
              Ottawa Multiservices Group
            </div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.28em] text-amber-400">
              Secure administration
            </p>
            <h1 className="mt-2 text-3xl font-bold">Reset password</h1>
            <p className="mt-2 text-sm text-slate-400">
              Choose a new password for your administrator account.
            </p>
          </div>

          {success ? (
            <div className="mt-7 space-y-4">
              <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/40 p-4 text-sm text-emerald-200">
                Your password has been changed successfully.
              </div>
              <Link
                to="/admin/login"
                className="block w-full rounded-xl bg-amber-400 px-4 py-3 text-center font-bold text-slate-950 hover:bg-amber-300"
              >
                Go to Admin Login
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-7 space-y-4">
              {!ready && (
                <div className="rounded-xl border border-amber-700/40 bg-amber-950/40 p-4 text-sm text-amber-200">
                  Open this page from the password recovery link sent by email.
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-700/40 bg-red-950/40 p-4 text-sm text-red-200">
                  {error}
                </div>
              )}

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">
                  New password
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!ready || saving}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 outline-none focus:border-amber-400 disabled:opacity-50"
                  placeholder="At least 8 characters"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">
                  Confirm password
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={!ready || saving}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 outline-none focus:border-amber-400 disabled:opacity-50"
                  placeholder="Repeat your new password"
                />
              </label>

              <button
                disabled={!ready || saving}
                className="w-full rounded-xl bg-amber-400 px-4 py-3 font-bold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Updating..." : "Change password"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}
