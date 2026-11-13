import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z
      .string({ error: 'Нэрээ оруулна уу.' })
      .trim()
      .min(2, { message: 'Нэр хамгийн багадаа 2 тэмдэгт байх ёстой.' })
      .max(60, { message: 'Нэр 60 тэмдэгтээс хэтрэхгүй байх ёстой.' }),
    email: z
      .string({ error: 'Имэйл хаягаа оруулна уу.' })
      .trim()
      .toLowerCase()
      .email({ message: 'Имэйл хаягаа зөв оруулна уу (жишээ: user@example.com).' }),
    password: z
      .string({ error: 'Нууц үгээ оруулна уу.' })
      .min(8, { message: 'Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.' })
      .max(100, { message: 'Нууц үг хэт урт байна.' }),
    confirmPassword: z
      .string()
      .optional(),
    terms: z
      .boolean()
      .optional()
      .default(true)
      .refine((val) => val === true, {
        message: 'Үйлчилгээний нөхцөлийг зөвшөөрнө үү.'
      })
  })
  .refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
    message: 'Нууц үгүүд таарахгүй байна.',
    path: ['confirmPassword']
  });

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Имэйл хаягаа зөв оруулна уу.' }),
  password: z
    .string()
    .min(1, { message: 'Нууц үгээ оруулна уу.' }),
  remember: z.boolean().optional()
});

export const movieSchema = z.object({
  titleMn: z.string().trim().min(1, { message: 'Монгол гарчиг оруулна уу.' }),
  titleEn: z.string().trim().min(1, { message: 'English title is required.' }),
  originalTitle: z.string().trim().optional().default(''),
  slug: z
    .string()
    .trim()
    .min(1, { message: 'Slug оруулна уу.' })
    .regex(/^[a-z0-9-]+$/, { message: 'Slug зөвхөн жижиг латин үсэг, тоо, зураас агуулна.' }),
  synopsisMn: z.string().trim().min(5, { message: 'Монгол товч агуулга оруулна уу.' }),
  synopsisEn: z.string().trim().min(5, { message: 'English synopsis is required.' }),
  posterUrl: z.string().trim().min(1, { message: 'Постер зургийн холбоос оруулна уу.' }),
  backdropUrl: z.string().trim().min(1, { message: 'Backdrop зургийн холбоос оруулна уу.' }),
  videoUrl: z.string().trim().min(1, { message: 'Видео тоглуулах эх сурвалж оруулна уу.' }),
  trailerUrl: z.string().trim().optional().default(''),
  year: z.coerce.number().int().min(1900).max(2100),
  country: z.string().trim().optional().default('Монгол'),
  duration: z.string().trim().min(1, { message: 'Үргэлжлэх хугацаа оруулна уу (жишээ: 2h 15m).' }),
  genres: z.array(z.string()).min(1, { message: 'Хамгийн багадаа 1 төрөл сонгоно уу.' }),
  rating: z.string().trim().default('8.5'),
  ageRating: z.string().trim().default('13+'),
  quality: z.enum(['4K HDR', '1080p Full HD', '720p HD']).default('1080p Full HD'),
  directorMn: z.string().trim().default(''),
  directorEn: z.string().trim().default(''),
  castMn: z.string().trim().default(''),
  castEn: z.string().trim().default(''),
  language: z.string().trim().default('mn'),
  type: z.enum(['movie', 'series']).default('movie'),
  featured: z.boolean().default(false),
  trending: z.boolean().optional().default(false),
  isPremium: z.boolean().default(true),
  minPlan: z.enum(['basic', 'standard', 'premium']).default('basic'),
  published: z.boolean().default(true),
  hasMongolianSubtitles: z.boolean().optional().default(true),
  isOriginal: z.boolean().optional().default(false),
  isExclusive: z.boolean().optional().default(false),
  isShortDrama: z.boolean().optional().default(false),
  totalEpisodes: z.coerce.number().int().min(1).max(500).optional().default(1),
  freeEpisodes: z.coerce.number().int().min(0).max(500).optional().default(1),
  unlockPrice: z.coerce.number().min(0).optional().default(4900),
  rentalDurationHours: z.coerce.number().int().min(1).optional().default(72),
  vipEnabled: z.boolean().optional().default(true),
  seriesStatus: z.enum(['ongoing', 'completed', 'draft']).optional().default('ongoing')
});

export const categorySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, { message: 'Slug оруулна уу.' })
    .regex(/^[a-z0-9-]+$/, { message: 'Slug зөвхөн жижиг латин үсэг, тоо, зураас байна.' }),
  nameMn: z.string().trim().min(1, { message: 'Монгол нэр оруулна уу.' }),
  nameEn: z.string().trim().min(1, { message: 'English name is required.' }),
  descriptionMn: z.string().trim().optional(),
  descriptionEn: z.string().trim().optional(),
  imageUrl: z.string().trim().optional()
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'Одоогийн нууц үгээ оруулна уу.' }),
    newPassword: z.string().min(8, { message: 'Шинэ нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.' }),
    confirmNewPassword: z.string().min(8, { message: 'Шинэ нууц үгээ давтана уу.' })
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Шинэ нууц үгүүд таарахгүй байна.',
    path: ['confirmNewPassword']
  });

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, { message: 'Нэр хамгийн багадаа 2 тэмдэгт байна.' })
});
