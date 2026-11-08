import React, { useState } from 'react';
import { Tv, Laptop, Smartphone, Film, ShieldCheck, Sparkles, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useTranslations, useLocale } from '../i18n/I18nContext.js';

export const StreamlineShowcase: React.FC = () => {
  const tHome = useTranslations('HomePage');
  const tFaq = useTranslations('FAQ');
  const { locale } = useLocale();

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const stats = [
    { value: tHome('statsMovies'), label: tHome('statsMoviesLabel') },
    { value: tHome('statsQuality'), label: tHome('statsQualityLabel') },
    { value: tHome('statsUptime'), label: tHome('statsUptimeLabel') },
    { value: tHome('statsViewers'), label: tHome('statsViewersLabel') }
  ];

  const devices = [
    {
      icon: Tv,
      title: tHome('deviceTv'),
      desc: tHome('deviceTvDesc')
    },
    {
      icon: Laptop,
      title: tHome('deviceLaptop'),
      desc: tHome('deviceLaptopDesc')
    },
    {
      icon: Smartphone,
      title: tHome('deviceMobile'),
      desc: tHome('deviceMobileDesc')
    }
  ];

  const faqItems = [
    { q: tFaq('q1'), a: tFaq('a1') },
    { q: tFaq('q2'), a: tFaq('a2') },
    { q: tFaq('q3'), a: tFaq('a3') },
    { q: tFaq('q4'), a: tFaq('a4') }
  ];

  return (
    <div className="w-full bg-[#070a12] border-t border-white/10 text-white select-none">
      {/* 1. Statistics Bar */}
      <section className="py-12 border-b border-white/10 bg-gradient-to-b from-[#0b0f19] to-[#070a12]">
        <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm"
              >
                <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-[#e5a93c] tracking-tight">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Device Showcase */}
      <section className="py-16 px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 w-full max-w-[1920px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Text & Device Specs */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#e5a93c]/15 text-[#e5a93c] border border-[#e5a93c]/30 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>STREAMLINE ECOSYSTEM</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight text-white">
              {tHome('devicesTitle')}
            </h2>

            <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
              {tHome('devicesSubtitle')}
            </p>

            <div className="space-y-4 pt-2">
              {devices.map((device, idx) => {
                const Icon = device.icon;
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-4 p-3.5 rounded-xl bg-[#111827]/70 border border-white/10 hover:border-[#e5a93c]/40 transition"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#e5a93c]/15 border border-[#e5a93c]/30 flex items-center justify-center shrink-0 text-[#e5a93c]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{device.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 leading-normal">{device.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Showcase Visual Asset */}
          <div className="lg:col-span-7 relative">
            <div className="relative rounded-2xl overflow-hidden border border-white/15 shadow-2xl shadow-amber-950/20 group">
              <img
                src="/src/assets/images/streamline_devices_1794122760463.jpg"
                alt="Streamline multi-device viewing"
                referrerPolicy="no-referrer"
                className="w-full h-auto object-cover object-center group-hover:scale-[1.02] transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070a12] via-transparent to-transparent opacity-60" />

              <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-[#0b0f19]/90 border border-white/15 backdrop-blur-md flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-[#e5a93c]" />
                  <span>{locale === 'en' ? '4 Concurrent Streams with Premium' : 'Премиум багцаар 4 төхөөрөмж зэрэг үзнэ'}</span>
                </div>
                <span className="text-[11px] font-bold text-[#e5a93c] uppercase">Ultra HD 4K</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FAQ Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-white/10">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {tFaq('title')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            {tFaq('subtitle')}
          </p>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-xl bg-[#111827]/80 border border-white/10 overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition"
                >
                  <span className="text-sm font-bold text-white">{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#e5a93c] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/5 bg-black/20">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
