import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, Search, Eye, Layers, Globe, Database,
  Loader2, ExternalLink, Import, Filter,
  Grid3X3, List, RefreshCw, Package, Box
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLang } from '../lib/i18n';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AssetModel {
  id: string;
  name: string;
  thumbnail: string;
  downloadUrl?: string;
  viewerUrl?: string;
  source: 'local' | 'sketchfab' | 'polypizza' | 'osa';
  format?: string;
  tags?: string[];
  category?: string;
  author?: string;
  license?: string;
  polyCount?: number;
  downloads?: number;
  externalUrl?: string;
  sketchfabUid?: string;
  isDownloadable?: boolean;
}

interface AssetBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (url: string, name: string, format: string) => void;
  isRu?: boolean;
}

// ─── Tokens ───────────────────────────────────────────────────────────────────
const SF_TOKEN = 'f8a254d9b48c40e9befa26962a40abec';

// Edge Functions are on kumotcnpmlbyqgqxqfxr project
const FUNCTIONS_URL = 'https://kumotcnpmlbyqgqxqfxr.supabase.co/functions/v1';
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string || '').split('#')[0].trim();

// ─── Sources & Categories ─────────────────────────────────────────────────────
const SOURCES = [
  { id: 'all',       labelEn: 'All Sources',  labelRu: 'Все источники', icon: Globe    },
  { id: 'local',     labelEn: 'My Library',   labelRu: 'Моя библиотека', icon: Database },
  { id: 'sketchfab', labelEn: 'Sketchfab',    labelRu: 'Sketchfab',     icon: Globe    },
  { id: 'polypizza', labelEn: 'Poly Pizza',   labelRu: 'Poly Pizza',    icon: Package  },
  { id: 'osa',       labelEn: 'Open Assets',  labelRu: 'Open Assets',  icon: Box       },
] as const;
type SourceId = typeof SOURCES[number]['id'];

const CATEGORIES = [
  { id: '',             en: 'All',          ru: 'Все'        },
  { id: 'characters',   en: 'Characters',   ru: 'Персонажи'  },
  { id: 'animals',      en: 'Animals',      ru: 'Животные'   },
  { id: 'vehicles',     en: 'Vehicles',     ru: 'Транспорт'  },
  { id: 'architecture', en: 'Architecture', ru: 'Архитектура' },
  { id: 'nature',       en: 'Nature',       ru: 'Природа'    },
  { id: 'food',         en: 'Food',         ru: 'Еда'        },
  { id: 'furniture',    en: 'Furniture',    ru: 'Мебель'     },
  { id: 'weapons',      en: 'Weapons',      ru: 'Оружие'     },
  { id: 'sci-fi',       en: 'Sci-Fi',       ru: 'Sci-Fi'     },
  { id: 'fantasy',      en: 'Fantasy',      ru: 'Фэнтези'    },
];

// ─── API: Local Supabase library ──────────────────────────────────────────────
async function fetchLocal(q: string, cat: string): Promise<AssetModel[]> {
  try {
    let query = supabase.from('library_models').select('*').order('downloads', { ascending: false }).limit(48);
    if (cat) query = query.eq('category', cat);
    if (q)   query = query.ilike('name', `%${q}%`);
    const { data } = await query;
    return (data || []).map((m: any) => ({
      id: `local_${m.id}`, name: m.name, thumbnail: m.thumbnail_url || '',
      downloadUrl: m.file_url || '', source: 'local' as const, format: 'glb',
      tags: m.tags || [], category: m.category, downloads: m.downloads,
    }));
  } catch { return []; }
}

