import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, Search, Download, Eye, Layers, Star, Globe, Database,
  ChevronDown, Loader2, ExternalLink, Import, Filter,
  Grid3X3, List, RefreshCw, Package, Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AssetModel {
  id: string;
  name: string;
  thumbnail: string;
  downloadUrl?: string;
  viewerUrl?: string;
  source: 'local' | 'sketchfab' | 'polypizza';
  format?: string;
  tags?: string[];
  category?: string;
  author?: string;
  license?: string;
  polyCount?: number;
  downloads?: number;
  externalUrl?: string;
  // Sketchfab-specific
  sketchfabUid?: string;
  isDownloadable?: boolean;
}

interface AssetBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (url: string, name: string, format: string) => void;
  isRu?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Token hardcoded — users don't need to enter anything
const SKETCHFAB_TOKEN = 'f8a254d9b48c40e9befa26962a40abec';
const POLY_PIZZA_KEY  = '98cbac2d31c944faa03c2d05922bee73';
const POLY_PIZZA_URL = 'https://api.poly.pizza/v1';

const SOURCES = [
  { id: 'all', label: 'All Sources', labelRu: 'Все источники', icon: Globe },
  { id: 'local', label: 'My Library', labelRu: 'Моя библиотека', icon: Database },
  { id: 'sketchfab', label: 'Sketchfab', labelRu: 'Sketchfab', icon: Globe },
  { id: 'polypizza', label: 'Poly Pizza', labelRu: 'Poly Pizza', icon: Package },
] as const;

type SourceId = typeof SOURCES[number]['id'];

const CATEGORIES = [
  '', 'characters', 'animals', 'vehicles', 'architecture',
  'nature', 'food', 'furniture', 'weapons', 'sci-fi', 'fantasy'
];

const CATEGORY_LABELS: Record<string, { en: string; ru: string }> = {
  '': { en: 'All', ru: 'Все' },
  'characters': { en: 'Characters', ru: 'Персонажи' },
  'animals': { en: 'Animals', ru: 'Животные' },
  'vehicles': { en: 'Vehicles', ru: 'Транспорт' },
  'architecture': { en: 'Architecture', ru: 'Архитектура' },
  'nature': { en: 'Nature', ru: 'Природа' },
  'food': { en: 'Food', ru: 'Еда' },
  'furniture': { en: 'Furniture', ru: 'Мебель' },
  'weapons': { en: 'Weapons', ru: 'Оружие' },
  'sci-fi': { en: 'Sci-Fi', ru: 'Sci-Fi' },
  'fantasy': { en: 'Fantasy', ru: 'Фэнтези' },
};

// ─── Sketchfab helpers ────────────────────────────────────────────────────────

async function searchSketchfab(
  query: string,
  page: number
): Promise<{ models: AssetModel[]; hasMore: boolean }> {
  if (!SKETCHFAB_TOKEN) return { models: [], hasMore: false };
  
  try {
    const params = new URLSearchParams({
      q: query || 'low poly',
      type: 'models',
      downloadable: 'true',
      count: '24',
      cursor: String(page * 24),
    });
    // Append license filters (URLSearchParams supports duplicate keys via append)
    ['by','by-sa','by-nd','cc0','by-nc','by-nc-sa','by-nc-nd'].forEach(l =>
      params.append('license[]', l)
    );

    const res = await fetch(`https://api.sketchfab.com/v3/search?${params}`, {
      headers: { Authorization: `Token ${SKETCHFAB_TOKEN}` },
    });

    if (!res.ok) throw new Error(`Sketchfab: ${res.status}`);
    const data = await res.json();

    const models: AssetModel[] = (data.results || []).map((m: any) => ({
      id: `sf_${m.uid}`,
      name: m.name,
      thumbnail: m.thumbnails?.images?.[1]?.url || m.thumbnails?.images?.[0]?.url || '',
      source: 'sketchfab' as const,
      sketchfabUid: m.uid,
      isDownloadable: m.isDownloadable,
      author: m.user?.displayName,
      license: m.license?.label,
      tags: m.tags?.map((t: any) => t.name) || [],
      externalUrl: `https://sketchfab.com/3d-models/${m.slug || m.uid}`,
      viewerUrl: `https://sketchfab.com/models/${m.uid}/embed`,
      downloads: m.downloadCount,
    }));

    return { models, hasMore: !!data.next };
  } catch {
    return { models: [], hasMore: false };
  }
}

async function downloadFromSketchfab(uid: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.sketchfab.com/v3/models/${uid}/download`, {
      headers: { Authorization: `Token ${SKETCHFAB_TOKEN}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.glb?.url || data.gltf?.url || null;
  } catch {
    return null;
  }
}

// ─── Poly Pizza helpers ───────────────────────────────────────────────────────

