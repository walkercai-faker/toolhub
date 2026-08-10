# 工具箱（toolhub）

貳輪嶼內部工具集平台。把常用的網站與後台收整成一格格 App icon，手機優先、任何尺寸都自適應。

- 點 icon 開連結、長按看說明
- 依分類分組，分類可重新命名、可拖曳排序
- 工具可拖曳排序、上傳自訂圖示
- Supabase Auth 帳密登入

## 架構

**純靜態網站**：Next.js 以 `output: 'export'` 匯出成 HTML/CSS/JS，放在 GitHub Pages。
沒有任何伺服器程式（沒有 API routes、沒有伺服器端 session），瀏覽器直接連 Supabase：

- 資料存取：`@supabase/supabase-js`（`lib/apps-api.ts`）
- 登入：Supabase Auth（`app/login/page.tsx`）＋ 客戶端守衛（`components/AuthGuard.tsx`）
- 安全：**全靠 Supabase RLS policy**。客戶端守衛只影響畫面，不是安全邊界。

## 開發

```bash
npm install
cp .env.example .env.local   # 填入 Supabase 的兩個值
npm run dev                  # http://localhost:3000/toolhub/
npm run build                # 靜態匯出到 out/
```

> 站台有 `basePath: '/toolhub'`，所有網址都會多一層 `/toolhub`。
> 因為是靜態匯出，沒有 `npm start`；要預覽 `out/` 可以把它掛在同名子路徑下：
>
> ```bash
> mkdir -p .preview && cp -r out .preview/toolhub && npx serve .preview
> ```

## 環境變數

| 變數 | 說明 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 專案網址，例：`https://xxxxxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon / public key |

兩個值都在 Supabase 專案的 **Settings → API** 取得。
`NEXT_PUBLIC_` 開頭的變數會在 build 時內嵌進前端 bundle；anon key 本來就設計成可公開，
資料安全由 RLS 決定，不是靠藏 key。變數缺失時站台會顯示明確的設定提示。

## Supabase 設定

1. **資料表 `apps`**（欄位為 snake_case）：

   ```sql
   create table if not exists public.apps (
     id uuid primary key default gen_random_uuid(),
     title text not null,
     url text not null,
     description text,
     icon text,
     color text,
     category text,
     sort_order integer not null default 0,
     created_at timestamptz not null default now()
   );
   ```

2. **開啟 RLS 並建立 policy**（只有登入者可讀寫）：

   ```sql
   alter table public.apps enable row level security;

   create policy "登入者可讀" on public.apps
     for select to authenticated using (true);

   create policy "登入者可寫" on public.apps
     for insert to authenticated with check (true);

   create policy "登入者可改" on public.apps
     for update to authenticated using (true) with check (true);

   create policy "登入者可刪" on public.apps
     for delete to authenticated using (true);
   ```

3. **建立使用者**：Authentication → Users → Add user（用 Email + 密碼，勾選自動確認）。
   若不想開放註冊，請在 Authentication → Providers → Email 關閉 **Enable sign ups**。

4. **允許來源**：Authentication → URL Configuration 的 Site URL 設為
   `https://walkercai-faker.github.io/toolhub/`。

## 部署（GitHub Pages）

1. GitHub repo → **Settings → Pages → Source** 選「GitHub Actions」。
2. **Settings → Secrets and variables → Actions → Variables** 新增兩個 Repository variables：
   `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`。
3. push 到 `main`，`.github/workflows/deploy.yml` 會自動 build 並發布。
4. 網址：<https://walkercai-faker.github.io/toolhub/>

改動 Supabase 變數後，要**重新跑一次 workflow**（值是 build 時內嵌的）。

## 技術

Next.js（App Router，靜態匯出）、TypeScript、Tailwind CSS、Supabase（Postgres + Auth + RLS）、@dnd-kit。

---

由 貳輪嶼 製作
