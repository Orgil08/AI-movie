import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMetadataPath, applyHeadMetadata } from './useLocalizedMetadata.js';
import { getPageMetadata } from './seo.js';
import { MOVIES } from '../data/movies.js';

test('useLocalizedMetadata - resolveMetadataPath maps tabs and state to URL paths', () => {
  assert.equal(resolveMetadataPath('home'), '/');
  assert.equal(resolveMetadataPath('movies'), '/movies');
  assert.equal(resolveMetadataPath('pricing'), '/pricing');
  assert.equal(resolveMetadataPath('checkout'), '/checkout');
  assert.equal(resolveMetadataPath('checkout', null, 'AIMOV-8888'), '/checkout/AIMOV-8888');
  assert.equal(resolveMetadataPath('subscription'), '/account/subscription');
  assert.equal(resolveMetadataPath('payments'), '/account/payments');
  assert.equal(resolveMetadataPath('payment-success'), '/payment/success');
  assert.equal(resolveMetadataPath('payment-cancel'), '/payment/cancel');

  const movie = MOVIES[0];
  assert.equal(resolveMetadataPath('home', movie), `/movie/${movie.id}`);

  // Explicit pathname overrides tab
  assert.equal(resolveMetadataPath('home', null, undefined, '/custom/path'), '/custom/path');
});

test('useLocalizedMetadata - resolves localized metadata with overrides and locale support', () => {
  const mnMeta = getPageMetadata('mn', resolveMetadataPath('pricing'));
  assert.match(mnMeta.title, /Үнийн Багц/);
  assert.match(mnMeta.description, /14,900₮/);

  const enMeta = getPageMetadata('en', resolveMetadataPath('pricing'));
  assert.match(enMeta.title, /Pricing & Plans/);
  assert.match(enMeta.description, /MNT 14,900/);

  // Movie detail interpolation
  const movie = MOVIES.find((m) => m.id === 'quantum-shaman')!;
  assert.ok(movie);

  const movieMn = getPageMetadata('mn', resolveMetadataPath('home', movie), { movie });
  assert.match(movieMn.title, /Квант Бөө/);
  assert.equal(movieMn.ogType, 'video.movie');

  const movieEn = getPageMetadata('en', resolveMetadataPath('home', movie), { movie });
  assert.match(movieEn.title, /Quantum Shaman/);
});

test('useLocalizedMetadata - applyHeadMetadata updates DOM mock elements without error', () => {
  // Simple DOM mock to verify applyHeadMetadata runs smoothly in Node test environments
  const tags: Record<string, any> = {};
  const mockDocument: any = {
    title: '',
    head: {
      appendChild: (el: any) => {
        const id = el.id || el.getAttribute?.('name') || el.getAttribute?.('property') || el.rel;
        tags[id] = el;
      }
    },
    querySelector: (selector: string) => {
      if (selector === 'meta[name="description"]') return tags['description'] || null;
      if (selector === 'meta[name="keywords"]') return tags['keywords'] || null;
      if (selector === 'meta[property="og:title"]') return tags['og:title'] || null;
      if (selector === 'meta[property="og:description"]') return tags['og:description'] || null;
      return null;
    },
    getElementById: (id: string) => tags[id] || null,
    createElement: (tag: string) => {
      const attrs: Record<string, string> = {};
      return {
        tagName: tag.toUpperCase(),
        setAttribute: (k: string, v: string) => {
          attrs[k] = v;
        },
        getAttribute: (k: string) => attrs[k],
        textContent: '',
        rel: '',
        href: ''
      };
    }
  };

  (globalThis as any).document = mockDocument;

  const metadata = getPageMetadata('mn', '/movies');
  assert.doesNotThrow(() => {
    applyHeadMetadata(metadata);
  });

  assert.equal(mockDocument.title, metadata.title);
  assert.equal(tags['description']?.getAttribute('content'), metadata.description);
  assert.equal(tags['og:title']?.getAttribute('content'), metadata.ogTitle);
  assert.equal(tags['seo-json-ld']?.textContent, JSON.stringify(metadata.jsonLd));

  delete (globalThis as any).document;
});
