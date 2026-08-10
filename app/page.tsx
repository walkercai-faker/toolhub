import AuthGuard from "@/components/AuthGuard";
import ToolHub from "@/components/ToolHub";

export default function Home() {
  // 靜態站的登入守衛在瀏覽器端執行，沒有 session 會導向 /login
  return (
    <AuthGuard>
      <ToolHub />
    </AuthGuard>
  );
}
