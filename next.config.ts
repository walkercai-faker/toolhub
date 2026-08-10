import type { NextConfig } from "next";

/**
 * 純靜態網站設定（部署到 GitHub Pages）。
 *
 * - output: "export"     → next build 直接輸出靜態檔到 out/，不需要 Node 伺服器
 * - basePath: "/toolhub" → 站台網址為 https://walkercai-faker.github.io/toolhub/
 *                          （next/link、useRouter 會自動補上這個前綴）
 * - trailingSlash: true  → 產生 /login/index.html，GitHub Pages 直接命中，不會 404
 * - images.unoptimized   → 靜態匯出沒有伺服器可即時最佳化圖片
 */
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/toolhub",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