async function searchPolyPizza(
  query: string,
  page: number
): Promise<{ models: AssetModel[]; hasMore: boolean }> {
  try {
    const params = new URLSearchParams({
      q: query || 'character',
      limit: '24',
      offset: String(page * 24),
      format: 'glb',
    });

    const res = await fetch(`${POLY_PIZZA_URL}/search?${params}`, {
      headers: POLY_PIZZA_KEY ? { 'X-Auth-Token': POLY_PIZZA_KEY } : {},
    });
    if (!res.ok) throw new Error(`Poly Pizza: ${res.status}`);
    const data = await res.json();

    const models: AssetModel[] = (data.body || []).map((m: any) => ({
      id: `pp_${m.ID || m.id}`,
      name: m.Title || m.name || 'Untitled',
      thumbnail: m.Thumbnail || m.thumbnail || '',
      source: 'polypizza' as const,
      downloadUrl: m.Download || m.download,
      format: 'glb',
      author: m.Creator?.Username || m.creator,
      license: 'CC0',
      tags: m.Tags || [],
      polyCount: m.Triangles,
      externalUrl: `https://poly.pizza/${m.ID || m.id}`,
    }));

    return { models, hasMore: data.body?.length === 24 };
  } catch {
    return { models: [], hasMore: false };
  }
}

// ─── Local library ─────────────────────────────────────────────────────────────

async function fetchLocalLibrary(
  query: string,
  category: string
): Promise<AssetModel[]> {
  try {
    let q = supabase.from('library_models').select('*').order('downloads', { ascending: false });
    if (category) q = q.eq('category', category);
    if (query) q = q.ilike('name', `%${query}%`);
    const { data } = await q.limit(48);
    if (!data) return [];
    return data.map((m: any) => ({
      id: `local_${m.id}`,
      name: m.name,
      thumbnail: m.thumbnail_url,
      downloadUrl: m.file_url,
      source: 'local' as const,
      format: 'glb',
      tags: m.tags || [],
      category: m.category,
      downloads: m.downloads,
    }));
  } catch {
    return [];
  }
}

// ─── SketchfabToken Modal ─────────────────────────────────────────────────────


// ─── ModelCard ────────────────────────────────────────────────────────────────

