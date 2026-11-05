/**
 * Public support and contact details for the Mera Coach app.
 * Edit values here. Site URL and social IDs stay in `appConfig.ts`.
 */

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Public contact inbox (matches web Contact page). */
export const SUPPORT_EMAIL = 'info@mera-coach.com';

/** WhatsApp wa.me digits (country code + number, no +). */
export const CONTACT_WHATSAPP = digitsOnly('917017730688');

export const CONTACT_WHATSAPP_DISPLAY = '+91 70177 30688';

export function contactWhatsAppUrl(): string {
  return `https://wa.me/${CONTACT_WHATSAPP}`;
}
