import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Film,
  PlusCircle,
  FolderTree,
  Users,
  CreditCard,
  Crown,
  BarChart3,
  Settings,
  LogOut,
  Search,
  Check,
  AlertCircle,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Star,
  RefreshCw,
  TrendingUp,
  Clock,
  Shield,
  Menu,
  X,
  Upload,
  UserCheck,
  UserX,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useTranslations, useLocale } from '../i18n/I18nContext.js';
import { formatCurrency, formatDate } from '../i18n/types.js';
import { LanguageSwitcher } from './LanguageSwitcher.js';
import { authFetch } from '../utils/api.js';

interface AdminPanelProps {
  currentUser: { id: string; name: string; email: string; role?: 'user' | 'admin' } | null;
  onBackToHome: () => void;
  onSignOut: () => void;
}

type AdminSection =
  | 'dashboard'
  | 'movies'
  | 'add-movie'
  | 'edit-movie'
  | 'categories'
  | 'users'
  | 'payments'
  | 'subscriptions'
  | 'audit-logs'
  | 'analytics'
  | 'settings'
  | 'profile';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  onBackToHome,
  onSignOut
}) => {
  const { locale } = useLocale();
  const tAdmin = useTranslations('Admin');

  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Data states loaded from backend
  const [stats, setStats] = useState<any>(null);
  const [movies, setMovies] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [subscriptionsList, setSubscriptionsList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<any[]>([]);
  const [uploadConfig, setUploadConfig] = useState<{ configured: boolean; provider: string }>({
    configured: false,
    provider: 'cloudinary'
  });
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search and filter states
  const [movieSearch, setMovieSearch] = useState('');
  const [movieGenreFilter, setMovieGenreFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');

  // Movie form state (for add & edit)
  const [selectedMovieForEdit, setSelectedMovieForEdit] = useState<any | null>(null);
  const [deleteConfirmMovie, setDeleteConfirmMovie] = useState<any | null>(null);
  const [movieSubmitting, setMovieSubmitting] = useState(false);

  // Add / Edit movie form inputs
  const [formData, setFormData] = useState({
    titleMn: '',
    titleEn: '',
    slug: '',
    synopsisMn: '',
    synopsisEn: '',
    posterUrl: '',
    backdropUrl: '',
    videoUrl: '',
    trailerUrl: '',
    year: new Date().getFullYear(),
    duration: '2h 00m',
    genres: ['Sci-Fi'],
    rating: '9.0',
    ageRating: '13+',
    quality: '4K HDR' as '4K HDR' | '1080p Full HD' | '720p HD',
    directorMn: '',
    directorEn: '',
    castMn: '',
    castEn: '',
    language: 'mn',
    type: 'movie' as 'movie' | 'series',
    featured: false,
    isPremium: true,
    minPlan: 'basic' as 'basic' | 'standard' | 'premium',
    published: true
  });

  // Category form state
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatNameMn, setNewCatNameMn] = useState('');
  const [newCatNameEn, setNewCatNameEn] = useState('');
  const [newCatDescMn, setNewCatDescMn] = useState('');
  const [newCatImageUrl, setNewCatImageUrl] = useState('');

  // Subscription adjustment modal state
  const [subAdjustModal, setSubAdjustModal] = useState<{ userId: string; userName: string } | null>(null);
  const [adjustPlanId, setAdjustPlanId] = useState('premium');
  const [adjustDurationDays, setAdjustDurationDays] = useState(30);

  // Bank transfer rejection reason modal state
  const [rejectPaymentModal, setRejectPaymentModal] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);

  // Website Settings state (persisted in MongoDB)
  const [siteSettings, setSiteSettings] = useState<{
    siteName: string;
    taglineMn: string;
    taglineEn: string;
    featuredMovieId: string;
    announcementMn: string;
    announcementEn: string;
    maintenanceMode: boolean;
    allowRegistrations: boolean;
    defaultLocale: 'mn' | 'en';
    primaryCurrency: string;
    subscriptionPrices: { basic: number; standard: number; premium: number };
    faq: Array<{ questionMn: string; questionEn: string; answerMn: string; answerEn: string }>;
  }>({
    siteName: 'SODON AI MOVIE',
    taglineMn: 'Монголын анхны хиймэл оюун ухаант 4K стриминг платформ',
    taglineEn: 'Premier 4K Generative AI Cinema Platform',
    featuredMovieId: '',
    announcementMn: '',
    announcementEn: '',
    maintenanceMode: false,
    allowRegistrations: true,
    defaultLocale: 'mn',
    primaryCurrency: 'MNT',
    subscriptionPrices: { basic: 9900, standard: 14900, premium: 19900 },
    faq: []
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Admin Profile state
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const notify = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/admin/stats');
      if (res.ok) {
        const d = await res.json();
        setStats(d.stats);
      }
    } catch (e) {
      console.warn('Failed to load stats', e);
    }
  };

  const fetchMovies = async () => {
    try {
      const res = await authFetch('/api/admin/movies');
      if (res.ok) {
        const d = await res.json();
        setMovies(d.movies || []);
      }
    } catch (e) {}
  };

  const fetchCategories = async () => {
    try {
      const res = await authFetch('/api/admin/categories');
      if (res.ok) {
        const d = await res.json();
        setCategories(d.categories || []);
      }
    } catch (e) {}
  };

  const fetchUsers = async () => {
    try {
      const res = await authFetch('/api/admin/users');
      if (res.ok) {
        const d = await res.json();
        setUsersList(d.users || []);
      }
    } catch (e) {}
  };

  const fetchPayments = async () => {
    try {
      const res = await authFetch('/api/admin/payments');
      if (res.ok) {
        const d = await res.json();
        setPaymentsList(d.payments || []);
      }
    } catch (e) {}
  };

  const fetchSubscriptions = async () => {
    try {
      const res = await authFetch('/api/admin/subscriptions');
      if (res.ok) {
        const d = await res.json();
        setSubscriptionsList(d.subscriptions || []);
      }
    } catch (e) {}
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await authFetch('/api/admin/audit-logs');
      if (res.ok) {
        const d = await res.json();
        setAuditLogs(d.logs || []);
      }
    } catch (e) {}
  };

  const fetchWebhooks = async () => {
    try {
      const res = await authFetch('/api/admin/webhooks');
      if (res.ok) {
        const d = await res.json();
        setWebhookEvents(d.events || []);
      }
    } catch (e) {}
  };

  const fetchSettings = async () => {
    try {
      const res = await authFetch('/api/admin/settings');
      if (res.ok) {
        const d = await res.json();
        if (d.settings) {
          setSiteSettings((prev) => ({
            ...prev,
            ...d.settings,
            subscriptionPrices: {
              basic: d.settings.subscriptionPrices?.basic ?? 9900,
              standard: d.settings.subscriptionPrices?.standard ?? 14900,
              premium: d.settings.subscriptionPrices?.premium ?? 19900
            },
            faq: Array.isArray(d.settings.faq) ? d.settings.faq : []
          }));
        }
      }
    } catch (e) {}
  };

  const fetchUploadConfig = async () => {
    try {
      const res = await authFetch('/api/admin/upload/config');
      if (res.ok) {
        const d = await res.json();
        setUploadConfig({ configured: Boolean(d.configured), provider: d.provider || 'cloudinary' });
      }
    } catch (e) {}
  };

  const refreshAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchMovies(),
      fetchCategories(),
      fetchUsers(),
      fetchPayments(),
      fetchSubscriptions(),
      fetchAuditLogs(),
      fetchWebhooks(),
      fetchSettings(),
      fetchUploadConfig()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Handle Cloudinary image upload (Phase 5)
  const handleFileUpload = async (file: File, target: 'posterUrl' | 'backdropUrl' | 'categoryImage') => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      notify('error', locale === 'en' ? 'Image size must not exceed 5MB.' : 'Зургийн хэмжээ 5MB-аас хэтрэхгүй байх ёстой.');
      return;
    }

    setUploadingField(target);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(file);
      });

      const res = await authFetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, base64Data })
      });
      const data = await res.json();

      if (!res.ok) {
        notify('error', locale === 'en' ? (data.messageEn || data.message || 'Image upload failed') : (data.message || 'Зураг хуулахад алдаа гарлаа.'));
        return;
      }

      if (target === 'posterUrl') {
        setFormData((prev) => ({ ...prev, posterUrl: data.url }));
      } else if (target === 'backdropUrl') {
        setFormData((prev) => ({ ...prev, backdropUrl: data.url }));
      } else if (target === 'categoryImage') {
        setNewCatImageUrl(data.url);
      }
      notify('success', locale === 'en' ? 'Image uploaded to Cloudinary!' : 'Зураг Cloudinary руу амжилттай хуулагдлаа!');
    } catch (err: any) {
      notify('error', err.message || 'Зураг хуулахад алдаа гарлаа.');
    } finally {
      setUploadingField(null);
    }
  };

  // Handle movie submission (Create or Update)
  const handleMovieSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMovieSubmitting(true);
    try {
      const isEditing = Boolean(selectedMovieForEdit);
      const url = isEditing ? `/api/admin/movies/${selectedMovieForEdit.id}` : '/api/admin/movies';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (!res.ok) {
        // Preserve entered form data on failure
        notify('error', data.message || 'Кино хадгалахад алдаа гарлаа.');
        return;
      }

      notify('success', data.message || 'Кино MongoDB өгөгдлийн санд амжилттай хадгалагдлаа.');
      await Promise.all([fetchMovies(), fetchStats(), fetchAuditLogs()]);
      setActiveSection('movies');
      setSelectedMovieForEdit(null);
    } catch (err: any) {
      notify('error', err.message || 'Сүлжээний алдаа.');
    } finally {
      setMovieSubmitting(false);
    }
  };

  // Toggle publish
  const handleTogglePublish = async (movieId: string) => {
    try {
      const res = await authFetch(`/api/admin/movies/${movieId}/toggle-publish`, { method: 'PATCH' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        await Promise.all([fetchMovies(), fetchStats(), fetchAuditLogs()]);
        notify('success', 'Киноны нийтлэлийн төлөв өөрчлөгдлөө.');
      } else {
        notify('error', data.message || 'Төлөв өөрчлөхөд алдаа гарлаа.');
      }
    } catch (e: any) {
      notify('error', e.message || 'Сүлжээний алдаа.');
    }
  };

  // Toggle featured
  const handleToggleFeatured = async (movieId: string) => {
    try {
      const res = await authFetch(`/api/admin/movies/${movieId}/toggle-featured`, { method: 'PATCH' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        await Promise.all([fetchMovies(), fetchAuditLogs()]);
        notify('success', 'Онцлох төлөв өөрчлөгдлөө.');
      } else {
        notify('error', data.message || 'Төлөв өөрчлөхөд алдаа гарлаа.');
      }
    } catch (e: any) {
      notify('error', e.message || 'Сүлжээний алдаа.');
    }
  };

  // Delete movie
  const handleDeleteMovie = async () => {
    if (!deleteConfirmMovie) return;
    try {
      const res = await authFetch(`/api/admin/movies/${deleteConfirmMovie.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        notify('success', 'Кино амжилттай устгагдлаа.');
        setDeleteConfirmMovie(null);
        await Promise.all([fetchMovies(), fetchStats(), fetchAuditLogs()]);
      } else {
        notify('error', data.message || 'Устгахад алдаа гарлаа.');
      }
    } catch (e) {
      notify('error', 'Устгахад алдаа гарлаа.');
    }
  };

  // Switch to edit movie form
  const handleStartEdit = (movie: any) => {
    setSelectedMovieForEdit(movie);
    setFormData({
      titleMn: movie.titleMn || movie.title?.mn || '',
      titleEn: movie.titleEn || movie.title?.en || '',
      slug: movie.slug || movie.id,
      synopsisMn: movie.synopsisMn || movie.descriptionMn || movie.synopsis?.mn || '',
      synopsisEn: movie.synopsisEn || movie.descriptionEn || movie.synopsis?.en || '',
      posterUrl: movie.posterUrl || '',
      backdropUrl: movie.backdropUrl || movie.bannerUrl || movie.posterUrl || '',
      videoUrl: movie.videoUrl || movie.videoSource || '',
      trailerUrl: movie.trailerUrl || '',
      year: movie.year || 2026,
      duration: movie.duration || '2h 00m',
      genres: Array.isArray(movie.genres) && movie.genres.length > 0 ? movie.genres : ['Sci-Fi'],
      rating: movie.rating || '9.0',
      ageRating: movie.ageRating || '13+',
      quality: movie.quality || '4K HDR',
      directorMn: movie.directorMn || movie.director?.mn || '',
      directorEn: movie.directorEn || movie.director?.en || '',
      castMn: movie.castMn || movie.cast?.mn || '',
      castEn: movie.castEn || movie.cast?.en || '',
      language: movie.language || 'mn',
      type: movie.type || 'movie',
      featured: Boolean(movie.featured),
      isPremium: movie.isPremium !== false,
      minPlan: movie.minPlan || 'basic',
      published: movie.published !== false
    });
    setActiveSection('edit-movie');
  };

  // Category Add
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatNameMn || !newCatNameEn || !newCatSlug) return;
    try {
      const res = await authFetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: newCatSlug.toLowerCase().trim(),
          nameMn: newCatNameMn.trim(),
          nameEn: newCatNameEn.trim(),
          descriptionMn: newCatDescMn.trim(),
          imageUrl: newCatImageUrl.trim() || undefined
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        notify('success', 'Ангилал амжилттай нэмэгдлээ.');
        setNewCatSlug('');
        setNewCatNameMn('');
        setNewCatNameEn('');
        setNewCatDescMn('');
        setNewCatImageUrl('');
        await Promise.all([fetchCategories(), fetchAuditLogs()]);
      } else {
        notify('error', data.message || 'Ангилал нэмэхэд алдаа гарлаа.');
      }
    } catch (e) {}
  };

  // Category Delete
  const handleDeleteCategory = async (catId: string) => {
    try {
      const res = await authFetch(`/api/admin/categories/${catId}`, { method: 'DELETE' });
      if (res.ok) {
        notify('success', 'Ангилал устгагдлаа.');
        await Promise.all([fetchCategories(), fetchAuditLogs()]);
      }
    } catch (e) {}
  };

  // User Role Switch (with last admin safeguard)
  const handleToggleUserRole = async (u: any) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    try {
      const res = await authFetch(`/api/admin/users/${u.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.message || 'Эрх өөрчлөхөд алдаа гарлаа.');
        return;
      }
      notify('success', `${u.name} хэрэглэгчийн эрх: ${newRole}`);
      await Promise.all([fetchUsers(), fetchStats(), fetchAuditLogs()]);
    } catch (e: any) {
      notify('error', e.message);
    }
  };

  // User Status Toggle (Suspend / Reactivate)
  const handleToggleUserStatus = async (u: any) => {
    const newStatus = u.status === 'suspended' ? 'active' : 'suspended';
    try {
      const res = await authFetch(`/api/admin/users/${u.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.message || 'Төлөв өөрчлөхөд алдаа гарлаа.');
        return;
      }
      notify('success', `${u.name} хэрэглэгч: ${newStatus}`);
      await Promise.all([fetchUsers(), fetchAuditLogs()]);
    } catch (e: any) {
      notify('error', e.message);
    }
  };

  // Approve Bank Transfer Payment (Phase 3)
  const handleApprovePayment = async (payment: any) => {
    const paymentKey = payment.orderNumber || payment.id;
    setProcessingPaymentId(paymentKey);
    try {
      const res = await authFetch(`/api/admin/payments/${paymentKey}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.message || 'Төлбөр баталгаажуулахад алдаа гарлаа.');
        return;
      }
      notify('success', data.message || 'Төлбөр баталгаажиж гишүүнчлэл идэвхжлээ.');
      await Promise.all([fetchPayments(), fetchSubscriptions(), fetchUsers(), fetchStats(), fetchAuditLogs()]);
    } catch (err: any) {
      notify('error', err.message || 'Сүлжээний алдаа.');
    } finally {
      setProcessingPaymentId(null);
    }
  };

  // Reject Bank Transfer Payment (Phase 3)
  const handleConfirmRejectPayment = async () => {
    if (!rejectPaymentModal) return;
    const paymentKey = rejectPaymentModal.orderNumber || rejectPaymentModal.id;
    setProcessingPaymentId(paymentKey);
    try {
      const res = await authFetch(`/api/admin/payments/${paymentKey}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() || 'Банкны хуулгаар гүйлгээ олдсонгүй.' })
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.message || 'Төлбөр татгалзахад алдаа гарлаа.');
        return;
      }
      notify('success', data.message || 'Төлбөрийн хүсэлтийг татгалзлаа.');
      setRejectPaymentModal(null);
      setRejectReason('');
      await Promise.all([fetchPayments(), fetchStats(), fetchAuditLogs()]);
    } catch (err: any) {
      notify('error', err.message || 'Сүлжээний алдаа.');
    } finally {
      setProcessingPaymentId(null);
    }
  };

  // Adjust Subscription
  const handleApplySubscriptionAdjust = async () => {
    if (!subAdjustModal) return;
    try {
      const res = await authFetch('/api/admin/subscriptions/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: subAdjustModal.userId,
          planId: adjustPlanId,
          durationDays: adjustDurationDays
        })
      });
      if (res.ok) {
        notify('success', 'Гишүүнчлэл амжилттай тохируулагдлаа.');
        setSubAdjustModal(null);
        await Promise.all([fetchSubscriptions(), fetchUsers(), fetchStats(), fetchAuditLogs()]);
      }
    } catch (e) {
      notify('error', 'Тохируулахад алдаа гарлаа.');
    }
  };

  // Save Website Settings (Phase 7)
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(siteSettings)
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.message || 'Тохиргоо хадгалахад алдаа гарлаа.');
        return;
      }
      if (data.settings) {
        setSiteSettings((prev) => ({ ...prev, ...data.settings }));
      }
      notify('success', data.message || 'Сайтын тохиргоо MongoDB-д амжилттай хадгалагдлаа.');
      await fetchAuditLogs();
    } catch (err: any) {
      notify('error', err.message || 'Сүлжээний алдаа.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Admin Profile Update & Password Change (Phase 8)
  const handleUpdateAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;
    setProfileSaving(true);
    try {
      const res = await authFetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.message || 'Профайл шинэчлэхэд алдаа гарлаа.');
        return;
      }
      notify('success', 'Админ нэр амжилттай шинэчлэгдлээ.');
    } catch (err: any) {
      notify('error', err.message || 'Сүлжээний алдаа.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    if (newPassword !== confirmNewPassword) {
      notify('error', 'Шинэ нууц үг хоорондоо таарахгүй байна.');
      return;
    }
    setProfileSaving(true);
    try {
      const res = await authFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.message || 'Нууц үг солиход алдаа гарлаа.');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      notify('success', 'Админ нууц үг амжилттай солигдлоо.');
    } catch (err: any) {
      notify('error', err.message || 'Сүлжээний алдаа.');
    } finally {
      setProfileSaving(false);
    }
  };

  // Filtered lists
  const filteredMovies = movies.filter((m) => {
    const matchSearch =
      !movieSearch ||
      (m.titleMn || m.title?.mn || '').toLowerCase().includes(movieSearch.toLowerCase()) ||
      (m.titleEn || m.title?.en || '').toLowerCase().includes(movieSearch.toLowerCase());
    const matchGenre =
      movieGenreFilter === 'all' ||
      (m.genres || []).some((g: string) => g.toLowerCase().includes(movieGenreFilter.toLowerCase()));
    return matchSearch && matchGenre;
  });

  const filteredUsers = usersList.filter((u) => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  const filteredPayments = paymentsList.filter((p) => {
    if (paymentStatusFilter === 'all') return true;
    return p.status === paymentStatusFilter;
  });

  const pendingReviewCount = paymentsList.filter((p) => p.status === 'PENDING_REVIEW').length;

  // Nav menu items (All 10 required sections)
  const menuItems = [
    { id: 'dashboard', label: tAdmin('dashboardNav'), icon: LayoutDashboard },
    { id: 'movies', label: tAdmin('moviesNav'), icon: Film, count: movies.length },
    { id: 'add-movie', label: tAdmin('addMovieNav'), icon: PlusCircle },
    { id: 'categories', label: tAdmin('categoriesNav'), icon: FolderTree, count: categories.length },
    { id: 'users', label: tAdmin('usersNav'), icon: Users, count: usersList.length },
    { id: 'payments', label: tAdmin('paymentsNav'), icon: CreditCard, count: pendingReviewCount || paymentsList.length },
    { id: 'subscriptions', label: tAdmin('subscriptionsNav'), icon: Crown, count: subscriptionsList.length },
    { id: 'audit-logs', label: locale === 'en' ? 'Audit Trail' : 'Аудит лог', icon: Shield, count: auditLogs.length },
    { id: 'analytics', label: tAdmin('analyticsNav'), icon: BarChart3 },
    { id: 'settings', label: tAdmin('settingsNav'), icon: Settings },
    { id: 'profile', label: locale === 'en' ? 'Admin Profile' : 'Админ профайл', icon: UserCheck }
  ];

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex select-none">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0a0f1d] border-r border-white/10 shrink-0 sticky top-0 h-screen z-30">
        {/* Brand Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-white tracking-tight">SODON</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 uppercase">
              ADMIN CMS
            </span>
          </div>
          <LanguageSwitcher />
        </div>

        {/* Current Admin User info */}
        <div className="px-5 py-3 border-b border-white/5 bg-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#e50914] to-amber-600 flex items-center justify-center font-black text-xs">
            {currentUser?.name?.charAt(0) || 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white truncate">{currentUser?.name || 'Administrator'}</div>
            <div className="text-[10px] text-slate-400 truncate">{currentUser?.email}</div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id as AdminSection);
                  if (item.id === 'add-movie') {
                    setSelectedMovieForEdit(null);
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#e50914] to-rose-700 text-white shadow-lg shadow-rose-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-white/10 space-y-1">
          <button
            onClick={onBackToHome}
            className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
          >
            <Film className="w-4 h-4 text-[#e5a93c]" />
            <span>{tAdmin('backToCatalogue')}</span>
          </button>
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{tAdmin('signOutNav')}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-64 bg-[#0a0f1d] border-r border-white/10 h-full flex flex-col p-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="font-black text-white text-lg">AI MOVIE CMS</span>
              <button onClick={() => setMobileSidebarOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id as AdminSection);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold ${
                    activeSection === item.id ? 'bg-[#e50914] text-white' : 'text-slate-300'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
            <button
              onClick={onBackToHome}
              className="w-full py-2 bg-white/10 text-white rounded-lg text-xs font-bold"
            >
              {tAdmin('backToCatalogue')}
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className="h-16 px-4 sm:px-8 border-b border-white/10 bg-[#0a0f1d]/80 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-white/5 text-slate-300 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-base sm:text-lg font-black text-white capitalize">
              {menuItems.find((m) => m.id === activeSection)?.label || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshAllData}
              disabled={loading}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="lg:hidden">
              <LanguageSwitcher />
            </div>
            <button
              onClick={onBackToHome}
              className="hidden sm:flex px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-bold cursor-pointer"
            >
              {tAdmin('backToCatalogue')}
            </button>
          </div>
        </header>

        {/* Global Feedback Toast */}
        {feedback && (
          <div
            className={`mx-4 sm:mx-8 mt-4 p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-bold animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Section View Router */}
        <div className="p-4 sm:p-8 space-y-8 flex-1">
          {/* ========================================================= */}
          {/* 1. DASHBOARD VIEW */}
          {/* ========================================================= */}
          {activeSection === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in">
              {/* 6 Real Stat Cards from MongoDB */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="p-4 rounded-2xl bg-[#0f172a] border border-white/10 shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold uppercase">{tAdmin('totalMoviesCard')}</span>
                    <Film className="w-4 h-4 text-[#e5a93c]" />
                  </div>
                  <div className="text-2xl font-black text-white">{stats?.totalMovies ?? movies.length}</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#0f172a] border border-white/10 shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold uppercase">{tAdmin('totalUsersCard')}</span>
                    <Users className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-black text-white">{stats?.totalUsers ?? usersList.length}</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#0f172a] border border-white/10 shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold uppercase">{tAdmin('activeSubsCard')}</span>
                    <Crown className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-amber-400">{stats?.activeSubscriptions ?? 0}</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#0f172a] border border-white/10 shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold uppercase">{tAdmin('totalRevenueCard')}</span>
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-lg font-black text-emerald-400">
                    {formatCurrency(stats?.totalRevenue ?? 0, locale, false)}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#0f172a] border border-white/10 shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold uppercase">{tAdmin('monthRevenueCard')}</span>
                    <TrendingUp className="w-4 h-4 text-teal-400" />
                  </div>
                  <div className="text-lg font-black text-teal-400">
                    {formatCurrency(stats?.monthRevenue ?? 0, locale, false)}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#0f172a] border border-white/10 shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold uppercase">{tAdmin('pendingPaymentsCard')}</span>
                    <Clock className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="text-2xl font-black text-orange-400">{stats?.pendingPayments ?? 0}</div>
                </div>
              </div>

              {/* Monthly Revenue Trend & Subscription Distribution Visual Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 6-Month Revenue Bar Chart */}
                <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0f172a] border border-white/10 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#e5a93c]" />
                      <span>{tAdmin('monthlyRevenueChart')}</span>
                    </h3>
                    <span className="text-[11px] text-slate-400">MNT ({locale === 'en' ? 'Verified' : 'Баталгаажсан'})</span>
                  </div>

                  <div className="pt-6 pb-2 grid grid-cols-6 gap-3 items-end h-44">
                    {(stats?.monthlyRevenueData || []).map((m: any, idx: number) => {
                      const maxVal = Math.max(1, ...((stats?.monthlyRevenueData || []).map((x: any) => x.amount) || [1]));
                      const heightPercent = Math.max(12, Math.round((m.amount / maxVal) * 100));
                      return (
                        <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end">
                          <div className="text-[10px] text-emerald-400 font-bold truncate max-w-full">
                            {m.amount > 0 ? `${Math.round(m.amount / 1000)}k` : '0₮'}
                          </div>
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className="w-full bg-gradient-to-t from-emerald-600 via-teal-500 to-emerald-400 rounded-t-lg transition-all duration-500"
                          />
                          <span className="text-[10px] text-slate-400 font-medium truncate">{m.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Subscription Distribution */}
                <div className="p-6 rounded-2xl bg-[#0f172a] border border-white/10 shadow-xl space-y-4">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>{tAdmin('subscriptionDistChart')}</span>
                  </h3>

                  <div className="space-y-3 pt-2">
                    {[
                      { plan: 'Premium 4K', key: 'premium', count: stats?.subscriptionDistribution?.premium ?? 0, color: 'bg-amber-400' },
                      { plan: 'Standard VIP', key: 'standard', count: stats?.subscriptionDistribution?.standard ?? 0, color: 'bg-emerald-400' },
                      { plan: 'Basic', key: 'basic', count: stats?.subscriptionDistribution?.basic ?? 0, color: 'bg-blue-400' }
                    ].map((item) => (
                      <div key={item.key} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 font-semibold">{item.plan}</span>
                          <span className="text-white font-black">{item.count}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full ${item.color} rounded-full`}
                            style={{
                              width: `${
                                stats?.activeSubscriptions
                                  ? Math.round((item.count / stats.activeSubscriptions) * 100)
                                  : 0
                              }%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-white/10 text-center">
                    <span className="text-xs text-slate-400 font-semibold">
                      {locale === 'en' ? 'Active Paying Subscribers: ' : 'Нийт төлбөртэй гишүүд: '}
                    </span>
                    <span className="text-sm font-black text-white ml-1">
                      {stats?.activeSubscriptions ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Tables Grid: Latest Users & Recent Payments */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Latest Registered Users */}
                <div className="p-6 rounded-2xl bg-[#0f172a] border border-white/10 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span>{tAdmin('recentUsers')}</span>
                    </h3>
                    <button
                      onClick={() => setActiveSection('users')}
                      className="text-xs text-[#e5a93c] hover:underline cursor-pointer"
                    >
                      {locale === 'en' ? 'View All' : 'Бүгдийг харах'}
                    </button>
                  </div>

                  <div className="divide-y divide-white/5 text-xs">
                    {(stats?.recentUsers || usersList.slice(0, 5)).map((u: any) => (
                      <div key={u.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white">{u.name}</div>
                          <div className="text-[11px] text-slate-400">{u.email}</div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            u.role === 'admin'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-white/10 text-slate-400'
                          }`}
                        >
                          {u.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Payments */}
                <div className="p-6 rounded-2xl bg-[#0f172a] border border-white/10 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      <span>{tAdmin('recentPayments')}</span>
                    </h3>
                    <button
                      onClick={() => setActiveSection('payments')}
                      className="text-xs text-[#e5a93c] hover:underline cursor-pointer"
                    >
                      {locale === 'en' ? 'View All' : 'Бүгдийг харах'}
                    </button>
                  </div>

                  <div className="divide-y divide-white/5 text-xs">
                    {(stats?.recentPayments || paymentsList.slice(0, 5)).map((p: any) => (
                      <div key={p.orderNumber} className="py-2.5 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white">{p.orderNumber}</div>
                          <div className="text-[11px] text-slate-400">
                            {p.userName || p.userId} · {p.planId}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-emerald-400">{formatCurrency(p.amount, locale, false)}</div>
                          <span
                            className={`text-[9px] font-black uppercase ${
                              p.status === 'PAID'
                                ? 'text-emerald-400'
                                : p.status === 'PENDING'
                                ? 'text-amber-400'
                                : 'text-slate-500'
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. MOVIE MANAGEMENT TABLE */}
          {/* ========================================================= */}
          {activeSection === 'movies' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* Search query */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={movieSearch}
                      onChange={(e) => setMovieSearch(e.target.value)}
                      placeholder={locale === 'en' ? 'Search movies...' : 'Кино хайх...'}
                      className="bg-[#111827] border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 w-48 sm:w-64 focus:outline-none focus:border-[#e5a93c]"
                    />
                  </div>

                  {/* Genre filter */}
                  <select
                    value={movieGenreFilter}
                    onChange={(e) => setMovieGenreFilter(e.target.value)}
                    className="bg-[#111827] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="all">{locale === 'en' ? 'All Genres' : 'Бүх төрөл'}</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.nameMn}>
                        {c.nameMn} ({c.nameEn})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => {
                    setSelectedMovieForEdit(null);
                    setFormData({
                      titleMn: '',
                      titleEn: '',
                      slug: '',
                      synopsisMn: '',
                      synopsisEn: '',
                      posterUrl: '',
                      backdropUrl: '',
                      videoUrl: '',
                      trailerUrl: '',
                      year: new Date().getFullYear(),
                      duration: '2h 00m',
                      genres: ['Sci-Fi'],
                      rating: '9.0',
                      ageRating: '13+',
                      quality: '4K HDR',
                      directorMn: '',
                      directorEn: '',
                      castMn: '',
                      castEn: '',
                      language: 'mn',
                      type: 'movie',
                      featured: false,
                      isPremium: true,
                      minPlan: 'basic',
                      published: true
                    });
                    setActiveSection('add-movie');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#e50914] to-rose-700 hover:brightness-110 text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-950/40"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{tAdmin('addMovie')}</span>
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">Постер</th>
                      <th className="py-3.5 px-4">Киноны нэр</th>
                      <th className="py-3.5 px-4">Төрөл</th>
                      <th className="py-3.5 px-4">Он / Хугацаа</th>
                      <th className="py-3.5 px-4">Төлөв</th>
                      <th className="py-3.5 px-4">Эрх</th>
                      <th className="py-3.5 px-4 text-right">{tAdmin('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredMovies.map((m) => (
                      <tr key={m.id} className="hover:bg-white/5 transition">
                        <td className="py-3 px-4">
                          <img
                            src={m.posterUrl}
                            alt={m.titleMn}
                            className="w-12 h-16 object-cover rounded-lg bg-black/50"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-black text-white text-xs sm:text-sm">{m.titleMn || m.title?.mn}</div>
                          <div className="text-[11px] text-slate-400">{m.titleEn || m.title?.en}</div>
                          <div className="text-[10px] text-[#e5a93c] mt-0.5">★ {m.rating} · {m.quality}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {(m.genres || []).map((g: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-white/10 text-slate-300 text-[10px]">
                                {g}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-medium">
                          {m.year} · {m.duration}
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                m.published !== false
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-500/20 text-slate-400'
                              }`}
                            >
                              {m.published !== false ? tAdmin('published') : tAdmin('draft')}
                            </span>
                            {m.featured && (
                              <span className="block text-[10px] text-amber-400 font-bold">★ {tAdmin('featuredBadge')}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#e5a93c]/20 text-[#e5a93c] uppercase">
                            {m.minPlan || 'basic'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleTogglePublish(m.id)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                              title={m.published ? tAdmin('unpublish') : tAdmin('publish')}
                            >
                              {m.published ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                            </button>
                            <button
                              onClick={() => handleToggleFeatured(m.id)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                              title={m.featured ? tAdmin('unfeature') : tAdmin('feature')}
                            >
                              <Star className={`w-3.5 h-3.5 ${m.featured ? 'text-amber-400 fill-amber-400' : 'text-slate-500'}`} />
                            </button>
                            <button
                              onClick={() => handleStartEdit(m)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-blue-400"
                              title={tAdmin('edit')}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmMovie(m)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                              title={tAdmin('delete')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3 & 4. ADD & EDIT MOVIE FORM (All 20 Required Fields) */}
          {/* ========================================================= */}
          {(activeSection === 'add-movie' || activeSection === 'edit-movie') && (
            <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-2xl bg-[#0f172a] border border-white/10 shadow-2xl space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white">
                    {selectedMovieForEdit ? `${tAdmin('editMovie')}: ${formData.titleEn}` : tAdmin('addMovie')}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {locale === 'en'
                      ? 'Configure multilingual titles, streaming video sources, genres, and metadata'
                      : 'Монгол ба Англи хэлний мэдээлэл, 4K видео эх үүсвэрийг тохируулах'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('movies');
                    setSelectedMovieForEdit(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
                >
                  {locale === 'en' ? 'Back' : 'Буцах'}
                </button>
              </div>

              <form onSubmit={handleMovieSubmit} className="space-y-6 text-xs">
                {/* 1 & 2. Titles & Slug */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5">🇲🇳 {tAdmin('titleMn')} *</label>
                    <input
                      type="text"
                      required
                      value={formData.titleMn}
                      onChange={(e) => setFormData({ ...formData, titleMn: e.target.value })}
                      placeholder="Жишээ: Алтан Орд"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border border-white/15 text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5">🇺🇸 {tAdmin('titleEn')} *</label>
                    <input
                      type="text"
                      required
                      value={formData.titleEn}
                      onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                      placeholder="e.g. The Golden Horde"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border border-white/15 text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5">Slug (URL) *</label>
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                      placeholder="golden-horde-2026"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border border-white/15 text-white font-mono"
                    />
                  </div>
                </div>

                {/* 4 & 5. Synopsis: MN & EN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5">🇲🇳 {tAdmin('synopsisMn')} *</label>
                    <textarea
                      rows={4}
                      required
                      value={formData.synopsisMn}
                      onChange={(e) => setFormData({ ...formData, synopsisMn: e.target.value })}
                      placeholder="Киноны товч агуулга..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border border-white/15 text-white resize-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5">🇺🇸 {tAdmin('synopsisEn')} *</label>
                    <textarea
                      rows={4}
                      required
                      value={formData.synopsisEn}
                      onChange={(e) => setFormData({ ...formData, synopsisEn: e.target.value })}
                      placeholder="English storyline..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border border-white/15 text-white resize-none"
                    />
                  </div>
                </div>

                {/* 6 & 7. Poster & Backdrop with Cloudinary Upload & Image Previews */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {uploadConfig.configured
                        ? 'Cloudinary үүлэн хадгалалт идэвхтэй (Зураг шууд хуулах эсвэл URL оруулах)'
                        : 'Зургийн URL оруулах эсвэл Cloudinary тохируулж файл хуулах боломжтой'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        uploadConfig.configured
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {uploadConfig.configured ? 'CLOUDINARY READY' : 'URL FALLBACK MODE'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block font-bold text-slate-300">Постер зураг (Poster URL) *</label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          required
                          value={formData.posterUrl}
                          onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value })}
                          placeholder="https://..."
                          className="flex-1 px-3 py-2 rounded-lg bg-[#111827] border border-white/15 text-white text-xs"
                        />
                        <label className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0">
                          <Upload className="w-3.5 h-3.5 text-[#e5a93c]" />
                          <span>{uploadingField === 'posterUrl' ? '...' : 'Файл'}</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file, 'posterUrl');
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                      {formData.posterUrl && (
                        <div className="mt-2 flex items-center gap-2">
                          <img src={formData.posterUrl} alt="Poster preview" className="w-16 h-24 object-cover rounded-md border border-white/20" />
                          <span className="text-[10px] text-slate-400">Постер урьдчилан харах</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block font-bold text-slate-300">Backdrop баннер зураг (Backdrop URL) *</label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          required
                          value={formData.backdropUrl}
                          onChange={(e) => setFormData({ ...formData, backdropUrl: e.target.value })}
                          placeholder="https://..."
                          className="flex-1 px-3 py-2 rounded-lg bg-[#111827] border border-white/15 text-white text-xs"
                        />
                        <label className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0">
                          <Upload className="w-3.5 h-3.5 text-[#e5a93c]" />
                          <span>{uploadingField === 'backdropUrl' ? '...' : 'Файл'}</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file, 'backdropUrl');
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                      {formData.backdropUrl && (
                        <div className="mt-2 flex items-center gap-2">
                          <img src={formData.backdropUrl} alt="Backdrop preview" className="w-28 h-16 object-cover rounded-md border border-white/20" />
                          <span className="text-[10px] text-slate-400">Баннер урьдчилан харах</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 8 & 9. Video Stream URL & Trailer URL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Киноны видео эх сурвалж (MP4 / HLS) *</label>
                    <input
                      type="url"
                      required
                      value={formData.videoUrl}
                      onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                      placeholder="https://commondatastorage.googleapis.com/.../video.mp4"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border border-white/15 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Трейлер видео URL</label>
                    <input
                      type="url"
                      value={formData.trailerUrl}
                      onChange={(e) => setFormData({ ...formData, trailerUrl: e.target.value })}
                      placeholder="https://commondatastorage.googleapis.com/.../trailer.mp4"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border border-white/15 text-white font-mono"
                    />
                  </div>
                </div>

                {/* Genres (Multi-value input / tag chips) */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">
                    Төрөл жанр (Genres — таслалаар тусгаарлана уу) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.genres.join(', ')}
                    onChange={(e) => {
                      const list = e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean);
                      setFormData({ ...formData, genres: list.length > 0 ? list : ['Sci-Fi'] });
                    }}
                    placeholder="Sci-Fi, Уран Зөгнөлт, Action, Түүхэн"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border border-white/15 text-white"
                  />
                </div>

                {/* 10, 11, 12, 13, 14, 15, 16, 17: Technical Attributes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">{tAdmin('year')}</label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/15 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">{tAdmin('duration')}</label>
                    <input
                      type="text"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="2h 15m"
                      className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/15 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">{tAdmin('rating')}</label>
                    <input
                      type="text"
                      value={formData.rating}
                      onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/15 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">{tAdmin('quality')}</label>
                    <select
                      value={formData.quality}
                      onChange={(e) => setFormData({ ...formData, quality: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/15 text-white"
                    >
                      <option value="4K HDR">4K HDR</option>
                      <option value="1080p Full HD">1080p Full HD</option>
                      <option value="720p HD">720p HD</option>
                    </select>
                  </div>
                </div>

                {/* Director & Cast (MN & EN) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">Найруулагч (MN / EN)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={formData.directorMn}
                        onChange={(e) => setFormData({ ...formData, directorMn: e.target.value })}
                        placeholder="Б. Тэмүүлэн"
                        className="px-3 py-2 rounded-lg bg-[#111827] border border-white/15 text-white"
                      />
                      <input
                        type="text"
                        value={formData.directorEn}
                        onChange={(e) => setFormData({ ...formData, directorEn: e.target.value })}
                        placeholder="Temuulen B."
                        className="px-3 py-2 rounded-lg bg-[#111827] border border-white/15 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Гол дүрүүд (MN / EN)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={formData.castMn}
                        onChange={(e) => setFormData({ ...formData, castMn: e.target.value })}
                        placeholder="Аватар #04, Нео-Мөнхбат"
                        className="px-3 py-2 rounded-lg bg-[#111827] border border-white/15 text-white"
                      />
                      <input
                        type="text"
                        value={formData.castEn}
                        onChange={(e) => setFormData({ ...formData, castEn: e.target.value })}
                        placeholder="Avatar #04, Neo-Munkhbat"
                        className="px-3 py-2 rounded-lg bg-[#111827] border border-white/15 text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Plan Requirement & Movie Type */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">{tAdmin('minPlan')}</label>
                    <select
                      value={formData.minPlan}
                      onChange={(e) => setFormData({ ...formData, minPlan: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/15 text-white uppercase"
                    >
                      <option value="basic">Basic (9,900₮)</option>
                      <option value="standard">Standard (14,900₮)</option>
                      <option value="premium">Premium (19,900₮)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Бүтээлийн төрөл</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/15 text-white"
                    >
                      <option value="movie">Бүрэн хэмжээний Кино (Movie)</option>
                      <option value="series">Олон ангит Цуврал (Series)</option>
                    </select>
                  </div>

                  {/* 18, 19, 20. Checkboxes */}
                  <div className="flex flex-col justify-center space-y-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.featured}
                        onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                        className="rounded text-[#e50914]"
                      />
                      <span className="text-white font-bold">Онцлох кино (Featured)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isPremium}
                        onChange={(e) => setFormData({ ...formData, isPremium: e.target.checked })}
                        className="rounded text-[#e50914]"
                      />
                      <span className="text-white font-bold">Төлбөртэй (Premium)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.published}
                        onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                        className="rounded text-emerald-500"
                      />
                      <span className="text-emerald-400 font-bold">Нийтлэх (Published)</span>
                    </label>
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveSection('movies')}
                    className="px-4 py-2.5 rounded-xl bg-white/10 text-white font-bold cursor-pointer"
                  >
                    {locale === 'en' ? 'Cancel' : 'Цуцлах'}
                  </button>
                  <button
                    type="submit"
                    disabled={movieSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#e50914] to-rose-700 hover:brightness-110 text-white font-black shadow-lg shadow-rose-950/40 cursor-pointer disabled:opacity-50"
                  >
                    {movieSubmitting
                      ? 'Хадгалж байна...'
                      : selectedMovieForEdit
                      ? tAdmin('saveChanges')
                      : 'Шинэ Кино Нэмэх'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. CATEGORY MANAGEMENT */}
          {/* ========================================================= */}
          {activeSection === 'categories' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Add Category Form */}
                <form
                  onSubmit={handleAddCategory}
                  className="p-6 rounded-2xl bg-[#0f172a] border border-white/10 shadow-xl space-y-4 h-fit"
                >
                  <h3 className="text-sm font-black text-white flex items-center gap-2 border-b border-white/10 pb-3">
                    <FolderTree className="w-4 h-4 text-[#e5a93c]" />
                    <span>Шинэ ангилал нэмэх</span>
                  </h3>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Slug (URL code) *</label>
                    <input
                      type="text"
                      required
                      value={newCatSlug}
                      onChange={(e) => setNewCatSlug(e.target.value)}
                      placeholder="scifi"
                      className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/15 text-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Монгол нэр *</label>
                    <input
                      type="text"
                      required
                      value={newCatNameMn}
                      onChange={(e) => setNewCatNameMn(e.target.value)}
                      placeholder="Уран зөгнөлт"
                      className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/15 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">English Name *</label>
                    <input
                      type="text"
                      required
                      value={newCatNameEn}
                      onChange={(e) => setNewCatNameEn(e.target.value)}
                      placeholder="Sci-Fi"
                      className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/15 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Ангиллын зураг (Сонголттой)</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={newCatImageUrl}
                        onChange={(e) => setNewCatImageUrl(e.target.value)}
                        placeholder="https://..."
                        className="flex-1 px-3 py-2 rounded-lg bg-[#111827] border border-white/15 text-white text-xs"
                      />
                      <label className="px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0">
                        <Upload className="w-3.5 h-3.5 text-[#e5a93c]" />
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'categoryImage');
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Тайлбар</label>
                    <textarea
                      rows={2}
                      value={newCatDescMn}
                      onChange={(e) => setNewCatDescMn(e.target.value)}
                      placeholder="Энэ төрлийн онцлог..."
                      className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/15 text-white text-xs resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#e5a93c] hover:bg-amber-400 text-black font-extrabold text-xs cursor-pointer"
                  >
                    Ангилал нэмэх
                  </button>
                </form>

                {/* Categories Table */}
                <div className="lg:col-span-2 overflow-x-auto rounded-2xl border border-white/10 bg-[#0f172a] shadow-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Slug</th>
                        <th className="py-3 px-4">Монгол нэр</th>
                        <th className="py-3 px-4">English Name</th>
                        <th className="py-3 px-4">Тайлбар</th>
                        <th className="py-3 px-4 text-right">Устгах</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {categories.map((c) => (
                        <tr key={c.id} className="hover:bg-white/5">
                          <td className="py-3 px-4 font-mono text-slate-400">{c.slug}</td>
                          <td className="py-3 px-4 font-bold text-white">{c.nameMn}</td>
                          <td className="py-3 px-4 text-slate-300">{c.nameEn}</td>
                          <td className="py-3 px-4 text-slate-400 text-[11px] max-w-xs truncate">
                            {c.descriptionMn || '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteCategory(c.id)}
                              className="p-1 rounded text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 6. USER MANAGEMENT (With Role & Status Toggles & Safeguards) */}
          {/* ========================================================= */}
          {activeSection === 'users' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder={tAdmin('searchUsersPlaceholder')}
                    className="bg-[#111827] border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 w-64 focus:outline-none"
                  />
                </div>
                <div className="text-xs text-slate-400 font-bold">
                  {locale === 'en' ? `Total Users: ${usersList.length}` : `Нийт: ${usersList.length}`}
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0f172a] shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">Хэрэглэгч</th>
                      <th className="py-3.5 px-4">Имэйл</th>
                      <th className="py-3.5 px-4">{tAdmin('role')}</th>
                      <th className="py-3.5 px-4">Гишүүнчлэл</th>
                      <th className="py-3.5 px-4">Төлөв</th>
                      <th className="py-3.5 px-4 text-right">Үйлдлүүд</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5">
                        <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-xs font-black uppercase text-[#e5a93c]">
                            {u.name.charAt(0)}
                          </div>
                          <span>{u.name}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{u.email}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleUserRole(u)}
                            className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider cursor-pointer transition ${
                              u.role === 'admin'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                                : 'bg-white/10 text-slate-300 hover:bg-white/15'
                            }`}
                            title="Click to switch role between User and Admin"
                          >
                            {u.role === 'admin' ? tAdmin('adminRole') : tAdmin('userRole')}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          {u.subscription ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 uppercase">
                              {u.subscription.planId} VIP
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.status === 'suspended'
                                ? 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-950/40 text-emerald-400'
                            }`}
                          >
                            {u.status === 'suspended' ? tAdmin('suspendedStatus') : tAdmin('activeStatus')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSubAdjustModal({ userId: u.id, userName: u.name })}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[#e5a93c] text-[10px] font-bold cursor-pointer"
                            >
                              Багц нэмэх
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className={`p-1.5 rounded-lg text-xs cursor-pointer ${
                                u.status === 'suspended'
                                  ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                              }`}
                              title={u.status === 'suspended' ? tAdmin('reactivate') : tAdmin('suspend')}
                            >
                              {u.status === 'suspended' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 7. PAYMENTS MANAGEMENT (With Bank Transfer Approve/Reject) */}
          {/* ========================================================= */}
          {activeSection === 'payments' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold">{tAdmin('statusCol')}:</span>
                  {['all', 'PENDING_REVIEW', 'PENDING', 'PAID', 'REJECTED', 'EXPIRED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setPaymentStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition cursor-pointer ${
                        paymentStatusFilter === st
                          ? 'bg-[#e5a93c] text-black'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {st === 'all' ? 'Бүгд' : st}
                    </button>
                  ))}
                </div>

                {pendingReviewCount > 0 && (
                  <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#e5a93c]" />
                    <span>Шалгах хүлээгдэж буй банкны шилжүүлэг: {pendingReviewCount}</span>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0f172a] shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Захиалгын №</th>
                      <th className="py-3 px-4">Хэрэглэгч</th>
                      <th className="py-3 px-4">Багц / Дүн</th>
                      <th className="py-3 px-4">Суваг & Шилжүүлгийн мэдээлэл</th>
                      <th className="py-3 px-4">Төлөв</th>
                      <th className="py-3 px-4">Огноо</th>
                      <th className="py-3 px-4 text-right">Баталгаажуулалт</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredPayments.map((p) => {
                      const canVerifyBank =
                        p.paymentMethod === 'bank_transfer' &&
                        (p.status === 'PENDING_REVIEW' || p.status === 'PENDING');
                      const isProcessing = processingPaymentId === (p.orderNumber || p.id);

                      return (
                        <tr key={p.orderNumber} className="hover:bg-white/5">
                          <td className="py-3 px-4 font-mono font-bold text-white">{p.orderNumber}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-white">{p.userName}</div>
                            <div className="text-[10px] text-slate-400">{p.userEmail}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-200">{p.planName}</div>
                            <div className="font-bold text-emerald-400">{formatCurrency(p.amount, locale, false)}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-300 text-[11px]">
                            <div className="font-bold text-white">
                              {p.paymentMethod === 'bank_transfer' ? 'Хаан Банк (Данс)' : 'Wire.mn QPay'}
                            </div>
                            {p.senderName && (
                              <div className="text-[10px] text-amber-300 mt-0.5">
                                Илгээгч: {p.senderName} ({p.senderPhone || '—'})
                              </div>
                            )}
                            {p.bankTransferRef && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                Лавлагаа: {p.bankTransferRef}
                              </div>
                            )}
                            {p.rejectionReason && (
                              <div className="text-[10px] text-rose-400">
                                Шалтгаан: {p.rejectionReason}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                p.status === 'PAID'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : p.status === 'PENDING_REVIEW'
                                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                  : p.status === 'PENDING'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : p.status === 'REJECTED'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : 'bg-slate-500/20 text-slate-400'
                              }`}
                            >
                              {p.status}
                            </span>
                            {p.verifiedByAdminEmail && (
                              <div className="text-[9px] text-slate-500 mt-0.5">
                                {p.verifiedByAdminEmail}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {formatDate(new Date(p.createdAt), locale)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {canVerifyBank ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() => handleApprovePayment(p)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] cursor-pointer disabled:opacity-50"
                                >
                                  {isProcessing ? '...' : locale === 'en' ? 'Approve' : 'Батлах'}
                                </button>
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() => {
                                    setRejectPaymentModal(p);
                                    setRejectReason('');
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-bold text-[10px] cursor-pointer disabled:opacity-50"
                                >
                                  {locale === 'en' ? 'Reject' : 'Татгалзах'}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 8. SUBSCRIPTIONS MANAGEMENT */}
          {/* ========================================================= */}
          {activeSection === 'subscriptions' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0f172a] shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">Хэрэглэгч</th>
                      <th className="py-3.5 px-4">Багц</th>
                      <th className="py-3.5 px-4">Эхэлсэн огноо</th>
                      <th className="py-3.5 px-4">Дуусах огноо</th>
                      <th className="py-3.5 px-4">Төлөв</th>
                      <th className="py-3.5 px-4 text-right">Үйлдэл</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {subscriptionsList.map((s) => (
                      <tr key={s.id} className="hover:bg-white/5">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{s.userName}</div>
                          <div className="text-[10px] text-slate-400">{s.userEmail}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-[#e5a93c] uppercase">{s.planName}</td>
                        <td className="py-3 px-4 text-slate-400">{formatDate(new Date(s.startDate), locale)}</td>
                        <td className="py-3 px-4 text-slate-300 font-medium">{formatDate(new Date(s.endDate), locale)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              s.isActive
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {s.isActive ? 'ACTIVE' : 'EXPIRED'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSubAdjustModal({ userId: s.userId, userName: s.userName })}
                            className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 text-white text-[10px] font-bold cursor-pointer"
                          >
                            {tAdmin('adjustSubscription')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 9. AUDIT LOGS (Dedicated Section) */}
          {/* ========================================================= */}
          {activeSection === 'audit-logs' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-6 rounded-2xl bg-[#0f172a] border border-white/10 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-rose-400" />
                    <span>Админ Үйлдлийн Аудит Лог (Audit Trail)</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-bold">Нийт: {auditLogs.length}</span>
                </div>

                <div className="divide-y divide-white/5 text-xs">
                  {auditLogs.map((log: any) => (
                    <div key={log.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-white/10 font-mono text-[10px] text-amber-400">
                            {log.action}
                          </span>
                          <span>{log.target}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {log.details || '—'} · Админ: <strong className="text-slate-300">{log.adminEmail}</strong>
                        </div>
                      </div>
                      <div className="text-right text-[10px] text-slate-500 shrink-0">
                        {formatDate(new Date(log.createdAt), locale)}
                      </div>
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                    <div className="text-center py-8 text-slate-500">Одоогоор бүртгэгдсэн аудит лог байхгүй.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 10. STATISTICS / ANALYTICS */}
          {/* ========================================================= */}
          {activeSection === 'analytics' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payment Channel & Plan Revenue Breakdown from Real MongoDB Records */}
                <div className="p-6 rounded-2xl bg-[#0f172a] border border-white/10 shadow-xl space-y-4">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#e5a93c]" />
                    <span>Баталгаажсан Орлогын Задаргаа (PAID Transactions)</span>
                  </h3>

                  <div className="space-y-3 text-xs">
                    {(['wire_qpay', 'bank_transfer'] as const).map((method) => {
                      const methodPaid = paymentsList.filter((p) => p.status === 'PAID' && p.paymentMethod === method);
                      const sum = methodPaid.reduce((acc, p) => acc + (p.amount || 0), 0);
                      return (
                        <div key={method} className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-white">
                              {method === 'wire_qpay' ? 'Wire.mn QPay Шууд Төлбөр' : 'Хаан Банк Дансны Шилжүүлэг'}
                            </div>
                            <div className="text-[11px] text-slate-400">{methodPaid.length} баталгаажсан гүйлгээ</div>
                          </div>
                          <div className="text-sm font-black text-emerald-400">
                            {formatCurrency(sum, locale, false)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top Movies by Views */}
                <div className="p-6 rounded-2xl bg-[#0f172a] border border-white/10 shadow-xl space-y-4">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Хамгийн их үзэлттэй кинонууд</span>
                  </h3>

                  <div className="divide-y divide-white/5 text-xs">
                    {[...movies]
                      .sort((a, b) => (b.views || 0) - (a.views || 0))
                      .slice(0, 6)
                      .map((m, i) => (
                        <div key={m.id} className="py-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-[10px] font-black text-[#e5a93c]">
                              {i + 1}
                            </span>
                            <div>
                              <div className="font-bold text-white">{m.titleMn || m.title?.mn}</div>
                              <div className="text-[10px] text-slate-400">{m.quality} · ★ {m.rating}</div>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-slate-300">{m.views || 0} үзэлт</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Webhook Events Ledger */}
              <div className="p-6 rounded-2xl bg-[#0f172a] border border-white/10 shadow-xl space-y-4">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  <span>Wire.mn Webhook Мэдэгдлийн Түүх</span>
                </h3>
                <div className="divide-y divide-white/5 text-xs">
                  {webhookEvents.slice(0, 10).map((ev: any, idx: number) => (
                    <div key={ev.eventId || idx} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-sky-300">{ev.type}</span>
                        <span className="text-slate-400 ml-2 text-[11px]">ID: {ev.eventId}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {ev.processedAt ? formatDate(new Date(ev.processedAt), locale) : '—'}
                      </span>
                    </div>
                  ))}
                  {webhookEvents.length === 0 && (
                    <div className="text-center py-6 text-slate-500">Одоогоор бүртгэгдсэн вебхүүк эвент байхгүй.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 11. WEBSITE SETTINGS (Persisted in MongoDB) */}
          {/* ========================================================= */}
          {activeSection === 'settings' && (
            <form
              onSubmit={handleSaveSettings}
              className="max-w-3xl p-6 sm:p-8 rounded-2xl bg-[#0f172a] border border-white/10 shadow-xl space-y-6 animate-in fade-in text-xs"
            >
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-lg font-black text-white">{tAdmin('settingsNav')}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Платформын үндсэн тохиргоо, Hero кино, зарлал, гишүүнчлэлийн үнэ болон FAQ (MongoDB-д хадгалагдана)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Сайтын нэр (Site Brand Name)</label>
                  <input
                    type="text"
                    required
                    value={siteSettings.siteName}
                    onChange={(e) => setSiteSettings({ ...siteSettings, siteName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border border-white/15 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Үндсэн хэл (Default Language)</label>
                  <select
                    value={siteSettings.defaultLocale}
                    onChange={(e) => setSiteSettings({ ...siteSettings, defaultLocale: e.target.value as 'mn' | 'en' })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border border-white/15 text-white"
                  >
                    <option value="mn">Монгол (MN)</option>
                    <option value="en">English (EN)</option>
                  </select>
                </div>
              </div>

              {/* Hero Featured Movie Selector */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Нүүр хуудасны Hero Banner онцлох кино
                </label>
                <select
                  value={siteSettings.featuredMovieId || ''}
                  onChange={(e) => setSiteSettings({ ...siteSettings, featuredMovieId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border border-white/15 text-white"
                >
                  <option value="">Автомат (Хамгийн эхний Featured кино)</option>
                  {movies.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.titleMn || m.title?.mn} ({m.titleEn || m.title?.en})
                    </option>
                  ))}
                </select>
              </div>

              {/* Homepage Announcements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Нүүр хуудасны зарлал (MN)</label>
                  <input
                    type="text"
                    value={siteSettings.announcementMn || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, announcementMn: e.target.value })}
                    placeholder="Шинэ 4K кинонууд нэмэгдлээ..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border border-white/15 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Homepage Announcement (EN)</label>
                  <input
                    type="text"
                    value={siteSettings.announcementEn || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, announcementEn: e.target.value })}
                    placeholder="New 4K AI movies added this week..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border border-white/15 text-white"
                  />
                </div>
              </div>

              {/* Subscription Pricing Overrides */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div className="font-bold text-white">Гишүүнчлэлийн сарын төлбөр (MNT)</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Basic багц (₮)</label>
                    <input
                      type="number"
                      value={siteSettings.subscriptionPrices?.basic ?? 9900}
                      onChange={(e) =>
                        setSiteSettings({
                          ...siteSettings,
                          subscriptionPrices: {
                            ...siteSettings.subscriptionPrices,
                            basic: Number(e.target.value)
                          }
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/15 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Standard VIP багц (₮)</label>
                    <input
                      type="number"
                      value={siteSettings.subscriptionPrices?.standard ?? 14900}
                      onChange={(e) =>
                        setSiteSettings({
                          ...siteSettings,
                          subscriptionPrices: {
                            ...siteSettings.subscriptionPrices,
                            standard: Number(e.target.value)
                          }
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/15 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Premium 4K багц (₮)</label>
                    <input
                      type="number"
                      value={siteSettings.subscriptionPrices?.premium ?? 19900}
                      onChange={(e) =>
                        setSiteSettings({
                          ...siteSettings,
                          subscriptionPrices: {
                            ...siteSettings.subscriptionPrices,
                            premium: Number(e.target.value)
                          }
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/15 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* System Toggles */}
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                  <div>
                    <div className="font-bold text-white">Шинэ хэрэглэгчийн бүртгэл (Allow Registrations)</div>
                    <div className="text-[11px] text-slate-400">Шинээр бүртгүүлэхийг нээх эсвэл түр хаах</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={siteSettings.allowRegistrations}
                    onChange={(e) => setSiteSettings({ ...siteSettings, allowRegistrations: e.target.checked })}
                    className="rounded text-[#e50914] w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                  <div>
                    <div className="font-bold text-white">Засвар үйлчилгээний горим (Maintenance Mode)</div>
                    <div className="text-[11px] text-slate-400">Сайтыг зөвхөн админ хэрэглэгчдэд нээлттэй байлгах</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={siteSettings.maintenanceMode}
                    onChange={(e) => setSiteSettings({ ...siteSettings, maintenanceMode: e.target.checked })}
                    className="rounded text-[#e50914] w-4 h-4"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full py-3 rounded-xl bg-[#e5a93c] hover:bg-amber-400 text-black font-extrabold text-xs cursor-pointer shadow-lg shadow-amber-950/40 disabled:opacity-50"
              >
                {savingSettings ? 'Хадгалж байна...' : 'Тохиргоог хадгалах'}
              </button>
            </form>
          )}

          {/* ========================================================= */}
          {/* 12. ADMIN PROFILE */}
          {/* ========================================================= */}
          {activeSection === 'profile' && (
            <div className="max-w-2xl space-y-6 animate-in fade-in text-xs">
              <form
                onSubmit={handleUpdateAdminProfile}
                className="p-6 rounded-2xl bg-[#0f172a] border border-white/10 shadow-xl space-y-4"
              >
                <h3 className="text-base font-black text-white border-b border-white/10 pb-3">
                  Админ Профайл Мэдээлэл
                </h3>
                <div>
                  <label className="block text-slate-400 mb-1">Имэйл хаяг</label>
                  <input
                    type="email"
                    disabled
                    value={currentUser?.email || ''}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111827]/60 border border-white/10 text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Админы нэр</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border border-white/15 text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#e5a93c] hover:bg-amber-400 text-black font-extrabold cursor-pointer disabled:opacity-50"
                >
                  Нэр шинэчлэх
                </button>
              </form>

              <form
                onSubmit={handleChangeAdminPassword}
                className="p-6 rounded-2xl bg-[#0f172a] border border-white/10 shadow-xl space-y-4"
              >
                <h3 className="text-base font-black text-white border-b border-white/10 pb-3">
                  Нууц Үг Солих
                </h3>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Одоогийн нууц үг</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border border-white/15 text-white"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Шинэ нууц үг (8+ тэмдэгт)</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border border-white/15 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Шинэ нууц үг давтах</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border border-white/15 text-white"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e50914] to-rose-700 text-white font-black cursor-pointer disabled:opacity-50"
                >
                  Нууц үг солих
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Reject Bank Transfer Modal */}
      {rejectPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0f172a] border border-white/15 rounded-2xl p-6 space-y-4 shadow-2xl text-xs">
            <h3 className="text-base font-black text-white">Банкны шилжүүлэг татгалзах</h3>
            <p className="text-slate-300">
              Захиалга: <strong className="text-white font-mono">{rejectPaymentModal.orderNumber}</strong> ({rejectPaymentModal.userName})
            </p>
            <div>
              <label className="block text-slate-400 mb-1">Татгалзсан шалтгаан:</label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Банкны хуулгаар гүйлгээ олдсонгүй"
                className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/15 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectPaymentModal(null)}
                className="py-2 rounded-xl bg-white/10 text-white font-bold cursor-pointer"
              >
                Цуцлах
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectPayment}
                className="py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
              >
                Татгалзах
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Movie Confirmation Modal */}
      {deleteConfirmMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0f172a] border border-white/15 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">{tAdmin('confirmDelete')}</h3>
            <p className="text-xs text-slate-300">
              "{deleteConfirmMovie.titleMn || deleteConfirmMovie.titleEn}" киногоо устгахдаа итгэлтэй байна уу? {tAdmin('confirmDeleteDesc')}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmMovie(null)}
                className="py-2 rounded-xl bg-white/10 text-white font-bold text-xs cursor-pointer"
              >
                {locale === 'en' ? 'Cancel' : 'Цуцлах'}
              </button>
              <button
                onClick={handleDeleteMovie}
                className="py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
              >
                {tAdmin('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Adjustment Modal */}
      {subAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0f172a] border border-white/15 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Crown className="w-4 h-4 text-[#e5a93c]" />
              <span>Гишүүнчлэл олгох / сунгах</span>
            </h3>
            <div className="text-xs text-slate-300">
              Хэрэглэгч: <strong className="text-white">{subAdjustModal.userName}</strong>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Багцын сонголт</label>
                <select
                  value={adjustPlanId}
                  onChange={(e) => setAdjustPlanId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/15 text-white uppercase"
                >
                  <option value="premium">Premium 4K (19,900₮)</option>
                  <option value="standard">Standard VIP (14,900₮)</option>
                  <option value="basic">Basic (9,900₮)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Хугацаа (хоногоор)</label>
                <input
                  type="number"
                  value={adjustDurationDays}
                  onChange={(e) => setAdjustDurationDays(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/15 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setSubAdjustModal(null)}
                className="py-2 rounded-xl bg-white/10 text-white font-bold text-xs cursor-pointer"
              >
                Цуцлах
              </button>
              <button
                onClick={handleApplySubscriptionAdjust}
                className="py-2 rounded-xl bg-gradient-to-r from-[#e50914] to-rose-700 text-white font-black text-xs shadow-md cursor-pointer"
              >
                Хадгалах
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
