import React, { useState } from 'react';
import { Film, Plus, Edit2, Trash2, Check, Save, Database, ShieldAlert } from 'lucide-react';
import { Movie, MOVIES, getLocalizedMovieText } from '../data/movies.js';
import { useTranslations, useLocale } from '../i18n/I18nContext.js';

interface AdminViewProps {
  onBackToHome: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onBackToHome }) => {
  const tAdmin = useTranslations('Admin');
  const { locale } = useLocale();

  const [movieList, setMovieList] = useState<Movie[]>(MOVIES);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(MOVIES[0]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states for bilingual editing
  const [titleMn, setTitleMn] = useState(MOVIES[0].titleMn);
  const [titleEn, setTitleEn] = useState(MOVIES[0].titleEn);
  const [synopsisMn, setSynopsisMn] = useState(MOVIES[0].descriptionMn);
  const [synopsisEn, setSynopsisEn] = useState(MOVIES[0].descriptionEn || '');
  const [directorMn, setDirectorMn] = useState(MOVIES[0].directorMn);
  const [directorEn, setDirectorEn] = useState(MOVIES[0].directorEn || '');
  const [rating, setRating] = useState(MOVIES[0].rating);
  const [quality, setQuality] = useState(MOVIES[0].quality);
  const [minPlan, setMinPlan] = useState(MOVIES[0].minPlan);

  const handleSelectToEdit = (m: Movie) => {
    setSelectedMovie(m);
    setTitleMn(m.titleMn);
    setTitleEn(m.titleEn);
    setSynopsisMn(m.descriptionMn);
    setSynopsisEn(m.descriptionEn || '');
    setDirectorMn(m.directorMn);
    setDirectorEn(m.directorEn || '');
    setRating(m.rating);
    setQuality(m.quality);
    setMinPlan(m.minPlan);
    setSaveSuccess(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMovie) return;

    const updated: Movie = {
      ...selectedMovie,
      title: {
        mn: titleMn,
        en: titleEn
      },
      synopsis: {
        mn: synopsisMn,
        en: synopsisEn
      },
      titleMn,
      titleEn,
      descriptionMn: synopsisMn,
      descriptionEn: synopsisEn,
      director: {
        mn: directorMn,
        en: directorEn
      },
      directorMn,
      directorEn,
      rating,
      quality,
      minPlan
    };

    setMovieList((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    setSelectedMovie(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="py-12 px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 w-full max-w-[1920px] mx-auto space-y-8 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#e5a93c]/15 text-[#e5a93c] text-xs font-black uppercase tracking-wider mb-2">
            <Database className="w-3.5 h-3.5" />
            <span>STREAMLINE CMS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">{tAdmin('title')}</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">{tAdmin('subtitle')}</p>
        </div>

        <button
          onClick={onBackToHome}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold self-start sm:self-auto cursor-pointer"
        >
          {locale === 'en' ? 'Back to Catalogue' : 'Кино сан руу буцах'}
        </button>
      </div>

      {/* Grid: Movie list on left, Bilingual editor on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Movies */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>{tAdmin('totalMovies')} ({movieList.length})</span>
            <span className="text-[#e5a93c]">{locale === 'en' ? 'Click to edit' : 'Засах киног сонгох'}</span>
          </div>

          <div className="space-y-2.5">
            {movieList.map((m) => {
              const isSelected = selectedMovie?.id === m.id;
              const displayTitle = getLocalizedMovieText(m.title, locale, m.titleMn);
              return (
                <div
                  key={m.id}
                  onClick={() => handleSelectToEdit(m)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                    isSelected
                      ? 'bg-[#1e293b] border-[#e5a93c] shadow-lg shadow-black'
                      : 'bg-[#111827] border-white/10 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={m.posterUrl}
                      alt={displayTitle}
                      className="w-10 h-14 object-cover rounded-md bg-black/40 shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">{displayTitle}</h4>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{m.titleEn}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px]">
                        <span className="text-[#e5a93c] font-bold">★ {m.rating}</span>
                        <span className="text-slate-500">·</span>
                        <span className="text-slate-400">{m.quality}</span>
                      </div>
                    </div>
                  </div>

                  <Edit2 className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#e5a93c]' : 'text-slate-500'}`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Bilingual Content Editor Form */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleSave}
            className="p-6 sm:p-8 rounded-2xl bg-[#111827] border border-white/10 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-black text-white">
                  {selectedMovie ? `${tAdmin('editMovie')}: ${selectedMovie.titleEn}` : tAdmin('addMovie')}
                </h3>
                <span className="text-xs text-slate-400">
                  {locale === 'en'
                    ? 'Changes persist to runtime catalog without overwriting existing legacy keys'
                    : 'Монгол ба Англи хэлний мэдээллийг зэрэг удирдах'}
                </span>
              </div>
              {saveSuccess && (
                <div className="px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                  <Check className="w-4 h-4" />
                  <span>{tAdmin('savedSuccess')}</span>
                </div>
              )}
            </div>

            {/* Title Inputs: Mongolian & English */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  🇲🇳 {tAdmin('titleMn')}
                </label>
                <input
                  type="text"
                  value={titleMn}
                  onChange={(e) => setTitleMn(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f19] border border-white/15 text-white text-xs focus:outline-none focus:border-[#e5a93c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  🇺🇸 {tAdmin('titleEn')}
                </label>
                <input
                  type="text"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f19] border border-white/15 text-white text-xs focus:outline-none focus:border-[#e5a93c]"
                />
              </div>
            </div>

            {/* Synopsis Inputs: Mongolian & English */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  🇲🇳 {tAdmin('synopsisMn')}
                </label>
                <textarea
                  rows={4}
                  value={synopsisMn}
                  onChange={(e) => setSynopsisMn(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f19] border border-white/15 text-white text-xs focus:outline-none focus:border-[#e5a93c] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  🇺🇸 {tAdmin('synopsisEn')}
                </label>
                <textarea
                  rows={4}
                  value={synopsisEn}
                  onChange={(e) => setSynopsisEn(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f19] border border-white/15 text-white text-xs focus:outline-none focus:border-[#e5a93c] resize-none"
                />
              </div>
            </div>

            {/* Director Inputs: Mongolian & English */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  🇲🇳 {tAdmin('directorMn')}
                </label>
                <input
                  type="text"
                  value={directorMn}
                  onChange={(e) => setDirectorMn(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f19] border border-white/15 text-white text-xs focus:outline-none focus:border-[#e5a93c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  🇺🇸 {tAdmin('directorEn')}
                </label>
                <input
                  type="text"
                  value={directorEn}
                  onChange={(e) => setDirectorEn(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f19] border border-white/15 text-white text-xs focus:outline-none focus:border-[#e5a93c]"
                />
              </div>
            </div>

            {/* Technical Metadata Row */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">{tAdmin('rating')}</label>
                <input
                  type="text"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0b0f19] border border-white/15 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">{tAdmin('quality')}</label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0b0f19] border border-white/15 text-white text-xs"
                >
                  <option value="4K HDR">4K HDR</option>
                  <option value="1080p Full HD">1080p Full HD</option>
                  <option value="720p HD">720p HD</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">{tAdmin('minPlan')}</label>
                <select
                  value={minPlan}
                  onChange={(e) => setMinPlan(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0b0f19] border border-white/15 text-white text-xs uppercase"
                >
                  <option value="basic">Basic (9,900₮)</option>
                  <option value="standard">Standard (14,900₮)</option>
                  <option value="premium">Premium (19,900₮)</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#e5a93c] via-amber-400 to-[#e5a93c] hover:brightness-110 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-950/40 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{tAdmin('saveChanges')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
