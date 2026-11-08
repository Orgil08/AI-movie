export interface Movie {
  id: string;
  titleMn: string;
  titleEn: string;
  year: number;
  duration: string;
  genreMn: string;
  rating: string;
  quality: '4K HDR' | '1080p Full HD' | '720p HD';
  isPremium: boolean;
  minPlan: 'basic' | 'standard' | 'premium';
  descriptionMn: string;
  directorMn: string;
  bannerUrl: string;
  posterUrl: string;
  trailerUrl: string;
  videoSource: string; // Internal protected video source
  tags: string[];
}

export const MOVIES: Movie[] = [
  {
    id: 'ai-nomad-2099',
    titleMn: 'Нүүдэлчин 2099: Алтан Орд',
    titleEn: 'Nomad 2099: The Golden Horde',
    year: 2026,
    duration: '2ц 18мин',
    genreMn: 'Киберпанк / AI Уран Зөгнөлт',
    rating: '9.4',
    quality: '4K HDR',
    isPremium: true,
    minPlan: 'basic',
    descriptionMn: '2099 оны кибер Улаанбаатар хот болон сансрын хөлөгт шилжсэн монгол нүүдэлчдийн хиймэл оюун ухаант өв соёлын төлөөх тулаан.',
    directorMn: 'Б. Тэмүүлэн (AI Synthetics)',
    bannerUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1600&q=80',
    posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
    trailerUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    tags: ['Шинэ нээлт', '4K HDR', 'Топ 10', 'QPay Онцгой']
  },
  {
    id: 'deep-singularity',
    titleMn: 'Гүн Сингулярит: Сүүлчийн Тархи',
    titleEn: 'Deep Singularity: The Last Mind',
    year: 2026,
    duration: '1ц 54мин',
    genreMn: 'Сэтгэл зүйн триллер / AI Sci-Fi',
    rating: '9.1',
    quality: '4K HDR',
    isPremium: true,
    minPlan: 'standard',
    descriptionMn: 'Хүн төрөлхтний хамгийн сүүлчийн био-мэдрэлийн судлаач бүрэн ухамсарт хүрсэн квант AI системтэй мэтгэлцэнэ.',
    directorMn: 'А. Сарнай (Neural Studio)',
    bannerUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    trailerUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    tags: ['Dolby Atmos', 'Премиум сонголт']
  },
  {
    id: 'ulaanbaatar-neon',
    titleMn: 'Неон Манан: Сүүдэрт Хот',
    titleEn: 'Neon Mist: Shadow City',
    year: 2025,
    duration: '2ц 05мин',
    genreMn: 'Нео-Нуар / Адал явдалт',
    rating: '8.9',
    quality: '1080p Full HD',
    isPremium: true,
    minPlan: 'basic',
    descriptionMn: 'Шөнийн неон гэрэлт гудамжаар хууль бус квант чип мөрдөх цагдаагийн тусгай ажилтны ээдрээт эрэн сурвалжлага.',
    directorMn: 'Ч. Бат-Эрдэнэ',
    bannerUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80',
    posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
    trailerUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    tags: ['Олон ангит өмнөх анги', 'Хит']
  },
  {
    id: 'quantum-shaman',
    titleMn: 'Квант Бөө: Ертөнцийн Хаалга',
    titleEn: 'Quantum Shaman: The Rift',
    year: 2026,
    duration: '2ц 22мин',
    genreMn: 'Уран зөгнөлт / Мистик',
    rating: '9.6',
    quality: '4K HDR',
    isPremium: true,
    minPlan: 'premium',
    descriptionMn: 'Эртний бөө мөргөлийн орон зайн долгион орчин үеийн квант компьютерын олон хэмжээст ертөнцтэй холбогдоход юу болох вэ?',
    directorMn: 'М. Баатар',
    bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    trailerUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    tags: ['Премиум онцгой', 'IMAX Enhanced']
  },
  {
    id: 'free-pilot-ai-origins',
    titleMn: 'AI Үүсэл: Хүн төрөлхтний Эхлэл (Үнэгүй)',
    titleEn: 'AI Origins: Genesis (Free Preview)',
    year: 2025,
    duration: '45мин',
    genreMn: 'Баримтат / Богино кино',
    rating: '8.7',
    quality: '720p HD',
    isPremium: false,
    minPlan: 'basic',
    descriptionMn: 'Бүх хэрэглэгчдэд нээлттэй үнэгүй танилцуулга үзвэр. AI MOVIE платформын дуу дүрсний чанарыг сорих боломжтой.',
    directorMn: 'AI Documentary Guild',
    bannerUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1600&q=80',
    posterUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
    trailerUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    tags: ['Үнэгүй үзвэр', 'Бүх насныханд']
  }
];

export function getMovieById(id: string): Movie | undefined {
  return MOVIES.find((m) => m.id === id);
}
