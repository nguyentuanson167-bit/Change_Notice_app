import { useEffect, useState } from "react";
import { api } from "./api";
import type { User } from "./types";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { BrowsePage } from "./pages/BrowsePage";
import { NoticeFormPage } from "./pages/NoticeFormPage";
import { NoticeDetailPage } from "./pages/NoticeDetailPage";
import { PrintNoticePage } from "./pages/PrintNoticePage";
import { AdminUsersPage } from "./pages/AdminUsersPage";

export type Page = "dashboard" | "browse" | "create" | "detail" | "print" | "admin-users";

export type NavState = {
  page: Page;
  id?: string;
  view?: string;
  workshopType?: "STERILE" | "NON_STERILE";
};

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [nav, setNav] = useState<NavState>({ page: "dashboard" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ user: User }>("/api/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="centered">Đang tải ứng dụng...</div>;
  if (!user) return <LoginPage onLogin={setUser} />;

  const navigate = (next: NavState) => setNav(next);

  return (
    <Layout user={user} nav={nav} navigate={navigate} onLogout={() => setUser(null)}>
      {nav.page === "dashboard" && <DashboardPage navigate={navigate} />}
      {nav.page === "browse" && <BrowsePage navigate={navigate} defaultView={nav.view} defaultWorkshopType={nav.workshopType} />}
      {nav.page === "create" && <NoticeFormPage id={nav.id} user={user} navigate={navigate} />}
      {nav.page === "detail" && nav.id && <NoticeDetailPage id={nav.id} user={user} navigate={navigate} />}
      {nav.page === "print" && nav.id && <PrintNoticePage id={nav.id} navigate={navigate} />}
      {nav.page === "admin-users" && <AdminUsersPage />}
    </Layout>
  );
}
