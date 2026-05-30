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
          <span>Quan ly TBTD</span>
        </div>
        <button className={nav.page === "dashboard" ? "active" : ""} onClick={() => navigate({ page: "dashboard" })}>
          Tong quan
        </button>
        <button className={nav.page === "browse" ? "active" : ""} onClick={() => navigate({ page: "browse" })}>
          Tra cuu TBTD
        </button>
        <button onClick={() => navigate({ page: "browse", view: "my-queue" })}>Cho toi xu ly</button>
        <button className={nav.page === "create" ? "active" : ""} onClick={() => navigate({ page: "create" })}>
          Tao TBTD
        </button>
        {isAdmin && (
          <button className={nav.page === "admin-users" ? "active" : ""} onClick={() => navigate({ page: "admin-users" })}>
            Tai khoan
          </button>
        )}
      </aside>
      <main>
        <header className="topbar">
          <div>
            <strong>{user.name}</strong>
            <span>{user.department}</span>
          </div>
          <div className="role-list">{user.roles.join(" | ")}</div>
          <button className="icon-button" onClick={logout} title="Dang xuat">
            <LogOut size={18} />
            Dang xuat
          </button>
        </header>
        <section className="content">{children}</section>
      </main>
    </div>
  );
}
