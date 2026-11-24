import { useLanguage } from "@/lib/language";
import { googleListingUrl } from "./model";
export function GoogleProfileReviews({ listingUrl }: { listingUrl?: string | null }) {
  const { language } = useLanguage();
  const url = googleListingUrl(listingUrl);
  return url ? <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold text-teal-800 underline underline-offset-4">{language === "fr" ? "Voir les avis sur Google Maps" : "See reviews on Google Maps"}</a> : null;
}
