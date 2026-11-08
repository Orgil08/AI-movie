import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing.js';
import mnMessages from '../../messages/mn.json';
import enMessages from '../../messages/en.json';

const dictionaries: Record<string, any> = {
  mn: mnMessages,
  en: enMessages
};

/**
 * next-intl request-time configuration
 * Configures next-intl request-time locale loading.
 * Validates requested locale against supported locales ('mn', 'en'),
 * ensuring language preference persistence and correct dictionary loading.
 * Default locale: 'mn'.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  // Read and validate the requestLocale segment
  let locale = await requestLocale;

  // Ensure that a supported locale is used, fallback to default 'mn'
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  const messages = dictionaries[locale] || dictionaries[routing.defaultLocale];

  return {
    locale,
    messages
  };
});