function ModelCard({
  model,
  isRu,
  onImport,
  onPreview,
  importing,
}: {
  model: AssetModel;
  isRu: boolean;
  onImport: (model: AssetModel) => void;
  onPreview: (model: AssetModel) => void;
  importing: boolean;
}) {
  const sourceColors = {
    local: 'bg-cyan-500/20 text-cyan-400',
    sketchfab: 'bg-orange-500/20 text-orange-400',
    polypizza: 'bg-green-500/20 text-green-400',
  };
  const sourceLabels = {
    local: 'Local',
    sketchfab: 'Sketchfab',
    polypizza: 'Poly Pizza',
  };

  return (
    <div className="group bg-gray-900/50 hover:bg-gray-900 rounded-xl border border-white/5 hover:border-white/15 overflow-hidden transition-all hover:scale-[1.02] cursor-pointer">
      {/* Thumbnail */}
      <div
        className="aspect-square bg-gray-800 relative overflow-hidden"
        onClick={() => onPreview(model)}
      >
        {model.thumbnail ? (
          <img
            src={model.thumbnail}
            alt={model.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-gray-700" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview(model);
            }}
            className="w-8 h-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center text-white hover:bg-white/30 transition-all"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onImport(model);
            }}
            disabled={importing}
            className="w-8 h-8 bg-cyan-500/80 backdrop-blur rounded-lg flex items-center justify-center text-white hover:bg-cyan-500 disabled:opacity-50 transition-all"
          >
            {importing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Import className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Source badge */}
        <div className="absolute top-2 right-2">
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${sourceColors[model.source]}`}
          >
            {sourceLabels[model.source]}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-xs text-gray-200 font-medium truncate">{model.name}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-[10px] text-gray-600 truncate">
            {model.author || model.category || model.license || ''}
          </p>
          {model.polyCount && (
            <p className="text-[10px] text-gray-700 flex-shrink-0">
              {(model.polyCount / 1000).toFixed(1)}k △
            </p>
          )}
          {model.downloads && !model.polyCount && (
            <p className="text-[10px] text-gray-700 flex-shrink-0">
              ⬇ {model.downloads > 999 ? `${(model.downloads / 1000).toFixed(1)}k` : model.downloads}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({
  model,
  onClose,
  onImport,
  importing,
  isRu,
}: {
  model: AssetModel;
  onClose: () => void;
  onImport: (model: AssetModel) => void;
  importing: boolean;
  isRu: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-gray-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Thumbnail */}
        <div className="aspect-video bg-gray-800 relative overflow-hidden">
          {model.source === 'sketchfab' && model.viewerUrl ? (
            <iframe
              src={`${model.viewerUrl}?autostart=1&ui_theme=dark`}
              className="w-full h-full"
              allowFullScreen
              title={model.name}
            />
          ) : model.thumbnail ? (
            <img
              src={model.thumbnail}
              alt={model.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-16 h-16 text-gray-700" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-white font-semibold">{model.name}</h3>
              {model.author && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {isRu ? 'Автор' : 'Author'}: {model.author}
                </p>
              )}
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white p-1 flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap gap-2 mb-4">
            {model.license && (
              <span className="text-[10px] px-2 py-1 bg-gray-800 text-gray-400 rounded-lg">
                📜 {model.license}
              </span>
            )}
            {model.format && (
              <span className="text-[10px] px-2 py-1 bg-gray-800 text-gray-400 rounded-lg uppercase">
                {model.format}
              </span>
            )}
            {model.polyCount && (
              <span className="text-[10px] px-2 py-1 bg-gray-800 text-gray-400 rounded-lg">
                △ {model.polyCount.toLocaleString()}
              </span>
            )}
          </div>

          {/* Tags */}
          {model.tags && model.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {model.tags.slice(0, 8).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 bg-white/5 text-gray-500 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {model.externalUrl && (
              <a
                href={model.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm rounded-xl transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                {isRu ? 'Открыть' : 'Open'}
              </a>
            )}
            <button
              onClick={() => onImport(model)}
              disabled={importing || (!model.downloadUrl && model.source === 'sketchfab' && !model.isDownloadable)}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-xl transition-all"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isRu ? 'Загрузка...' : 'Loading...'}
                </>
              ) : (
                <>
                  <Import className="w-4 h-4" />
                  {isRu ? 'Импорт в сцену' : 'Import to Scene'}
                </>
              )}
            </button>
          </div>

          {model.source === 'sketchfab' && !model.isDownloadable && (
            <p className="text-[10px] text-yellow-500/70 mt-2 text-center">
              {isRu
                ? '⚠️ Эта модель недоступна для скачивания'
                : '⚠️ This model is not available for download'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main AssetBrowser ────────────────────────────────────────────────────────

export default function AssetBrowser({ isOpen, onClose, onImport, isRu = false }: AssetBrowserProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [source, setSource] = useState<SourceId>('all');
  const [category, setCategory] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(0);
  const [models, setModels] = useState<AssetModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [preview, setPreview] = useState<AssetModel | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  // Reset & fetch on source/query/category change
  useEffect(() => {
    setModels([]);
    setPage(0);
    setHasMore(true);
  }, [source, debouncedQuery, category]);

  // Fetch models
  const fetchModels = useCallback(async (pageNum: number, append = false) => {
    setLoading(true);
    const results: AssetModel[] = [];
    let more = false;

    try {
      if (source === 'local' || source === 'all') {
        const local = await fetchLocalLibrary(debouncedQuery, category);
        if (pageNum === 0) results.push(...local);
      }

      if (source === 'polypizza' || source === 'all') {
        const pp = await searchPolyPizza(debouncedQuery || category || 'object', pageNum);
        results.push(...pp.models);
        more = more || pp.hasMore;
      }

      if (source === 'sketchfab' || source === 'all') {
        if (SKETCHFAB_TOKEN) {
          const sf = await searchSketchfab(debouncedQuery || category || 'low poly', pageNum);
          results.push(...sf.models);
          more = more || sf.hasMore;
        }
      }

      if (append) {
        setModels((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          return [...prev, ...results.filter((m) => !ids.has(m.id))];
        });
      } else {
        setModels(results);
      }
      setHasMore(more);
    } finally {
      setLoading(false);
    }
  }, [source, debouncedQuery, category, SKETCHFAB_TOKEN]);

  useEffect(() => {
    if (isOpen) fetchModels(0, false);
  }, [isOpen, fetchModels]);

  // Load more
  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchModels(nextPage, true);
  }, [loading, hasMore, page, fetchModels]);

  // Infinite scroll observer
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  // Handle import
  const handleImport = async (model: AssetModel) => {
    setImporting(model.id);
    try {
      let url = model.downloadUrl;
      const format = model.format || 'glb';

      // Poly Pizza: direct download URL
      if (model.source === 'polypizza' && url) {
        onImport(url, model.name, format);
        setPreview(null);
        return;
      }

      // Local: direct
      if (model.source === 'local' && url) {
        onImport(url, model.name, format);
        setPreview(null);
        return;
      }

      // Sketchfab: need to fetch download URL
      if (model.source === 'sketchfab' && model.sketchfabUid) {
        const dlUrl = await downloadFromSketchfab(model.sketchfabUid);
        if (dlUrl) {
          onImport(dlUrl, model.name, 'glb');
          setPreview(null);
          return;
        }
        alert(isRu ? 'Не удалось получить ссылку для скачивания' : 'Could not get download link');
      }
    } finally {
      setImporting(null);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-white/5 flex-shrink-0 bg-gray-950">
        <Layers className="w-5 h-5 text-cyan-400 flex-shrink-0" />
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isRu ? 'Поиск 3D моделей...' : 'Search 3D models...'}
            className="w-full bg-gray-900 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`p-2 rounded-lg border transition-all flex-shrink-0 ${showFilters ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' : 'border-white/10 text-gray-500 hover:text-white'}`}
        >
          <Filter className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          className="p-2 rounded-lg border border-white/10 text-gray-500 hover:text-white transition-all flex-shrink-0"
        >
          {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
        </button>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-white transition-colors flex-shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Source Tabs ── */}
      <div className="flex border-b border-white/5 flex-shrink-0 overflow-x-auto bg-gray-950">
        {SOURCES.map(({ id, label, labelRu, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSource(id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all border-b-2 flex-shrink-0 ${
              source === id
                ? 'text-cyan-400 border-cyan-500'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {isRu ? labelRu : label}
          </button>
        ))}

        <div className="flex-1" />
</div>

      {/* ── Filters ── */}
      {showFilters && (
        <div className="px-4 py-3 border-b border-white/5 flex-shrink-0 bg-gray-950/80">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 text-xs rounded-lg border flex-shrink-0 transition-all ${
                  category === cat
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                {isRu ? CATEGORY_LABELS[cat].ru : CATEGORY_LABELS[cat].en}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 relative">
        {/* Token modal */}
{/* Status bar */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-gray-600">
            {loading && models.length === 0
              ? (isRu ? 'Поиск...' : 'Searching...')
              : models.length > 0
              ? `${models.length}${hasMore ? '+' : ''} ${isRu ? 'моделей' : 'models'}`
              : ''}
          </p>
          {models.length > 0 && (
            <button
              onClick={() => fetchModels(0, false)}
              className="text-xs text-gray-600 hover:text-gray-300 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              {isRu ? 'Обновить' : 'Refresh'}
            </button>
          )}
        </div>

        {/* Grid / List */}
        {models.length > 0 && (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {models.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  isRu={isRu}
                  onImport={handleImport}
                  onPreview={setPreview}
                  importing={importing === model.id}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {models.map((model) => (
                <div
                  key={model.id}
                  className="flex items-center gap-3 p-3 bg-gray-900/50 hover:bg-gray-900 rounded-xl border border-white/5 hover:border-white/15 transition-all cursor-pointer"
                  onClick={() => setPreview(model)}
                >
                  <div className="w-14 h-14 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                    {model.thumbnail ? (
                      <img src={model.thumbnail} alt={model.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-700" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 font-medium truncate">{model.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {model.author || model.category || ''}{model.license ? ` · ${model.license}` : ''}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        model.source === 'local' ? 'bg-cyan-500/20 text-cyan-400' :
                        model.source === 'sketchfab' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {model.source === 'local' ? 'Local' : model.source === 'sketchfab' ? 'Sketchfab' : 'Poly Pizza'}
                      </span>
                      {model.polyCount && (
                        <span className="text-[10px] text-gray-600">△ {model.polyCount.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleImport(model); }}
                    disabled={importing === model.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs rounded-lg flex-shrink-0 transition-all"
                  >
                    {importing === model.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Import className="w-3 h-3" />
                    )}
                    {isRu ? 'Импорт' : 'Import'}
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {/* Empty state */}
        {!loading && models.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Package className="w-16 h-16 text-gray-800" />
            <div className="text-center">
              <p className="text-gray-400 font-medium mb-1">
                {isRu ? 'Модели не найдены' : 'No models found'}
              </p>
              <p className="text-xs text-gray-600">
                {isRu ? 'Попробуйте изменить запрос или фильтры' : 'Try a different query or filters'}
              </p>
            </div>
          </div>
        )}

        {/* Infinite scroll loader */}
        <div ref={loaderRef} className="flex justify-center py-6 mt-2">
          {loading && models.length > 0 && (
            <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          )}
          {!loading && hasMore && models.length > 0 && (
            <button
              onClick={loadMore}
              className="text-xs text-gray-600 hover:text-gray-400 px-4 py-2 border border-white/5 rounded-lg transition-all"
            >
              {isRu ? 'Загрузить ещё' : 'Load more'}
            </button>
          )}
          {!hasMore && models.length > 0 && (
            <p className="text-xs text-gray-700">{isRu ? 'Всё загружено' : 'All loaded'}</p>
          )}
        </div>
      </div>

      {/* ── Preview Modal ── */}
      {preview && (
        <PreviewModal
          model={preview}
          onClose={() => setPreview(null)}
          onImport={handleImport}
          importing={importing === preview.id}
          isRu={isRu}
        />
      )}
    </div>
  );
}
