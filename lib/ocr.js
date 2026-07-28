import { createWorker } from "tesseract.js";

// Đọc chữ tiếng Việt trong 1 ảnh (dùng cho ảnh chụp màn hình bài đăng Zalo — đọc caption
// tên/giá sản phẩm). Mỗi lần gọi tạo và huỷ worker riêng — Server Action chạy trên môi trường
// serverless nên không đảm bảo giữ được worker giữa các lần gọi khác nhau.
export async function ocrImageText(buffer) {
  const worker = await createWorker("vie");
  try {
    const { data } = await worker.recognize(buffer);
    return data.text || "";
  } finally {
    await worker.terminate();
  }
}
