import React, { useState } from 'react';
import { CheckCircle2, BookmarkMinus, X } from 'lucide-react';
import { MyListToastNotification } from '../utils/myList.js';

interface ToastContainerProps {
  toasts: MyListToastNotification[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      data-testid="my-list-toast-container"
      className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2.5 items-end pointer-events-none max-w-sm w-full px-4 sm:px-0 select-none"
    >
      {toasts.map((toast) => {
        const isAdded = toast.action === 'added';
        const showPoster = Boolean(toast.posterUrl && !failedImages[toast.id]);

        return (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            data-testid={`my-list-toast-${toast.action}`}
            className={`pointer-events-auto w-full rounded-2xl bg-[#0d1322]/95 backdrop-blur-xl border shadow-2xl shadow-black/90 p-3.5 flex items-center gap-3 transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 ${
              isAdded
                ? 'border-[#e5a93c]/40'
                : 'border-white/15'
            }`}
          >
            {/* Movie Poster Thumbnail or Clean Status Icon Badge */}
            {showPoster ? (
              <div className="relative w-9 h-12 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-white/10">
                <img
                  src={toast.posterUrl}
                  alt={toast.movieTitle}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={() =>
                    setFailedImages((prev) => ({
                      ...prev,
                      [toast.id]: true
                    }))
                  }
                />
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-tl-md flex items-center justify-center ${
                    isAdded ? 'bg-emerald-500 text-black' : 'bg-amber-500 text-black'
                  }`}
                >
                  {isAdded ? (
                    <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                  ) : (
                    <BookmarkMinus className="w-3 h-3 stroke-[2.5]" />
                  )}
                </div>
              </div>
            ) : (
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isAdded
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-[#e5a93c] border border-[#e5a93c]/30'
                }`}
              >
                {isAdded ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <BookmarkMinus className="w-5 h-5" />
                )}
              </div>
            )}

            {/* Notification Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {isAdded ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <BookmarkMinus className="w-3.5 h-3.5 text-[#e5a93c] shrink-0" />
                )}
                <span
                  className={`text-xs font-extrabold tracking-wide ${
                    isAdded ? 'text-emerald-400' : 'text-[#e5a93c]'
                  }`}
                >
                  {toast.title}
                </span>
              </div>
              <p className="text-xs text-slate-200 font-medium line-clamp-2 leading-snug mt-0.5">
                {toast.message}
              </p>
            </div>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
