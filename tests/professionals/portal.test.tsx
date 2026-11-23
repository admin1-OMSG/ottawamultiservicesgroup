import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  storageFrom: vi.fn(),
  unsubscribe: vi.fn(),
  language: "en",
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      getUser: mocks.getUser,
      onAuthStateChange: mocks.onAuthStateChange,
      signInWithOtp: mocks.signInWithOtp,
      verifyOtp: mocks.verifyOtp,
      signOut: mocks.signOut,
    },
    from: mocks.from,
    rpc: mocks.rpc,
    storage: { from: mocks.storageFrom },
  },
}));

vi.mock("@/lib/language", () => ({
  useLanguage: () => ({ language: mocks.language }),
  LanguageSwitcher: () => <span>EN / FR</span>,
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: { component: ComponentType }) => ({ options }),
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

import { Route } from "@/routes/pro";

const Portal = (Route as unknown as { options: { component: ComponentType } }).options.component;
const userId = "11111111-1111-1111-1111-111111111111";
const accountId = "22222222-2222-2222-2222-222222222222";
const verifiedUser = {
  id: userId,
  email: "alex@example.ca",
  email_confirmed_at: "2026-11-01T10:00:00Z",
};
const account = {
  id: accountId,
  user_id: userId,
  email: "alex@example.ca",
  account_type: "company",
  business_name: "Alex Cleaning Inc.",
  contact_name: "Alex Exemple",
  phone: "6135550123",
  city: "Ottawa",
  province: "ON",
  postal_code: "K1A 0B1",
  website: "",
  services: ["cleaning"],
  service_areas: ["Ottawa", "Gatineau"],
  preferred_language: "en",
  review_status: "draft",
  review_message: null,
  submitted_at: null,
  reviewed_at: null,
  created_at: "2026-11-22T10:00:00Z",
  updated_at: "2026-11-22T10:00:00Z",
};

type Result = { data: unknown; error: unknown };
let accountResults: Result[];
let documentResult: Result;
let accountQueries: {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
}[];
let authCallback: ((event: string, session: unknown) => void) | undefined;

function signedIn(profile: unknown = account) {
  mocks.getSession.mockResolvedValue({ data: { session: { user: verifiedUser } }, error: null });
  mocks.getUser.mockResolvedValue({ data: { user: verifiedUser }, error: null });
  accountResults = [{ data: profile, error: null }];
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.language = "en";
  authCallback = undefined;
  accountQueries = [];
  accountResults = [{ data: null, error: null }];
  documentResult = { data: [], error: null };
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
  mocks.onAuthStateChange.mockImplementation((callback) => {
    authCallback = callback;
    return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
  });
  mocks.signInWithOtp.mockResolvedValue({ data: {}, error: null });
  mocks.verifyOtp.mockResolvedValue({ data: {}, error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.rpc.mockResolvedValue({ data: accountId, error: null });
  mocks.from.mockImplementation((table: string) => {
    if (table === "professional_accounts") {
      const resolve = () =>
        Promise.resolve(accountResults.length > 1 ? accountResults.shift()! : accountResults[0]);
      const query = {
        select: vi.fn(),
        eq: vi.fn(),
        maybeSingle: vi.fn(resolve),
        single: vi.fn(resolve),
      };
      query.select.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      accountQueries.push(query);
      return query;
    }
    if (table === "professional_documents") {
      const query = {
        select: vi.fn(),
        eq: vi.fn(),
        order: vi.fn(() => Promise.resolve(documentResult)),
      };
      query.select.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      return query;
    }
    throw new Error(`Unexpected table read: ${table}`);
  });
});

afterEach(() => {
  cleanup();
});

async function showDraft() {
  render(<Portal />);
  await screen.findByDisplayValue("Alex Cleaning Inc.");
  await waitFor(() => expect(screen.getByRole("button", { name: "Save draft" })).toBeTruthy());
}

describe("professional sign-in", () => {
  it("requires consent before requesting a sign-in link and reports a delivery failure honestly", async () => {
    const user = userEvent.setup();
    mocks.signInWithOtp.mockResolvedValue({ error: { message: "Rate limit exceeded" } });
    render(<Portal />);
    const button = await screen.findByRole("button", { name: "Email me a sign-in link" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    await user.type(screen.getByLabelText("Email address"), "Alex@Example.CA");
    await user.click(screen.getByRole("checkbox"));
    await user.click(button);
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("could not send"),
    );
    expect(screen.queryByText("alex@example.ca")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Your professional profile" })).toBeNull();
  });

  it("shows the email destination and prevents immediate resend after successful delivery", async () => {
    const user = userEvent.setup();
    render(<Portal />);
    await screen.findByRole("button", { name: "Email me a sign-in link" });
    await user.type(screen.getByLabelText("Email address"), "Alex@Example.CA");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Email me a sign-in link" }));
    expect(await screen.findByText("alex@example.ca")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("secure sign-in link");
    expect((screen.getByRole("button", { name: /Resend in/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(mocks.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: "alex@example.ca" }),
    );
    expect(screen.queryByRole("heading", { name: "Your professional profile" })).toBeNull();
  });

  it("keeps an invalid email code on the sign-in screen", async () => {
    const user = userEvent.setup();
    mocks.verifyOtp.mockResolvedValue({ error: { message: "Expired" } });
    render(<Portal />);
    await screen.findByLabelText("Email address");
    await user.type(screen.getByLabelText("Email address"), "alex@example.ca");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Email me a sign-in link" }));
    await user.click(await screen.findByText("My email includes a code"));
    await user.type(screen.getByLabelText("Email code"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify code" }));
    expect((await screen.findByRole("alert")).textContent).toContain("invalid or has expired");
    expect(screen.queryByRole("heading", { name: "Your professional profile" })).toBeNull();
  });
});

describe("professional account loading and mutations", () => {
  it("loads the confirmed user's stored account and coverage", async () => {
    signedIn();
    await showDraft();
    expect(screen.getByDisplayValue("Ottawa, Gatineau")).toBeTruthy();
    expect(screen.getByText("alex@example.ca")).toBeTruthy();
    expect(accountQueries[0].eq).toHaveBeenCalledWith("user_id", userId);
    expect((screen.getByRole("button", { name: "Save draft" }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("blocks editing after a failed account lookup and permits retry without overwriting an existing draft", async () => {
    const user = userEvent.setup();
    signedIn();
    accountResults = [
      { data: null, error: { code: "42501", message: "Permission denied" } },
      { data: account, error: null },
    ];
    render(<Portal />);
    expect(
      await screen.findByRole("heading", { name: "We could not load your application" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save draft" })).toBeNull();
    expect(screen.queryByLabelText("Contact name *")).toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByDisplayValue("Alex Cleaning Inc.")).toBeTruthy();
  });

  it("blocks editing if supporting documents cannot be loaded", async () => {
    signedIn();
    documentResult = { data: null, error: { message: "Network unavailable" } };
    render(<Portal />);
    expect(
      await screen.findByRole("heading", { name: "We could not load your application" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save draft" })).toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("does not expose an editable account for an unconfirmed email session", async () => {
    signedIn();
    mocks.getUser.mockResolvedValue({
      data: { user: { ...verifiedUser, email_confirmed_at: null } },
      error: null,
    });
    render(<Portal />);
    await screen.findByRole("heading", { name: "We could not load your application" });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Save draft" })).toBeNull();
  });

  it("reports save failure without displaying saved or submitted success", async () => {
    const user = userEvent.setup();
    signedIn();
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "Unavailable" } });
    await showDraft();
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    expect((await screen.findByRole("alert")).textContent).toContain("could not be completed");
    expect(screen.queryByText(/Your draft has been saved/)).toBeNull();
    expect(screen.queryByText(/Your application has been submitted/)).toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalledWith("submit_my_professional_account");
  });

  it("does not claim submission when the save succeeds but submission fails", async () => {
    const user = userEvent.setup();
    signedIn();
    mocks.rpc.mockImplementation((name) =>
      Promise.resolve(
        name === "submit_my_professional_account"
          ? { data: null, error: { message: "State conflict" } }
          : { data: accountId, error: null },
      ),
    );
    await showDraft();
    await user.click(screen.getByRole("checkbox", { name: /I confirm that my information/ }));
    await user.click(screen.getByRole("button", { name: "Submit my application" }));
    expect((await screen.findByRole("alert")).textContent).toContain("could not be completed");
    expect(screen.queryByText(/Your application has been submitted/)).toBeNull();
    expect(screen.queryByText("Under review")).toBeNull();
  });

  it.each(["pending_review", "approved", "suspended"])(
    "locks an account with status %s",
    async (status) => {
      const user = userEvent.setup();
      signedIn({ ...account, review_status: status });
      render(<Portal />);
      const name = await screen.findByDisplayValue("Alex Cleaning Inc.");
      expect(name.matches(":disabled")).toBe(true);
      await user.type(name, " changed");
      expect((name as HTMLInputElement).value).toBe("Alex Cleaning Inc.");
      expect(screen.queryByRole("button", { name: "Save draft" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Submit my application" })).toBeNull();
      expect(screen.queryByLabelText("Add a document")).toBeNull();
    },
  );

  it("clears the previous professional account when the session is signed out", async () => {
    signedIn();
    await showDraft();
    act(() => authCallback?.("SIGNED_OUT", null));
    await screen.findByRole("heading", { name: "Create or access your account" });
    expect(screen.queryByDisplayValue("Alex Cleaning Inc.")).toBeNull();
    expect(screen.queryByText("alex@example.ca")).toBeNull();
  });

  it("renders the full professional form in French without relying on DOM translation", async () => {
    mocks.language = "fr";
    signedIn();
    render(<Portal />);
    await screen.findByDisplayValue("Alex Cleaning Inc.");
    expect(screen.getByRole("heading", { name: "Votre profil professionnel" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Enregistrer le brouillon" })).toBeTruthy();
    expect(screen.queryByText("Your professional profile")).toBeNull();
  });
});
