"use server";

import Papa from "papaparse";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { slugify } from "@/lib/slugify";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminAuth";

const BATCH_SIZE = 500; // ghi theo t?ng d?t 500 dòng  tránh 1 request quá l?n/quá lâu
const MAX_ROWS = 15000; // ch?n s?m n?u file quá kh?, tránh treo c? trang trong lúc x? ly

function parseVariants(text) {
  return String(text || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// M?i thông s? cách nhau b?ng d?u ";", tên và giá tr? cách nhau b?ng d?u ":"
// VD c?t "specs" trong CSV: "B?o hành:6 tháng;Dung lu?ng:4500mAh"
function parseSpecs(text) {
  return String(text || "")
    .split(";")
    .map((part) => {
      const idx = part.indexOf(":");
      if (idx === -1) return null;
      const label = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      return label && value ? [label, value] : null;
    })
    .filter(Boolean);
}

function parseImages(text) {
  return String(text || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("http"));
}

function toNumber(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

// D?c 1 giá tr? theo nhi?u tên c?t có th? có (kh?p c? tiêu d? ti?ng Vi?t l?n ti?ng Anh),
// d? ngu?i nh?p không ph?i nh? chính xác tên c?t ti?ng Anh.
function pick(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") return row[k];
  }
  return "";
}

export async function importProductsFromCsv(formData) {
  const authError = requireAdmin();
  if (authError) return authError;

  const file = formData.get("csvFile");
  if (!file || typeof file.text !== "function" || file.size === 0) {
    return { success: false, error: "Vui lòng ch?n 1 file CSV d? t?i lên." };
  }

  let csvText;
  try {
    csvText = await file.text();
  } catch (e) {
    return { success: false, error: "Không d?c du?c n?i dung file  hay ch?c ch?n dây là file .csv." };
  }

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const rows = parsed.data || [];
  if (rows.length === 0) {
    return { success: false, error: "File không có d? li?u (ho?c thi?u dòng tiêu d?)." };
  }
  if (rows.length > MAX_ROWS) {
    return {
      success: false,
      error: `File có ${rows.length} dòng  vu?t quá gi?i h?n ${MAX_ROWS.toLocaleString(
        "vi-VN"
      )} dòng/l?n. Hay chia nh? file r?i nh?p thành nhi?u l?n.`,
    };
  }

  // L?y tru?c danh sách slug danh m?c h?p l?  ch?n s?n ph?m gán vào danh m?c không t?n t?i.
  const { data: categories, error: catError } = await supabaseAdmin.from("categories").select("slug");
  if (catError) {
    return { success: false, error: `L?i t?i danh m?c d? ki?m tra: ${catError.message}` };
  }
  const validCategorySlugs = new Set((categories || []).map((c) => c.slug));

  const validRows = [];
  const rowErrors = [];

  rows.forEach((row, i) => {
    const lineNumber = i + 2; // dòng 1 là tiêu d?, d? li?u tính t? dòng 2 cho kh?p s? dòng trong Excel

    const name = String(pick(row, ["name", "tên", "ten", "tên s?n ph?m"])).trim();
    const code = String(pick(row, ["code", "ma", "ma", "ma s?n ph?m"])).trim();
    const category = String(pick(row, ["category", "danh_muc", "danh muc", "danh m?c"])).trim();
    const priceRaw = pick(row, ["price", "giá", "gia", "giá bán"]);

    if (!name) {
      rowErrors.push(`Dòng ${lineNumber}: thi?u tên s?n ph?m  da b? qua.`);
      return;
    }
    if (!code) {
      rowErrors.push(`Dòng ${lineNumber}: thi?u ma s?n ph?m (code)  da b? qua.`);
      return;
    }
    if (!category) {
      rowErrors.push(`Dòng ${lineNumber}: thi?u danh m?c (category)  da b? qua.`);
      return;
    }
    if (!validCategorySlugs.has(category)) {
      rowErrors.push(
        `Dòng ${lineNumber}: danh m?c "${category}" không t?n t?i (ki?m tra l?i dúng slug trong /admin/categories)  da b? qua.`
      );
      return;
    }

    const price = toNumber(priceRaw, NaN);
    if (!Number.isFinite(price) || price <= 0) {
      rowErrors.push(`Dòng ${lineNumber}: giá bán không h?p l? ("${priceRaw}")  da b? qua.`);
      return;
    }

    const rawSlug = String(pick(row, ["slug"])).trim();
    const slug = slugify(rawSlug || name);
    if (!slug) {
      rowErrors.push(`Dòng ${lineNumber}: không t?o du?c ma du?ng d?n (slug) t? tên s?n ph?m  da b? qua.`);
      return;
    }

    const variants = parseVariants(pick(row, ["variants", "dòng máy", "dong may"]));
    const images = parseImages(pick(row, ["images", "?nh", "anh", "hình ?nh"]));
    const defaultVariantRaw = String(pick(row, ["default_variant", "dòng máy m?c d?nh"])).trim();

    validRows.push({
      slug,
      code,
      name,
      price,
      old_price: toNumber(pick(row, ["old_price", "giá g?c"]), null),
      // Shop hi?m khi h?t hàng nên không qu?n ly t?n kho theo t?ng dòng CSV  d?t c? d?nh
      // 1 s? l?n (gi? nguyên co ch? ch?ng bán vu?t t?n kho trong place_order() phòng khi c?n dùng l?i).
      stock: 9999,
      category,
      brand: String(pick(row, ["brand", "hang", "hang"])).trim() || null,
      variants,
      default_variant: defaultVariantRaw || variants[0] || null,
      specs: parseSpecs(pick(row, ["specs", "thông s?", "thong so"])),
      images,
      image_url: images[0] || null,
    });
  });

  if (validRows.length === 0) {
    return {
      success: false,
      error: "Không có dòng nào h?p l? d? nh?p  xem chi ti?t l?i bên du?i.",
      rowErrors: rowErrors.slice(0, 80),
      totalRows: rows.length,
    };
  }

  // Lo?i trùng slug NGAY TRONG FILE (dòng sau dè dòng tru?c)  tránh l?i trùng khoá khi 2 dòng
  // trong cùng file l? trùng slug (VD: 2 s?n ph?m cùng tên chua d?t slug riêng).
  const bySlug = new Map();
  validRows.forEach((r) => bySlug.set(r.slug, r));
  const dedupedRows = Array.from(bySlug.values());

  let insertedCount = 0;
  const batchErrors = [];

  // upsert (không ph?i insert thu?ng): n?u slug da t?n t?i thì C?P NH?T thay vì báo l?i trùng 
  // nh? v?y có th? ch?y nh?p l?i nhi?u l?n (b? sung/s?a d?n d? li?u) mà không s? l?i.
  for (let i = 0; i < dedupedRows.length; i += BATCH_SIZE) {
    const batch = dedupedRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin.from("products").upsert(batch, { onConflict: "slug" });

    if (error) {
      batchErrors.push(`Lô dòng ${i + 1}${i + batch.length}: ${error.message}`);
    } else {
      insertedCount += batch.length;
    }
  }

  revalidatePath("/admin/products");
  revalidatePath("/");

  return {
    success: batchErrors.length === 0,
    insertedCount,
    totalRows: rows.length,
    skippedCount: rowErrors.length,
    rowErrors: rowErrors.slice(0, 80),
    batchErrors,
  };
}
