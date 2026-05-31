import { useEffect, useState } from "react";
import { api } from "../api";

type AdminRole = { id: string; code: string; name: string };
type WorkshopScope = "STERILE" | "NON_STERILE" | "ALL";

type AdminUser = {
  id: string;
  username: string;
  name: string;
  email: string;
  department: string;
  workshopType: WorkshopScope;
  active: boolean;
  roles: { role: AdminRole }[];
};

type UserForm = {
  username: string;
  name: string;
  email: string;
  department: string;
  workshopType: WorkshopScope;
  roles: string[];
};

const workshopLabels: Record<WorkshopScope, string> = {
  ALL: "Tất cả xưởng",
  STERILE: "Xưởng vô trùng",
  NON_STERILE: "Xưởng không vô trùng"
};

const emptyUser: UserForm = {
  username: "",
  name: "",
  email: "",
  department: "",
  workshopType: "ALL",
  roles: []
};

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [form, setForm] = useState<UserForm>(emptyUser);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const res = await api<{ users: AdminUser[]; roles: AdminRole[] }>("/api/admin/users");
    setUsers(res.users);
    setRoles(res.roles);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    try {
      await api(editingId ? `/api/admin/users/${editingId}` : "/api/admin/users", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      setForm(emptyUser);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được tài khoản.");
    }
  }

  function edit(user: AdminUser) {
    setError("");
    setEditingId(user.id);
    setForm({
      username: user.username,
      name: user.name,
      email: user.email,
      department: user.department,
      workshopType: user.workshopType,
      roles: user.roles.map((item) => item.role.code)
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyUser);
    setError("");
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
          <p>Quản lý đa tài khoản, phòng ban, phạm vi xưởng và vai trò ký duyệt.</p>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <form className="form-grid panel" onSubmit={save}>
        <h2 className="wide">{editingId ? "Chỉnh sửa tài khoản" : "Tạo tài khoản mới"}</h2>
        <label>
          Username
          <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        </label>
        <label>
          Họ tên
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label>
          Email
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>
          Phòng ban
          <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        </label>
        <label>
          Phạm vi xưởng
          <select value={form.workshopType} onChange={(e) => setForm({ ...form, workshopType: e.target.value as WorkshopScope })}>
            <option value="ALL">Tất cả xưởng</option>
            <option value="STERILE">Xưởng vô trùng</option>
            <option value="NON_STERILE">Xưởng không vô trùng</option>
          </select>
        </label>
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
              {role.name}
            </label>
          ))}
        </div>
        <button type="submit">{editingId ? "Lưu thay đổi tài khoản" : "Tạo tài khoản"}</button>
        {editingId && <button type="button" onClick={cancelEdit}>Hủy sửa</button>}
      </form>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tài khoản</th>
              <th>Họ tên</th>
              <th>Phòng ban</th>
              <th>Phạm vi xưởng</th>
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
                <td>{workshopLabels[user.workshopType]}</td>
                <td>{user.roles.map((item) => item.role.name).join(", ")}</td>
                <td>{user.active ? "Đang hoạt động" : "Đã vô hiệu"}</td>
                <td className="row-actions">
                  <button onClick={() => edit(user)}>Sửa</button>
                  <button onClick={() => toggleActive(user)}>{user.active ? "Vô hiệu" : "Kích hoạt"}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