// ─── API: Sketchfab (direct, works from browser) ──────────────────────────────
async function fetchSketchfab(
  q: string, cursor: string
): Promise<{ models: AssetModel[]; nextCursor: string }> {
  try {
    const params = new URLSearchParams({
      q: q || 'low poly',
      type: 'models',
      downloadable: 'true',
      count: '24',
    });
    if (cursor) params.set('cursor', cursor);
    ['by','by-sa','by-nd','cc0','by-nc','by-nc-sa','by-nc-nd'].forEach(l =>
      params.append('license[]', l)
    );

    const res = await fetch(`https://api.sketchfab.com/v3/search?${params}`, {
      headers: { Authorization: `Token ${SF_TOKEN}` },
    });
    if (!res.ok) { console.error('SF', res.status); return { models: [], nextCursor: '' }; }
    const data = await res.json();

    let nextCursor = '';
    if (data.next) {
      try { nextCursor = new URL(data.next).searchParams.get('cursor') || ''; } catch {}
    }

    const models: AssetModel[] = (data.results || []).map((m: any) => ({
      id: `sf_${m.uid}`, name: m.name,
      thumbnail: m.thumbnails?.images?.[1]?.url || m.thumbnails?.images?.[0]?.url || '',
      source: 'sketchfab' as const, sketchfabUid: m.uid,
      isDownloadable: m.isDownloadable, author: m.user?.displayName,
      license: m.license?.label, tags: m.tags?.map((t: any) => t.name) || [],
      externalUrl: `https://sketchfab.com/3d-models/${m.slug || m.uid}`,
      viewerUrl: `https://sketchfab.com/models/${m.uid}/embed`,
      downloads: m.downloadCount,
    }));

    return { models, nextCursor };
  } catch (e) { console.error('SF exception', e); return { models: [], nextCursor: '' }; }
}

async function downloadSketchfab(uid: string): Promise<string> {
  try {
    const res = await fetch(`https://api.sketchfab.com/v3/models/${uid}/download`, {
      headers: { Authorization: `Token ${SF_TOKEN}` },
    });
    if (!res.ok) return '';
    const d = await res.json();
    return d.glb?.url || d.gltf?.url || '';
  } catch { return ''; }
}

// ─── API: Poly Pizza (via Edge Function proxy) ────────────────────────────────
async function fetchPolyPizza(
  q: string, offset: number, limit: number = 24
): Promise<{ models: AssetModel[]; total: number }> {
  try {
    const safeOffset = Math.max(0, offset);
    const safeLimit = Math.min(100, Math.max(1, limit));
    
    const response = await fetch(`${FUNCTIONS_URL}/poly-pizza-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ 
        q: q || '', 
        limit: safeLimit, 
        offset: safeOffset
      }),
    });

    if (!response.ok) { 
      console.error('PP proxy error:', response.status); 
      return { models: [], total: 0 }; 
    }
    
    const data = await response.json();
    
    if (data.error) { 
      console.error('PP error:', data.error); 
      return { models: [], total: 0 }; 
    }

    // Определяем формат ответа
    let items: any[] = [];
    let total: number = 0;
    
    if (data.results && Array.isArray(data.results)) {
      items = data.results;
      total = data.total || data.count || items.length;
    } else if (data.data && Array.isArray(data.data)) {
      items = data.data;
      total = data.total || data.count || items.length;
    } else if (Array.isArray(data)) {
      items = data;
      total = data.length;
    } else {
      items = [];
      total = 0;
    }

    console.log('PP raw items sample:', items[0]);
    const models: AssetModel[] = items
      .map((m: any, index: number) => {
        const downloadUrl = m.Download || m.download || m.file || m.glb || '';
        const id = m.ID || m.id || m.uid || `${Date.now()}_${index}`;
        return {
          id: `pp_${id}`,
          name: m.Title || m.name || m.title || 'Untitled',
          thumbnail: m.Thumbnail || m.thumbnail || m.image || m.preview || '',
          downloadUrl,
          source: 'polypizza' as const, 
          format: 'glb',
          author: m.Creator?.Username || m.creator?.username || m.author || '',
          license: m.Licence || m.License || m.license || 'CC0',
          tags: Array.isArray(m.Tags) ? m.Tags : (Array.isArray(m.tags) ? m.tags : []),
          polyCount: m['Tri Count'] || m.TriCount || m.Triangles || m.poly_count,
          externalUrl: m.Url || m.url || (id ? `https://poly.pizza/m/${id}` : ''),
          isDownloadable: true,
        };
      })
      .filter((m: AssetModel) => m.name !== 'Untitled' || m.downloadUrl);

    return { models, total };
  } catch (e) { 
    console.error('PP exception', e); 
    return { models: [], total: 0 }; 
  }
}

