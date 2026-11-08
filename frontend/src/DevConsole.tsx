import { useState, useEffect } from "react";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  course: string | null;
  institution: string | null;
  graduation_year: number | null;
  created_at: string;
  conversation_count: number;
  message_count: number;
};

type DevConsoleProps = {
  token: string;
  onClose: () => void;
};

export function DevConsole({ token, onClose }: DevConsoleProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modals / forms
  const [resetTargetEmail, setResetTargetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newUserPass, setNewUserPass] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/auth/admin/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Failed to fetch users (HTTP ${res.status})`);
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || "Failed to load user registry.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTargetEmail || !newPassword) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/auth/admin/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email: resetTargetEmail, new_password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to reset password.");
      setSuccess(data.message || "Password updated.");
      setIsResetting(false);
      setNewPassword("");
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDeleteUser(userId: number, email: string) {
    if (!confirm(`Are you sure you want to delete user ${email} and all their conversations?`)) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/auth/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to delete user.");
      setSuccess(data.message || "User deleted.");
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newName || !newEmail || !newUserPass) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/auth/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newName, email: newEmail, password: newUserPass, role: "student" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create user.");
      setSuccess(data.message || "User created successfully.");
      setShowAddForm(false);
      setNewName("");
      setNewEmail("");
      setNewUserPass("");
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleResetDatabase() {
    if (!confirm("FACTORY RESET: This will wipe all chat messages and reset the database to root admin and fresh Anupriya student account. Proceed?")) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/auth/admin/reset-database", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to reset database.");
      setSuccess(data.message || "Database wiped and re-seeded.");
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="dev-console-overlay">
      <div className="dev-console-card">
        <div className="dev-console-header">
          <div>
            <div className="dev-tag">ROOT DEVELOPER ACCESS</div>
            <h2 className="dev-title">System Registry & Credentials Console</h2>
            <p className="dev-subtitle">Confidential management console for node administrator.</p>
          </div>
          <button className="dev-close-btn" onClick={onClose} title="Return to Portal">Close</button>
        </div>

        {error && <div className="dev-alert dev-alert-error">{error}</div>}
        {success && <div className="dev-alert dev-alert-success">{success}</div>}

        <div className="dev-actions-bar">
          <div className="dev-actions-left">
            <button className="dev-btn dev-btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? "Cancel Provisioning" : "+ Provision Student Account"}
            </button>
            <button className="dev-btn dev-btn-secondary" onClick={fetchUsers}>
              Refresh Registry
            </button>
          </div>
          <button className="dev-btn dev-btn-danger" onClick={handleResetDatabase}>
            Wipe & Reset Database
          </button>
        </div>

        {showAddForm && (
          <form className="dev-form-card" onSubmit={handleCreateUser}>
            <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: "600" }}>Provision New Account</h4>
            <div className="dev-form-grid">
              <input
                type="text"
                placeholder="Student Name"
                className="dev-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
              <input
                type="email"
                placeholder="Email Address"
                className="dev-input"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Initial Password (e.g. Pass1234!@#)"
                className="dev-input"
                value={newUserPass}
                onChange={(e) => setNewUserPass(e.target.value)}
                required
              />
              <button type="submit" className="dev-btn dev-btn-primary">Provision</button>
            </div>
          </form>
        )}

        {isResetting && (
          <form className="dev-form-card" onSubmit={handleResetPassword}>
            <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: "600" }}>
              Reset Password for: <span style={{ color: "var(--accent-primary)" }}>{resetTargetEmail}</span>
            </h4>
            <div className="dev-form-grid">
              <input
                type="text"
                placeholder="Enter new password (min 6 chars)"
                className="dev-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button type="submit" className="dev-btn dev-btn-primary">Apply Password</button>
              <button type="button" className="dev-btn dev-btn-secondary" onClick={() => setIsResetting(false)}>Cancel</button>
            </div>
          </form>
        )}

        <div className="dev-table-container">
          {loading ? (
            <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>Loading registered users...</div>
          ) : users.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>No accounts found in registry.</div>
          ) : (
            <table className="dev-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Conversations</th>
                  <th>Registered</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><code>#{u.id}</code></td>
                    <td><strong>{u.name}</strong></td>
                    <td>
                      <code>{u.email}</code>
                      {u.email === "blackfeatheractual@proton.me" && (
                        <span className="dev-role-badge dev-role-admin">ROOT</span>
                      )}
                    </td>
                    <td>
                      <span className={`dev-role-badge ${u.role === "admin" ? "dev-role-admin" : "dev-role-student"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      {u.conversation_count} chats ({u.message_count} msgs)
                    </td>
                    <td style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "Active"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="dev-table-actions">
                        <button
                          className="dev-action-btn dev-action-edit"
                          onClick={() => {
                            setResetTargetEmail(u.email);
                            setIsResetting(true);
                            setNewPassword("");
                          }}
                          title="Reset Password"
                        >
                          Reset Pass
                        </button>
                        {u.email !== "blackfeatheractual@proton.me" && (
                          <button
                            className="dev-action-btn dev-action-del"
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            title="Delete User"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
