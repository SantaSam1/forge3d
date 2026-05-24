import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Search, Download, Eye, ArrowLeft, Filter,
  Sparkles, Grid, List, ChevronDown, ExternalLink
} from 'lucide-react';
import { useLang } from '../lib/i18n';

interface LibraryProps {
  onClose: () => void;
  onOpenInStudio: (url: string, name: string) => void;
}

interface SketchfabModel {
  uid: string;
  name: string;
  description: string;
  thumbnails: { images: { url: string; width: number }[] };
  user: { displayName: string; profileUrl: string };
  viewCount: number;
  likeCount: number;
  downloadCount: number;
  categories: { name: string }[];
  tags: { name: string }[];
  isDownloadable: boolean;
  publishedAt: string;
}

const CATEGORIES = [
  { id: '', label_ru: 'Все', label_en: 'All' },
  { id: 'characters-creatures', label_ru: 'Персонажи', label_en: 'Characters' },
  { id: 'animals-pets', label_ru: 'Животные', label_en: 'Animals' },
  { id: 'vehicles-transportation', label_ru: 'Транспорт', label_en: 'Vehicles' },
  { id: 'architecture', label_ru: 'Архитектура', label_en: 'Architecture' },
  { id: 'weapons-military', label_ru: 'Оружие', label_en: 'Weapons' },
  { id: 'food-drink', label_ru: 'Еда', label_en: 'Food' },
  { id: 'nature-plants', label_ru: 'Природа', label_en: 'Nature' },
  { id: 'science-technology', label_ru: 'Технологии', label_en: 'Tech' },
  { id: 'furniture-home', label_ru: 'Мебель', label_en: 'Furniture' },
];

const SORT_OPTIONS = [
  { id: 'relevance', label_ru: 'По релевантности', label_en: 'Relevance' },
  { id: 'likeCount', label_ru: 'Популярные', label_en: 'Most liked' },
  { id: 'viewCount', label_ru: 'Просматриваемые', label_en: 'Most viewed' },
  { id: 'publishedAt', label_ru: 'Новые', label_en: 'Newest' },
];

// Sketchfab client token - public read-only
const SKETCHFAB_API = 'https://api.sketchfab.com/v3';