// ─── API: Open Source 3D Assets (ToxSam registry, CC0, via raw GitHub JSON) ───
const OSA_BASE = 'https://raw.githubusercontent.com/ToxSam/open-source-3d-assets/main/data';

interface OsaRawAsset {
  id?: string;
  name?: string;
  model_file_url?: string;
  thumbnail_url?: string;
  format?: string;
  metadata?: {
    file_size?: number;
    attributes?: { trait_type: string; value: string }[];
  };
}

// All ~991 models live across ~17 small per-collection JSON files with no
// pagination of their own — fetch once, cache in memory for the session,
// then paginate/filter on the client.
let osaCache: AssetModel[] | null = null;
let osaCachePromise: Promise<AssetModel[]> | null = null;

async function loadOsaCatalog(): Promise<AssetModel[]> {
  if (osaCache) return osaCache;
  if (osaCachePromise) return osaCachePromise;

  osaCachePromise = (async () => {
    try {
      const projectsRes = await fetch(`${OSA_BASE}/projects.json`);
      if (!projectsRes.ok) return [];
      const projects: any[] = await projectsRes.json();

      const collections = await Promise.all(
        projects.map(async (proj) => {
          try {
            const res = await fetch(`${OSA_BASE}/${proj.asset_data_file}`);
            if (!res.ok) return [];
            const assets: OsaRawAsset[] = await res.json();
            return assets.map((a, i): AssetModel => {
              const attrs = a.metadata?.attributes || [];
              const tags = attrs.map((attr) => attr.value).filter(Boolean);
              const niceName = (a.name || proj.name || 'Untitled').replace(/_/g, ' ');
              return {
                id: `osa_${proj.id}_${a.id || i}`,
                name: niceName,
                thumbnail: a.thumbnail_url || '',
                downloadUrl: a.model_file_url || '',
                source: 'osa' as const,
                format: (a.format || 'glb').toLowerCase(),
                tags: tags.length ? tags : [proj.name],
                category: proj.name,
                author: proj.creator_id || 'Polygonal Mind',
                license: proj.license || 'CC0',
                externalUrl: proj.github_url,
                isDownloadable: true,
              };
            });
          } catch { return []; }
        })
      );

      const flat = collections.flat().filter((m) => m.downloadUrl);
      osaCache = flat;
      return flat;
    } catch (e) {
      console.error('OSA load exception', e);
      return [];
    } finally {
      osaCachePromise = null;
    }
  })();

  return osaCachePromise;
}

async function fetchOsa(
  q: string, cat: string, offset: number, limit: number = 24
): Promise<{ models: AssetModel[]; total: number }> {
  const all = await loadOsaCatalog();
  const term = q.trim().toLowerCase();

  const filtered = all.filter((m) => {
    if (cat && m.category?.toLowerCase() !== cat.toLowerCase() &&
        !m.tags?.some((t) => t.toLowerCase() === cat.toLowerCase())) {
      return false;
    }
    if (!term) return true;
    return (
      m.name.toLowerCase().includes(term) ||
      m.tags?.some((t) => t.toLowerCase().includes(term)) ||
      m.category?.toLowerCase().includes(term)
    );
  });

  return { models: filtered.slice(offset, offset + limit), total: filtered.length };
}


