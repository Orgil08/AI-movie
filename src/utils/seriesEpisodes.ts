export interface EpisodeItem {
  id: string;
  seriesId: string;
  episodeNumber: number;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  videoUrl: string;
  duration: string;
  isPublished: boolean;
  isFree: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EpisodeRange {
  index: number;
  start: number;
  end: number;
  labelMn: string;
  labelEn: string;
  shortLabel: string;
  hasLockedEpisodes: boolean;
}

/**
 * Automatically calculates the starting episode number for paid episodes.
 * Formula: paidStartingEpisode = freeEpisodes + 1
 */
export function calculatePaidStartingEpisode(freeEpisodes: number, totalEpisodes: number): number {
  const safeFree = Math.max(0, Math.floor(Number(freeEpisodes) || 0));
  const safeTotal = Math.max(1, Math.floor(Number(totalEpisodes) || 1));
  if (safeFree >= safeTotal) {
    return safeTotal + 1;
  }
  return safeFree + 1;
}

/**
 * Dynamically generates episode range tabs (e.g. 1-30, 31-50) based on the actual total episode count.
 */
export function buildEpisodeRanges(
  totalEpisodes: number,
  freeEpisodes = 0,
  chunkSize = 30
): EpisodeRange[] {
  const safeTotal = Math.max(0, Math.floor(Number(totalEpisodes) || 0));
  const safeChunk = Math.max(1, Math.floor(Number(chunkSize) || 30));
  if (safeTotal === 0) return [];

  const ranges: EpisodeRange[] = [];
  let index = 0;
  for (let start = 1; start <= safeTotal; start += safeChunk) {
    const end = Math.min(safeTotal, start + safeChunk - 1);
    const hasLockedEpisodes = end > freeEpisodes;
    ranges.push({
      index,
      start,
      end,
      labelMn: `${start}–${end}-р анги`,
      labelEn: `Ep ${start}–${end}`,
      shortLabel: `${start}–${end}`,
      hasLockedEpisodes
    });
    index++;
  }
  return ranges;
}

/**
 * Generates or expands episode records up to totalEpisodes without overwriting existing episode URLs or metadata.
 */
export function mergeGeneratedEpisodes(params: {
  seriesId: string;
  existingEpisodes: EpisodeItem[];
  totalEpisodes: number;
  freeEpisodes: number;
  defaultThumbnailUrl?: string;
  defaultVideoUrl?: string;
  defaultDuration?: string;
}): EpisodeItem[] {
  const {
    seriesId,
    existingEpisodes,
    totalEpisodes,
    freeEpisodes,
    defaultThumbnailUrl = '',
    defaultVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    defaultDuration = '2 мин'
  } = params;

  const safeTotal = Math.max(1, Math.min(500, Math.floor(Number(totalEpisodes) || 1)));
  const safeFree = Math.max(0, Math.floor(Number(freeEpisodes) || 0));

  const byNumber = new Map<number, EpisodeItem>();
  for (const ep of existingEpisodes || []) {
    const num = Math.floor(Number(ep.episodeNumber));
    if (num >= 1 && !byNumber.has(num)) {
      byNumber.set(num, {
        ...ep,
        seriesId,
        episodeNumber: num,
        isFree: num <= safeFree
      });
    }
  }

  const merged: EpisodeItem[] = [];
  for (let num = 1; num <= safeTotal; num++) {
    const existing = byNumber.get(num);
    if (existing) {
      // Preserve existing videoUrl, title, description, thumbnailUrl, duration
      merged.push({
        ...existing,
        isFree: num <= safeFree
      });
    } else {
      merged.push({
        id: `${seriesId}-ep-${num}`,
        seriesId,
        episodeNumber: num,
        title: `${num}-р анги`,
        description: '',
        thumbnailUrl: defaultThumbnailUrl,
        videoUrl: defaultVideoUrl,
        duration: defaultDuration,
        isPublished: true,
        isFree: num <= safeFree
      });
    }
  }

  // Also preserve any existing episodes beyond safeTotal if they already had custom data
  for (const [num, ep] of byNumber.entries()) {
    if (num > safeTotal) {
      merged.push({
        ...ep,
        isFree: num <= safeFree
      });
    }
  }

  return merged.sort((a, b) => a.episodeNumber - b.episodeNumber);
}

export interface EpisodeValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a list of episodes for duplicate numbers, missing/invalid video URLs, and invalid episode counts.
 */
export function validateEpisodesPayload(episodes: Partial<EpisodeItem>[]): EpisodeValidationResult {
  if (!Array.isArray(episodes) || episodes.length === 0) {
    return { valid: false, error: 'Хамгийн багадаа 1 анги оруулна уу.' };
  }

  if (episodes.length > 500) {
    return { valid: false, error: 'Нийт ангийн тоо 500-аас хэтрэхгүй байх ёстой.' };
  }

  const seenNumbers = new Set<number>();

  for (const ep of episodes) {
    const num = Number(ep.episodeNumber);
    if (!Number.isInteger(num) || num < 1) {
      return {
        valid: false,
        error: `Ангийн дугаар буруу байна (${ep.episodeNumber}). 1-ээс эхэлсэн бүхэл тоо байх ёстой.`
      };
    }

    if (seenNumbers.has(num)) {
      return {
        valid: false,
        error: `${num}-р ангийн дугаар давхардсан байна.`
      };
    }
    seenNumbers.add(num);

    const videoUrl = (ep.videoUrl || '').trim();
    if (!videoUrl) {
      return {
        valid: false,
        error: `${num}-р ангийн видео холбоос (MP4 / R2 URL) хоосон байна.`
      };
    }

    const isValidUrlOrKey =
      videoUrl.startsWith('http://') ||
      videoUrl.startsWith('https://') ||
      videoUrl.startsWith('/') ||
      videoUrl.startsWith('r2://');
    if (!isValidUrlOrKey) {
      return {
        valid: false,
        error: `${num}-р ангийн видео холбоос буруу форматтай байна ("https://..." эсвэл R2 зам оруулна уу).`
      };
    }
  }

  return { valid: true };
}

/**
 * Determines whether a user is allowed to stream a specific episode.
 */
export function canAccessEpisode(params: {
  episodeNumber: number;
  freeEpisodes: number;
  episodeIsFree?: boolean;
  hasActiveVip?: boolean;
  vipEnabled?: boolean;
  hasActiveSeriesPurchase?: boolean;
  userRole?: string;
}): boolean {
  const {
    episodeNumber,
    freeEpisodes,
    episodeIsFree,
    hasActiveVip = false,
    vipEnabled = true,
    hasActiveSeriesPurchase = false,
    userRole
  } = params;

  if (userRole === 'admin') return true;
  if (episodeIsFree === true || episodeNumber <= freeEpisodes) return true;
  if (hasActiveSeriesPurchase) return true;
  if (vipEnabled && hasActiveVip) return true;

  return false;
}

export type EpisodeAccessStatus = 'free' | 'unlocked' | 'locked';

export interface EpisodeDisplayStatus {
  status: EpisodeAccessStatus;
  isUnlocked: boolean;
  isFree: boolean;
  badgeLabel: string;
  completed: boolean;
}

/**
 * Resolves the display status, unlock state, and localized badge label for an episode in EpisodeGrid.
 */
export function getEpisodeDisplayStatus(params: {
  episodeNumber: number;
  freeEpisodes: number;
  isFree?: boolean;
  unlocked?: boolean;
  isAllEpisodesUnlocked?: boolean;
  completed?: boolean;
  locale?: 'mn' | 'en';
}): EpisodeDisplayStatus {
  const {
    episodeNumber,
    freeEpisodes,
    isFree,
    unlocked = false,
    isAllEpisodesUnlocked = false,
    completed = false,
    locale = 'mn'
  } = params;

  const resolvedFree = Boolean(isFree || episodeNumber <= freeEpisodes);
  const resolvedUnlocked = Boolean(resolvedFree || unlocked || isAllEpisodesUnlocked);

  let status: EpisodeAccessStatus = 'locked';
  let badgeLabel = locale === 'en' ? 'Locked' : 'Түгжээтэй';

  if (resolvedFree) {
    status = 'free';
    badgeLabel = locale === 'en' ? 'Free' : 'Үнэгүй';
  } else if (resolvedUnlocked) {
    status = 'unlocked';
    badgeLabel = locale === 'en' ? 'Unlocked' : 'Нээлттэй';
  }

  return {
    status,
    isUnlocked: resolvedUnlocked,
    isFree: resolvedFree,
    badgeLabel,
    completed: Boolean(completed)
  };
}

