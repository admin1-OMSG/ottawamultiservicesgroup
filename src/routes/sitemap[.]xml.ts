import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://www.ottawamultiservicesgroup.com";

interface SitemapEntry { path: string; changefreq?: string; priority?: string; }

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/",         changefreq: "weekly",  priority: "1.0" },
          { path: "/services", changefreq: "monthly", priority: "0.9" },
          { path: "/house-cleaning-ottawa", changefreq: "monthly", priority: "0.9" },
          { path: "/commercial-cleaning-ottawa", changefreq: "monthly", priority: "0.9" },
          { path: "/landscaping-ottawa", changefreq: "monthly", priority: "0.9" },
          { path: "/snow-removal-ottawa", changefreq: "monthly", priority: "0.9" },
          { path: "/mobile-car-detailing-ottawa", changefreq: "monthly", priority: "0.9" },
          { path: "/mobile-tire-change-ottawa", changefreq: "monthly", priority: "0.9" },
          { path: "/moving-services-ottawa", changefreq: "monthly", priority: "0.9" },
          { path: "/handyman-ottawa", changefreq: "monthly", priority: "0.9" },
          { path: "/about",    changefreq: "monthly", priority: "0.7" },
          { path: "/partners", changefreq: "monthly", priority: "0.8" },
          { path: "/quote",    changefreq: "monthly", priority: "0.9" },
          { path: "/contact",  changefreq: "yearly",  priority: "0.6" },
          { path: "/faq",      changefreq: "monthly", priority: "0.6" },
          { path: "/blog",     changefreq: "weekly",  priority: "0.7" },
          { path: "/privacy",  changefreq: "yearly",  priority: "0.3" },
          { path: "/terms",    changefreq: "yearly",  priority: "0.3" },
        ];
        const urls = entries.map((e) => [
          `  <url>`,
          `    <loc>${BASE_URL}${e.path}</loc>`,
          e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
          e.priority ? `    <priority>${e.priority}</priority>` : null,
          `  </url>`,
        ].filter(Boolean).join("\n"));
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");
        return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
