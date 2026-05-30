import { useEffect, useState } from "react";
import { api } from "../api";

type AdminRole = { id: string; code: string; name: string };
type AdminUser = {
  id: string;
  username: string;
  name: string;
  email: string;
  department: string;
  active: boolean;
  roles: { role: AdminRole }[];
};

const emptyUser = { username: "", name: "", email: "", department: "", roles: [] as string[] };

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [form, setForm] = useState(emptyUser);
  const [error, setError] = useState("");

  async function load() {
    const res = await api<{ users: AdminUser[]; roles: AdminRole[] }>("/api/admin/users");
    setUsers(res.users);
    setRoles(res.roles);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    await api("/api/admin/users", { method: "POST", body: JSON.stringify(form) });
    setForm(emptyUser);
    await load();
  }

  async function toggleActive(user: AdminUser) {
    await api(`/api/admin/users/${user.id}/${user.active ? "deactivate" : "activate"}`, { method: "POST" });
    await load();
  }

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>Quản lý tài khoản</h1>
          <p>Quản lý đa tài khoản, phòng ban và vai trò ký duyệt.</p>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <form className="form-grid panel" onSubmit={create}>
        <label>Username<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>
        <label>Họ tên<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Phòng ban<input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></label>
        <div className="wide checkbox-row">
          {roles.map((role) => (
            <label key={role.id}>
              <input
                type="checkbox"
                checked={form.roles.includes(role.code)}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    roles: event.target.checked ? [...current.roles, role.code] : current.roles.filter((item) => item !== role.code)
                  }));
                }}
              />
              {role.code}
            </label>
          ))}
        </div>
        <button type="submit">Tạo tài khoản</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tài khoản</th>
              <th>Họ tên</th>
              <th>Phòng ban</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.username}<br /><small>{user.email}</small></td>
                <td>{user.name}</td>
                <td>{user.department}</td>
                <td>{user.roles.map((item) => item.role.code).join(", ")}</td>
                <td>{user.active ? "Đang hoạt động" : "Đã vô hiệu"}</td>
                <td><button onClick={() => toggleActive(user)}>{user.active ? "Vô hiệu" : "Kích hoạt"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
