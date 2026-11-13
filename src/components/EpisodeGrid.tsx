import React from 'react';
import { Play, Lock, Unlock, CheckCircle2, Clock } from 'lucide-react';
import { getEpisodeDisplayStatus } from '../utils/seriesEpisodes.js';

export interface PublicEpisodeItem {
  id?: string;
  seriesId: string;
  episodeNumber: number;
  title: string;
  titleEn?: string;
  duration: string;
  thumbnailUrl?: string;
  subtitleUrlMn?: string;
  isFree: boolean;
  unlocked: boolean;
  unlockReason?: string;
}

export interface EpisodeGridProps {
  episodes: PublicEpisodeItem[];
  fallbackThumbnailUrl: string;
  freeEpisodes: number;
  isAllEpisodesUnlocked: boolean;
  episodeProgressMap?: Record<number, { completed: boolean; currentTime: number }>;
  locale?: 'mn' | 'en';
  viewMode?: 'grid' | 'numbered';
  onSelectEpisode: (episode: PublicEpisodeItem) => void;
}

const FALLBACK_POSTER_URL =
  'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=600';

export const EpisodeGrid: React.FC<EpisodeGridProps> = ({
  episodes,
  fallbackThumbnailUrl,
  freeEpisodes,
  isAllEpisodesUnlocked,
  episodeProgressMap = {},
  locale = 'mn',
  viewMode = 'grid',
  onSelectEpisode
}) => {
  if (!episodes || episodes.length === 0) {
    return (
      <div
        data-testid="episode-grid-empty"
        className="py-12 rounded-2xl bg-[#10131D] border border-[#252A36] text-center text-sm text-[#9CA3AF]"
      >
        {locale === 'en' ? 'No episodes available in this range.' : 'Энэ мужид анги олдсонгүй.'}
      </div>
    );
  }

  if (viewMode === 'numbered') {
    return (
      <div
        data-testid="episode-grid-numbered"
        className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2.5"
      >
        {episodes.map((ep) => {
          const prog = episodeProgressMap[ep.episodeNumber];
          const displayStatus = getEpisodeDisplayStatus({
            episodeNumber: ep.episodeNumber,
            freeEpisodes,
            isFree: ep.isFree,
            unlocked: ep.unlocked,
            isAllEpisodesUnlocked,
            completed: prog?.completed,
            locale
          });

          const epTitle =
            locale === 'en' ? ep.titleEn || `Episode ${ep.episodeNumber}` : ep.title || `${ep.episodeNumber}-р анги`;

          return (
            <button
              key={ep.episodeNumber}
              type="button"
              onClick={() => onSelectEpisode(ep)}
              data-testid={`episode-numbered-item-${ep.episodeNumber}`}
              aria-label={`${epTitle} (${ep.duration || '2 мин'}) - ${displayStatus.badgeLabel}`}
              className={`relative h-12 rounded-xl border font-bold text-sm tabular-nums flex items-center justify-center transition cursor-pointer ${
                displayStatus.isUnlocked
                  ? 'bg-[#11141D] hover:bg-[#1764F5]/20 border-[#252A36] hover:border-[#1764F5] text-white'
                  : 'bg-[#0C0F17] border-[#252A36]/60 text-[#9CA3AF] hover:border-[#1764F5]/50'
              }`}
            >
              <span>{ep.episodeNumber}</span>
              {displayStatus.status === 'free' && (
                <span className="absolute top-1 right-1.5 text-[8px] font-extrabold text-[#347DFF]">
                  FREE
                </span>
              )}
              {displayStatus.status === 'locked' && (
                <Lock className="w-3 h-3 text-[#9CA3AF]/70 absolute top-1.5 right-1.5" />
              )}
              {displayStatus.completed && (
                <span className="w-2 h-2 rounded-full bg-[#1764F5] absolute bottom-1.5 right-1.5" />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      data-testid="episode-grid"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {episodes.map((ep) => {
        const prog = episodeProgressMap[ep.episodeNumber];
        const displayStatus = getEpisodeDisplayStatus({
          episodeNumber: ep.episodeNumber,
          freeEpisodes,
          isFree: ep.isFree,
          unlocked: ep.unlocked,
          isAllEpisodesUnlocked,
          completed: prog?.completed,
          locale
        });

        const epTitle =
          locale === 'en'
            ? ep.titleEn || `Episode ${ep.episodeNumber}`
            : ep.title || `${ep.episodeNumber}-р анги`;
        const epDuration = ep.duration || (locale === 'en' ? '2 min' : '2 мин');
        const thumbSrc = ep.thumbnailUrl || fallbackThumbnailUrl || FALLBACK_POSTER_URL;

        return (
          <button
            key={ep.episodeNumber}
            type="button"
            onClick={() => onSelectEpisode(ep)}
            data-testid={`episode-grid-item-${ep.episodeNumber}`}
            aria-label={`${epTitle} (${epDuration}) - ${displayStatus.badgeLabel}`}
            className="group w-full text-left rounded-2xl bg-[#11141D] hover:bg-[#151926] border border-[#252A36] hover:border-[#1764F5] p-3 flex items-center justify-between gap-3.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1764F5]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Episode Thumbnail with Play / Lock Overlay */}
              <div className="relative w-14 h-20 rounded-xl overflow-hidden bg-[#080A10] border border-[#252A36] shrink-0">
                <img
                  src={thumbSrc}
                  alt={epTitle}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== FALLBACK_POSTER_URL) {
                      target.src = FALLBACK_POSTER_URL;
                    }
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/20 flex items-center justify-center">
                  <div
                    className={`w-7 h-7 rounded-full border flex items-center justify-center transition ${
                      displayStatus.isUnlocked
                        ? 'bg-black/70 border-white/25 text-white group-hover:bg-[#1764F5] group-hover:border-[#1764F5]'
                        : 'bg-black/80 border-white/15 text-slate-300 group-hover:border-[#1764F5]/60'
                    }`}
                  >
                    {displayStatus.isUnlocked ? (
                      <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-300" />
                    )}
                  </div>
                </div>
              </div>

              {/* Episode Title & Duration */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white group-hover:text-[#347DFF] transition truncate">
                    {epTitle}
                  </h4>
                  {displayStatus.completed && (
                    <CheckCircle2
                      className="w-3.5 h-3.5 text-[#1764F5] shrink-0"
                      aria-label={locale === 'en' ? 'Watched' : 'Үзсэн'}
                    />
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF] mt-1 tabular-nums">
                  <Clock className="w-3 h-3 text-[#9CA3AF]/80 shrink-0" />
                  <span>{epDuration}</span>
                </div>
              </div>
            </div>

            {/* Free vs Paid Status Indicator Badge */}
            <div className="shrink-0">
              {displayStatus.status === 'free' ? (
                <span
                  data-testid={`episode-status-${ep.episodeNumber}`}
                  data-status="free"
                  className="px-2.5 py-1 rounded-lg bg-[#1764F5]/15 border border-[#1764F5]/40 text-xs font-bold text-[#347DFF] whitespace-nowrap"
                >
                  {displayStatus.badgeLabel}
                </span>
              ) : displayStatus.status === 'unlocked' ? (
                <span
                  data-testid={`episode-status-${ep.episodeNumber}`}
                  data-status="unlocked"
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-xs font-bold text-emerald-400 flex items-center gap-1 whitespace-nowrap"
                >
                  <Unlock className="w-3 h-3" />
                  <span>{displayStatus.badgeLabel}</span>
                </span>
              ) : (
                <span
                  data-testid={`episode-status-${ep.episodeNumber}`}
                  data-status="locked"
                  className="px-2.5 py-1 rounded-lg bg-[#080A10] border border-[#252A36] text-xs font-semibold text-[#9CA3AF] flex items-center gap-1 whitespace-nowrap"
                >
                  <Lock className="w-3 h-3" />
                  <span>{displayStatus.badgeLabel}</span>
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};
