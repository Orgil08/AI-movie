import React from 'react';
import { useLocalizedMetadata, UseLocalizedMetadataOptions } from '../i18n/useLocalizedMetadata.js';

export interface SEOHeadProps extends UseLocalizedMetadataOptions {}

/**
 * Client-side SEO coordinator component.
 * Automatically delegates to the useLocalizedMetadata custom hook to update document.title,
 * meta description, OpenGraph cards, canonical links, and Schema.org JSON-LD structured data.
 */
export function SEOHead(props: SEOHeadProps) {
  useLocalizedMetadata(props);
  return null;
}

export default SEOHead;
