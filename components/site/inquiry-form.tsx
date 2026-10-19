"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Plus, X, Paperclip, Check, AlertCircle } from "lucide-react";
import { getDictionary, type Locale } from "@/lib/i18n";
import { validateInquiry, MAX_FILES, MAX_FILE_BYTES, ALLOWED_EXTENSIONS } from "@/lib/core.js";

type Item = { mpn: string; brand: string; qty: string; note: string };

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; code: string; duplicate?: boolean }
  | { status: "error"; message: string; errors?: Record<string, string> };

const emptyItem = (): Item => ({ mpn: "", brand: "", qty: "", note: "" });

/**
 * 静态导出（GitHub Pages）没有后端：表单照常校验，但提交时明确告知"不连接服务器"，
 * 不会假装拿到编号、也不会把内容留在浏览器里冒充已发送。
 */
const STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

export function InquiryForm({
  locale,
  initialBrand,
  initialMpn,
  initialMessage,
}: {
  locale: Locale;
  initialBrand?: string;
  initialMpn?: string;
  initialMessage?: string;
}) {
  const dict = getDictionary(locale);
  const [items, setItems] = useState<Item[]>(() => [{ ...emptyItem(), brand: initialBrand || "", mpn: initialMpn || "" }]);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [company, setCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [message, setMessage] = useState(initialMessage || "");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<SubmitState>({ status: "idle" });
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);

  const update = (index: number, patch: Partial<Item>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addRow = () => {
    if (items.length >= 20) return;
    setItems((prev) => [...prev, emptyItem()]);
  };

  const removeRow = (index: number) => {
    setItems((prev) => (prev.length === 1 ? [emptyItem()] : prev.filter((_, i) => i !== index)));
  };

  const onFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setFileError(null);
    const next = [...files];
    for (const file of Array.from(incoming)) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setFileError(dict.inquiry.uploadBadType);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        setFileError(dict.inquiry.uploadTooLarge);
        continue;
      }
      if (next.length >= MAX_FILES) {
        setFileError(dict.inquiry.uploadTooMany);
        break;
      }
      next.push(file);
    }
    setFiles(next);
    if (inputRef.current) inputRef.current.value = "";
  };

  const local = validateInquiry(
    {
      items: items.map((item) => ({ ...item, qty: item.qty || undefined })),
      company,
      contactName,
      email,
      phone,
      country,
      message,
      locale,
    },
    { hasAttachment: files.length > 0 }
  );
  const clientErrors: Record<string, string> = { ...local.errors };
  if (!consent) clientErrors.consent = "consent_required";

  const errText = (code?: string) => {
    if (!code) return "";
    const map = dict.inquiry.errors as Record<string, string>;
    return map[code] || map.generic;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (Object.keys(clientErrors).length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    if (STATIC_EXPORT) {
      setState({ status: "error", message: dict.inquiry.staticNotice });
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    setState({ status: "submitting" });

    const payload = {
      items: items
        .filter((item) => item.mpn.trim())
        .map((item) => ({ ...item, qty: item.qty || null })),
      company,
      contactName,
      email,
      phone,
      country,
      message,
      locale,
      consent,
    };

    const body = new FormData();
    body.append("payload", JSON.stringify(payload));
    files.forEach((file) => body.append("files", file, file.name));

    try {
      const res = await fetch("/api/inquiries", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        code?: string;
        duplicate?: boolean;
        errors?: Record<string, string>;
        message?: string;
      };

      if (res.ok && data.ok && data.code) {
        setState({ status: "success", code: data.code, duplicate: data.duplicate });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (res.status === 429) {
        setState({ status: "error", message: dict.inquiry.rateLimited });
        return;
      }
      setState({
        status: "error",
        message: data.message || dict.inquiry.errorBody,
        errors: data.errors,
      });
    } catch {
      setState({ status: "error", message: dict.inquiry.serverError });
    }
  };

  if (state.status === "success") {
    return (
      <div className="panel" style={{ padding: "clamp(26px, 3vw, 44px)" }}>
        <span
          style={{
            display: "inline-flex",
            width: 34,
            height: 34,
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid var(--ink)",
            borderRadius: "50%",
          }}
          aria-hidden="true"
        >
          <Check size={16} strokeWidth={1.8} />
        </span>
        <h2 className="h2 h2--cn" style={{ marginTop: 20, fontSize: "clamp(24px,2.4vw,34px)" }}>
          {dict.inquiry.successTitle}
        </h2>
        <p className="body" style={{ marginTop: 12, maxWidth: "52ch" }}>
          {dict.inquiry.successBody}
        </p>
        <div
          style={{
            marginTop: 24,
            padding: "18px 20px",
            border: "1px solid var(--line-2)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <p className="mono-sm">{dict.inquiry.codeLabel}</p>
            <p className="mono numeric" style={{ fontSize: 20, color: "var(--ink)", marginTop: 6 }}>
              {state.code}
            </p>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => navigator.clipboard?.writeText(state.code)}
          >
            Copy
          </button>
        </div>
        {state.duplicate ? (
          <p className="small" style={{ marginTop: 14 }}>
            {dict.inquiry.duplicateNotice}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3" style={{ marginTop: 26 }}>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setItems([emptyItem()]);
              setFiles([]);
              setMessage("");
              setState({ status: "idle" });
            }}
          >
            {dict.inquiry.newInquiry}
          </button>
          <Link href={`/${locale}`} className="btn btn--ghost">
            {dict.common.backHome}
          </Link>
        </div>
      </div>
    );
  }

  const errors = state.status === "error" && state.errors ? state.errors : {};
  const merged = { ...clientErrors, ...errors };
  const errorCount = touched ? Object.keys(clientErrors).length : 0;

  return (
    <form onSubmit={submit} noValidate>
      {STATIC_EXPORT ? (
        <div
          style={{
            border: "1px solid var(--line-2)",
            background: "rgba(23,25,28,0.03)",
            padding: "14px 16px",
            marginBottom: 24,
          }}
        >
          <p className="mono-sm">{dict.inquiry.staticTitle}</p>
          <p className="small" style={{ marginTop: 8, maxWidth: "62ch" }}>
            {dict.inquiry.staticNotice}
          </p>
        </div>
      ) : null}
      {touched && errorCount > 0 ? (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          style={{
            border: "1px solid #9b3b34",
            background: "rgba(155,59,52,0.04)",
            padding: "14px 16px",
            marginBottom: 24,
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <AlertCircle size={16} strokeWidth={1.6} color="#8c322c" aria-hidden="true" />
          <div>
            <p style={{ fontSize: 13, color: "#8c322c", fontWeight: 500 }}>
              {dict.inquiry.errorTitle}
            </p>
            <ul style={{ marginTop: 6 }}>
              {Object.entries(clientErrors).map(([key, code]) => (
                <li key={key} className="small" style={{ color: "#8c322c" }}>
                  · {errText(code)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="grid12" style={{ alignItems: "start" }}>
        <div className="g-7">
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <p className="mono-sm">{dict.inquiry.itemsTitle}</p>
            <span className="mono" style={{ fontSize: 10.5 }}>
              {items.length} / 20
            </span>
          </div>
          <p className="hint" style={{ marginTop: 6 }}>
            {dict.inquiry.itemsHint}
          </p>

          <div style={{ marginTop: 16 }}>
            {items.map((item, index) => (
              <fieldset
                key={index}
                style={{
                  border: 0,
                  borderTop: index === 0 ? "1px solid var(--line-2)" : 0,
                  borderBottom: "1px solid var(--line)",
                  padding: "16px 0",
                  margin: 0,
                }}
                aria-label={dict.inquiry.itemLabel.replace("{index}", String(index + 1))}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr) minmax(0,0.7fr) auto",
                    gap: 12,
                    alignItems: "end",
                  }}
                  className="item-row"
                >
                  <div className="field">
                    <label className="label" htmlFor={`mpn-${index}`}>
                      {dict.inquiry.mpn}
                      {index === 0 ? <span className="req">*</span> : null}
                    </label>
                    <input
                      id={`mpn-${index}`}
                      className="input"
                      value={item.mpn}
                      onChange={(e) => update(index, { mpn: e.target.value })}
                      placeholder={dict.inquiry.mpnPlaceholder}
                      autoComplete="off"
                      spellCheck={false}
                      aria-invalid={touched && merged[`items.${index}.qty`] ? true : undefined}
                    />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor={`brand-${index}`}>
                      {dict.inquiry.brand}
                    </label>
                    <input
                      id={`brand-${index}`}
                      className="input"
                      value={item.brand}
                      onChange={(e) => update(index, { brand: e.target.value })}
                      placeholder={dict.inquiry.brandPlaceholder}
                      autoComplete="off"
                    />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor={`qty-${index}`}>
                      {dict.inquiry.qty}
                    </label>
                    <input
                      id={`qty-${index}`}
                      className="input"
                      inputMode="numeric"
                      value={item.qty}
                      onChange={(e) => update(index, { qty: e.target.value.replace(/[^\d]/g, "") })}
                      placeholder={dict.inquiry.qtyPlaceholder}
                      aria-invalid={touched && merged[`items.${index}.qty`] ? true : undefined}
                      aria-describedby={merged[`items.${index}.qty`] ? `qty-err-${index}` : undefined}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    style={{ width: 38, padding: 0 }}
                    onClick={() => removeRow(index)}
                    aria-label={dict.inquiry.removeItem}
                  >
                    <X size={14} strokeWidth={1.6} />
                  </button>
                </div>
                <div style={{ marginTop: 10 }}>
                  <input
                    className="input"
                    style={{ minHeight: 38, padding: "8px 12px", fontSize: 13 }}
                    value={item.note}
                    onChange={(e) => update(index, { note: e.target.value })}
                    placeholder={dict.inquiry.itemNotePlaceholder}
                    aria-label={dict.inquiry.itemNote}
                  />
                </div>
                {touched && merged[`items.${index}.qty`] ? (
                  <p className="field-error" id={`qty-err-${index}`} style={{ marginTop: 8 }}>
                    {errText(merged[`items.${index}.qty`])}
                  </p>
                ) : null}
              </fieldset>
            ))}
          </div>

          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={addRow}
            disabled={items.length >= 20}
            style={{ marginTop: 14 }}
          >
            <Plus size={14} strokeWidth={1.6} aria-hidden="true" />
            {dict.inquiry.addItem}
          </button>

          {touched && merged.items ? (
            <p className="field-error" style={{ marginTop: 10 }}>
              {errText(merged.items)}
            </p>
          ) : null}

          <div id="bom-upload" style={{ marginTop: 34, scrollMarginTop: 100 }}>
            <p className="mono-sm">{dict.inquiry.uploadTitle}</p>
            <div
              style={{
                marginTop: 12,
                border: "1px dashed var(--line-2)",
                padding: "22px",
                textAlign: "center",
                background: "#fff",
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onFiles(e.dataTransfer.files);
              }}
            >
              <input
                ref={inputRef}
                id="attachments"
                type="file"
                multiple
                accept=".pdf,.csv,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.webp"
                onChange={(e) => onFiles(e.target.files)}
                style={{ display: "none" }}
              />
              <label htmlFor="attachments" className="btn btn--ghost btn--sm">
                <Paperclip size={14} strokeWidth={1.6} aria-hidden="true" />
                {dict.inquiry.uploadButton}
              </label>
              <p className="hint" style={{ marginTop: 10 }}>
                {dict.inquiry.uploadDrop}
              </p>
              <p className="hint" style={{ marginTop: 4, maxWidth: "52ch", marginInline: "auto" }}>
                {dict.inquiry.uploadHint}
              </p>
            </div>

            {files.length > 0 ? (
              <ul style={{ marginTop: 12, borderTop: "1px solid var(--line)" }}>
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom: "1px solid var(--line)",
                      alignItems: "center",
                    }}
                  >
                    <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-2)" }}>
                      {file.name}
                    </span>
                    <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <span className="mono" style={{ fontSize: 10.5 }}>
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        style={{ width: 30, height: 30, padding: 0 }}
                        onClick={() => setFiles(files.filter((_, i) => i !== index))}
                        aria-label={`${dict.inquiry.uploadRemove} ${file.name}`}
                      >
                        <X size={13} strokeWidth={1.6} />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {fileError ? (
              <p className="field-error" style={{ marginTop: 10 }}>
                {fileError}
              </p>
            ) : null}
          </div>
        </div>

        <div className="g-start-9" style={{ position: "sticky", top: 92 }}>
          <p className="mono-sm">{dict.inquiry.contactTitle}</p>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="field">
              <label className="label" htmlFor="company">
                {dict.inquiry.company}
              </label>
              <input
                id="company"
                className="input"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder={dict.inquiry.companyPlaceholder}
                autoComplete="organization"
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="contactName">
                {dict.inquiry.contactName}
              </label>
              <input
                id="contactName"
                className="input"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder={dict.inquiry.contactNamePlaceholder}
                autoComplete="name"
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="email">
                {dict.common.email}
                <span className="req">*</span>
              </label>
              <input
                id="email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={dict.inquiry.emailPlaceholder}
                autoComplete="email"
                aria-invalid={touched && (clientErrors.email || clientErrors.contact) ? true : undefined}
                aria-describedby={
                  touched && (clientErrors.email || clientErrors.contact) ? "email-err" : undefined
                }
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="phone">
                {dict.inquiry.phone}
              </label>
              <input
                id="phone"
                className="input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={dict.inquiry.phonePlaceholder}
                autoComplete="tel"
                aria-invalid={touched && (clientErrors.phone || clientErrors.contact) ? true : undefined}
                aria-describedby={
                  touched && (clientErrors.phone || clientErrors.contact) ? "email-err" : undefined
                }
              />
            </div>
            {touched && (clientErrors.email || clientErrors.phone || clientErrors.contact) ? (
              <p className="field-error" id="email-err">
                {errText(clientErrors.email || clientErrors.phone || clientErrors.contact)}
              </p>
            ) : null}
            <div className="field">
              <label className="label" htmlFor="country">
                {dict.inquiry.country}
              </label>
              <input
                id="country"
                className="input"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder={dict.inquiry.countryPlaceholder}
                autoComplete="country-name"
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="message">
                {dict.inquiry.message}
              </label>
              <textarea
                id="message"
                className="textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={dict.inquiry.messagePlaceholder}
                maxLength={4000}
              />
            </div>
          </div>

          <label
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              marginTop: 18,
              fontSize: 12.5,
              lineHeight: 1.55,
              color: "var(--ink-2)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={{ marginTop: 3, accentColor: "#17191C" }}
            />
            <span>
              {dict.inquiry.consent}{" "}
              <Link href={`/${locale}/privacy`} style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
                {dict.footer.privacy}
              </Link>
            </span>
          </label>
          {touched && !consent ? <p className="field-error">{errText("consent_required")}</p> : null}

          <button
            type="submit"
            className="btn btn--primary"
            style={{ width: "100%", marginTop: 22, justifyContent: "space-between" }}
            disabled={state.status === "submitting"}
          >
            {state.status === "submitting" ? dict.inquiry.submitting : dict.inquiry.submit}
            <span className="btn__arrow" aria-hidden="true">
              {state.status === "submitting" ? "…" : "→"}
            </span>
          </button>

          {state.status === "error" ? (
            <div role="alert" style={{ marginTop: 14 }}>
              <p className="field-error">{state.message}</p>
              {state.errors ? (
                <p className="hint" style={{ marginTop: 6 }}>
                  {dict.inquiry.savedLocally}
                </p>
              ) : null}
            </div>
          ) : null}

          <p className="hint" style={{ marginTop: 14 }}>
            {dict.inquiry.uploadHint}
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .item-row { grid-template-columns: 1fr 1fr !important; }
          .item-row > .field:first-child { grid-column: 1 / -1; }
        }
      `}</style>
    </form>
  );
}
