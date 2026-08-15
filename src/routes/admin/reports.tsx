import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { BarChart3, Download, RefreshCw, TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { PageHeader } from "@/components/admin/PageHeader"
import { requireActiveAdmin } from "@/features/admin/requireAdmin"
import { formatCad } from "@/features/admin/formatters"
import { supabase } from "@/lib/supabase"

export const Route = createFileRoute("/admin/reports")({ component: ReportsPage })

type RangeKey = "30d" | "90d" | "year" | "all"
type Payment = { amount:number; payment_date:string; invoice_id:string|null }
type Invoice = { id:string; total:number; amount_paid:number; balance_due:number; status:string; issue_date:string; created_at:string; customer_id:string; estimate_id:string|null }
type Estimate = { id:string; status:string; total:number; created_at:string; service_request_id:string|null }
type Request = { id:string; service_name:string|null; status:string; created_at:string }
type Job = { id:string; status:string; created_at:string; completed_at?:string|null }
type Customer = { id:string; created_at:string }

function startFor(range: RangeKey) {
  const now = new Date()
  if (range === "all") return null
  if (range === "year") return new Date(now.getFullYear(), 0, 1)
  const days = range === "30d" ? 30 : 90
  return new Date(now.getTime() - days * 86400000)
}
function inRange(value:string|undefined|null, start:Date|null){ return !start || (!!value && new Date(value) >= start) }
function monthKey(value:string){ const d=new Date(value); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}` }
function monthLabel(key:string){ const [y,m]=key.split("-"); return new Intl.DateTimeFormat("en-CA",{month:"short",year:"2-digit"}).format(new Date(Number(y),Number(m)-1,1)) }
function csvCell(value:unknown){ const s=String(value ?? ""); return `"${s.replaceAll('"','""')}"` }

function ReportsPage(){
  const nav=useNavigate(); const [range,setRange]=useState<RangeKey>("90d"); const [loading,setLoading]=useState(true); const [error,setError]=useState("")
  const [payments,setPayments]=useState<Payment[]>([]); const [invoices,setInvoices]=useState<Invoice[]>([]); const [estimates,setEstimates]=useState<Estimate[]>([]); const [requests,setRequests]=useState<Request[]>([]); const [jobs,setJobs]=useState<Job[]>([]); const [customers,setCustomers]=useState<Customer[]>([])
  useEffect(()=>{void load()},[])
  async function load(){ setLoading(true); setError(""); try{ if(!(await requireActiveAdmin())){await nav({to:"/admin/login"});return} const [p,i,e,r,j,c]=await Promise.all([
    supabase.from("payments").select("amount,payment_date,invoice_id").order("payment_date"),
    supabase.from("invoices").select("id,total,amount_paid,balance_due,status,issue_date,created_at,customer_id,estimate_id").order("created_at"),
    supabase.from("estimates").select("id,status,total,created_at,service_request_id").order("created_at"),
    supabase.from("service_requests").select("id,service_name,status,created_at").order("created_at"),
    supabase.from("jobs").select("id,status,created_at,completed_at").order("created_at"),
    supabase.from("customers").select("id,created_at").order("created_at")
  ]); const failed=[p,i,e,r,j,c].find(x=>x.error); if(failed?.error) throw failed.error; setPayments((p.data??[]) as Payment[]);setInvoices((i.data??[]) as Invoice[]);setEstimates((e.data??[]) as Estimate[]);setRequests((r.data??[]) as Request[]);setJobs((j.data??[]) as Job[]);setCustomers((c.data??[]) as Customer[])
  }catch(e){setError(e instanceof Error?e.message:"Unable to load reports.")}finally{setLoading(false)} }
  const report=useMemo(()=>{ const start=startFor(range); const ps=payments.filter(x=>inRange(x.payment_date,start)); const ins=invoices.filter(x=>inRange(x.issue_date||x.created_at,start)); const es=estimates.filter(x=>inRange(x.created_at,start)); const rs=requests.filter(x=>inRange(x.created_at,start)); const js=jobs.filter(x=>inRange(x.created_at,start)); const cs=customers.filter(x=>inRange(x.created_at,start));
    const revenue=ps.reduce((s,x)=>s+Number(x.amount||0),0); const invoiced=ins.reduce((s,x)=>s+Number(x.total||0),0); const outstanding=ins.reduce((s,x)=>s+Number(x.balance_due||0),0); const accepted=es.filter(x=>["accepted","signed","approved"].includes(x.status)).length; const sent=es.filter(x=>x.status!=="draft").length; const conversion=sent?accepted/sent*100:0; const completed=js.filter(x=>x.status==="completed").length;
    const monthly=new Map<string,number>(); ps.forEach(x=>monthly.set(monthKey(x.payment_date),(monthly.get(monthKey(x.payment_date))??0)+Number(x.amount||0))); const monthlyRevenue=[...monthly.entries()].sort().map(([month,value])=>({month:monthLabel(month),value}));
    const serviceCounts=new Map<string,number>(); rs.forEach(x=>{const k=x.service_name||"Unspecified";serviceCounts.set(k,(serviceCounts.get(k)??0)+1)}); const services=[...serviceCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([service,count])=>({service,count}));
    const statusCounts=new Map<string,number>(); rs.forEach(x=>statusCounts.set(x.status,(statusCounts.get(x.status)??0)+1));
    return {revenue,invoiced,outstanding,requests:rs.length,customers:cs.length,invoices:ins.length,payments:ps.length,jobs:js.length,completed,conversion,monthlyRevenue,services,statuses:[...statusCounts.entries()].sort((a,b)=>b[1]-a[1])}
  },[range,payments,invoices,estimates,requests,jobs,customers])
  function exportCsv(){ const rows=[["Metric","Value"],["Revenue received",report.revenue],["Invoiced",report.invoiced],["Outstanding",report.outstanding],["Quote requests",report.requests],["New customers",report.customers],["Invoices",report.invoices],["Payments",report.payments],["Jobs",report.jobs],["Completed jobs",report.completed],["Quote conversion %",report.conversion.toFixed(1)],[],["Month","Revenue"],...report.monthlyRevenue.map(x=>[x.month,x.value]),[],["Service","Quote requests"],...report.services.map(x=>[x.service,x.count])]; const csv=rows.map(r=>r.map(csvCell).join(",")).join("\r\n"); const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}); const url=URL.createObjectURL(blob); const a=document.createElement("a");a.href=url;a.download=`omsg-report-${range}-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url) }
  return <div className="space-y-6"><PageHeader title="Reports" description="Business performance, revenue, sales and operational activity." action={<div className="flex flex-wrap gap-2"><select value={range} onChange={e=>setRange(e.target.value as RangeKey)} className="rounded-lg border bg-white px-3 py-2 text-sm"><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="year">This year</option><option value="all">All time</option></select><button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold"><RefreshCw className="h-4 w-4"/>Refresh</button><button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"><Download className="h-4 w-4"/>Export CSV</button></div>}/>
    {error&&<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}{loading?<div className="rounded-xl border bg-white p-10 text-center text-slate-500">Loading reports…</div>:<>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Revenue received" value={formatCad(report.revenue)} note={`${report.payments} payment(s)`}/><Metric label="Invoiced" value={formatCad(report.invoiced)} note={`${report.invoices} invoice(s)`}/><Metric label="Outstanding" value={formatCad(report.outstanding)} note="Current balance due"/><Metric label="Quote conversion" value={`${report.conversion.toFixed(1)}%`} note="Accepted ÷ sent quotes"/></section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Quote requests" value={String(report.requests)}/><Metric label="New customers" value={String(report.customers)}/><Metric label="Jobs" value={String(report.jobs)} note={`${report.completed} completed`}/><Metric label="Average payment" value={formatCad(report.payments?report.revenue/report.payments:0)}/></section>
    <section className="grid gap-6 xl:grid-cols-2"><ChartCard title="Revenue by month" icon={<TrendingUp className="h-5 w-5 text-emerald-600"/>}>{report.monthlyRevenue.length?<ResponsiveContainer width="100%" height={280}><BarChart data={report.monthlyRevenue}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="month"/><YAxis tickFormatter={v=>`$${Math.round(Number(v))}`}/><Tooltip formatter={(v)=>formatCad(Number(v))}/><Bar dataKey="value" fill="currentColor" className="text-emerald-600" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer>:<Empty/>}</ChartCard><ChartCard title="Quote requests by service" icon={<BarChart3 className="h-5 w-5 text-emerald-600"/>}>{report.services.length?<ResponsiveContainer width="100%" height={280}><BarChart data={report.services} layout="vertical" margin={{left:20}}><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="service" width={120} tick={{fontSize:11}}/><Tooltip/><Bar dataKey="count" fill="currentColor" className="text-emerald-600" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer>:<Empty/>}</ChartCard></section>
    <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Quote request status</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{report.statuses.length?report.statuses.map(([status,count])=><div key={status} className="rounded-lg bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{status.replaceAll("_"," ")}</p><p className="mt-1 text-2xl font-bold">{count}</p></div>):<p className="text-sm text-slate-500">No data for this period.</p>}</div></section></>}</div>
}
function Metric({label,value,note}:{label:string;value:string;note?:string}){return <article className="rounded-xl border bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>{note&&<p className="mt-1 text-xs text-slate-500">{note}</p>}</article>}
function ChartCard({title,icon,children}:{title:string;icon:React.ReactNode;children:React.ReactNode}){return <section className="rounded-xl border bg-white p-5 shadow-sm"><div className="mb-5 flex items-center gap-2">{icon}<h2 className="font-bold">{title}</h2></div>{children}</section>}
function Empty(){return <div className="flex h-[280px] items-center justify-center text-sm text-slate-500">No data for this period.</div>}