function ModelCard({ model, isRu, onImport, onPreview, importing }: {
  model: AssetModel; isRu: boolean;
  onImport: (m: AssetModel) => void;
  onPreview: (m: AssetModel) => void;
  importing: boolean;
}) {
  const badge = {
    local:     { cls: 'bg-cyan-500/20 text-cyan-400',   label: 'Local'      },
    sketchfab: { cls: 'bg-orange-500/20 text-orange-400', label: 'Sketchfab' },
    polypizza: { cls: 'bg-green-500/20 text-green-400',  label: 'Poly Pizza' },
    osa:       { cls: 'bg-purple-500/20 text-purple-400', label: 'Open Assets' },
  }[model.source];

  return (
    <div className="group bg-gray-900/50 hover:bg-gray-900 rounded-xl border border-white/5 hover:border-white/15 overflow-hidden transition-all hover:scale-[1.02] cursor-pointer">
      <div className="aspect-square bg-gray-800 relative overflow-hidden" onClick={() => onPreview(model)}>
        {model.thumbnail
          ? <img 
              src={model.thumbnail} 
              alt={model.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          : <div className="w-full h-full flex items-center justify-center bg-gray-800/50"><Package className="w-8 h-8 text-gray-700" /></div>
        }
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button onClick={e => { e.stopPropagation(); onPreview(model); }}
            className="w-8 h-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center text-white hover:bg-white/30">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={e => { e.stopPropagation(); onImport(model); }} disabled={importing}
            className="w-8 h-8 bg-cyan-500/80 backdrop-blur rounded-lg flex items-center justify-center text-white hover:bg-cyan-500 disabled:opacity-50">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Import className="w-4 h-4" />}
          </button>
        </div>
        <span className={`absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
      </div>
      <div className="p-2.5">
        <p className="text-xs text-gray-200 font-medium truncate">{model.name}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-[10px] text-gray-600 truncate">{model.author || model.category || ''}</p>
          {model.polyCount
            ? <p className="text-[10px] text-gray-700">{(model.polyCount / 1000).toFixed(1)}k △</p>
            : model.downloads
            ? <p className="text-[10px] text-gray-700">⬇ {model.downloads > 999 ? `${(model.downloads/1000).toFixed(1)}k` : model.downloads}</p>
            : null}
        </div>
      </div>
    </div>
  );
}

// ─── Preview Modal ────────────────────────────────────────────────────────────
function PreviewModal({ model, onClose, onImport, importing, isRu }: {
  model: AssetModel; onClose: () => void;
  onImport: (m: AssetModel) => void; importing: boolean; isRu: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-gray-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="aspect-video bg-gray-800">
          {model.source === 'sketchfab' && model.viewerUrl
            ? <iframe src={`${model.viewerUrl}?autostart=1&ui_theme=dark`} className="w-full h-full" allowFullScreen title={model.name} />
            : model.thumbnail
            ? <img src={model.thumbnail} alt={model.name} className="w-full h-full object-contain" />
            : <div className="w-full h-full flex items-center justify-center"><Package className="w-16 h-16 text-gray-700" /></div>
          }
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-white font-semibold">{model.name}</h3>
              {model.author && <p className="text-xs text-gray-500 mt-0.5">{isRu ? 'Автор' : 'Author'}: {model.author}</p>}
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white p-1"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {model.license && <span className="text-[10px] px-2 py-1 bg-gray-800 text-gray-400 rounded-lg">📜 {model.license}</span>}
            {model.format  && <span className="text-[10px] px-2 py-1 bg-gray-800 text-gray-400 rounded-lg uppercase">{model.format}</span>}
            {model.polyCount && <span className="text-[10px] px-2 py-1 bg-gray-800 text-gray-400 rounded-lg">△ {model.polyCount.toLocaleString()}</span>}
          </div>
          {model.tags && model.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {model.tags.slice(0, 8).map(tag => <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-white/5 text-gray-500 rounded">#{tag}</span>)}
            </div>
          )}
          <div className="flex gap-2">
            {model.externalUrl && (
              <a href={model.externalUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm rounded-xl">
                <ExternalLink className="w-4 h-4" />{isRu ? 'Открыть' : 'Open'}
              </a>
            )}
            <button onClick={() => onImport(model)}
              disabled={importing || (model.source === 'sketchfab' && !model.isDownloadable)}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-xl">
              {importing
                ? <><Loader2 className="w-4 h-4 animate-spin" />{isRu ? 'Загрузка...' : 'Loading...'}</>
                : <><Import className="w-4 h-4" />{isRu ? 'Импорт в сцену' : 'Import to Scene'}</>
              }
            </button>
          </div>
          {model.source === 'sketchfab' && !model.isDownloadable && (
            <p className="text-[10px] text-yellow-500/70 mt-2 text-center">⚠️ {isRu ? 'Модель недоступна для скачивания' : 'Not available for download'}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AssetBrowser({ isOpen, onClose, onImport }: Omit<AssetBrowserProps, 'isRu'>) {
  const { lang } = useLang();
  const isRu = lang === 'ru';
  const [query, setQuery]           = useState('');
  const [dq, setDq]                 = useState('');
  const [source, setSource]         = useState<SourceId>('all');
  const [category, setCategory]     = useState('');
  const [viewMode, setViewMode]     = useState<'grid' | 'list'>('grid');
  const [models, setModels]         = useState<AssetModel[]>([]);
  const [loading, setLoading]       = useState(false);
  const [hasMore, setHasMore]       = useState(false);
  const [preview, setPreview]       = useState<AssetModel | null>(null);
  const [importing, setImporting]   = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [totalPP, setTotalPP]       = useState(0);
  
  const sfCursorRef = useRef('');
  const ppOffsetRef = useRef(0);
  const ppTotalRef = useRef(0);
  const osaOffsetRef = useRef(0);
  const osaTotalRef = useRef(0);
  const isLoadingRef = useRef(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDq(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  // Сброс и загрузка при изменении фильтров
  const resetAndLoad = useCallback(async () => {
    if (!isOpen) return;
    
    // Сброс всех состояний
    setModels([]);
    setHasMore(false);
    setTotalPP(0);
    sfCursorRef.current = '';
    ppOffsetRef.current = 0;
    ppTotalRef.current = 0;
    osaOffsetRef.current = 0;
    osaTotalRef.current = 0;
    isLoadingRef.current = false;
    
    setLoading(true);
    
    try {
      const firstModels: AssetModel[] = [];
      let moreData = false;

      // Local
      if (source === 'local' || source === 'all') {
        const local = await fetchLocal(dq, category);
        firstModels.push(...local);
      }

      // Poly Pizza
if (source === 'polypizza' || source === 'all') {
  // Если поиск пустой, показываем популярные машины
  const searchQuery =
    dq?.trim() ||
    category?.trim() ||
    'car';

  const { models: ppModels, total } = await fetchPolyPizza(
    searchQuery,
    0,
    24
  );

  firstModels.push(...ppModels);

  ppOffsetRef.current = ppModels.length;
  ppTotalRef.current = total;
  setTotalPP(total);

  moreData =
    ppModels.length > 0 &&
    ppOffsetRef.current < total;

  console.log(
    'PolyPizza:',
    searchQuery,
    'found:',
    total,
    'loaded:',
    ppModels.length
  );
}

      // Sketchfab
      if (source === 'sketchfab' || source === 'all') {
        const { models: sfModels, nextCursor } = await fetchSketchfab(
          dq || category || 'low poly',
          ''
        );
        firstModels.push(...sfModels);
        sfCursorRef.current = nextCursor;
        moreData = moreData || !!nextCursor;
      }

      // Open Source 3D Assets (ToxSam, CC0)
      if (source === 'osa' || source === 'all') {
        const { models: osaModels, total } = await fetchOsa(dq, category, 0, 24);
        firstModels.push(...osaModels);
        osaOffsetRef.current = osaModels.length;
        osaTotalRef.current = total;
        moreData = moreData || osaOffsetRef.current < total;
      }

      // Убираем дубликаты
      const seen = new Set();
      const uniqueModels = firstModels.filter(model => {
        if (seen.has(model.id)) return false;
        seen.add(model.id);
        return true;
      });

      setModels(uniqueModels);
      setHasMore(moreData);
    } catch (error) {
      console.error('Error loading first page:', error);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [isOpen, source, dq, category]);

  // Загрузка следующей страницы
  const loadNextPage = useCallback(async () => {
    if (isLoadingRef.current || !hasMore || !isOpen) return;
    
    isLoadingRef.current = true;
    setLoading(true);

    try {
      const newModels: AssetModel[] = [];
      let moreData = false;

      // Poly Pizza - загружаем следующую страницу
      if ((source === 'polypizza' || source === 'all') && ppOffsetRef.current > 0 && ppOffsetRef.current < ppTotalRef.current) {
        const { models: ppModels, total } = await fetchPolyPizza(
          dq || category || 'object',
          ppOffsetRef.current,
          24
        );
        
        if (ppModels.length > 0) {
          newModels.push(...ppModels);
          ppOffsetRef.current += ppModels.length;
          ppTotalRef.current = total;
          setTotalPP(total);
          moreData = ppOffsetRef.current < total;
        }
      }

      // Sketchfab - загружаем следующую страницу
      if ((source === 'sketchfab' || source === 'all') && sfCursorRef.current) {
        const { models: sfModels, nextCursor } = await fetchSketchfab(
          dq || category || 'low poly',
          sfCursorRef.current
        );
        
        if (sfModels.length > 0) {
          newModels.push(...sfModels);
          sfCursorRef.current = nextCursor;
          moreData = moreData || !!nextCursor;
        }
      }

      // Open Source 3D Assets - загружаем следующую страницу
      if ((source === 'osa' || source === 'all') && osaOffsetRef.current < osaTotalRef.current) {
        const { models: osaModels, total } = await fetchOsa(dq, category, osaOffsetRef.current, 24);
        if (osaModels.length > 0) {
          newModels.push(...osaModels);
          osaOffsetRef.current += osaModels.length;
          osaTotalRef.current = total;
          moreData = moreData || osaOffsetRef.current < total;
        }
      }

      // Убираем дубликаты
      const existingIds = new Set(models.map(m => m.id));
      const uniqueNewModels = newModels.filter(model => !existingIds.has(model.id));

      if (uniqueNewModels.length > 0) {
        setModels(prev => [...prev, ...uniqueNewModels]);
        setHasMore(moreData);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading next page:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [source, dq, category, hasMore, models, isOpen]);

  // Запуск загрузки при открытии или изменении фильтров
  useEffect(() => {
    if (isOpen) {
      resetAndLoad();
    }
  }, [isOpen, source, dq, category, resetAndLoad]);

  // Intersection Observer для infinite scroll
  useEffect(() => {
    const el = loaderRef.current;
    if (!el || !isOpen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !isLoadingRef.current) {
          loadNextPage();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadNextPage, isOpen]);

  // Import handler
  const handleImport = useCallback(async (model: AssetModel) => {
    if (importing === model.id) return;
    setImporting(model.id);
    try {
      if (model.source === 'polypizza' && model.downloadUrl) {
        onImport(model.downloadUrl, model.name, 'glb');
        setPreview(null);
      } else if (model.source === 'local' && model.downloadUrl) {
        onImport(model.downloadUrl, model.name, model.format || 'glb');
        setPreview(null);
      } else if (model.source === 'osa' && model.downloadUrl) {
        onImport(model.downloadUrl, model.name, model.format || 'glb');
        setPreview(null);
      } else if (model.source === 'sketchfab' && model.sketchfabUid) {
        const url = await downloadSketchfab(model.sketchfabUid);
        if (url) { 
          onImport(url, model.name, 'glb'); 
          setPreview(null);
        } else {
          alert(isRu ? 'Не удалось получить ссылку для скачивания' : 'Could not get download link');
        }
      }
    } catch (error) {
      console.error('Import error:', error);
      alert(isRu ? 'Ошибка при импорте модели' : 'Error importing model');
    } finally {
      setImporting('');
    }
  }, [onImport, isRu, importing]);

  const handleRefresh = useCallback(() => {
    resetAndLoad();
  }, [resetAndLoad]);

  if (!isOpen) return null;

  const totalLoaded = models.length;
  const totalAvail = source === 'polypizza' ? ppTotalRef.current : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-white/5 flex-shrink-0 bg-gray-950">
        <Layers className="w-5 h-5 text-cyan-400 flex-shrink-0" />
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
            autoFocus
            placeholder={isRu ? 'Поиск 3D моделей...' : 'Search 3D models...'}
            className="w-full bg-gray-900 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50" 
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
          onClick={() => setShowFilters(v => !v)}
          className={`p-2 rounded-lg border flex-shrink-0 transition-all ${
            showFilters 
              ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' 
              : 'border-white/10 text-gray-500 hover:text-white'
          }`}
        >
          <Filter className="w-4 h-4" />
        </button>
        <button 
          onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
          className="p-2 rounded-lg border border-white/10 text-gray-500 hover:text-white flex-shrink-0"
        >
          {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
        </button>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white flex-shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 flex-shrink-0 overflow-x-auto bg-gray-950">
        {SOURCES.map(({ id, labelEn, labelRu, icon: Icon }) => (
          <button 
            key={id} 
            onClick={() => setSource(id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 flex-shrink-0 transition-all ${
              source === id 
                ? 'text-cyan-400 border-cyan-500' 
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {isRu ? labelRu : labelEn}
          </button>
        ))}
        <div className="flex-1" />
      </div>

      {/* Category Filters */}
      {showFilters && (
        <div className="flex gap-2 px-4 py-3 border-b border-white/5 overflow-x-auto flex-shrink-0 bg-gray-950/80">
          {CATEGORIES.map(cat => (
            <button 
              key={cat.id} 
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 text-xs rounded-lg border flex-shrink-0 transition-all ${
                category === cat.id 
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' 
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {isRu ? cat.ru : cat.en}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Status */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-gray-600">
            {loading && totalLoaded === 0
              ? (isRu ? 'Загрузка...' : 'Loading...')
              : totalLoaded > 0
              ? totalAvail > 0
                ? `${totalLoaded} / ${totalAvail.toLocaleString()} ${isRu ? 'моделей' : 'models'}`
                : `${totalLoaded}${hasMore ? '+' : ''} ${isRu ? 'моделей' : 'models'}`
              : ''}
          </p>
          {totalLoaded > 0 && (
            <button 
              onClick={handleRefresh}
              className="text-xs text-gray-600 hover:text-gray-300 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              {isRu ? 'Обновить' : 'Refresh'}
            </button>
          )}
        </div>

        {/* Grid */}
        {totalLoaded > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {models.map(m => (
              <ModelCard 
                key={m.id} 
                model={m} 
                isRu={isRu}
                onImport={handleImport} 
                onPreview={setPreview}
                importing={importing === m.id} 
              />
            ))}
          </div>
        )}

        {/* List */}
        {totalLoaded > 0 && viewMode === 'list' && (
          <div className="flex flex-col gap-2">
            {models.map(m => {
              const badge = {
                local:     { cls: 'bg-cyan-500/20 text-cyan-400',   label: 'Local'      },
                sketchfab: { cls: 'bg-orange-500/20 text-orange-400', label: 'Sketchfab' },
                polypizza: { cls: 'bg-green-500/20 text-green-400',  label: 'Poly Pizza' },
                osa:       { cls: 'bg-purple-500/20 text-purple-400', label: 'Open Assets' },
              }[m.source];
              return (
                <div 
                  key={m.id} 
                  onClick={() => setPreview(m)}
                  className="flex items-center gap-3 p-3 bg-gray-900/50 hover:bg-gray-900 rounded-xl border border-white/5 cursor-pointer"
                >
                  <div className="w-14 h-14 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                    {m.thumbnail
                      ? <img src={m.thumbnail} alt={m.name} className="w-full h-full object-cover" loading="lazy" />
                      : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-gray-700" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 font-medium truncate">{m.name}</p>
                    <p className="text-xs text-gray-500 truncate">{m.author || ''}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <button 
                    onClick={e => { e.stopPropagation(); handleImport(m); }} 
                    disabled={importing === m.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs rounded-lg flex-shrink-0"
                  >
                    {importing === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Import className="w-3 h-3" />}
                    {isRu ? 'Импорт' : 'Import'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty */}
        {!loading && totalLoaded === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Package className="w-14 h-14 text-gray-800" />
            <p className="text-gray-400 text-sm">{isRu ? 'Модели не найдены' : 'No models found'}</p>
            <p className="text-xs text-gray-600">{isRu ? 'Попробуйте другой запрос или источник' : 'Try a different query or source'}</p>
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={loaderRef} className="flex justify-center py-8 mt-2">
          {loading && totalLoaded > 0 && (
            <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          )}
          {!loading && hasMore && totalLoaded > 0 && (
            <button 
              onClick={loadNextPage}
              className="text-xs text-gray-600 hover:text-gray-400 px-4 py-2 border border-white/5 rounded-lg"
            >
              {isRu ? 'Загрузить ещё' : 'Load more'}
            </button>
          )}
          {!hasMore && totalLoaded > 0 && (
            <p className="text-xs text-gray-700">{isRu ? 'Всё загружено' : 'All loaded'}</p>
          )}
        </div>
      </div>

      {/* Preview */}
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