import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { useSyncExternalStore, type ComponentType } from "react";

const bindings=vi.hoisted(()=>({
  rpc:vi.fn(), auth:vi.fn(), getSession:vi.fn(), profile:vi.fn(), functions:vi.fn(), admin:vi.fn(),
  navigate:vi.fn(), search:{} as Record<string,unknown>, listeners:new Set<()=>void>(),
}));
vi.mock("@/lib/supabase",()=>({supabase:{rpc:bindings.rpc,auth:{getSession:bindings.getSession,onAuthStateChange:bindings.auth},functions:{invoke:bindings.functions},from:bindings.profile}}));
vi.mock("@/features/admin/requireAdmin",()=>({requireActiveAdmin:bindings.admin}));
vi.mock("@/lib/language",()=>({useLanguage:()=>({language:"fr"}), LanguageSwitcher:()=>null}));
vi.mock("@tanstack/react-router",()=>({
  createFileRoute:()=>(options:{component:ComponentType})=>({
    options,useNavigate:()=>bindings.navigate,
    useSearch:()=>useSyncExternalStore(listener=>{bindings.listeners.add(listener);return ()=>bindings.listeners.delete(listener);},()=>bindings.search),
  }),useNavigate:()=>bindings.navigate,
}));
import { Route as Customer } from "@/routes/marketplace";
import { Route as Professional } from "@/routes/pro-market";
import { Route as Admin } from "@/routes/admin/marketplace";

type Role="client"|"pro"|"admin";
type Actor={id:string;email:string;email_confirmed_at:string};
type Payload={op:string;role?:Role;method?:string;args?:Record<string,unknown>};
type State={contacts:number;balance:number;notifications:number;refunds:number;reviews:number};
let actors:Record<Role,Actor>, role:Role;
let checkoutLead="";
const worker=spawn(process.execPath,[resolve("tests/marketplace/fixtures/workflow-db.mjs")],{stdio:["pipe","pipe","inherit"]});
const pending=new Map<number,{resolve:(value:unknown)=>void;reject:(error:Error)=>void}>();
let sequence=0;
createInterface({input:worker.stdout}).on("line",line=>{
 const {id,data,error}=JSON.parse(line);const job=pending.get(id);pending.delete(id);
 if(error)job?.reject(new Error(error));else job?.resolve(data);
});
worker.on("exit",code=>{for(const {reject} of pending.values())reject(new Error("Fixture terminated "+code));pending.clear();});
function perform<T>(payload:Payload):Promise<T>{
 return new Promise((done,reject)=>{const id=++sequence;pending.set(id,{resolve:value=>done(value as T),reject});worker.stdin.write(JSON.stringify({id,...payload})+"\n");});
}
const state=()=>perform<State>({op:"state"});
async function show(who:Role,uri="",search:Record<string,unknown>={}){
 cleanup();role=who;bindings.search=search;window.history.replaceState({},"",uri||"/");
 const route={client:Customer,pro:Professional,admin:Admin}[who] as unknown as {options:{component:ComponentType}};
 const Page=route.options.component;
 const cache=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
 render(<QueryClientProvider client={cache}><Page/></QueryClientProvider>);
}
beforeAll(async()=>{
 actors=await perform({op:"init"});
 bindings.navigate.mockImplementation(async({search})=>{bindings.search=search;bindings.listeners.forEach(cb=>cb());});
 bindings.auth.mockImplementation(cb=>{const actor=actors[role];queueMicrotask(()=>cb("INITIAL_SESSION",{user:actor}));return {data:{subscription:{unsubscribe:()=>{}}}};});
 bindings.getSession.mockImplementation(async()=>({data:{session:{user:actors[role]}},error:null}));
 bindings.admin.mockImplementation(async()=>role==="admin" ? actors.admin:null);
 bindings.profile.mockImplementation(()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:await perform({op:"profile",role}),error:null})})})}));
 bindings.rpc.mockImplementation((method,args)=>{
  const result=perform({op:"rpc",role,method,args}).then(data=>({data,error:null})).catch(error=>({data:null,error}));
  const paged=(key?:string,value?:boolean)=>({range:async(start:number,end:number)=>{
   const {data,error}=await result;
   if(error)return {data:null,error};
   const rows=data as Record<string,unknown>[];
   return {data:(key?rows.filter(r=>r[key]===value):rows).slice(start,end+1),error:null};
  }});
  return Object.assign(result,paged(),{eq:paged});
 });
 bindings.functions.mockImplementation(async(method,{body})=>{expect(method).toBe("market-checkout");const {lead}=await perform<{lead:string}>({op:"checkout",role,args:body});checkoutLead=lead;return {data:{url:window.location.origin+"/pro-market?checkout=simulated&lead="+lead},error:null};});
},30000);
afterAll(()=>{cleanup();worker.stdin.end();});
const button=(name:string|RegExp)=>screen.findByRole("button",{name,exact:typeof name==="string"});
const title="Nettoyage de mon appartement", incorrect="Demande créée par erreur";

