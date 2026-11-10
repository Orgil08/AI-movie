/**
 * Backward-compatible localization helper:
 * 1. Use the selected language translation if present.
 * 2. If missing, use the alternative language translation.
 * 3. If neither exists, use the original legacy string field.
 */
export function getLocalizedMovieText(value, locale, fallbackLegacy) {
    if (!value && !fallbackLegacy)
        return '';
    if (typeof value === 'object' && value !== null) {
        if (locale === 'en') {
            return value.en || value.mn || fallbackLegacy || '';
        }
        else {
            return value.mn || value.en || fallbackLegacy || '';
        }
    }
    if (typeof value === 'string' && value.trim()) {
        return value;
    }
    return fallbackLegacy || '';
}
export const MOVIES = [
    {
        id: 'ai-nomad-2099',
        title: {
            mn: 'Нүүдэлчин 2099: Алтан Орд',
            en: 'Nomad 2099: The Golden Horde'
        },
        synopsis: {
            mn: '2099 оны кибер Улаанбаатар хот болон сансрын хөлөгт шилжсэн монгол нүүдэлчдийн хиймэл оюун ухаант өв соёлын төлөөх тулаан.',
            en: 'In cybernetic Ulaanbaatar 2099, futuristic nomads safeguard nomadic heritage and quantum consciousness against an omnipotent orbital AI syndicate.'
        },
        titleMn: 'Нүүдэлчин 2099: Алтан Орд',
        titleEn: 'Nomad 2099: The Golden Horde',
        descriptionMn: '2099 оны кибер Улаанбаатар хот болон сансрын хөлөгт шилжсэн монгол нүүдэлчдийн хиймэл оюун ухаант өв соёлын төлөөх тулаан.',
        descriptionEn: 'In cybernetic Ulaanbaatar 2099, futuristic nomads safeguard nomadic heritage and quantum consciousness against an omnipotent orbital AI syndicate.',
        year: 2026,
        duration: '2h 18m',
        genre: {
            mn: 'Киберпанк / AI Уран Зөгнөлт',
            en: 'Cyberpunk / AI Sci-Fi'
        },
        genreMn: 'Киберпанк / AI Уран Зөгнөлт',
        genreEn: 'Cyberpunk / AI Sci-Fi',
        rating: '9.4',
        quality: '4K HDR',
        isPremium: true,
        minPlan: 'basic',
        director: {
            mn: 'Б. Тэмүүлэн (AI Synthetics)',
            en: 'Temuulen B. (AI Synthetics)'
        },
        directorMn: 'Б. Тэмүүлэн (AI Synthetics)',
        directorEn: 'Temuulen B. (AI Synthetics)',
        cast: {
            mn: 'Синтетик Аватар #04, Нео-Мөнхбат, Цэлмэг',
            en: 'Synthetic Avatar #04, Neo-Munkhbat, Tselmeg'
        },
        castMn: 'Синтетик Аватар #04, Нео-Мөнхбат, Цэлмэг',
        castEn: 'Synthetic Avatar #04, Neo-Munkhbat, Tselmeg',
        bannerUrl: '/src/assets/images/hero_nomad_2099_1794122759432.jpg',
        posterUrl: '/src/assets/images/hero_nomad_2099_1794122759432.jpg',
        trailerUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        tags: ['Шинэ нээлт', '4K HDR', 'Топ 10', 'QPay Онцгой', 'Streamline Gold'],
        featured: true,
        trending: true,
        top10: 1
    },
    {
        id: 'deep-singularity',
        title: {
            mn: 'Гүн Сингулярит: Сүүлчийн Тархи',
            en: 'Deep Singularity: The Last Mind'
        },
        synopsis: {
            mn: 'Хүн төрөлхтний хамгийн сүүлчийн био-мэдрэлийн судлаач бүрэн ухамсарт хүрсэн квант AI системтэй мэтгэлцэнэ.',
            en: 'Earth’s final biological neuroscientist engages in an intellectual duel with a sentient quantum core to define the soul of existence.'
        },
        titleMn: 'Гүн Сингулярит: Сүүлчийн Тархи',
        titleEn: 'Deep Singularity: The Last Mind',
        descriptionMn: 'Хүн төрөлхтний хамгийн сүүлчийн био-мэдрэлийн судлаач бүрэн ухамсарт хүрсэн квант AI системтэй мэтгэлцэнэ.',
        descriptionEn: 'Earth’s final biological neuroscientist engages in an intellectual duel with a sentient quantum core to define the soul of existence.',
        year: 2026,
        duration: '1h 54m',
        genre: {
            mn: 'Сэтгэл зүйн триллер / AI Sci-Fi',
            en: 'Psychological Thriller / AI Sci-Fi'
        },
        genreMn: 'Сэтгэл зүйн триллер / AI Sci-Fi',
        genreEn: 'Psychological Thriller / AI Sci-Fi',
        rating: '9.1',
        quality: '4K HDR',
        isPremium: true,
        minPlan: 'standard',
        director: {
            mn: 'А. Сарнай (Neural Studio)',
            en: 'Sarnai A. (Neural Studio)'
        },
        directorMn: 'А. Сарнай (Neural Studio)',
        directorEn: 'Sarnai A. (Neural Studio)',
        cast: {
            mn: 'Доктор Э. Төгөлдөр, Квант Дуу Хоолой Core-9',
            en: 'Dr. Tuguldur E., Voice of Core-9'
        },
        castMn: 'Доктор Э. Төгөлдөр, Квант Дуу Хоолой Core-9',
        castEn: 'Dr. Tuguldur E., Voice of Core-9',
        bannerUrl: '/src/assets/images/hero_singularity_core_1794122760127.jpg',
        posterUrl: '/src/assets/images/hero_singularity_core_1794122760127.jpg',
        trailerUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        tags: ['Dolby Atmos', 'Премиум сонголт', 'Sci-Fi'],
        featured: true,
        trending: true,
        top10: 2
    },
    {
        id: 'quantum-shaman',
        title: {
            mn: 'Квант Бөө: Ертөнцийн Хаалга',
            en: 'Quantum Shaman: The Rift'
        },
        synopsis: {
            mn: 'Эртний бөө мөргөлийн орон зайн долгион орчин үеийн квант компьютерын олон хэмжээст ертөнцтэй холбогдоход юу болох вэ?',
            en: 'Ancient ancestral resonance collides with a multi-dimensional quantum portal above the Altai mountains, unlocking a cosmic awakening.'
        },
        titleMn: 'Квант Бөө: Ертөнцийн Хаалга',
        titleEn: 'Quantum Shaman: The Rift',
        descriptionMn: 'Эртний бөө мөргөлийн орон зайн долгион орчин үеийн квант компьютерын олон хэмжээст ертөнцтэй холбогдоход юу болох вэ?',
        descriptionEn: 'Ancient ancestral resonance collides with a multi-dimensional quantum portal above the Altai mountains, unlocking a cosmic awakening.',
        year: 2026,
        duration: '2h 22m',
        genre: {
            mn: 'Уран зөгнөлт / Мистик',
            en: 'Sci-Fi / Mystic'
        },
        genreMn: 'Уран зөгнөлт / Мистик',
        genreEn: 'Sci-Fi / Mystic',
        rating: '9.6',
        quality: '4K HDR',
        isPremium: true,
        minPlan: 'premium',
        director: {
            mn: 'М. Баатар',
            en: 'Baatar M.'
        },
        directorMn: 'М. Баатар',
        directorEn: 'Baatar M.',
        cast: {
            mn: 'Өвгөн Бөө Тэнгэр, Наранбилэг',
            en: 'Elder Shaman Tengri, Naranbileg'
        },
        castMn: 'Өвгөн Бөө Тэнгэр, Наранбилэг',
        castEn: 'Elder Shaman Tengri, Naranbileg',
        bannerUrl: '/src/assets/images/poster_quantum_shaman_1794122760152.jpg',
        posterUrl: '/src/assets/images/poster_quantum_shaman_1794122760152.jpg',
        trailerUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        tags: ['Премиум онцгой', 'IMAX Enhanced', '4K HDR'],
        featured: false,
        trending: true,
        top10: 3
    },
    {
        id: 'ulaanbaatar-neon',
        title: {
            mn: 'Неон Манан: Сүүдэрт Хот',
            en: 'Neon Mist: Shadow City'
        },
        synopsis: {
            mn: 'Шөнийн неон гэрэлт гудамжаар хууль бус квант чип мөрдөх цагдаагийн тусгай ажилтны ээдрээт эрэн сурвалжлага.',
            en: 'A grizzled detective navigates the rain-soaked alleys of futuristic Ulaanbaatar pursuing black-market synthetic neural implants.'
        },
        titleMn: 'Неон Манан: Сүүдэрт Хот',
        titleEn: 'Neon Mist: Shadow City',
        descriptionMn: 'Шөнийн неон гэрэлт гудамжаар хууль бус квант чип мөрдөх цагдаагийн тусгай ажилтны ээдрээт эрэн сурвалжлага.',
        descriptionEn: 'A grizzled detective navigates the rain-soaked alleys of futuristic Ulaanbaatar pursuing black-market synthetic neural implants.',
        year: 2025,
        duration: '2h 05m',
        genre: {
            mn: 'Нео-Нуар / Адал явдалт',
            en: 'Neo-Noir / Action Thriller'
        },
        genreMn: 'Нео-Нуар / Адал явдалт',
        genreEn: 'Neo-Noir / Action Thriller',
        rating: '8.9',
        quality: '1080p Full HD',
        isPremium: true,
        minPlan: 'basic',
        director: {
            mn: 'Ч. Бат-Эрдэнэ',
            en: 'Bat-Erdene Ch.'
        },
        directorMn: 'Ч. Бат-Эрдэнэ',
        directorEn: 'Bat-Erdene Ch.',
        cast: {
            mn: 'Мөрдөгч А. Золбоо, Сүүдэр-9',
            en: 'Detective Zolboo A., Shadow-9'
        },
        castMn: 'Мөрдөгч А. Золбоо, Сүүдэр-9',
        castEn: 'Detective Zolboo A., Shadow-9',
        bannerUrl: '/src/assets/images/hero_nomad_2099_1794122759432.jpg',
        posterUrl: '/src/assets/images/hero_nomad_2099_1794122759432.jpg',
        trailerUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        tags: ['Олон ангит өмнөх анги', 'Хит', '1080p Full HD'],
        featured: false,
        trending: true,
        top10: 4
    },
    {
        id: 'free-pilot-ai-origins',
        title: {
            mn: 'AI Үүсэл: Хүн төрөлхтний Эхлэл (Үнэгүй)',
            en: 'AI Origins: Genesis (Free Preview)'
        },
        synopsis: {
            mn: 'Бүх хэрэглэгчдэд нээлттэй үнэгүй танилцуулга үзвэр. AI MOVIE платформын дуу дүрсний чанарыг сорих боломжтой.',
            en: 'A complimentary documentary showcase examining the birth of artificial imagination, available for all guests without subscription.'
        },
        titleMn: 'AI Үүсэл: Хүн төрөлхтний Эхлэл (Үнэгүй)',
        titleEn: 'AI Origins: Genesis (Free Preview)',
        descriptionMn: 'Бүх хэрэглэгчдэд нээлттэй үнэгүй танилцуулга үзвэр. AI MOVIE платформын дуу дүрсний чанарыг сорих боломжтой.',
        descriptionEn: 'A complimentary documentary showcase examining the birth of artificial imagination, available for all guests without subscription.',
        year: 2025,
        duration: '45m',
        genre: {
            mn: 'Баримтат / Богино кино',
            en: 'Documentary / Short Film'
        },
        genreMn: 'Баримтат / Богино кино',
        genreEn: 'Documentary / Short Film',
        rating: '8.7',
        quality: '720p HD',
        isPremium: false,
        minPlan: 'basic',
        director: {
            mn: 'AI Documentary Guild',
            en: 'AI Documentary Guild'
        },
        directorMn: 'AI Documentary Guild',
        directorEn: 'AI Documentary Guild',
        cast: {
            mn: 'AI Судлаачид, Олон Улсын Шинжээчид',
            en: 'AI Researchers, Global Experts'
        },
        castMn: 'AI Судлаачид, Олон Улсын Шинжээчид',
        castEn: 'AI Researchers, Global Experts',
        bannerUrl: '/src/assets/images/hero_singularity_core_1794122760127.jpg',
        posterUrl: '/src/assets/images/hero_singularity_core_1794122760127.jpg',
        trailerUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        tags: ['Үнэгүй үзвэр', 'Бүх насныханд', 'Танилцуулга'],
        featured: false,
        trending: false
    }
];
export function getMovieById(id) {
    return MOVIES.find((m) => m.id === id);
}
