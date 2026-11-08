export type Locale = 'mn' | 'en';

export const LOCALES: Locale[] = ['mn', 'en'];
export const DEFAULT_LOCALE: Locale = 'mn';

export interface LocaleConfig {
  code: Locale;
  label: string;
  flag: string;
  nativeName: string;
}

export const LOCALE_CONFIGS: Record<Locale, LocaleConfig> = {
  mn: {
    code: 'mn',
    label: 'MN',
    flag: '🇲🇳',
    nativeName: 'Монгол'
  },
  en: {
    code: 'en',
    label: 'EN',
    flag: '🇺🇸',
    nativeName: 'English'
  }
};

/**
 * Format currency in whole MNT integers for Mongolian or English locale.
 * Mongolian: 14,900 ₮ / сар
 * English: MNT 14,900 / month
 */
export function formatCurrency(amount: number, locale: Locale = 'mn', perMonth: boolean = true): string {
  const formatted = new Intl.NumberFormat('en-US').format(amount);
  if (locale === 'mn') {
    return perMonth ? `${formatted} ₮ / сар` : `${formatted} ₮`;
  }
  return perMonth ? `MNT ${formatted} / month` : `MNT ${formatted}`;
}

/**
 * Format date localized for Mongolian and English
 */
export function formatDate(dateInput: Date | string | number | undefined, locale: Locale = 'mn'): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  if (locale === 'mn') {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y} оны ${m} сарын ${d}`;
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}
