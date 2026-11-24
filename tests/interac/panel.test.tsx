import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { InteracSandboxPanel } from "@/features/interac/InteracSandboxPanel";

const json = (data: unknown, status = 200) => Response.json(data, { status });
const available = () => json({ available: true, status: "not_started" });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("shows an unavailable test in French without offering a launch", async () => {
  const fetchMock = vi.fn().mockResolvedValue(json({ available: false, status: "not_started" }));
  vi.stubGlobal("fetch", fetchMock);
  render(<InteracSandboxPanel language="fr" accessToken="first-test-session" />);
  expect(await screen.findByText(/n’est pas encore disponible/)).toBeTruthy();
  expect(screen.queryByRole("checkbox")).toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
  expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
    "/api/interac/status",
    expect.objectContaining({
      headers: { Authorization: "Bearer first-test-session" },
      cache: "no-store",
    }),
  );
});

it("sends the session, explicit consent and locale only on a user-initiated launch", async () => {
  const user = userEvent.setup();
  const fetchMock = vi.fn().mockResolvedValueOnce(available()).mockResolvedValueOnce(json({}, 429));
  vi.stubGlobal("fetch", fetchMock);
  render(<InteracSandboxPanel language="fr" accessToken="first-test-session" />);
  const start = (await screen.findByRole("button", {
    name: "Lancer l’essai Interac",
  })) as HTMLButtonElement;
  expect(start.disabled).toBe(true);
  await user.click(start);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("checkbox"));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await user.click(start);
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    expect.stringContaining("limite"),
  );
  expect(fetchMock).toHaveBeenNthCalledWith(
    2,
    "/api/interac/start",
    expect.objectContaining({
      method: "POST",
      headers: { Authorization: "Bearer first-test-session", "Content-Type": "application/json" },
      body: JSON.stringify({ consent: true, locale: "fr-CA" }),
    }),
  );
});

it("rejects a start response outside the sandbox", async () => {
  const user = userEvent.setup();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(available())
      .mockResolvedValueOnce(json({ url: "https://example.invalid/not-interac" })),
  );
  render(<InteracSandboxPanel language="en" accessToken="test-session" />);
  await user.click(await screen.findByRole("checkbox"));
  await user.click(screen.getByRole("button", { name: "Start Interac test" }));
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    expect.stringContaining("could not be opened"),
  );
});

it("discards a pending launch and old consent when the session changes", async () => {
  const user = userEvent.setup();
  let resolveLaunch!: (result: Response) => void;
  const firstLaunch = new Promise<Response>((resolve) => {
    resolveLaunch = resolve;
  });
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(available())
    .mockReturnValueOnce(firstLaunch)
    .mockResolvedValueOnce(available());
  vi.stubGlobal("fetch", fetchMock);
  const view = render(
    <InteracSandboxPanel key="account-a" language="en" accessToken="session-a" />,
  );
  await user.click(await screen.findByRole("checkbox"));
  await user.click(screen.getByRole("button", { name: "Start Interac test" }));
  const signal = fetchMock.mock.calls[1][1].signal as AbortSignal;
  view.rerender(<InteracSandboxPanel key="account-b" language="en" accessToken="session-b" />);
  expect(((await screen.findByRole("checkbox")) as HTMLInputElement).checked).toBe(false);
  expect(signal.aborted).toBe(true);
  await act(async () => resolveLaunch(json({}, 429)));
  expect(screen.queryByRole("alert")).toBeNull();
});

it("shows only a simulation result after a verified test", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(json({ available: true, status: "sandbox_verified" })),
  );
  render(<InteracSandboxPanel language="fr" accessToken="test-session" />);
  expect(await screen.findByText("Simulation réussie avec une identité fictive.")).toBeTruthy();
  expect(screen.queryByText("Identité vérifiée")).toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
});
