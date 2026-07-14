import { supabase } from "@/lib/supabase";
import { SITE_URL } from "@/lib/siteUrl";

// Giới hạn 1 con số an toàn thay vì kéo hết bảng — với quy mô catalog vài nghìn sản phẩm của
// site này, con số này đủ phủ hết; nếu catalog vượt qua ngưỡng này thật thì nên chuyển sang
// generateSitemaps() (chia nhiều sitemap con) thay vì tăng số ở đây.
const MAX_PRODUCTS_IN_SITEMAP = 10000;

export default async function sitemap() {
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("slug"),
    supabase.from("products").select("slug, created_at").limit(MAX_PRODUCTS_IN_SITEMAP),
  ]);

  const staticEntries = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/tim-kiem`, changeFrequency: "weekly", priority: 0.3 },
  ];

  const categoryEntries = (categories || []).map((c) => ({
    url: `${SITE_URL}/danh-muc/${c.slug}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const productEntries = (products || []).map((p) => ({
    url: `${SITE_URL}/san-pham/${p.slug}`,
    lastModified: p.created_at,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
