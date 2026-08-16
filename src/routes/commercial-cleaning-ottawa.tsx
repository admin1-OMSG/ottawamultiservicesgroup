import { createFileRoute } from "@tanstack/react-router";
import { ServiceSeoPage } from "@/components/service-seo-page";
import { seoHead, absoluteUrl } from "@/lib/seo";

const title = 'Commercial Cleaning Ottawa | Janitorial Services | OMSG';
const description = 'Commercial cleaning and janitorial services in Ottawa for offices, retail, medical and managed properties. Request a tailored quote.';
export const Route = createFileRoute("/commercial-cleaning-ottawa")({
  head: () => ({ ...seoHead({ title, description, path: "/commercial-cleaning-ottawa" }), scripts: [{ type: "application/ld+json", children: JSON.stringify({ "@context":"https://schema.org", "@type":"Service", name:'Commercial Cleaning & Janitorial Services in Ottawa', description, areaServed:["Ottawa","Kanata","Nepean","Barrhaven","Orleans","Stittsville","Gatineau"], provider:{"@type":"LocalBusiness",name:"Ottawa Multiservices Group Inc.",url:absoluteUrl("/")} }) }] }),
  component: () => <ServiceSeoPage content={{ eyebrow:'Commercial Cleaning', title:'Commercial Cleaning & Janitorial Services in Ottawa', intro:'Flexible cleaning support for businesses, property managers and organizations that need dependable recurring or project-based service.', bullets:['Office cleaning', 'Janitorial service', 'Retail and common-area cleaning', 'Post-construction commercial cleaning', 'Custom recurring cleaning schedules'], localText:'We serve commercial properties across Ottawa and the National Capital Region, with scope and frequency tailored to each site.' }} />,
});