export default function Library({ onClose, onOpenInStudio }: LibraryProps) {
  const { lang } = useLang();
  const isRu = lang === 'ru';

  const [models, setModels] = useState<SketchfabModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('likeCount');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedModel, setSelectedModel] = useState<SketchfabModel | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [total, setTotal] = useState(0);

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const observerRef = useRef<IntersectionObserver>();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchModels = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const currentPage = reset ? 1 : page;
      const params = new URLSearchParams({
        type: 'models',
        downloadable: 'true',
        count: '24',
        offset: String((currentPage - 1) * 24),
        sort_by: sort === 'relevance' ? '-likeCount' : `-${sort}`,
        ...(query && { q: query }),
        ...(category && { categories: category }),
      });

      const res = await fetch(`${SKETCHFAB_API}/search?${params}`);
      const data = await res.json();

      const newModels = data.results || [];
      setTotal(data.count || 0);
      setHasMore(!!data.next);

      if (reset) {
        setModels(newModels);
        setPage(2);
      } else {
        setModels(prev => [...prev, ...newModels]);
        setPage(p => p + 1);
      }
    } catch (err) {
      console.error('Sketchfab fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [query, category, sort, page]);

  // Initial load
  useEffect(() => {
    fetchModels(true);
  }, [category, sort]);

  // Search debounce
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchModels(true), 500);
    return () => clearTimeout(searchTimeout.current);
  }, [query]);

  // Infinite scroll
  useEffect(() => {
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        fetchModels();
      }
    }, { threshold: 0.1 });

    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, fetchModels]);

  const getThumbnail = (model: SketchfabModel) => {
    const images = model.thumbnails?.images || [];
    const med = images.find(i => i.width >= 200 && i.width <= 400) || images[0];
    return med?.url || '';
  };

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <div className="fixed inset-0 z-40 bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 flex-shrink-0 bg-gray-950">
        <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={isRu ? 'Поиск 3D моделей...' : 'Search 3D models...'}
            className="w-full bg-gray-900 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm transition-all ${showFilters ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-white/5 border-white/10 text-gray-400'}`}>
          <Filter className="w-4 h-4" />
          <span className="hidden sm:block">{isRu ? 'Фильтры' : 'Filters'}</span>
        </button>
        <div className="flex items-center gap-1 bg-white/5 rounded-xl border border-white/10 p-1">
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-cyan-500 text-white' : 'text-gray-500'}`}>
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-cyan-500 text-white' : 'text-gray-500'}`}>
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white p-1 hidden sm:block">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Filters bar */}
      {showFilters && (
        <div className="border-b border-white/5 px-4 py-3 bg-gray-950 flex-shrink-0">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-xs text-gray-500 self-center">{isRu ? 'Категория:' : 'Category:'}</span>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className={`px-3 py-1 text-xs rounded-lg border transition-all ${category === cat.id ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>
                {isRu ? cat.label_ru : cat.label_en}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 self-center">{isRu ? 'Сортировка:' : 'Sort by:'}</span>
            {SORT_OPTIONS.map(opt => (
              <button key={opt.id} onClick={() => setSort(opt.id)}
                className={`px-3 py-1 text-xs rounded-lg border transition-all ${sort === opt.id ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>
                {isRu ? opt.label_ru : opt.label_en}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="px-4 py-2 border-b border-white/5 flex-shrink-0 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {total > 0 ? (isRu ? `Найдено: ${formatNumber(total)} моделей` : `Found: ${formatNumber(total)} models`) : ''}
        </p>
        <p className="text-xs text-gray-600">{isRu ? 'Источник: Sketchfab' : 'Source: Sketchfab'}</p>
      </div>

      {/* Models grid */}
      <div className="flex-1 overflow-y-auto">
        {models.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Sparkles className="w-12 h-12 text-gray-700" />
            <p className="text-gray-500">{isRu ? 'Модели не найдены' : 'No models found'}</p>
          </div>
        ) : (
          <div className={`p-4 ${viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'flex flex-col gap-3'}`}>
            {models.map(model => (
              viewMode === 'grid' ? (
                <div key={model.uid}
                  className="group bg-gray-900/50 rounded-xl border border-white/5 hover:border-white/15 overflow-hidden cursor-pointer transition-all hover:scale-[1.02]"
                  onClick={() => setSelectedModel(model)}>
                  <div className="aspect-square relative overflow-hidden bg-gray-800">
                    <img src={getThumbnail(model)} alt={model.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                      <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {model.isDownloadable && (
                      <div className="absolute top-2 right-2 bg-green-500/80 text-white text-xs px-1.5 py-0.5 rounded-md">
                        {isRu ? 'Скач.' : 'DL'}
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs text-gray-200 font-medium truncate">{model.name}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{model.user?.displayName}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-gray-600">👁 {formatNumber(model.viewCount)}</span>
                      <span className="text-xs text-gray-600">❤️ {formatNumber(model.likeCount)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={model.uid}
                  className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-xl border border-white/5 hover:border-white/15 cursor-pointer transition-all"
                  onClick={() => setSelectedModel(model)}>
                  <img src={getThumbnail(model)} alt={model.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-gray-800" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 font-medium truncate">{model.name}</p>
                    <p className="text-xs text-gray-500 truncate">{model.user?.displayName}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-600">👁 {formatNumber(model.viewCount)}</span>
                      <span className="text-xs text-gray-600">❤️ {formatNumber(model.likeCount)}</span>
                      {model.isDownloadable && <span className="text-xs text-green-400">{isRu ? '✓ Скачать' : '✓ Download'}</span>}
                    </div>
                  </div>
                  <Eye className="w-5 h-5 text-gray-600 flex-shrink-0" />
                </div>
              )
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={loadMoreRef} className="h-4" />
      </div>

      {/* Model detail modal */}
      {selectedModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedModel(null)} />
          <div className="relative w-full max-w-lg bg-gray-900 rounded-2xl border border-white/10 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="relative">
              <img src={getThumbnail(selectedModel)} alt={selectedModel.name}
                className="w-full h-56 object-cover" />
              <button onClick={() => setSelectedModel(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">{selectedModel.name}</h3>
              <p className="text-sm text-gray-400 mb-3">{isRu ? 'Автор: ' : 'By: '}{selectedModel.user?.displayName}</p>
              {selectedModel.description && (
                <p className="text-xs text-gray-500 mb-4 line-clamp-3">{selectedModel.description}</p>
              )}
              <div className="flex items-center gap-4 mb-4 text-sm text-gray-400">
                <span>👁 {formatNumber(selectedModel.viewCount)}</span>
                <span>❤️ {formatNumber(selectedModel.likeCount)}</span>
                <span>⬇️ {formatNumber(selectedModel.downloadCount)}</span>
              </div>
              {selectedModel.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {selectedModel.tags.slice(0, 8).map(tag => (
                    <span key={tag.name} className="px-2 py-0.5 bg-white/5 text-gray-500 text-xs rounded-lg">{tag.name}</span>
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    const glbUrl = `https://sketchfab.com/models/${selectedModel.uid}/download`;
                    onOpenInStudio(glbUrl, selectedModel.name);
                    setSelectedModel(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-xl transition-all">
                  <Eye className="w-4 h-4" />
                  {isRu ? 'Открыть в студии' : 'Open in Studio'}
                </button>
                <a
                  href={`https://sketchfab.com/models/${selectedModel.uid}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-sm rounded-xl transition-all border border-white/10">
                  <ExternalLink className="w-4 h-4" />
                  {isRu ? 'Открыть на Sketchfab' : 'View on Sketchfab'}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
