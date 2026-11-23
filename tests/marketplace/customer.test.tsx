import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { MarketConversation } from "@/features/marketplace/MarketConversation";
import { CustomerSignIn } from "@/features/marketplace/CustomerSignIn";
import { CustomerRequestForm } from "@/features/marketplace/CustomerRequestForm";
import { CustomerRequestDetail } from "@/features/marketplace/CustomerRequestDetail";
import { readMarketRows } from "@/features/marketplace/market-read";
import type { DirectoryProvider,MarketContact, MarketRequest } from "@/features/marketplace/customer-model";

const mocks=vi.hoisted(()=>({rpc:vi.fn(),signIn:vi.fn(),verify:vi.fn()}));
vi.mock("@/lib/supabase",()=>({supabase:{rpc:mocks.rpc,auth:{signInWithOtp:mocks.signIn,verifyOtp:mocks.verify}}}));
const provider:DirectoryProvider={id:"pro",name:"Local team",services:["cleaning"],service_areas:["Ottawa"],city:"Ottawa",review_status:"approved",active_at:null,completed_count:3,review_count:1,average_rating:5,google_maps_url:null};
const request:MarketRequest={id:"req",service:"cleaning",city:"Ottawa",title:"Move out clean",description:"Clean the apartment",urgency:"week",status:"open",created_at:"2026-11-23T10:00:00Z",is_owner:true,preferred_ids:[],preferred_names:[]};
const contact:MarketContact={id:"contact",request_id:request.id,provider_id:"pro",provider_name:"Local team",completed_at:null,review_rating:null,review_body:null,my_provider:false};
afterEach(()=>{cleanup();vi.unstubAllEnvs();vi.unstubAllGlobals();});
beforeEach(()=>{mocks.rpc.mockReset();mocks.signIn.mockReset();mocks.verify.mockReset();});
function authSettings(phone:boolean) {
  vi.stubEnv("VITE_SUPABASE_URL","https://example.supabase.co");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY","public-test");
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>({external:{phone}})}));
}
function form(onCreated:(id:string)=>void) {
  function App(){
    const [preferred,select]=useState<string[]>([]);
    return <CustomerRequestForm providers={[provider]} preferred={preferred} select={select} onCreated={onCreated} category="cleaning"/>;
  }
  return render(<QueryClientProvider client={new QueryClient()}><App/></QueryClientProvider>);
}
describe("customer marketplace",()=>{
  it("verifies mobile sign-in using the number that received the code",async()=>{
    authSettings(true);
    mocks.signIn.mockResolvedValue({error:null});mocks.verify.mockResolvedValue({error:null});
    const user=userEvent.setup();render(<CustomerSignIn/>);
    await waitFor(()=>expect((screen.getByRole("button",{name:"SMS"}) as HTMLButtonElement).disabled).toBe(false));
    await user.click(screen.getByRole("button",{name:"SMS"}));
    await user.type(screen.getByLabelText("Mobile phone"),"(613) 555-0100");
    await user.click(screen.getByRole("button",{name:"Send my code"}));
    expect(mocks.signIn).toHaveBeenCalledWith({phone:"+16135550100",options:{shouldCreateUser:true,data:{language:"en"}}});
    await user.type(screen.getByLabelText("Verification code"),"123456");
    await user.click(screen.getByRole("button",{name:"Verify and continue"}));
    expect(mocks.verify).toHaveBeenCalledWith({type:"sms",phone:"+16135550100",token:"123456"});
  });
  it("verifies a pasted email link in the current tab and rejects other origins", async () => {
    authSettings(false);
    mocks.signIn.mockResolvedValue({error:null});
    mocks.verify.mockResolvedValue({error:null});
    const user = userEvent.setup();
    render(<CustomerSignIn/>);
    await user.type(screen.getByLabelText("Email address"), "client@example.test");
    await user.click(screen.getByRole("button", {name:"Send my sign-in link"}));
    const field = screen.getByLabelText("Email link or code");
    const submit = screen.getByRole("button", {name:"Verify and continue"});
    await user.click(field);
    await user.paste("https://other.example/auth/v1/verify?token=test&type=magiclink");
    await user.click(submit);
    expect(mocks.verify).not.toHaveBeenCalled();
    await user.clear(field);
    await user.paste("https://example.supabase.co/auth/v1/verify?token=test&type=magiclink");
    await user.click(submit);
    expect(mocks.verify).toHaveBeenCalledWith({type:"magiclink",token_hash:"test"});
  });
  it("keeps email sign-in available when SMS is disabled",async()=>{
    authSettings(false);render(<CustomerSignIn/>);
    expect(await screen.findByText(/SMS verification is currently unavailable/)).toBeTruthy();
    expect((screen.getByRole("button",{name:"SMS"}) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button",{name:"Send my sign-in link"}) as HTMLButtonElement).disabled).toBe(false);
  });
  it("retries creation using the same id and includes selected professionals",async()=>{
    mocks.rpc.mockResolvedValueOnce({error:Error("network")}).mockResolvedValue({data:"req",error:null});
    const done=vi.fn();const user=userEvent.setup();form(done);
    await user.type(screen.getByLabelText("City or neighbourhood"),"Orléans");
    await user.type(screen.getByLabelText("Request title"),"Kitchen clean");
    await user.type(screen.getByLabelText("Describe the work"),"Clean the kitchen after a move.");
    await user.click(screen.getByRole("button",{name:/Invite preferred/}));
    await user.click(screen.getByLabelText("Invite to my request"));
    await user.click(screen.getByRole("button",{name:"Publish my free request"}));
    expect(await screen.findByRole("alert")).toBeTruthy();
    await user.click(screen.getByRole("button",{name:"Publish my free request"}));
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    expect(mocks.rpc.mock.calls[0]).toEqual(mocks.rpc.mock.calls[1]);
    expect(mocks.rpc.mock.calls[1][1]).toMatchObject({p_city:"Orléans",p_preferred_ids:["pro"],p_service:"cleaning"});
    expect(done).toHaveBeenCalledWith("req");
  });
  it("keeps drafts for retry and never sends into a previously viewed thread",async()=>{
    const user=userEvent.setup();
    let sendCount=0;
    mocks.rpc.mockImplementation((name:string,arg:{p_contact_id:string})=>{
      if(name==="market_messages")return {range:async()=>({data:[{id:"m",body:"Thread "+arg.p_contact_id,created_at:request.created_at,mine:false}],error:null})};
      if(name==="market_send_message")return Promise.resolve({error:++sendCount===1?Error("timeout"):null});
      throw Error("unexpected rpc");
    });
    const {rerender}=render(<MarketConversation contactId="A"/>);
    expect(await screen.findByText("Thread A")).toBeTruthy();
    await user.type(screen.getByLabelText("Your message"),"Can you come tomorrow?");
    await user.click(screen.getByRole("button",{name:"Send"}));
    expect(await screen.findByRole("alert")).toBeTruthy();
    await user.click(screen.getByRole("button",{name:"Send"}));
    const sends=mocks.rpc.mock.calls.filter(([name])=>name==="market_send_message");
    expect(sends[0]).toEqual(sends[1]);
    rerender(<MarketConversation contactId="B"/>);
    expect(await screen.findByText("Thread B")).toBeTruthy();
    expect(screen.queryByText("Thread A")).toBeNull();
    expect((screen.getByLabelText("Your message") as HTMLTextAreaElement).value).toBe("");
  });
  it("confirms withdrawal and keeps existing conversations",async()=>{
    mocks.rpc.mockImplementation((name)=>name==="market_messages"?{range:async()=>({data:[],error:null})}:Promise.resolve({error:null}));
    const user=userEvent.setup(),refresh=vi.fn().mockResolvedValue(undefined);
    const {rerender}=render(<CustomerRequestDetail request={request} contacts={[contact]} providers={[]} activeId={contact.id} select={vi.fn()} refresh={refresh}/>);
    await user.click(screen.getByRole("button",{name:"Withdraw request"}));
    expect(mocks.rpc).not.toHaveBeenCalledWith("market_withdraw",expect.anything());
    await user.click(screen.getByRole("button",{name:"Confirm withdrawal"}));
    expect(mocks.rpc).toHaveBeenCalledWith("market_withdraw",{p_request_id:"req"});
    await waitFor(()=>expect(refresh).toHaveBeenCalled());
    rerender(<CustomerRequestDetail request={{...request,status:"withdrawn"}} contacts={[contact]} providers={[]} activeId={contact.id} select={vi.fn()} refresh={refresh}/>);
    expect(screen.getByText("Withdrawn")).toBeTruthy();
    expect(screen.queryByRole("button",{name:"Mark work as completed"})).toBeNull();
    expect(screen.getByLabelText("Your message")).toBeTruthy();
  });
  it("opens reviews only for completed work and submits the client's rating",async()=>{
    mocks.rpc.mockImplementation((name)=>name==="market_messages"?{range:async()=>({data:[],error:null})}:Promise.resolve({error:null}));
    const user=userEvent.setup(),refresh=vi.fn().mockResolvedValue(undefined);
    const props={request,contacts:[contact],providers:[],activeId:contact.id,select:vi.fn(),refresh};
    const {rerender}=render(<CustomerRequestDetail {...props}/>);
    expect(screen.queryByLabelText("Rating")).toBeNull();
    await user.click(screen.getByRole("button",{name:"Mark work as completed"}));
    await user.click(screen.getByRole("button",{name:"Confirm completion"}));
    expect(mocks.rpc).toHaveBeenCalledWith("market_complete",{p_contact_id:contact.id});
    rerender(<CustomerRequestDetail {...props} request={{...request,status:"completed"}} contacts={[{...contact,completed_at:request.created_at}]}/>);
    await user.selectOptions(screen.getByLabelText("Rating"),"4");
    await user.type(screen.getByLabelText("Your review"),"Very careful work.");
    await user.click(screen.getByRole("button",{name:"Publish review"}));
    expect(mocks.rpc).toHaveBeenCalledWith("market_review",{p_contact_id:contact.id,p_rating:4,p_body:"Very careful work."});
  });
  it("paginates matching rows including the oldest results",async()=>{
    const range=vi.fn().mockResolvedValueOnce({data:Array(200).fill("recent")}).mockResolvedValueOnce({data:["old"]});
    const eq=vi.fn().mockReturnValue({range});mocks.rpc.mockReturnValue({eq});
    const rows=await readMarketRows<string>("market_requests",{},{field:"is_owner",value:true});
    expect(rows).toHaveLength(201);expect(rows.at(-1)).toBe("old");
    expect(eq).toHaveBeenCalledWith("is_owner",true);
    expect(range.mock.calls).toEqual([[0,199],[200,399]]);
  });
});
