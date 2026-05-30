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
          <h1>Quan ly tai khoan</h1>
          <p>Quan ly da tai khoan, phong ban va vai tro ky duyet.</p>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <form className="form-grid panel" onSubmit={create}>
        <label>Username<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>
        <label>Ho ten<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Phong ban<input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></label>
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
        <button type="submit">Tao tai khoan</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tai khoan</th>
              <th>Ho ten</th>
              <th>Phong ban</th>
              <th>Vai tro</th>
              <th>Trang thai</th>
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
                <td>{user.active ? "Dang hoat dong" : "Da vo hieu"}</td>
                <td><button onClick={() => toggleActive(user)}>{user.active ? "Vo hieu" : "Kich hoat"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
