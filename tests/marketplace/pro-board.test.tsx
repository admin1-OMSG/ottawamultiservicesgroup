import React from "react";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {cleanup,render,screen,within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {ProfessionalDashboard} from "@/features/marketplace/pro/ProfessionalDashboard";
import {defaultFilters,visibleLeads,type MarketLead} from "@/features/marketplace/pro/model";

const rpc=vi.hoisted(()=>vi.fn());
vi.mock("@/features/marketplace/market-read",()=>({readMarketRows:async(name:string)=>(await rpc(name)).data}));
vi.mock("@/lib/supabase",()=>({supabase:{rpc,functions:{invoke:vi.fn()}}}));
vi.mock("@/features/marketplace/MarketConversation",()=>({MarketConversation:({contactId}:{contactId:string})=><p>Conversation {contactId}</p>}));
const day=86400000;
const now=Date.now();
const lead:MarketLead={id:"request-a",title:"Kitchen cleaning",description:"Clean the kitchen",service:"cleaning",city:"Ottawa",urgency:"week",status:"open",credit_cost:6,created_at:new Date(now-day*5).toISOString(),client_active_at:new Date(now-1000).toISOString(),is_owner:false,matched:true,invited:false,email_verified:true,phone_verified:false};
const t=(en:string,_fr:string)=>en;
const deals=[52,104,208].map(n=>({code:"p"+n,kind:"pack",enabled:true,price_cents:n*100,credits:n}));
let balance=8;
let unlocked=false;
function show(){
  const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
  return render(<QueryClientProvider client={client}><ProfessionalDashboard userId="u" profileId="p" name="Cleaning Pro" t={t} language="en"/></QueryClientProvider>);
}
beforeEach(()=>{
  balance=8;unlocked=false;
  rpc.mockImplementation(async(name:string)=>{
    switch(name){
      case "market_requests":return {data:[lead]};
      case "market_my_contacts":return {data:unlocked?[{id:"c",request_id:lead.id,provider_id:"p",request_title:lead.title,credit_cost:6,created_at:lead.created_at}]:[]};
      case "market_wallet":return {data:{balance,packs:deals,discount_percent:0,subscription:null,refunds:[],preview_checkout_enabled:true}};
      case "market_notifications":return {data:[]};
      case "market_unlock":unlocked=true;balance-=6;return {data:"c"};
      default:return {data:null};
    }
  });
});
afterEach(()=>{cleanup();window.history.replaceState(null,"","/");});
describe("professional contact workflow",()=>{
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
    for(const n of [52,104,208])expect(within(dialog).getByRole("button",{name:new RegExp("CAD\\s*"+n)})).toBeTruthy();
    expect(rpc.mock.calls.filter(([name])=>name==="market_unlock")).toHaveLength(0);
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
