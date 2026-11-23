import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType, ReactNode } from "react";

const mocks = vi.hoisted(() => ({
  requireActiveAdmin: vi.fn(),
  navigate: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  storageFrom: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { onAuthStateChange: mocks.onAuthStateChange },
    from: mocks.from,
    rpc: mocks.rpc,
    storage: { from: mocks.storageFrom },
  },
}));
vi.mock("@/features/admin/requireAdmin", () => ({ requireActiveAdmin: mocks.requireActiveAdmin }));
vi.mock("@/lib/language", () => ({ useLanguage: () => ({ language: "en" }) }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: { component: ComponentType }) => ({ options }),
  useNavigate: () => mocks.navigate,
}));
vi.mock("@/components/admin/PageHeader", () => ({
  PageHeader: ({
    title,
    description,
    action,
  }: {
    title: string;
    description: string;
    action: ReactNode;
  }) => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
      {action}
    </header>
  ),
}));

import { Route } from "@/routes/admin/professionals";
const AdminPage = (Route as unknown as { options: { component: ComponentType } }).options.component;
const adminId = "99999999-9999-9999-9999-999999999999";
const profile = {
  id: "22222222-2222-2222-2222-222222222222",
  user_id: "11111111-1111-1111-1111-111111111111",
  email: "alex@example.ca",
  account_type: "company",
  business_name: "Alex Cleaning Inc.",
  contact_name: "Alex Exemple",
  phone: "6135550123",
  city: "Ottawa",
  province: "ON",
  postal_code: "K1A 0B1",
  website: null,
  services: ["cleaning"],
  service_areas: ["Ottawa"],
  preferred_language: "en",
  review_status: "pending_review",
  review_message: null,
  submitted_at: "2026-11-22T10:00:00Z",
  reviewed_at: null,
  created_at: "2026-11-22T10:00:00Z",
  updated_at: "2026-11-22T11:00:00Z",
};

let documentError: unknown;
beforeEach(() => {
  vi.resetAllMocks();
  documentError = null;
  mocks.requireActiveAdmin.mockResolvedValue({ id: adminId });
  mocks.navigate.mockResolvedValue(undefined);
  mocks.onAuthStateChange.mockImplementation((callback) => {
    queueMicrotask(() => callback("INITIAL_SESSION", { user: { id: adminId } }));
    return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
  });
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  mocks.from.mockImplementation((table: string) => {
    if (table === "professional_accounts") {
      const query = {
        select: vi.fn(),
        order: vi.fn(),
        limit: vi.fn(() => Promise.resolve({ data: [profile], error: null })),
      };
      query.select.mockReturnValue(query);
      query.order.mockReturnValue(query);
      return query;
    }
    if (table === "professional_documents") {
      const query = {
        select: vi.fn(),
        eq: vi.fn(),
        order: vi.fn(() => Promise.resolve({ data: [], error: documentError })),
      };
      query.select.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      return query;
    }
    throw new Error(`Unexpected table access: ${table}`);
  });
});
afterEach(() => cleanup());

async function openApplication() {
  const user = userEvent.setup();
  render(<AdminPage />);
  await user.click(await screen.findByRole("button", { name: /Alex Cleaning Inc\./ }));
  await waitFor(() => expect(screen.queryByText("Loading…")).toBeNull());
  return user;
}

describe("professional application administration", () => {
  it("redirects a denied or inactive administrator before reading professional applications", async () => {
    mocks.requireActiveAdmin.mockResolvedValue(null);
    render(<AdminPage />);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/admin/login" }));
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("does not load professional applications when the session belongs to a different user", async () => {
    mocks.requireActiveAdmin.mockResolvedValue({ id: "different-admin" });
    render(<AdminPage />);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/admin/login" }));
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("requires review confirmation and a professional-facing message before approval", async () => {
    const user = await openApplication();
    const approve = screen.getByRole("button", {
      name: "Approve application",
    }) as HTMLButtonElement;
    expect(approve.disabled).toBe(true);
    await user.type(
      screen.getByLabelText("Message visible to the professional"),
      "Your application has been reviewed.",
    );
    expect(approve.disabled).toBe(true);
    await user.click(screen.getByRole("checkbox", { name: /I have reviewed/ }));
    expect(approve.disabled).toBe(false);
  });

  it("keeps the dossier open and reports a stale review failure without displaying success", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "Application changed since it was loaded" },
    });
    const user = await openApplication();
    await user.type(
      screen.getByLabelText("Message visible to the professional"),
      "Your application has been reviewed.",
    );
    await user.click(screen.getByRole("checkbox", { name: /I have reviewed/ }));
    await user.click(screen.getByRole("button", { name: "Approve application" }));
    expect((await screen.findByRole("alert")).textContent).toContain("decision could not be saved");
    expect(screen.queryByText(/The decision has been saved/)).toBeNull();
    expect(screen.getByRole("region", { name: "Application details" })).toBeTruthy();
    expect(mocks.rpc).toHaveBeenCalledWith(
      "review_professional_account",
      expect.objectContaining({
        p_expected_updated_at: profile.updated_at,
        p_account_id: profile.id,
      }),
    );
  });

  it("blocks review decisions while supporting documents cannot be opened", async () => {
    documentError = { message: "Network unavailable" };
    const user = await openApplication();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Supporting documents could not be opened",
    );
    await user.type(
      screen.getByLabelText("Message visible to the professional"),
      "Please provide your supporting documents.",
    );
    expect(
      (screen.getByRole("checkbox", { name: /I have reviewed/ }) as HTMLInputElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Approve application" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
