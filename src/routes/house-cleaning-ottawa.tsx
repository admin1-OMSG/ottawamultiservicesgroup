import { createFileRoute } from "@tanstack/react-router";
import { ServiceSeoPage } from "@/components/service-seo-page";
import { seoHead, absoluteUrl } from "@/lib/seo";

const title = 'House Cleaning Ottawa | Residential Cleaning | OMSG';
const description = 'House cleaning in Ottawa for regular, deep, move-in, move-out and post-construction needs. Request a free quote from Ottawa Multiservices Group.';
export const Route = createFileRoute("/house-cleaning-ottawa")({
  head: () => ({ ...seoHead({ title, description, path: "/house-cleaning-ottawa" }), scripts: [{ type: "application/ld+json", children: JSON.stringify({ "@context":"https://schema.org", "@type":"Service", name:'House Cleaning Services in Ottawa', description, areaServed:["Ottawa","Kanata","Nepean","Barrhaven","Orleans","Stittsville","Gatineau"], provider:{"@type":"LocalBusiness",name:"Ottawa Multiservices Group Inc.",url:absoluteUrl("/")} }) }] }),
  component: () => <ServiceSeoPage content={{ eyebrow:'House Cleaning', title:'House Cleaning Services in Ottawa', intro:'Reliable residential cleaning for homes, apartments, rentals and move transitions across Ottawa and nearby communities.', bullets:['Regular and recurring house cleaning', 'Deep cleaning', 'Move-in and move-out cleaning', 'Airbnb and rental turnover cleaning', 'Post-construction cleaning'], localText:'Our local service area covers Ottawa neighbourhoods and nearby communities, with scheduling based on crew availability.' }} />,
});
