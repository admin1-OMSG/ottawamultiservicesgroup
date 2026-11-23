import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";

const mocks = vi.hoisted(() => ({
  admin: vi.fn(), navigate: vi.fn(), auth: vi.fn(), rpc: vi.fn(), language: "en",
}));
vi.mock("@/features/admin/requireAdmin", () => ({ requireActiveAdmin: mocks.admin }));
vi.mock("@/lib/supabase", () => ({ supabase: { rpc:mocks.rpc, auth: {onAuthStateChange:mocks.auth} } }));
vi.mock("@/lib/language", () => ({ useLanguage: () => ({language:mocks.language}) }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: { component: ComponentType }) => ({options}),
  useNavigate: () => mocks.navigate,
}));
import { Route } from "@/routes/admin/marketplace";
const Page = (Route as unknown as {options:{component:ComponentType}}).options.component;
const data = {
  refunds:[{
    contact_id:"contact-11", request_id:"request-22", title:"Office cleaning", provider_name:"Ciel",
    provider_email:"ciel@example.test", client_phone:"6135550100", client_email:null, credits:8,
    reason:"invalid_phone", status:"pending", created_at:"2026-11-02T12:00:00Z", request_note:"Number disconnected."
  }],
  offers:[{code:"pack52",kind:"pack",price_cents:5200,credits:null,enabled:false,name:"Pack"}],
  tariffs:[{service:"cleaning",credits:8}],
  partners:[{account_id:"pro-1",business_name:"Ciel",email:"ciel@example.test",discount_percent:0}],
};
beforeEach(()=>{
  vi.resetAllMocks();
  mocks.language = "en";
  mocks.admin.mockResolvedValue({id:"admin-1"});
  mocks.auth.mockImplementation(callback=>{
    queueMicrotask(()=>callback("INITIAL_SESSION", {user:{id:"admin-1"}}));
    return {data:{subscription:{unsubscribe:vi.fn()}}};
  });
  mocks.rpc.mockImplementation(async(name)=>({error:null,data:name==="market_billing_admin" ? data : null}));
});
afterEach(cleanup);

describe("marketplace administration",()=>{
  it("requires the same active administrator before showing sensitive data",async()=>{
    mocks.admin.mockResolvedValue({id:"someone-else"});
    render(<Page/>);
    await waitFor(()=>expect(mocks.navigate).toHaveBeenCalledWith({to:"/admin/login"}));
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("requires a checked reason and decision note to restore the exact purchase",async()=>{
    mocks.language = "fr";
    const user = userEvent.setup();
    render(<Page/>);
    const approve = await screen.findByRole("button",{name:"Approuver et recréditer"}) as HTMLButtonElement;
    expect(screen.getByText("Numéro de téléphone inexistant")).toBeTruthy();
    expect(screen.getByText("Number disconnected.")).toBeTruthy();
    expect(approve.disabled).toBe(true);
    await user.type(screen.getByLabelText("Motif de la décision"),"Numéro vérifié");
    expect(approve.disabled).toBe(true);
    await user.click(screen.getByRole("checkbox",{name:/J’ai vérifié le motif/}));
    await user.click(approve);
    await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith("market_review_refund",{p_contact_id:"contact-11",p_approve:true,p_note:"Numéro vérifié"}));
  });
  it("keeps the fixed pack price when its credit quantity is published",async()=>{
    const user = userEvent.setup();
    render(<Page/>);
    await user.click(await screen.findByRole("button",{name:"Pricing"}));
    await user.type(screen.getByLabelText("Credits in pack"),"30");
    await user.click(screen.getByLabelText("Available to purchase"));
    await user.click(screen.getByRole("button",{name:"Save offer"}));
    await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith("market_save_offer",{
      p_code:"pack52",p_credits:30,p_enabled:true,p_price_cents:5200,
    }));
  });
  it("keeps the 208 CAD subscription terms fixed while the other subscription stays configurable", async () => {
    const monthly = {code:"monthly",kind:"subscription",name:"Monthly",price_cents:null,credits:null,enabled:false};
    const loyalty = {...monthly,code:"monthly208",price_cents:20800,credits:240,loyalty_bonus_credits:20};
    mocks.rpc.mockImplementation(async name=>({error:null,data:name==="market_billing_admin" ? {...data,offers:[monthly,loyalty]} : null}));
    const user = userEvent.setup();
    render(<Page/>);
    await user.click(await screen.findByRole("button",{name:"Pricing"}));
    const fixed = within(screen.getByRole("heading",{name:/Monthly subscription.*208/}).closest("form")!);
    expect((fixed.getByLabelText("Monthly price (CAD)") as HTMLInputElement).readOnly).toBe(true);
    expect((fixed.getByLabelText("Credits per paid month") as HTMLInputElement).readOnly).toBe(true);
    const configurable = within(screen.getByRole("heading",{name:"Monthly subscription",exact:true}).closest("form")!);
    expect((configurable.getByLabelText("Monthly price (CAD)") as HTMLInputElement).readOnly).toBe(false);
    await user.click(fixed.getByLabelText("Available to purchase"));
    await user.click(fixed.getByRole("button",{name:"Save offer"}));
    await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith("market_save_offer",{
      p_code:"monthly208",p_credits:240,p_enabled:true,p_price_cents:20800,
    }));
  });
  it("requires review before assigning a partner discount and produces a French invitation draft",async()=>{
    const user = userEvent.setup();
    render(<Page/>);
    await user.click(await screen.findByRole("button",{name:"Partners"}));
    await user.selectOptions(screen.getByLabelText("Professional"),"pro-1");
    const discount = screen.getByLabelText("Partner discount (%)");
    await user.clear(discount);
    await user.type(discount,"10");
    const save = screen.getByRole("button",{name:"Save partner rate"}) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    await user.click(screen.getByRole("checkbox",{name:/existing OMSG partner/}));
    await user.click(save);
    await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith("market_set_discount",{p_account_id:"pro-1",p_percent:10}));
    await user.type(screen.getByLabelText("Contact name (optional)"),"Salma");
    await user.selectOptions(screen.getByLabelText("Email language"),"fr");
    const draft = screen.getByLabelText("Invitation text") as HTMLTextAreaElement;
    expect(draft.value).toContain("Bonjour Salma,");
    expect(draft.value).toContain("https://www.ottawamultiservicesgroup.com/pro");
    expect(within(draft.closest("section")!).queryByRole("button",{name:/send|envoyer/i})).toBeNull();
  });
});
