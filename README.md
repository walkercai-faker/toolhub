# 工具箱（toolhub）

貳輪嶼內部工具集平台。把常用的網站與後台收整成一格格 App icon，手機優先、任何尺寸都自適應。

- 點 icon 開連結、長按看說明
- 依分類分組，分類可重新命名、可拖曳排序
- 工具可拖曳排序、上傳自訂圖示
- 整站共用帳密登入

## 開發

```bash
npm install
npm run dev
```

本機沒設 `DATABASE_URL` 時會自動使用 PGlite，資料存在專案內的 `.pgdata/`（已 gitignore）。
本機帳密放 `.env.local`（格式見 `.env.example`）。

## 環境變數

| 變數 | 說明 |
|---|---|
| `DATABASE_URL` | Postgres 連線字串。**未設定時**改用本機 PGlite。Supabase 請用 **Transaction pooler**（host 含 `pooler.supabase.com`、port `6543`）；Direct connection 走 IPv6，Vercel 連不到。 |
| `APP_USERNAME` | 登入帳號 |
| `APP_PASSWORD` | 登入密碼 |
| `AUTH_SECRET` | 簽發登入憑證的隨機字串，用 `openssl rand -base64 32` 產生 |

登入相關的三個變數只要缺一個，登入一律失敗（避免無密碼裸奔）。

## 部署（Vercel）

1. 在 Vercel 匯入本 repo。
2. 設定上述四個環境變數。
3. Deploy。首次請求會自動建立資料表。

## 技術

Next.js（App Router）、TypeScript、Tailwind CSS、Drizzle ORM、PGlite / Postgres、@dnd-kit。

---

由 貳輪嶼 製作
