import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePaidStartingEpisode,
  buildEpisodeRanges,
  mergeGeneratedEpisodes,
  validateEpisodesPayload,
  canAccessEpisode,
  getEpisodeDisplayStatus
} from './seriesEpisodes.js';

describe('seriesEpisodes utilities', () => {
  it('calculates paidStartingEpisode as freeEpisodes + 1', () => {
    assert.equal(calculatePaidStartingEpisode(6, 50), 7);
    assert.equal(calculatePaidStartingEpisode(0, 20), 1);
    assert.equal(calculatePaidStartingEpisode(50, 50), 51);
  });

  it('builds dynamic episode ranges without hardcoding 30 or 50', () => {
    const ranges50 = buildEpisodeRanges(50, 6, 30);
    assert.equal(ranges50.length, 2);
    assert.equal(ranges50[0].labelMn, '1–30-р анги');
    assert.equal(ranges50[0].shortLabel, '1–30');
    assert.equal(ranges50[0].hasLockedEpisodes, true);
    assert.equal(ranges50[1].labelMn, '31–50-р анги');
    assert.equal(ranges50[1].shortLabel, '31–50');

    const ranges12 = buildEpisodeRanges(12, 12, 30);
    assert.equal(ranges12.length, 1);
    assert.equal(ranges12[0].labelMn, '1–12-р анги');
    assert.equal(ranges12[0].hasLockedEpisodes, false);
  });

  it('generates episodes up to totalEpisodes without overwriting existing episode URLs or titles', () => {
    const existing = [
      {
        id: 'pact-ep-1',
        seriesId: 'pact',
        episodeNumber: 1,
        title: 'Custom Ep 1 Title',
        videoUrl: 'https://r2.custom.dev/ep1.mp4',
        duration: '3 мин',
        isPublished: true,
        isFree: true
      }
    ];

    const merged = mergeGeneratedEpisodes({
      seriesId: 'pact',
      existingEpisodes: existing,
      totalEpisodes: 10,
      freeEpisodes: 3,
      defaultVideoUrl: 'https://r2.default.dev/sample.mp4'
    });

    assert.equal(merged.length, 10);
    assert.equal(merged[0].title, 'Custom Ep 1 Title');
    assert.equal(merged[0].videoUrl, 'https://r2.custom.dev/ep1.mp4');
    assert.equal(merged[0].isFree, true);
    assert.equal(merged[2].episodeNumber, 3);
    assert.equal(merged[2].isFree, true);
    assert.equal(merged[3].episodeNumber, 4);
    assert.equal(merged[3].isFree, false);
  });

  it('validates duplicate episode numbers, missing URLs, and invalid URLs', () => {
    const dupResult = validateEpisodesPayload([
      { episodeNumber: 1, videoUrl: 'https://example.com/1.mp4' },
      { episodeNumber: 1, videoUrl: 'https://example.com/2.mp4' }
    ]);
    assert.equal(dupResult.valid, false);

    const missingUrl = validateEpisodesPayload([
      { episodeNumber: 1, videoUrl: '   ' }
    ]);
    assert.equal(missingUrl.valid, false);

    const invalidUrl = validateEpisodesPayload([
      { episodeNumber: 1, videoUrl: 'ftp://bad-url' }
    ]);
    assert.equal(invalidUrl.valid, false);

    const validResult = validateEpisodesPayload([
      { episodeNumber: 1, videoUrl: 'https://pub-r2.cloudflare.com/ep1.mp4' },
      { episodeNumber: 2, videoUrl: 'https://pub-r2.cloudflare.com/ep2.mp4' }
    ]);
    assert.equal(validResult.valid, true);
  });

  it('enforces free vs paid episode access rules accurately', () => {
    assert.equal(
      canAccessEpisode({ episodeNumber: 3, freeEpisodes: 6 }),
      true
    );
    assert.equal(
      canAccessEpisode({ episodeNumber: 7, freeEpisodes: 6 }),
      false
    );
    assert.equal(
      canAccessEpisode({ episodeNumber: 7, freeEpisodes: 6, hasActiveSeriesPurchase: true }),
      true
    );
    assert.equal(
      canAccessEpisode({ episodeNumber: 7, freeEpisodes: 6, hasActiveVip: true, vipEnabled: true }),
      true
    );
    assert.equal(
      canAccessEpisode({ episodeNumber: 7, freeEpisodes: 6, hasActiveVip: true, vipEnabled: false }),
      false
    );
    assert.equal(
      canAccessEpisode({ episodeNumber: 7, freeEpisodes: 6, userRole: 'admin' }),
      true
    );
  });

  it('resolves episode display status for free, locked, and unlocked paid episodes', () => {
    const freeEp = getEpisodeDisplayStatus({
      episodeNumber: 2,
      freeEpisodes: 6,
      locale: 'mn'
    });
    assert.equal(freeEp.status, 'free');
    assert.equal(freeEp.isFree, true);
    assert.equal(freeEp.isUnlocked, true);
    assert.equal(freeEp.badgeLabel, 'Үнэгүй');

    const lockedPaidEp = getEpisodeDisplayStatus({
      episodeNumber: 7,
      freeEpisodes: 6,
      locale: 'mn'
    });
    assert.equal(lockedPaidEp.status, 'locked');
    assert.equal(lockedPaidEp.isFree, false);
    assert.equal(lockedPaidEp.isUnlocked, false);
    assert.equal(lockedPaidEp.badgeLabel, 'Түгжээтэй');

    const unlockedPaidEp = getEpisodeDisplayStatus({
      episodeNumber: 7,
      freeEpisodes: 6,
      isAllEpisodesUnlocked: true,
      completed: true,
      locale: 'en'
    });
    assert.equal(unlockedPaidEp.status, 'unlocked');
    assert.equal(unlockedPaidEp.isFree, false);
    assert.equal(unlockedPaidEp.isUnlocked, true);
    assert.equal(unlockedPaidEp.badgeLabel, 'Unlocked');
    assert.equal(unlockedPaidEp.completed, true);
  });
});

