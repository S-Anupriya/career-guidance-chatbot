import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "";

const DISPOSABLE_EMAIL_DOMAINS = [
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "throwawaymail.com",
  "fakeinbox.com",
  "yopmail.com",
  "trashmail.com",
  "dispostable.com"
];

type Student = {
  id: number;
  name: string;
  email: string;
  course?: string | null;
  institution?: string | null;
  graduation_year?: number | null;
  interests?: string[];
  skills?: string[];
  preferred_domains?: string[];
};

type AuthScreenProps = {
  onAuthenticated: (token: string, student: Student) => void;
};

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Password rules validation
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  // Disposable email check
  const emailDomain = email.includes("@") ? email.split("@")[1].toLowerCase() : "";
  const isDisposableEmail = DISPOSABLE_EMAIL_DOMAINS.includes(emailDomain);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (mode === "register") {
      if (isDisposableEmail) {
        setError("Temporary or disposable email domains are not permitted.");
        return;
      }
      if (!isPasswordValid) {
        setError("Please fulfill all password security requirements before proceeding.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please verify.");
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = mode === "register" ? "/auth/register" : "/auth/login";

      const body =
        mode === "register"
          ? { name: name.trim(), email: email.trim(), password }
          : { email: email.trim(), password };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Authentication failed.");
      }

      if (mode === "register") {
        setMode("login");
        setPassword("");
        setConfirmPassword("");
        setSuccess("Candidate account registered successfully. Please sign in with your credentials.");
        return;
      }

      onAuthenticated(data.access_token, data.student);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        {/* Brand Insignia */}
        <div className="auth-brand">
          <div className="brand-seal" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <line x1="12" y1="6" x2="16" y2="6" />
              <line x1="12" y1="10" x2="16" y2="10" />
            </svg>
          </div>
          <div className="brand-copy">
            <h2 className="brand-title">CareerPath India</h2>
            <p className="brand-sub">Institutional Advisory Registry</p>
          </div>
        </div>

        {/* Heading Block */}
        <div className="auth-heading">
          <span className="auth-docket-tag">STUDENT PORTAL ACCESS</span>
          <h1 className="auth-headline">
            {mode === "login" ? "Access your advisory dossier." : "Register your candidate profile."}
          </h1>
          <p className="auth-subtext">
            {mode === "login"
              ? "Sign in to review saved roadmaps, salary benchmarks, and tailored career guidance."
              : "Create an academic profile to receive verified recommendations tailored to your institution and degree."}
          </p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={mode === "login" ? "selected" : ""}
            onClick={() => {
              setMode("login");
              setError("");
              setSuccess("");
            }}
          >
            Sign In
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            className={mode === "register" ? "selected" : ""}
            onClick={() => {
              setMode("register");
              setError("");
              setSuccess("");
            }}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <label className="auth-field">
              <span className="field-label">Candidate Full Name</span>
              <input
                type="text"
                placeholder="e.g. Udayagiri Devayani"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={80}
                required
                className="auth-input"
              />
            </label>
          )}

          <label className="auth-field">
            <span className="field-label">Institutional or Personal Email</span>
            <input
              type="email"
              placeholder="e.g. student@eastpoint.ac.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
              autoComplete="email"
              required
              className="auth-input"
            />
            {isDisposableEmail && (
              <span className="field-hint-error">
                Temporary or disposable email domains are not permitted.
              </span>
            )}
          </label>

          <label className="auth-field">
            <span className="field-label">Password</span>
            <div className="password-input-box">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={
                  mode === "register"
                    ? "Minimum 8 chars with mixed case, number & symbol"
                    : "Enter your account password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                maxLength={128}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                className="auth-input"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {mode === "register" && (
            <div className="password-rules-card">
              <span className="rules-heading">Security Compliance Checklist:</span>
              <div className="rules-grid">
                <span className={`rule-item ${hasMinLength ? "passed" : ""}`}>
                  <span className="rule-dot">•</span> 8+ Characters
                </span>
                <span className={`rule-item ${hasUppercase ? "passed" : ""}`}>
                  <span className="rule-dot">•</span> Uppercase Letter (A–Z)
                </span>
                <span className={`rule-item ${hasLowercase ? "passed" : ""}`}>
                  <span className="rule-dot">•</span> Lowercase Letter (a–z)
                </span>
                <span className={`rule-item ${hasNumber ? "passed" : ""}`}>
                  <span className="rule-dot">•</span> Number (0–9)
                </span>
                <span className={`rule-item ${hasSpecial ? "passed" : ""}`}>
                  <span className="rule-dot">•</span> Special Symbol (!@#$%)
                </span>
              </div>
            </div>
          )}

          {mode === "register" && (
            <label className="auth-field">
              <span className="field-label">Confirm Password</span>
              <div className="password-input-box">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter password to verify"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                  className="auth-input"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
          )}

          {error && <div className="auth-message error">{error}</div>}
          {success && <div className="auth-message success">{success}</div>}

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading || (mode === "register" && (!isPasswordValid || isDisposableEmail))}
          >
            {loading ? "Verifying..." : mode === "login" ? "Sign In to Dossier →" : "Register Candidate Account →"}
          </button>
        </form>
      </section>
    </main>
  );
}
