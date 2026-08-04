/**
 * 用 canvas 把上傳圖片壓縮縮放到「最長邊約 maxSize（預設 192px）」，
 * 轉成 base64 data URL，避免 base64 過大。
 * 在瀏覽器端執行。
 */
export async function compressImageToDataUrl(
  file: File,
  maxSize = 192,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    let { width, height } = bitmap;

    // 依最長邊等比例縮放
    if (width >= height && width > maxSize) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    } else if (height > width && height > maxSize) {
      width = Math.round((width * maxSize) / height);
      height = maxSize;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("無法取得 canvas context");
    ctx.drawImage(bitmap, 0, 0, width, height);

    // webp 通常更小；不支援時瀏覽器會自動回退成 png
    return canvas.toDataURL("image/webp", 0.85);
  } finally {
    bitmap.close();
  }
}
