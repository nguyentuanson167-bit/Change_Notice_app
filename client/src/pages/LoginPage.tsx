import { useState } from "react";
import { api } from "../api";
import type { User } from "../types";

const accounts = [
  ["author", "Nhân viên NCPT"],
  ["author2", "Nhân viên NCPT 2"],
  ["lead", "Trưởng nhóm NCPT"],
  ["qa-deputy", "Phó phòng ĐBCL"],
  ["qa-head", "Trưởng phòng ĐBCL"],
  ["director", "Giám đốc sản xuất"],
  ["admin", "Quản trị"],
  ["viewer", "Người xem"]
];

export function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState("author");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const res = await api<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      onLogin(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại.");
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <h1>eCN</h1>
        <p>Hệ thống quản lý Thông báo thay đổi bản mềm</p>
        <label>
          Tài khoản
          <select value={username} onChange={(event) => setUsername(event.target.value)}>
            {accounts.map(([value, label]) => (
              <option key={value} value={value}>
                {value} - {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mật khẩu
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
        </label>
        {error && <div className="error">{error}</div>}
        <button type="submit">Đăng nhập</button>
        <small>Mật khẩu demo: password123</small>
      </form>
    </div>
  );
}
