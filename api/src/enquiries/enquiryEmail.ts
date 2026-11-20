import type { Product } from "../domain/product.js";
import type { EmailMessage } from "../email/emailSender.js";
import type { Enquiry } from "./enquiry.js";

/**
 * The email the sales team receives for one enquiry. A pure function: no
 * sending, no settings lookup, so the wording and layout can change (or be
 * tested) without touching the enquiry flow or the email provider.
 *
 * It is sent in two forms. Mail programs show the HTML one, with the
 * product's photo; the plain-text one is the fallback. The photo is loaded by
 * the mail program from the product source's own host, so some programs hide
 * it until the reader allows images.
 */
export function buildEnquiryEmail(
  enquiry: Enquiry,
  product: Product,
  settings: {
    salesInbox: string;
    from: string;
    /** Where customers reach the site; makes the "View product" button. */
    webUrl?: string;
  },
): EmailMessage {
  const price = formatPrice(product.price, product.currency);
  const rating = `${product.rating.average.toFixed(1)} out of 5 (${product.rating.count} ratings)`;
  const received = formatReceived(enquiry.createdAt);
  const message = enquiry.message?.trim();
  const productUrl = settings.webUrl
    ? `${settings.webUrl.replace(/\/+$/, "")}/products/${encodeURIComponent(product.id)}`
    : undefined;
  const subject = `New enquiry: ${product.title}`;

  const text = [
    `${enquiry.name} is asking about a product`,
    "",
    `Product:   ${product.title}`,
    `           ${price}, ${product.category.name}, rated ${rating}`,
    `           product id ${product.id}`,
    ...(productUrl ? [`           ${productUrl}`] : []),
    "",
    "Customer message:",
    message || "(none: the customer left the message blank)",
    "",
    `Name:      ${enquiry.name}`,
    `Email:     ${enquiry.email}`,
    ...(enquiry.phone ? [`Phone:     ${enquiry.phone}`] : []),
    "",
    `Reply to this email to answer ${enquiry.name} directly.`,
    "",
    `Received ${received}`,
    `Reference ${enquiry.id}`,
  ].join("\n");

  return {
    to: settings.salesInbox,
    from: settings.from,
    replyTo: enquiry.email,
    subject,
    text,
    html: renderHtml({
      name: enquiry.name,
      email: enquiry.email,
      phone: enquiry.phone,
      message,
      productTitle: product.title,
      price,
      category: product.category.name,
      productId: product.id,
      rating: `★ ${rating}`,
      // Only a web address may become an image source.
      imageUrl: /^https?:\/\//i.test(product.imageUrl) ? product.imageUrl : undefined,
      productUrl,
      replyUrl: `mailto:${encodeURIComponent(enquiry.email)}?subject=${encodeURIComponent(`Re: your enquiry about ${product.title}`)}`,
      received,
      reference: enquiry.id,
    }),
  };
}

/**
 * Everything the customer typed is escaped before it goes into the HTML, so
 * it is shown as the characters they typed and can never become markup.
 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    // A source may send a code Intl does not know; show it as it came.
    return `${amount} ${currency}`;
  }
}

/** UTC, and says so: the sales team may not share the server's time zone. */
function formatReceived(date: Date): string {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date);
  return `${formatted} UTC`;
}

interface HtmlParts {
  name: string;
  email: string;
  phone?: string;
  message?: string;
  productTitle: string;
  price: string;
  category: string;
  productId: string;
  rating: string;
  imageUrl?: string;
  productUrl?: string;
  replyUrl: string;
  received: string;
  reference: string;
}

// Email colours, in one place. Mail programs do not support CSS variables or
// style sheets reliably, so the values are written inline below.
const INK = "#0b0b0c";
const MUTED = "#66666c";
const LINE = "#e6e6e3";
const PANEL = "#f3f3f1";
const STAR = "#9a5800";
const FONT = "'Segoe UI', -apple-system, 'Helvetica Neue', Arial, sans-serif";

/**
 * Tables and inline styles on purpose: that is what mail programs (Outlook
 * above all) render reliably. The photo and details are two inline blocks,
 * so they sit side by side on a wide screen and stack on a phone without
 * needing a media query. No web fonts and no tracking of any kind.
 */
