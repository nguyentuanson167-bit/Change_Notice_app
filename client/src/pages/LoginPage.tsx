import { useState } from "react";
import { api } from "../api";
import type { User } from "../types";

const accounts = [
  ["author", "Nhan vien NCPT"],
  ["author2", "Nhan vien NCPT 2"],
  ["lead", "Truong nhom NCPT"],
  ["qa-deputy", "Pho phong DBCL"],
  ["qa-head", "Truong phong DBCL"],
  ["director", "Giam doc san xuat"],
  ["admin", "Quan tri"],
  ["viewer", "Nguoi xem"]
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
      setError(err instanceof Error ? err.message : "Dang nhap that bai.");
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <h1>eCN</h1>
        <p>He thong quan ly Thong bao thay doi ban mem</p>
        <label>
          Tai khoan
          <select value={username} onChange={(event) => setUsername(event.target.value)}>
            {accounts.map(([value, label]) => (
              <option key={value} value={value}>
                {value} - {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mat khau
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
        </label>
        {error && <div className="error">{error}</div>}
        <button type="submit">Dang nhap</button>
        <small>Mat khau demo: password123</small>
      </form>
    </div>
  );
}
