/** 前端使用的工具型別（API 以 JSON 回傳，createdAt 為 ISO 字串）。 */
export interface App {
  id: string;
  title: string;
  url: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  createdAt: string;
}

/** 新增 / 編輯表單的欄位。 */
export interface AppInput {
  title: string;
  url: string;
  description: string;
  icon: string | null;
  color: string | null;
}
