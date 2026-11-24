import React from "react";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {act,cleanup,render,screen,within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {ProfessionalDashboard} from "@/features/marketplace/pro/ProfessionalDashboard";
import {WalletPanel} from "@/features/marketplace/pro/WalletPanel";
import {defaultFilters,visibleLeads,type MarketLead,type Wallet} from "@/features/marketplace/pro/model";

const {rpc,invoke}=vi.hoisted(()=>({rpc:vi.fn(),invoke:vi.fn()}));
vi.mock("@/features/marketplace/market-read",()=>({readMarketRows:async(name:string)=>(await rpc(name)).data}));
vi.mock("@/lib/supabase",()=>({supabase:{rpc,functions:{invoke}}}));
vi.mock("@/features/marketplace/MarketConversation",()=>({MarketConversation:({contactId}:{contactId:string})=><p>Conversation {contactId}</p>}));
const day=86400000;
const now=Date.now();
const lead:MarketLead={id:"request-a",title:"Kitchen cleaning",description:"Clean the kitchen",service:"cleaning",city:"Ottawa",urgency:"week",status:"open",credit_cost:6,created_at:new Date(now-day*5).toISOString(),client_active_at:new Date(now-1000).toISOString(),is_owner:false,matched:true,invited:false,email_verified:true,phone_verified:false};
const t=(en:string,_fr:string)=>en;
const deals=[52,104,208].map(n=>({code:"p"+n,kind:"pack",enabled:true,price_cents:n*100,credits:n}));
let balance=8;
let unlocked=false;
function show(client=new QueryClient({defaultOptions:{queries:{retry:false}}})){
  return render(<QueryClientProvider client={client}><ProfessionalDashboard userId="u" profileId="p" name="Cleaning Pro" t={t} language="en"/></QueryClientProvider>);
}
beforeEach(()=>{
  balance=8;unlocked=false;
  rpc.mockImplementation(async(name:string)=>{
    switch(name){
      case "market_requests":return {data:[lead]};
      case "market_my_contacts":return {data:unlocked?[{id:"c",request_id:lead.id,provider_id:"p",request_title:lead.title,credit_cost:6,created_at:lead.created_at}]:[]};
      case "market_wallet":return {data:{balance,packs:deals,discount_percent:0,subscription:null,refunds:[],preview_checkout_enabled:true}};
      case "market_inbox":return {data:{unread:0,items:[],has_older:false}};
      case "market_unlock":unlocked=true;balance-=6;return {data:"c"};
      default:return {data:null};
    }
  });
});
afterEach(()=>{cleanup();window.history.replaceState(null,"","/");});
describe("professional contact workflow",()=>{
  it("shows earned badges on the lead and professional and carries the new details into the response", async () => {
    const fallback = rpc.getMockImplementation()!;
    const updated = {
      ...lead, urgency: "asap", repeat_client: true, phone_verified: true,
      details_updated_at: new Date().toISOString(), description: "Clean the kitchen\nAlso clean the stove.",
    };
    rpc.mockImplementation(async (name, args) => {
      if (name === "market_requests") return {data: [updated]};
      const result = await fallback(name, args);
      return name === "market_wallet"
        ? {data: {...result.data, paid_subscriber: true, phone_verified: false}}
        : result;
    });
    const user = userEvent.setup();
    unlocked = true;
    show();
    const card = (await screen.findByRole("heading", {name: lead.title})).closest("article")!;
    for (const label of ["Urgent", "Frequent client", "Phone verified", "Details added"]) {
      expect(within(card).getByText(label)).toBeTruthy();
    }
    expect(screen.getByText("Pro subscriber")).toBeTruthy();
    await user.click(within(card).getByRole("button", {name: "Open conversation"}));
    const thread = (await screen.findByText("Conversation c")).closest("article")!;
    expect(within(thread).getByText("Details added")).toBeTruthy();
    expect(within(thread).getByText(/Also clean the stove/)).toBeTruthy();
  });
  it("does not award badges to an ordinary request or a professional without a paid subscription", async () => {
    show();
    const card = (await screen.findByRole("heading", {name: lead.title})).closest("article")!;
    for (const label of ["Urgent", "Frequent client", "Phone verified", "Details added", "Pro subscriber"]) {
      expect(screen.queryByText(label)).toBeNull();
    }
    expect(within(card).getByText("Email verified")).toBeTruthy();
  });
  it("refreshes a newly notified conversation before navigating without a second debit",async()=>{
    const fallback=rpc.getMockImplementation()!;
    let read=false;
    rpc.mockImplementation(async(name,args)=>{
      if(name==="market_read_notification"){read=true;return {error:null};}
      if(name==="market_inbox")return {data:{unread:read?0:1,has_older:false,items:args.p_include_items?[{
        id:"alert",kind:"message",request_id:lead.id,request_title:lead.title,contact_id:"c",created_at:lead.created_at,read_at:null,
      }]:[]}};
      return fallback(name,args);
    });
    const user=userEvent.setup();show();
    await screen.findByRole("heading",{name:lead.title});
    expect(rpc).toHaveBeenCalledWith("market_inbox",{p_as_provider:true,p_include_items:false,p_before_at:null,p_before_id:null});
    // The notification arrived after the last full dashboard refresh.
    unlocked=true;
    await user.click(await screen.findByRole("button",{name:/Notifications.*1/}));
    await user.click(await screen.findByRole("button",{name:/New message.*Kitchen cleaning/}));
    expect(await screen.findByText("Conversation c")).toBeTruthy();
    expect(rpc).toHaveBeenCalledWith("market_read_notification",{p_id:"alert"});
    expect(rpc.mock.calls.some(([name])=>name==="market_unlock")).toBe(false);
  });
  it("keeps a notification unread if the conversation has become unavailable",async()=>{
    const fallback=rpc.getMockImplementation()!;
    rpc.mockImplementation(async(name,args)=>name==="market_inbox"?{data:{unread:1,has_older:false,items:args.p_include_items?[{
      id:"old",kind:"message",request_id:lead.id,request_title:lead.title,contact_id:"gone",created_at:lead.created_at,read_at:null,
    }]:[]}}:fallback(name,args));
    const user=userEvent.setup();show();
    await user.click(await screen.findByRole("button",{name:/Notifications.*1/}));
    await user.click(await screen.findByRole("button",{name:/New message.*Kitchen cleaning/}));
    expect(await screen.findByText("This request or conversation is no longer available.")).toBeTruthy();
    expect(screen.getByRole("heading",{name:"Notifications"})).toBeTruthy();
    expect(rpc.mock.calls.some(([name])=>name==="market_read_notification")).toBe(false);
  });
  it("shows the cost before contact and charges only after confirmation",async()=>{
    const user=userEvent.setup();show();
    const card=(await screen.findByRole("heading",{name:lead.title})).closest("article")!;
    expect(within(card).getByText("6 credits")).toBeTruthy();
    await user.click(within(card).getByRole("button",{name:"Contact client"}));
    const dialog=await screen.findByRole("dialog");
    expect(within(dialog).getByText("8 credits")).toBeTruthy();
    expect(rpc.mock.calls.filter(([name])=>name==="market_unlock")).toHaveLength(0);
    await user.click(within(dialog).getByRole("button",{name:"Confirm contact"}));
    expect(await screen.findByText("Conversation c")).toBeTruthy();
    expect(rpc.mock.calls.filter(([name])=>name==="market_unlock")).toEqual([["market_unlock",{p_request_id:"request-a",p_expected_cost:6}]]);
  });
  it("returns to the lead and presents all three CAD packs without unlocking",async()=>{
    balance=1;window.history.replaceState(null,"","/pro-market?lead=request-a&checkout=simulated");show();
    const dialog=await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Credits needed.*5 credits/)).toBeTruthy();
    expect(within(dialog).queryByRole("button",{name:"Confirm contact"})).toBeNull();
    for(const n of [52,104,208])expect(within(dialog).getByRole("button",{name:new RegExp("\\$\\s*"+n)})).toBeTruthy();
    expect(rpc.mock.calls.filter(([name])=>name==="market_unlock")).toHaveLength(0);
  });
  it("shows separate pack and subscription rewards and opens the selected 208 CAD checkout", async () => {
    const offer = {price_cents:20800,credits:240,enabled:true,name:"208 CAD",loyalty_bonus_credits:20};
    const wallet: Wallet = {balance:0,discount_percent:0,subscription:null,refunds:[],preview_checkout_enabled:false,packs:[
      {...offer,code:"pack208",kind:"pack"},
      {...offer,code:"monthly208",kind:"subscription"},
      {...offer,code:"pack104",kind:"pack",price_cents:10400,credits:110,loyalty_bonus_credits:0},
    ]};
    const fr = (_en:string, french:string) => french;
    const user = userEvent.setup();
    invoke.mockResolvedValue({data:null,error:new Error("Test checkout")});
    const panel = render(<WalletPanel wallet={wallet} language="fr" t={fr}/>);
    const pack = screen.getByRole("button",{name:/Pack de crédits.*208/});
    const subscription = screen.getByRole("button",{name:/Abonnement mensuel.*208/});
    expect(pack.textContent).toMatch(/260 crédits.*20 en prime.*3e achat/);
    expect(subscription.textContent).toMatch(/260 crédits.*20 en prime.*3e mois payé consécutif/);
    expect(screen.getByRole("button",{name:/Pack de crédits.*104/}).textContent).not.toContain("prime");
    await user.click(subscription);
    expect(invoke).toHaveBeenCalledWith("market-checkout",{body:expect.objectContaining({offer_code:"monthly208"})});
    panel.rerender(<WalletPanel wallet={wallet} language="fr" t={fr} packsOnly/>);
    expect(screen.queryByRole("button",{name:/Abonnement mensuel/})).toBeNull();
    await user.click(screen.getByRole("button",{name:/Pack de crédits.*208/}));
    expect(invoke).toHaveBeenCalledWith("market-checkout",{body:expect.objectContaining({offer_code:"pack208"})});
  });
  it("opens the chosen offer in the wallet and starts checkout only on a payment click", async () => {
    window.history.replaceState(null, "", "/pro-market?offer=p208");
    invoke.mockResolvedValue({data:null,error:new Error("Test checkout")});
    const user = userEvent.setup();
    show();
    const payment = await screen.findByRole("button", {name:/Your selection.*\$\s*208.*Continue to payment/});
    expect(rpc.mock.calls.some(([name])=>name==="market_requests")).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
    await user.click(payment);
    expect(invoke).toHaveBeenCalledWith("market-checkout",{body:expect.objectContaining({offer_code:"p208"})});
  });

  it("opens the linked conversation when it becomes available to the signed-in professional", async () => {
    const conversationId = "8e41c86a-1c97-45e8-b69d-4b88e66ee1a7";
    const row = { id: conversationId, request_id: lead.id, request_title: lead.title, credit_cost: 6, created_at: lead.created_at };
    let currentProvider = "another-professional";
    const read = rpc.getMockImplementation()!;
    rpc.mockImplementation((name: string) => name === "market_my_contacts"
      ? Promise.resolve({ data: [{ ...row, provider_id: currentProvider }] })
      : read(name));
    window.history.replaceState(null, "", "/pro-market?contact=" + conversationId);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    show(client);
    await screen.findByText("This conversation isn’t available in your account.");
    expect(screen.queryByText("Conversation " + conversationId)).toBeNull();
    currentProvider = "p";
    await act(() => client.invalidateQueries({ queryKey: ["professional-market-desk"] }));
    expect(await screen.findByText("Conversation " + conversationId)).toBeTruthy();
    expect(rpc.mock.calls.some(([name]) => name === "market_unlock")).toBe(false);
  });

  it("reopens an existing response and sends a refund reason for administrator review",async()=>{
    unlocked=true;const user=userEvent.setup();show();
    await user.click(await screen.findByRole("button",{name:"Open conversation"}));
    expect(await screen.findByText("Conversation c")).toBeTruthy();
    expect(rpc.mock.calls.some(([name])=>name==="market_unlock")).toBe(false);
    await user.click(screen.getByRole("button",{name:"Request a credit refund"}));
    await user.selectOptions(screen.getByLabelText("Reason"),"request_in_error");
    await user.click(screen.getByRole("button",{name:"Send for review"}));
    expect(await screen.findByText("Refund under review")).toBeTruthy();
    expect(rpc.mock.calls.filter(([name])=>name==="market_request_refund")).toEqual([["market_request_refund",{p_contact_id:"c",p_reason:"request_in_error",p_note:""}]]);
  });
  it("filters verified phones, client activity and posting date separately",()=>{
    const fresh:MarketLead={...lead,id:"b",phone_verified:true,created_at:new Date(now).toISOString(),client_active_at:new Date(now-day*10).toISOString()};
    const rows=[lead,fresh,{...lead,id:"own",is_owner:true}];
    expect(visibleLeads(rows,{...defaultFilters,verified:"phone"},"en",now).map(r=>r.id)).toEqual(["b"]);
    expect(visibleLeads(rows,{...defaultFilters,active:"1"},"en",now).map(r=>r.id)).toEqual(["request-a"]);
    expect(visibleLeads(rows,{...defaultFilters,age:"1"},"en",now).map(r=>r.id)).toEqual(["b"]);
  });
});
