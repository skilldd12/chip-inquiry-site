"use client";

import { useState } from "react";
import { getDictionary, type Locale } from "@/lib/i18n";

export function ContactForm({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, message, locale }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <div style={{ display: "grid", gap: 14 }}>
        <div className="field">
          <label className="label" htmlFor="c-name">
            {dict.contactForm.name}
          </label>
          <input
            id="c-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="c-email">
            {dict.contactForm.email}
            <span className="req">*</span>
          </label>
          <input
            id="c-email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="c-message">
            {dict.contactForm.message}
            <span className="req">*</span>
          </label>
          <textarea
            id="c-message"
            className="textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            maxLength={2000}
          />
        </div>
      </div>

      <button
        type="submit"
        className="btn btn--primary"
        style={{ marginTop: 20, width: "100%", justifyContent: "space-between" }}
        disabled={status === "sending"}
      >
        {status === "sending" ? dict.inquiry.submitting : dict.contactForm.submit}
        <span className="btn__arrow" aria-hidden="true">
          →
        </span>
      </button>

      {status === "sent" ? (
        <p className="small" role="status" style={{ marginTop: 12, color: "#2f6a4a" }}>
          {dict.contactForm.sent}
        </p>
      ) : null}
      {status === "error" ? (
        <p className="field-error" role="alert" style={{ marginTop: 12 }}>
          {dict.contactForm.failed}
        </p>
      ) : null}
    </form>
  );
}
