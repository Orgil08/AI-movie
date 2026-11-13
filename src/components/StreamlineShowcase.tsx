import React, { useState } from 'react';
import { Tv, Laptop, Smartphone, Sparkles, CheckCircle2, ChevronDown } from 'lucide-react';
import { useLocale } from '../i18n/I18nContext.js';

export interface CustomFaqItem {
  qMn: string;
  aMn: string;
  qEn: string;
  aEn: string;
}

interface StreamlineShowcaseProps {
  customFaqs?: CustomFaqItem[];
}

export const StreamlineShowcase: React.FC<StreamlineShowcaseProps> = () => {
  const { locale } = useLocale();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const stats = [
    {
      value: '1,500+',
      label: locale === 'en' ? 'Full-Length AI Movies' : 'Бүрэн хэмжээний AI Кино'
    },
    {
      value: '4K HDR',
      label: locale === 'en' ? 'Ultra HD & Dolby Audio' : 'Ultra HD & Dolby Дуугаралт'
    },
    {
      value: '99.9%',
      label: locale === 'en' ? 'Streaming Reliability' : 'Стрийминг Найдвартай Байдал'
    },
    {
      value: '50,000+',
      label: locale === 'en' ? 'Active Viewer Members' : 'Идэвхтэй Үзэгч Гишүүд'
    }
  ];

  const devices = [
    {
      icon: Tv,
      title: locale === 'en' ? 'Smart TV' : 'Ухаалаг Зурагт',
      desc:
        locale === 'en'
          ? 'Supports 4K HDR + Dolby Atmos on Apple TV, Android TV, Samsung Tizen, and LG webOS.'
          : 'Apple TV, Android TV, Samsung Tizen, LG webOS дээр 4K HDR + Dolby Atmos дэмжинэ.'
    },
    {
      icon: Laptop,
      title: locale === 'en' ? 'Computer & Laptop' : 'Компьютер & Лаптоп',
      desc:
        locale === 'en'
          ? 'Stream directly on Chrome, Safari, and Firefox browsers with zero extra setup.'
          : 'Chrome, Safari, Firefox хөтчүүд дээр нэмэлт тохиргоогүй шууд үзнэ.'
    },
    {
      icon: Smartphone,
      title: locale === 'en' ? 'Mobile & Tablet' : 'Гар утас & Таблет',
      desc:
        locale === 'en'
          ? 'Adaptive bitrate streaming optimized for iOS and Android devices on the go.'
          : 'iOS болон Android төхөөрөмж дээр интернэтийн хурдад тохируулан гацахгүй тоглуулна.'
    },
    {
      icon: Sparkles,
      title: locale === 'en' ? 'Premium Streaming' : 'Премиум Стрийминг',
      desc:
        locale === 'en'
          ? 'Cloudflare R2 edge delivery ensures ultra-fast playback and crystal-clear Mongolian subtitles.'
          : 'Cloudflare R2 өндөр хурдны серверээр дамжуулан монгол хадмал орчуулгатайгаар үзүүлнэ.'
    }
  ];

  const defaultFaqs = [
    {
      q:
        locale === 'en'
          ? 'How do I pay with Wire.mn and QPay?'
          : 'Wire.mn болон QPay-ээр хэрхэн төлбөр төлөх вэ?',
      a:
        locale === 'en'
          ? 'When you choose your desired plan, the official Wire.mn payment gateway opens. Scan the QPay QR code using Khan Bank, Golomt, TDB, SocialPay, or any banking app for automatic activation within 10 seconds.'
          : 'Та хүссэн багцаа сонгоход Wire.mn-ийн албан ёсны төлбөрийн гарц нээгдэнэ. Тэндээс Хаан Банк, Голомт, Худалдаа Хөгжил, SocialPay зэрэг бүх банкны апп-аар шууд QPay QR уншуулан 10 секундэд баталгаажуулна.'
    },
    {
      q:
        locale === 'en'
          ? 'How do I transfer via Khan Bank account 5132104221?'
          : 'Хаан Банкны 5132104221 дансаар хэрхэн шилжүүлэх вэ?',
      a:
        locale === 'en'
          ? 'Select the Bank Transfer tab at checkout, transfer the exact plan amount to Khan Bank account 5132104221 (Recipient: Сүхбат Мөнх-Оргил) with your Order ID in the description, and submit for admin verification.'
          : 'Төлбөр төлөх хэсгээс Банкны дансаар шилжүүлэх сонголтыг дарж, Хаан Банкны 5132104221 (Хүлээн авагч: Сүхбат Мөнх-Оргил) данс руу гүйлгээний утга дээр захиалгын дугаараа бичин шилжүүлснээр админ шалгаад багцыг идэвхжүүлнэ.'
    },
    {
      q:
        locale === 'en'
          ? 'Are there automatic renewals or hidden fees?'
          : 'Автомат сунгалт эсвэл гэнэтийн шимтгэл байгаа юу?',
      a:
        locale === 'en'
          ? 'No. All memberships and 72-hour series rentals are one-time payments. Your account will never be charged automatically without your consent.'
          : 'Байхгүй. Манай бүх VIP багц болон цуврал түрээсийн төлбөр зөвхөн нэг удаагийн төлөлтөөр хийгдэнэ. Таны данснаас автоматаар мөнгө суутгахгүй.'
    },
    {
      q:
        locale === 'en'
          ? 'Which devices support 4K Ultra HD video and audio quality?'
          : '4K Ultra HD дуу дүрсний чанар ямар төхөөрөмж дэмжих вэ?',
      a:
        locale === 'en'
          ? 'All modern Smart TVs (Samsung, LG, Android TV, Apple TV), desktop browsers, iPads, and smartphones support our adaptive 4K Ultra HD and 1080p Full HD streams.'
          : 'Ухаалаг зурагт, компьютер, зөөврийн лаптоп, таблет болон бүх төрлийн ухаалаг гар утас дээр 4K Ultra HD болон 1080p Full HD өндөр чанараар шууд дэмжин ажиллана.'
    }
  ];

  return (
    <div className="bg-[#080A10] border-t border-[#252D3A]/60">
      {/* 1. Statistics Bar matching image_533e5d0b.png */}
      <div className="border-b border-[#252D3A]/70 bg-[#080A10]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {stats.map((s, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-[#111520] border border-[#252D3A] px-6 py-7 text-center hover:border-[#F5B936]/40 transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
              >
                <p className="text-3xl sm:text-4xl font-black text-[#F5B936] tracking-tight mb-2">
                  {s.value}
                </p>
                <p className="text-xs sm:text-sm text-[#94A3B8] font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Device Compatibility / Streamline Ecosystem matching image_533e5d0b.png */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-16 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column (5 cols) */}
          <div className="lg:col-span-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#F5B936]/10 border border-[#F5B936]/30 text-[#F5B936] text-[11px] font-extrabold uppercase tracking-wider mb-5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>STREAMLINE ECOSYSTEM</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-white leading-[1.15] tracking-tight mb-5">
              {locale === 'en'
                ? 'Stream Unlimited on Any Device'
                : 'Дурын төхөөрөмж дээрээ хязгааргүй үзээрэй'}
            </h2>

            <p className="text-[#94A3B8] text-sm sm:text-base leading-relaxed mb-8">
              {locale === 'en'
                ? 'Seamlessly stream in 4K Ultra HD audio and visual fidelity across your Smart TV, laptop, tablet, and smartphone.'
                : 'Ухаалаг зурагт, зөөврийн компьютер, таблет болон гар утаснаасаа 4K Ultra HD дуу дүрсний өндөр чанараар саадгүй дамжуулаарай.'}
            </p>

            <div className="space-y-3.5">
              {devices.map((d, i) => {
                const Icon = d.icon;
                return (
                  <div
                    key={i}
                    className="flex items-start gap-4 p-4 rounded-2xl bg-[#111520] border border-[#252D3A] hover:border-[#F5B936]/35 transition-all"
                  >
                    <div className="w-11 h-11 rounded-xl bg-[#F5B936]/10 border border-[#F5B936]/25 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-[#F5B936]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">{d.title}</h4>
                      <p className="text-xs text-[#94A3B8] leading-relaxed">{d.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column (7 cols): Living room TV visual matching image_533e5d0b.png */}
          <div className="lg:col-span-7 relative">
            <div className="relative rounded-2xl overflow-hidden border border-[#252D3A] shadow-[0_25px_70px_rgba(0,0,0,0.75)] bg-[#0D111B]">
              <img
                src="/src/assets/images/streamline_devices_1794122760463.jpg"
                alt="SODON AI MOVIE Multi-Device Ecosystem"
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080A10]/90 via-transparent to-transparent" />

              {/* Bottom Floating Bar */}
              <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 p-4 rounded-xl bg-[#0D111B]/95 backdrop-blur-md border border-[#252D3A] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#F5B936] shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-white">
                    {locale === 'en'
                      ? 'Watch on 4 devices simultaneously with Premium'
                      : 'Премиум багцаар 4 төхөөрөмж зэрэг үзнэ'}
                  </span>
                </div>
                <span className="text-xs font-black text-[#F5B936] uppercase tracking-wider shrink-0">
                  ULTRA HD 4K
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. FAQ Accordion Section matching image_5ad5d63c.png */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 pt-6 border-t border-[#252D3A]/50">
        <div className="text-center mb-10 pt-8">
          <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2.5">
            {locale === 'en' ? 'Frequently Asked Questions' : 'Түгээмэл Асуултууд'}
          </h3>
          <p className="text-xs sm:text-sm text-[#94A3B8]">
            {locale === 'en'
              ? 'Answers to common questions about billing, 4K streaming, and device support'
              : 'Төлбөр тооцоо, 4K дамжуулалт болон бусад түгээмэл асуултын хариултууд'}
          </p>
        </div>

        <div className="space-y-3.5">
          {defaultFaqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-xl bg-[#111520] border border-[#252D3A] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-6 py-4.5 text-left flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <span className="text-sm font-bold text-white">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#F5B936] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 pt-2 text-xs sm:text-sm text-[#94A3B8] leading-relaxed border-t border-[#252D3A]/70">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
