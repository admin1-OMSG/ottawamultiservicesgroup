import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { CreditOffer } from "@/features/marketplace/credit-offer";
import { ProfessionalPricing } from "@/features/marketplace/pro/ProfessionalPricing";
import { LanguageProvider } from "@/lib/language";

vi.mock("@/lib/supabase", () => ({ supabase: { rpc: vi.fn() } }));

function offer(code: string, dollars: number, credits: number, bonus = 0): CreditOffer {
  return {
    code,
    kind: code.startsWith("monthly") ? "subscription" : "pack",
    price_cents: dollars * 100,
    credits,
    loyalty_bonus_credits: bonus,
    name: code,
    enabled: true,
  };
}

const catalog = [
  offer("pack52", 52, 52),
  offer("pack104", 104, 110),
  offer("pack208", 208, 240, 20),
  offer("monthly208", 208, 240, 20),
];

function showPricing(language: string, exampleCost: number | null, offers = catalog) {
  localStorage.setItem("omsg-language", language);
  const initialOffers = offers.map((item) => ({ ...item, example_contact_credits: exampleCost }));
  render(
    <LanguageProvider>
      <QueryClientProvider client={new QueryClient()}>
        <ProfessionalPricing initialOffers={initialOffers} />
      </QueryClientProvider>
    </LanguageProvider>,
  );
}

function card(code: string) {
  const link = screen
    .getAllByRole("link")
    .find((entry) => entry.getAttribute("href") === `/pro-market?offer=${code}`);
  expect(link?.closest("article")).toBeTruthy();
  return link!.closest("article")!.textContent ?? "";
}

afterEach(() => {
  cleanup();
  localStorage.removeItem("omsg-language");
});

it.each(["fr", "en"])(
  "shows base and loyalty contact examples on the right offers in %s",
  (lang) => {
    showPricing(lang, 3);
    expect(card("pack52")).toMatch(/(?<!\d)17\s+(?:clients|contacts)/i);
    expect(card("pack104")).toMatch(/(?<!\d)36\s+(?:clients|contacts)/i);
    for (const code of ["pack208", "monthly208"]) {
      expect(card(code)).toMatch(/(?<!\d)80\s+(?:clients|contacts)/i);
      expect(card(code)).toMatch(/(?<!\d)86\s+(?:clients|contacts)/i);
      expect(card(code)).toMatch(/(?:save|économisez)\s+(?:\$\s*52|52\s*\$)/i);
    }
    expect(card("pack52")).toMatch(/3\s+cr[ée]dits\s+(?:par|per)\s+contact/i);
    expect(card("pack104")).toMatch(/(?<!\d)6\s+(?:(?:more|extra|additional) )?cr[ée]dits/i);
    expect(card("pack208")).toMatch(/(?<!\d)32\s+(?:(?:more|extra|additional) )?cr[ée]dits/i);
  },
);

it("recalculates examples and extra credits when the catalog changes", () => {
  const offers = catalog.map((item) => (item.code === "pack52" ? { ...item, credits: 50 } : item));
  showPricing("fr", 5, offers);
  expect(card("pack104")).toMatch(/(?<!\d)22\s+(?:clients|contacts)/i);
  expect(card("pack104")).toMatch(/(?<!\d)10\s+crédits/i);
  expect(card("pack208")).toMatch(/(?<!\d)40\s+crédits/i);
  expect(card("monthly208")).not.toMatch(/économisez/i);
});

it("still offers the packs without numeric contact promises when no tariff is configured", () => {
  showPricing("fr", null);
  for (const { code } of catalog) {
    expect(card(code)).not.toMatch(/\d+\s+(?:clients|contacts)/i);
  }
});
