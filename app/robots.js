import { SITE_URL } from "@/lib/siteUrl";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dat-hang", "/don-hang-cua-toi", "/gio-hang"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
