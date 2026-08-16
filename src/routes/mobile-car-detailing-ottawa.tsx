import { createFileRoute } from "@tanstack/react-router";
import { ServiceSeoPage } from "@/components/service-seo-page";
import { seoHead, absoluteUrl } from "@/lib/seo";

const title = 'Mobile Car Detailing Ottawa | At-Home Vehicle Cleaning | OMSG';
const description = 'Mobile car detailing and vehicle cleaning in Ottawa. Interior, exterior and full-detail service at your location.';
export const Route = createFileRoute("/mobile-car-detailing-ottawa")({
  head: () => ({ ...seoHead({ title, description, path: "/mobile-car-detailing-ottawa" }), scripts: [{ type: "application/ld+json", children: JSON.stringify({ "@context":"https://schema.org", "@type":"Service", name:'Mobile Car Detailing in Ottawa', description, areaServed:["Ottawa","Kanata","Nepean","Barrhaven","Orleans","Stittsville","Gatineau"], provider:{"@type":"LocalBusiness",name:"Ottawa Multiservices Group Inc.",url:absoluteUrl("/")} }) }] }),
  component: () => <ServiceSeoPage content={{ eyebrow:'Mobile Vehicle Detailing', title:'Mobile Car Detailing in Ottawa', intro:'Convenient vehicle cleaning brought to your driveway or approved work location across the Ottawa area.', bullets:['Interior vehicle cleaning', 'Exterior wash and detailing', 'Full-detail packages', 'Seasonal vehicle cleanup', 'At-home mobile service'], localText:'Mobile service reduces the need to leave your vehicle at a shop and is offered across our Ottawa-area service zone.' }} />,
});
