/** Public app copy — used by mobile profile and API responses. */
export const DEFAULT_APP_INFO = {
  name: 'Localite',
  tagline: 'Your neighbourhood shops, delivered.',
  about:
    'Localite helps you order from trusted local shops — sweets, groceries, flowers, nursery plants, and more. '
    + 'Browse stores near you, place orders by text, photo, or catalog, and track delivery from shop to your door.',
  contactPhone: '+91 98765 43210',
  contactEmail: 'hello@localite.in',
  downloadLink: 'https://localite.app',
};

export function isValidReferralEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export function normalizeReferralPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits.length >= 10 ? digits.slice(-10) : '';
}

export function isValidReferralPhone(value) {
  return normalizeReferralPhone(value).length === 10;
}
