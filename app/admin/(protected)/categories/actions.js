"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminAuthed, requireAdmin } from "@/lib/adminAuth";

export async function createCategory(formData) {
  if (!isAdminAuthed()) {
    redirect("/admin/login");
  }

  const slug = formData.get("slug")?.trim();
  const code = formData.get("code")?.trim();
  const name = formData.get("name")?.trim();
  const groupSlug = formData.get("groupSlug")?.trim() || "linh-kien";

  if (!slug || !code || !name) {
    redirect(`/admin/categories/new?error=${encodeURIComponent("Vui lòng điền đủ thông tin.")}`);
  }

  const { error } = await supabaseAdmin.from("categories").insert({ slug, code, name, group_slug: groupSlug });

  if (error) {
    console.error("Lỗi thêm danh mục:", error.message);
    redirect(`/admin/categories/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/categories");
  revalidatePath("/");
  redirect("/admin/categories");
}

export async function updateCategory(slug, formData) {
  if (!isAdminAuthed()) {
    redirect("/admin/login");
  }

  const code = formData.get("code")?.trim();
  const name = formData.get("name")?.trim();
  const groupSlug = formData.get("groupSlug")?.trim() || "linh-kien";

  const { error } = await supabaseAdmin
    .from("categories")
    .update({ code, name, group_slug: groupSlug })
    .eq("slug", slug);

  if (error) {
    console.error("Lỗi cập nhật danh mục:", error.message);
    redirect(`/admin/categories/${slug}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/categories");
  revalidatePath("/");
  redirect("/admin/categories");
}

export async function deleteCategory(slug) {
  const authError = requireAdmin();
  if (authError) return authError;

  // Không cho xoá nếu vẫn còn sản phẩm thuộc danh mục này — tránh sản phẩm bị "mồ côi" danh mục.
  const { count, error: countError } = await supabaseAdmin
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("category", slug);

  if (countError) {
    return { success: false, error: countError.message };
  }

  if ((count ?? 0) > 0) {
    return {
      success: false,
      error: `Không thể xoá — vẫn còn ${count} sản phẩm thuộc danh mục này. Hãy chuyển hoặc xoá các sản phẩm đó trước.`,
    };
  }

  const { error } = await supabaseAdmin.from("categories").delete().eq("slug", slug);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/");
  return { success: true };
}
