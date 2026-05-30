import { LogOut } from "lucide-react";
import { api } from "../api";
import type { NavState } from "../App";
import type { User } from "../types";

type Props = {
  user: User;
  nav: NavState;
  navigate: (nav: NavState) => void;
  onLogout: () => void;
  children: React.ReactNode;
};

const workshopLabels: Record<string, string> = {
  ALL: "Tất cả xưởng",
  STERILE: "Xưởng vô trùng",
  NON_STERILE: "Xưởng không vô trùng"
};

export function Layout({ user, nav, navigate, onLogout, children }: Props) {
  const isAdmin = user.roles.includes("ADMIN");
  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    onLogout();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>eCN</strong>
          <span>Quản lý TBTĐ</span>
        </div>
        <button className={nav.page === "dashboard" ? "active" : ""} onClick={() => navigate({ page: "dashboard" })}>
          Tổng quan
        </button>
        <button className={nav.page === "browse" ? "active" : ""} onClick={() => navigate({ page: "browse" })}>
          Tra cứu TBTĐ
        </button>
        <button onClick={() => navigate({ page: "browse", workshopType: "STERILE" })}>
          Tra cứu TBTĐ xưởng vô trùng
        </button>
        <button onClick={() => navigate({ page: "browse", workshopType: "NON_STERILE" })}>
          Tra cứu TBTĐ xưởng không vô trùng
        </button>
        <button onClick={() => navigate({ page: "browse", view: "my-queue" })}>Chờ tôi xử lý</button>
        <button className={nav.page === "create" ? "active" : ""} onClick={() => navigate({ page: "create" })}>
          Tạo TBTĐ
        </button>
        {isAdmin && (
          <button className={nav.page === "admin-users" ? "active" : ""} onClick={() => navigate({ page: "admin-users" })}>
            Tài khoản
          </button>
        )}
      </aside>
      <main>
        <header className="topbar">
          <div>
            <strong>{user.name}</strong>
            <span>{user.department} · {workshopLabels[user.workshopType] || user.workshopType}</span>
          </div>
          <div className="role-list">{user.roles.join(" | ")}</div>
          <button className="icon-button" onClick={logout} title="Đăng xuất">
            <LogOut size={18} />
            Đăng xuất
          </button>
        </header>
        <section className="content">{children}</section>
      </main>
    </div>
  );
}
