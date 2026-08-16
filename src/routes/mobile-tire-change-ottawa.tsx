import { createFileRoute } from "@tanstack/react-router";
import { ServiceSeoPage } from "@/components/service-seo-page";
import { seoHead, absoluteUrl } from "@/lib/seo";

const title = 'Mobile Tire Change Ottawa | Seasonal Tire Service | OMSG';
const description = 'Mobile seasonal tire changes in Ottawa at your home or location, plus practical roadside and battery support where available.';
export const Route = createFileRoute("/mobile-tire-change-ottawa")({
  head: () => ({ ...seoHead({ title, description, path: "/mobile-tire-change-ottawa" }), scripts: [{ type: "application/ld+json", children: JSON.stringify({ "@context":"https://schema.org", "@type":"Service", name:'Mobile Tire Change in Ottawa', description, areaServed:["Ottawa","Kanata","Nepean","Barrhaven","Orleans","Stittsville","Gatineau"], provider:{"@type":"LocalBusiness",name:"Ottawa Multiservices Group Inc.",url:absoluteUrl("/")} }) }] }),
  component: () => <ServiceSeoPage content={{ eyebrow:'Mobile Tire Service', title:'Mobile Tire Change in Ottawa', intro:'Convenient seasonal tire-change service at your location for eligible vehicles and wheel setups.', bullets:['Seasonal tire swaps', 'On-location tire changes', 'Basic tire pressure checks', 'Battery boost support', 'Appointment-based mobile service'], localText:'We travel across our Ottawa-area service zone. Vehicle and wheel details are confirmed before the appointment.' }} />,
});
