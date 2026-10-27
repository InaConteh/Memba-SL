/** Click-to-chat link: the owner's own WhatsApp opens with the text filled in. */
export function whatsappLink(e164Phone: string, message: string): string {
  if (!/^\+232\d{8}$/.test(e164Phone)) throw new Error('Phone must be +232XXXXXXXX');
  return `https://wa.me/${e164Phone.slice(1)}?text=${encodeURIComponent(message)}`;
}
