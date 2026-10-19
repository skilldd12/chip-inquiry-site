import { localizedField, type Faq } from "@/lib/site";
import type { Locale } from "@/lib/i18n";

export function FaqList({
  faqs,
  locale,
  startIndex = 1,
}: {
  faqs: Faq[];
  locale: Locale;
  startIndex?: number;
}) {
  return (
    <div>
      {faqs.map((faq, index) => {
        const question = localizedField(faq as unknown as Record<string, unknown>, "question", locale);
        const answer = localizedField(faq as unknown as Record<string, unknown>, "answer", locale);
        return (
          <details className="faq-item" key={faq.id} name="faq">
            <summary>
              <span style={{ display: "flex", gap: 18, alignItems: "baseline" }}>
                <span className="mono" style={{ flex: "none" }}>
                  {String(index + startIndex).padStart(2, "0")}
                </span>
                <span>{question}</span>
              </span>
              <span className="faq-item__icon" aria-hidden="true" />
            </summary>
            <div className="faq-item__body">{answer}</div>
          </details>
        );
      })}
    </div>
  );
}
