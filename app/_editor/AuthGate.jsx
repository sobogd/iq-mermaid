import { useState } from "react";
import "./auth.css";

// Maps the error codes the /api/auth endpoints return to the `t.auth.*` string
// the UI shows. Anything unknown falls back to the generic message.
const ERROR_KEY = {
  INVALID_EMAIL: "invalidEmail",
  INVALID_CODE: "invalidCode",
  CODE_EXPIRED: "codeExpired",
  TOO_MANY_REQUESTS: "tooManyAttempts",
  TOO_MANY_ATTEMPTS: "tooManyAttempts",
};

async function postJson(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON error body */
  }
  return { ok: res.ok && data?.ok !== false, error: data?.error ?? null, status: res.status };
}

// Sign-in gate as a blocking modal over the editor: a dimmed backdrop and one
// small card — email → 6-digit code. There is deliberately no way to dismiss
// it into the editor: using the editor requires signing in. `onBack` (optional)
// goes back to the content window instead. On success `onAuthed(email)` hands
// control back to the caller.
export default function AuthGate({ t, onAuthed, onBack }) {
  const [step, setStep] = useState("email"); // "email" | "code"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  function showError(key) {
    setError(t.auth[key] ?? t.auth.genericError);
  }

  async function requestCode(target) {
    setBusy(true);
    setError(null);
    const { ok, error } = await postJson("/api/auth/send-otp", { email: target });
    setBusy(false);
    if (!ok) {
      showError(ERROR_KEY[error] ?? "genericError");
      return false;
    }
    setNotice(t.auth.codeSent.replace("{email}", target));
    return true;
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    const target = email.trim().toLowerCase();
    if (!target || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      showError("invalidEmail");
      return;
    }
    if (await requestCode(target)) setStep("code");
  }

  async function handleCodeSubmit(e) {
    e.preventDefault();
    if (code.trim().length !== 6) {
      showError("invalidCode");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: code.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && data.ok) {
      onAuthed(email);
      return;
    }
    showError(ERROR_KEY[data?.error] ?? "genericError");
  }

  async function handleResend() {
    await requestCode(email);
  }

  function backToEmail() {
    setStep("email");
    setCode("");
    setNotice(null);
    setError(null);
  }

  return (
    <div className="iqm-auth" role="dialog" aria-modal="true" aria-label={t.auth.title}>
      <div className="iqm-auth-backdrop" aria-hidden="true" />
      <form
        className="iqm-auth-panel"
        role="group"
        aria-label={t.auth.title}
        onSubmit={step === "email" ? handleEmailSubmit : handleCodeSubmit}
      >
        <h1 className="iqm-auth-title">{t.auth.title}</h1>
        <p className="iqm-auth-subtitle">{t.auth.subtitle}</p>

        {step === "email" ? (
          <label className="iqm-auth-field">
            <span className="iqm-auth-label">{t.auth.emailLabel}</span>
            <input
              type="email"
              autoComplete="email"
              className="iqm-auth-input"
              placeholder={t.auth.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
          </label>
        ) : (
          <>
            {notice && <p className="iqm-auth-notice">{notice}</p>}
            <label className="iqm-auth-field">
              <span className="iqm-auth-label">{t.auth.codeLabel}</span>
              <input
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className="iqm-auth-input iqm-auth-code"
                placeholder={t.auth.codePlaceholder}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                disabled={busy}
              />
            </label>
            <button type="button" className="iqm-auth-resend" onClick={handleResend} disabled={busy}>
              {t.auth.resend}
            </button>
          </>
        )}

        {error && <p className="iqm-auth-error">{error}</p>}

        <button type="submit" className="iqm-auth-submit" disabled={busy}>
          {busy
            ? step === "email"
              ? t.auth.sending
              : t.auth.verifying
            : step === "email"
              ? t.auth.sendCode
              : t.auth.verify}
        </button>

        {step === "code" && (
          <button type="button" className="iqm-auth-back" onClick={backToEmail} disabled={busy}>
            {t.auth.back}
          </button>
        )}

        {onBack && (
          <button type="button" className="iqm-auth-back-to-site" onClick={onBack} disabled={busy}>
            {t.auth.goBack}
          </button>
        )}
      </form>
    </div>
  );
}
