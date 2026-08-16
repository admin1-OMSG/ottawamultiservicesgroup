export const SITE_URL = "https://www.ottawamultiservicesgroup.com";
export const SITE_NAME = "Ottawa Multiservices Group Inc.";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

export function absoluteUrl(path = "/") {
  return `${SITE_URL}${path === "/" ? "" : path}`;
}

export function seoHead({ title, description, path, noindex = false }: { title: string; description: string; path: string; noindex?: boolean }) {
  const url = absoluteUrl(path);
  return {
    meta: [
      { title },
      { name: "description", content: description },
      ...(noindex ? [{ name: "robots", content: "noindex, nofollow, noarchive" }] : []),
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:type", content: "website" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: DEFAULT_OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: DEFAULT_OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
