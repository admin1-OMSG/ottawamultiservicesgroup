import { createFileRoute } from "@tanstack/react-router";
import { ServiceSeoPage } from "@/components/service-seo-page";
import { seoHead, absoluteUrl } from "@/lib/seo";

const title = 'Landscaping Ottawa | Lawn & Yard Care | OMSG';
const description = 'Lawn care and landscaping services in Ottawa including mowing, trimming, seasonal cleanups and garden maintenance.';
export const Route = createFileRoute("/landscaping-ottawa")({
  head: () => ({ ...seoHead({ title, description, path: "/landscaping-ottawa" }), scripts: [{ type: "application/ld+json", children: JSON.stringify({ "@context":"https://schema.org", "@type":"Service", name:'Lawn Care & Landscaping in Ottawa', description, areaServed:["Ottawa","Kanata","Nepean","Barrhaven","Orleans","Stittsville","Gatineau"], provider:{"@type":"LocalBusiness",name:"Ottawa Multiservices Group Inc.",url:absoluteUrl("/")} }) }] }),
  component: () => <ServiceSeoPage content={{ eyebrow:'Lawn & Landscaping', title:'Lawn Care & Landscaping in Ottawa', intro:'Practical outdoor property care for homeowners and businesses, from routine lawn maintenance to seasonal cleanups.', bullets:['Lawn mowing and trimming', 'Spring and fall cleanup', 'Garden maintenance', 'Yard cleanup', 'Commercial lawn care'], localText:'Seasonal service is available across Ottawa, Kanata, Nepean, Barrhaven, Orleans, Stittsville and surrounding areas.' }} />,
});
