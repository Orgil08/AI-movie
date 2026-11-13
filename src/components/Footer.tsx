import React, { useState } from 'react';
import { Shield, Mail, Phone, MapPin, X, FileText, Lock, Scale, ShieldAlert } from 'lucide-react';
import { useLocale } from '../i18n/I18nContext.js';

interface FooterProps {
  onNavigate?: (tab: string) => void;
  onNavClick?: (tab: string) => void;
  onOpenDocs?: () => void;
  contactEmail?: string;
  contactPhone?: string;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  onNavClick,
  contactEmail = 'gantomor6174@gmail.com',
  contactPhone = '+976 7711-2099'
}) => {
  const { locale } = useLocale();
  const [modalDoc, setModalDoc] = useState<'terms' | 'privacy' | 'copyright' | 'adult' | null>(
    null
  );
  const currentYear = new Date().getFullYear();

  const handleNav = (tab: string) => {
    const navFn = onNavClick || onNavigate;
    if (navFn) {
      navFn(tab === 'history' ? 'payments' : tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      <footer className="bg-[#080A10] border-t border-[#252D3A] py-14 text-sm text-[#94A3B8]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Column 1: SODON AI MOVIE Brand */}
            <div>
              <div className="flex items-baseline gap-1.5 mb-4">
                <span className="text-xl font-black tracking-tight text-white">SODON</span>
                <span className="text-xs font-extrabold tracking-[0.18em] text-[#F5B936] uppercase">
                  AI MOVIE
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed mb-5">
                {locale === 'en'
                  ? 'Mongolia’s first official 4K AI cinema streaming platform, equipped with reliable Wire.mn QPay and interbank payment systems.'
                  : 'Монголын анхны хиймэл оюун ухаанаар бүтээгдсэн 4K кино дамжуулах албан ёсны платформ. Wire.mn төлбөрийн гарц болон банк хоорондын найдвартай системээр тоноглогдсон.'}
              </p>
              <div className="inline-flex items-center gap-2 text-xs text-white font-semibold">
                <Shield className="w-4 h-4 text-[#F5B936]" />
                <span>{locale === 'en' ? 'Security & Protection' : 'Аюулгүй байдал'}</span>
              </div>
            </div>

            {/* Column 2: ХЭРЭГЦЭЭТ ХОЛБООСУУД */}
            <div>
              <h4 className="text-white font-extrabold mb-4 text-xs uppercase tracking-wider">
                {locale === 'en' ? 'USEFUL LINKS' : 'ХЭРЭГЦЭЭТ ХОЛБООСУУД'}
              </h4>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <button
                    type="button"
                    onClick={() => handleNav('home')}
                    className="text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                  >
                    {locale === 'en' ? 'Home' : 'Нүүр'}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleNav('movies')}
                    className="text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                  >
                    {locale === 'en' ? 'Movie Library' : 'Кино сан'}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleNav('pricing')}
                    className="text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                  >
                    {locale === 'en' ? 'Pricing Plans' : 'Үнийн багц'}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleNav('subscription')}
                    className="text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                  >
                    {locale === 'en' ? 'Active Plan' : 'Идэвхтэй багц'}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleNav('history')}
                    className="text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                  >
                    {locale === 'en' ? 'Payment History' : 'Төлбөрийн түүх'}
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: ХУУЛЬ ЭРХ ЗҮЙ */}
            <div>
              <h4 className="text-white font-extrabold mb-4 text-xs uppercase tracking-wider">
                {locale === 'en' ? 'LEGAL' : 'ХУУЛЬ ЭРХ ЗҮЙ'}
              </h4>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <button
                    type="button"
                    onClick={() => setModalDoc('terms')}
                    className="text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                  >
                    {locale === 'en' ? 'Terms of Service' : 'Үйлчилгээний нөхцөл'}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setModalDoc('privacy')}
                    className="text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                  >
                    {locale === 'en' ? 'Privacy Policy' : 'Нууцлалын бодлого'}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setModalDoc('copyright')}
                    className="text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                  >
                    {locale === 'en' ? 'Copyright Policy' : 'Зохиогчийн эрх'}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setModalDoc('adult')}
                    className="text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                  >
                    {locale === 'en' ? '18+ Content Policy' : '18+ контентын бодлого'}
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: ХОЛБОО БАРИХ */}
            <div>
              <h4 className="text-white font-extrabold mb-4 text-xs uppercase tracking-wider">
                {locale === 'en' ? 'CONTACT US' : 'ХОЛБОО БАРИХ'}
              </h4>
              <ul className="space-y-3 text-xs">
                <li className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#F5B936] shrink-0" />
                  <a
                    href={`mailto:${contactEmail}`}
                    className="text-[#94A3B8] hover:text-white transition-colors"
                  >
                    {contactEmail}
                  </a>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-[#F5B936] shrink-0" />
                  <a
                    href={`tel:${contactPhone}`}
                    className="text-[#94A3B8] hover:text-white transition-colors"
                  >
                    {contactPhone}
                  </a>
                </li>
                <li className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-[#F5B936] shrink-0" />
                  <span>
                    {locale === 'en'
                      ? 'Sukhbaatar District, Ulaanbaatar'
                      : 'Улаанбаатар хот, Сүхбаатар дүүрэг'}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#252D3A] flex flex-col sm:flex-row items-center justify-between text-xs text-[#64748B] gap-4">
            <p>
              © {currentYear} SODON AI MOVIE.{' '}
              {locale === 'en' ? 'All rights reserved.' : 'Бүх эрх хуулиар хамгаалагдсан.'}
            </p>
            <div className="flex items-center gap-4">
              <span>4K Ultra HD</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Legal Policy Modal */}
      {modalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl rounded-2xl bg-[#0D111B] border border-[#252D3A] p-6 sm:p-8 shadow-2xl max-h-[85vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setModalDoc(null)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {modalDoc === 'terms' && (
              <div>
                <div className="flex items-center gap-2.5 text-[#F5B936] font-bold text-xs uppercase tracking-wider mb-2">
                  <FileText className="w-4 h-4" />
                  SODON AI MOVIE
                </div>
                <h3 className="text-2xl font-black text-white mb-4">Үйлчилгээний нөхцөл</h3>
                <div className="space-y-4 text-sm text-[#94A3B8] leading-relaxed">
                  <p>
                    1. <strong>Нийтлэг үндэслэл:</strong> SODON AI MOVIE платформ нь хиймэл оюун
                    ухаанаар бүтээгдсэн кино, богино драм болон цуврал контентыг хэрэглэгчдэд
                    зохиогчийн эрхийн дагуу дамжуулах стриминг үйлчилгээ юм.
                  </p>
                  <p>
                    2. <strong>Гишүүнчлэл ба Төлбөр:</strong> Хэрэглэгч багцаа сонгон Wire.mn (QPay)
                    эсвэл Хаан Банкны дансаар төлбөрөө төлснөөр 30 хоногийн VIP эрх эсвэл 72 цагийн
                    цуврал түрээсийн эрх идэвхжинэ.
                  </p>
                </div>
              </div>
            )}

            {modalDoc === 'privacy' && (
              <div>
                <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
                  <Lock className="w-4 h-4" />
                  DATA PROTECTION
                </div>
                <h3 className="text-2xl font-black text-white mb-4">Нууцлалын бодлого</h3>
                <div className="space-y-4 text-sm text-[#94A3B8] leading-relaxed">
                  <p>
                    1. <strong>Мэдээллийн аюулгүй байдал:</strong> Таны бүртгэлийн нууц үг криптограф
                    хэш алгоритмаар хамгаалагдах бөгөөд гуравдагч этгээдэд задруулахгүй.
                  </p>
                  <p>
                    2. <strong>Төлбөрийн нууцлал:</strong> Манай систем хэрэглэгчийн банкны картын
                    мэдээллийг хадгалдаггүй бөгөөд QPay болон банкны системээр дамжин баталгаажна.
                  </p>
                </div>
              </div>
            )}

            {modalDoc === 'copyright' && (
              <div>
                <div className="flex items-center gap-2.5 text-[#1769FF] font-bold text-xs uppercase tracking-wider mb-2">
                  <Scale className="w-4 h-4" />
                  COPYRIGHT PROTECTION
                </div>
                <h3 className="text-2xl font-black text-white mb-4">Зохиогчийн эрх</h3>
                <div className="space-y-4 text-sm text-[#94A3B8] leading-relaxed">
                  <p>
                    SODON AI MOVIE платформ дээрх бүх AI кино, олон ангит цуврал, дуу оруулалт болон
                    монгол хадмал орчуулга нь оюуны өмчийн хуулиар хамгаалагдсан болно. Зөвшөөрөлгүй
                    хуулбарлах, тараахыг хориглоно.
                  </p>
                </div>
              </div>
            )}

            {modalDoc === 'adult' && (
              <div>
                <div className="flex items-center gap-2.5 text-[#E50914] font-bold text-xs uppercase tracking-wider mb-2">
                  <ShieldAlert className="w-4 h-4" />
                  18+ AGE RESTRICTION POLICY
                </div>
                <h3 className="text-2xl font-black text-white mb-4">18+ контентын бодлого</h3>
                <div className="space-y-4 text-sm text-[#94A3B8] leading-relaxed">
                  <p>
                    Hot+ (18+) хэсэгт байрлах контентууд нь зөвхөн 18 нас хүрсэн насанд хүрэгчдэд
                    зориулагдсан бөгөөд насны баталгаажуулалт хийсний дараа нэвтрэх эрх нээгдэнэ.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