function renderHtml(parts: HtmlParts): string {
  const e = escapeHtml;
  const caps = `font:600 11px ${FONT};letter-spacing:0.12em;text-transform:uppercase;color:${MUTED};`;
  const label = `padding:7px 20px 7px 0;${caps}vertical-align:top;white-space:nowrap;`;
  const value = `padding:5px 0;font:400 15px ${FONT};color:${INK};vertical-align:top;`;

  const row = (name: string, content: string) =>
    `<tr><td style="${label}">${name}</td><td style="${value}">${content}</td></tr>`;

  const button = (href: string, text: string, filled: boolean) =>
    `<a href="${e(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 22px;border:1px solid ${INK};border-radius:4px;background:${filled ? INK : "#ffffff"};color:${filled ? "#ffffff" : INK};font:600 14px ${FONT};text-decoration:none;">${e(text)}</a>`;

  const photo = parts.imageUrl
    ? `<div style="display:inline-block;vertical-align:top;width:100%;max-width:200px;margin:0 24px 16px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:16px;background:#ffffff;border:1px solid ${LINE};border-radius:4px;">
<img src="${e(parts.imageUrl)}" width="166" alt="${e(parts.productTitle)}" style="display:block;width:100%;max-width:166px;height:auto;max-height:200px;object-fit:contain;border:0;">
</td></tr></table>
</div>`
    : "";

  const message = parts.message
    ? e(parts.message).replace(/\r?\n/g, "<br>")
    : `<span style="color:${MUTED};">The customer left the message blank.</span>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>New enquiry</title>
</head>
<body style="margin:0;padding:0;background:${PANEL};">
<div style="display:none;max-height:0;overflow:hidden;">${e(parts.name)} asked about ${e(parts.productTitle)}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PANEL};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid ${LINE};border-radius:4px;">
<tr><td style="padding:14px 28px;background:${INK};border-radius:4px 4px 0 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="font:800 13px ${FONT};letter-spacing:0.14em;text-transform:uppercase;color:#ffffff;">Catalogue</td>
<td align="right" style="font:600 11px ${FONT};letter-spacing:0.12em;text-transform:uppercase;color:#c9c9cc;">New enquiry</td>
</tr></table>
</td></tr>
<tr><td style="padding:28px 28px 4px;">
<h1 style="margin:0;font:700 24px/1.25 ${FONT};letter-spacing:-0.02em;color:${INK};">${e(parts.name)} is asking about a product</h1>
</td></tr>
<tr><td style="padding:20px 28px 8px;font-size:0;">
${photo}<div style="display:inline-block;vertical-align:top;width:100%;max-width:340px;margin:0 0 16px;">
<p style="margin:0 0 6px;${caps}">${e(parts.category)}</p>
<p style="margin:0 0 10px;font:600 18px/1.3 ${FONT};color:${INK};">${e(parts.productTitle)}</p>
<p style="margin:0 0 8px;font:700 26px/1 ${FONT};letter-spacing:-0.02em;color:${INK};">${e(parts.price)}</p>
<p style="margin:0 0 4px;font:400 14px ${FONT};color:${STAR};">${e(parts.rating)}</p>
<p style="margin:0;font:400 13px ${FONT};color:${MUTED};">Product id ${e(parts.productId)}</p>
</div>
</td></tr>
<tr><td style="padding:0 28px 24px;">
<p style="margin:0 0 8px;${caps}">Customer message</p>
<div style="padding:18px 20px;background:${PANEL};border-left:3px solid ${INK};font:400 16px/1.55 ${FONT};color:${INK};">${message}</div>
</td></tr>
<tr><td style="padding:0 28px 16px;">
<p style="margin:0 0 4px;${caps}">Customer details</p>
<table role="presentation" cellpadding="0" cellspacing="0">
${row("Name", e(parts.name))}
${row("Email", e(parts.email))}
${parts.phone ? row("Phone", e(parts.phone)) : ""}
</table>
</td></tr>
<tr><td style="padding:0 28px 20px;">
${button(parts.replyUrl, `Reply to ${parts.name}`, true)}${parts.productUrl ? button(parts.productUrl, "View product", false) : ""}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid ${LINE};font:400 12px/1.6 ${FONT};color:${MUTED};">
Received ${e(parts.received)} &nbsp;·&nbsp; Reference ${e(parts.reference)}<br>
Replying to this email also goes straight to the customer.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
