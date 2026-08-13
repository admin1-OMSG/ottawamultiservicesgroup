export function formatCad(value: number | string | null | undefined) {
  const amount = typeof value === "string" ? Number(value) : value ?? 0
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(Number.isFinite(amount) ? amount : 0)
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value))
}
