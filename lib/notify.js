/**
 * Sales notification. Only reports "sent" when an HTTP endpoint accepted the
 * payload. Without configuration the record stays "not_configured" — the saved
 * inquiry is never presented as a delivered email.
 */
export async function notifySales(inquiry, config) {
  const webhook = config?.notification?.webhook_url || process.env.NOTIFY_WEBHOOK_URL || "";
  const enabled = config?.notification?.enabled !== false;

  if (!enabled || !webhook) {
    return {
      status: "not_configured",
      detail: "No notification endpoint configured; inquiry is stored in the admin console only.",
    };
  }

  const payload = {
    type: "inquiry.created",
    code: inquiry.code,
    createdAt: inquiry.createdAt,
    company: inquiry.company,
    contact: { name: inquiry.contactName, email: inquiry.email, phone: inquiry.phone },
    country: inquiry.country,
    locale: inquiry.locale,
    items: inquiry.items,
    attachments: inquiry.attachments?.map((a) => a.originalName) || [],
    message: inquiry.message,
    adminUrl: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/admin/inquiries/${inquiry.id}`,
  };

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.NOTIFY_WEBHOOK_TOKEN
          ? { authorization: `Bearer ${process.env.NOTIFY_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return { status: "failed", detail: `Endpoint responded ${res.status}` };
    }
    return { status: "sent", detail: "Notification accepted by endpoint." };
  } catch (error) {
    return { status: "failed", detail: String(error?.message || error).slice(0, 300) };
  }
}