it("publishes, matches, buys a test pack, unlocks, exchanges messages, reviews work and refunds an erroneous lead through three authenticated dashboards",async()=>{
 const user=userEvent.setup();
 async function publish(label:string,invite:boolean){
  await user.click(await button("Créer une demande"));
  await user.selectOptions(await screen.findByLabelText("Catégorie de service"),"cleaning");
  await user.type(screen.getByLabelText("Ville ou quartier"),"Orléans");
  await user.type(screen.getByLabelText("Titre de la demande"),label);
  await user.type(screen.getByLabelText("Décrivez le travail"),"Nettoyer deux chambres et les fenêtres.");
  if(invite){await user.click(await button(/Inviter des professionnels de votre choix/));await user.click(await screen.findByLabelText("Inviter pour ma demande"));}
  await user.click(await button("Publier ma demande gratuite"));
  await screen.findByRole("heading",{name:label,exact:true});
 }
 await show("client");await publish(title,true);
 expect((await state()).notifications).toBe(1);
 await show("pro");await user.click(await button("Contacter le client"));
 const dialog=await screen.findByRole("dialog");
 expect(within(dialog).getByText("Solde disponible")).toBeTruthy();
 expect(within(dialog).getByText(/Crédits manquants/)).toBeTruthy();
 await user.click(within(dialog).getByRole("button",{name:/Pack de crédits.*52/}));
 await waitFor(()=>expect(checkoutLead).toBeTruthy());
 expect(await state()).toMatchObject({balance:12,contacts:0});
 await show("pro","/pro-market?checkout=simulated&lead="+checkoutLead);
 await user.click(await button("Confirmer le contact"));
 await user.type(await screen.findByLabelText("Votre message"),"Nous sommes libres jeudi.");
 await user.click(await button("Envoyer"));await screen.findByText("Nous sommes libres jeudi.");
 expect(await state()).toMatchObject({contacts:1,balance:9});
 await show("client");await user.click(await button(/Notifications/));await user.click(await button(/Éclat Ottawa souhaite vous contacter/));
 await screen.findByText("Nous sommes libres jeudi.");
 await user.type(await screen.findByLabelText("Votre message"),"Jeudi me convient.");
 await user.click(await button("Envoyer"));await screen.findByText("Jeudi me convient.");
 await user.click(await button("Indiquer que le travail est terminé"));await user.click(await button("Confirmer la réalisation"));
 await user.selectOptions(await screen.findByLabelText("Note",{exact:true}),"5");await user.type(await screen.findByLabelText("Votre avis",{exact:true}),"Travail soigné.");await user.click(await button("Publier l’avis"));
 await screen.findByText("Travail soigné.");expect((await state()).reviews).toBe(1);
 await publish(incorrect,false);await show("pro");await user.click(await button("Contacter le client"));await user.click(await button("Confirmer le contact"));
 await user.click(await button("Demander un remboursement de crédits"));await user.selectOptions(await screen.findByLabelText("Motif",{exact:true}),"request_in_error");
 await user.type(await screen.findByLabelText(/Précisions pour OMSG/),"Erreur confirmée.");await user.click(await button("Soumettre à l’administrateur"));await screen.findByText("Remboursement en cours d’examen");
 await show("admin");await user.type(await screen.findByLabelText("Motif de la décision"),"Le client confirme son erreur.");
 await user.click(await screen.findByRole("checkbox",{name:/J’ai vérifié le motif/}));await user.click(await button("Approuver et recréditer"));
 await screen.findByText("Modifications enregistrées.");expect(await state()).toMatchObject({balance:9,refunds:1,contacts:2});
 await show("pro");await user.click(await button(/Mes réponses/));const row=(await screen.findByRole("heading",{name:incorrect})).closest("article")!;
 await user.click(within(row).getByRole("button",{name:"Ouvrir la conversation"}));await screen.findByText("Crédits remboursés");
},45000);
