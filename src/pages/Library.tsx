import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Search, Download, Eye, ArrowLeft, Sparkles, Grid, List, Star, Users, Clock, Filter, ExternalLink, ChevronRight } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import Viewer3D from '../components/Viewer3D';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SF_TOKEN = 'f8a254d9b48c40e9befa26962a40abec';
const SF_API = 'https://api.sketchfab.com/v3';

interface LibraryProps { onClose: () => void; onOpenInStudio: () => void; }
interface LocalModel { id: string; name: string; category: string; thumbnail_url: string; file_url: string; tags: string[]; downloads: number; featured: boolean; }
interface SFModel { uid: string; name: string; thumbnails: { images: { url: string; width: number }[] }; user: { displayName: string }; viewCount: number; likeCount: number; isDownloadable: boolean; }
interface CommunityModel { id: string; name: string; prompt: string; file_url: string; created_at: string; }

const SF_CATS = [
  { id: '', ru: 'Все', en: 'All' },
  { id: 'characters-creatures', ru: 'Персонажи', en: 'Characters' },
  { id: 'animals-pets', ru: 'Животные', en: 'Animals' },
  { id: 'vehicles-transportation', ru: 'Транспорт', en: 'Vehicles' },
  { id: 'architecture', ru: 'Архитектура', en: 'Architecture' },
  { id: 'weapons-military', ru: 'Оружие', en: 'Weapons' },
  { id: 'food-drink', ru: 'Еда', en: 'Food' },
  { id: 'nature-plants', ru: 'Природа', en: 'Nature' },
  { id: 'science-technology', ru: 'Технологии', en: 'Tech' },
  { id: 'furniture-home', ru: 'Мебель', en: 'Furniture' },
  { id: 'art-abstract', ru: 'Арт', en: 'Art' },
  { id: 'sports-fitness', ru: 'Спорт', en: 'Sports' },
];

const fmt = (n: number) => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(1)}K` : String(n || 0);
const getThumb = (m: SFModel) => { const imgs = m.thumbnails?.images || []; return (imgs.find(i => i.width >= 200 && i.width <= 400) || imgs[0])?.url || ''; };

export default function Library({ onClose, onOpenInStudio }: LibraryProps) {
  const { lang } = useLang();
  const isRu = lang === 'ru';
  const [tab, setTab] = useState<'local'|'sketchfab'|'community'>('local');
  const [search, setSearch] = useState('');
  const [sfCat, setSfCat] = useState('');
  const [viewMode, setViewMode] = useState<'grid'|'list'>('grid');

  // Local
  const [local, setLocal] = useState<LocalModel[]>([]);
  const [localLoading, setLocalLoading] = useState(false);

  // Sketchfab — key fix: use cursor-based pagination, not offset
  const [sfModels, setSfModels] = useState<SFModel[]>([]);
  const [sfLoading, setSfLoading] = useState(false);
  const [sfNext, setSfNext] = useState<string | null>(null);
  const [sfTotal, setSfTotal] = useState(0);
  const [sfSeenUids, setSfSeenUids] = useState<Set<string>>(new Set());

  // Community
  const [community, setCommunity] = useState<CommunityModel[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);

  // Preview
  const [preview, setPreview] = useState<{ url: string; name: string; sfUid?: string } | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const searchRef = useRef<ReturnType<typeof setTimeout>>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver>();

  // ── LOAD LOCAL ──
  const loadLocal = useCallback(async () => {
    setLocalLoading(true);
    let q = supabase.from('library_models').select('*')
      .order('featured', { ascending: false })
      .order('downloads', { ascending: false });
    if (search) q = q.ilike('name', `%${search}%`);
    const { data } = await q.limit(200);
    if (data) setLocal(data as LocalModel[]);
    setLocalLoading(false);
  }, [search]);

  // ── LOAD SKETCHFAB ──
  const loadSF = useCallback(async (url?: string) => {
    if (sfLoading) return;
    setSfLoading(true);
    try {
      let fetchUrl: string;
      if (url) {
        fetchUrl = url;
      } else {
        const p = new URLSearchParams({
          type: 'models',
          downloadable: 'true',
          count: '24',
          sort_by: '-likeCount',
          ...(search && { q: search }),
          ...(sfCat && { categories: sfCat }),
        });
        fetchUrl = `${SF_API}/search?${p}`;
      }

      const res = await fetch(fetchUrl, {
        headers: { Authorization: `Token ${SF_TOKEN}` },
      });
      const data = await res.json();

      setSfTotal(data.count || 0);
      setSfNext(data.next || null);

      // Deduplicate
      const newModels = (data.results || []).filter((m: SFModel) => !sfSeenUids.has(m.uid));
      const newUids = new Set([...sfSeenUids, ...newModels.map((m: SFModel) => m.uid)]);
      setSfSeenUids(newUids);

      if (!url) {
        setSfModels(newModels);
      } else {
        setSfModels(prev => [...prev, ...newModels]);
      }
    } catch (e) {
      console.error('SF error:', e);
    } finally {
      setSfLoading(false);
    }
  }, [search, sfCat, sfLoading, sfSeenUids]);

  const resetSF = useCallback(() => {
    setSfModels([]);
    setSfNext(null);
    setSfSeenUids(new Set());
    loadSF(undefined);
  }, [loadSF]);

  // ── LOAD COMMUNITY ──
  const loadCommunity = useCallback(async () => {
    setCommunityLoading(true);
    const { data } = await supabase.from('models').select('id,name,prompt,file_url,created_at')
      .eq('status', 'ready').eq('source_type', 'ai_generated')
      .not('file_url', 'is', null).neq('file_url', '')
      .order('created_at', { ascending: false }).limit(100);
    if (data) setCommunity(data as CommunityModel[]);
    setCommunityLoading(false);
  }, []);

  // Tab switch
  useEffect(() => {
    if (tab === 'local') loadLocal();
    else if (tab === 'sketchfab') resetSF();
    else loadCommunity();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Search debounce
  useEffect(() => {
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      if (tab === 'local') loadLocal();
      else if (tab === 'sketchfab') resetSF();
    }, 600);
    return () => clearTimeout(searchRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Category change
  useEffect(() => {
    if (tab === 'sketchfab') resetSF();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sfCat]);

  // Infinite scroll — load next page via cursor URL
  useEffect(() => {
    observerRef.current?.disconnect();
    if (tab !== 'sketchfab' || !sfNext) return;
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && sfNext && !sfLoading) {
        loadSF(sfNext);
      }
    }, { threshold: 0.1 });
    if (bottomRef.current) observerRef.current.observe(bottomRef.current);
    return () => observerRef.current?.disconnect();
  }, [tab, sfNext, sfLoading, loadSF]);

  // ── DOWNLOAD ──
  const dlLocal = async (url: string, name: string, id: string) => {
    setDownloading(id);
    try {
      const r = await fetch(url);
      const blob = await r.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${name}.glb`;
      a.click();
    } finally { setDownloading(null); }
  };

  const dlSketchfab = async (uid: string, name: string) => {
    setDownloading(uid);
    try {
      const res = await fetch(`${SF_API}/models/${uid}/download`, {
        headers: { Authorization: `Token ${SF_TOKEN}` },
      });
      const data = await res.json();
      const glbUrl = data.gltf?.url || data.source?.url;
      if (glbUrl) {
        const r = await fetch(glbUrl);
        const blob = await r.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${name}.glb`;
        a.click();
      } else {
        window.open(`https://sketchfab.com/models/${uid}`, '_blank');
      }
    } catch {
      window.open(`https://sketchfab.com/models/${uid}`, '_blank');
    } finally { setDownloading(null); }
  };

  const gridCls = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3';

  return (
    <div className="fixed inset-0 z-40 bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 flex-shrink-0">
        <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={isRu ? 'Поиск 3D моделей...' : 'Search 3D models...'}
            className="w-full bg-gray-900 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50" />
        </div>
        <div className="flex items-center gap-1 bg-white/5 rounded-xl border border-white/10 p-1">
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg ${viewMode==='grid'?'bg-cyan-500 text-white':'text-gray-500'}`}><Grid className="w-3.5 h-3.5" /></button>
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg ${viewMode==='list'?'bg-cyan-500 text-white':'text-gray-500'}`}><List className="w-3.5 h-3.5" /></button>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white p-1 hidden sm:block"><X className="w-5 h-5" /></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 flex-shrink-0">
        <button onClick={() => setTab('local')} className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${tab==='local'?'text-cyan-400 border-cyan-500':'text-gray-500 border-transparent hover:text-gray-300'}`}>
          <Star className="w-4 h-4" />{isRu ? 'Наши модели' : 'Featured'}
          <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded-full">{local.length || '49+'}</span>
        </button>
        <button onClick={() => setTab('sketchfab')} className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${tab==='sketchfab'?'text-cyan-400 border-cyan-500':'text-gray-500 border-transparent hover:text-gray-300'}`}>
          <Sparkles className="w-4 h-4" />Sketchfab
          {sfTotal > 0 && <span className="text-xs bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full">{fmt(sfTotal)}</span>}
        </button>
        <button onClick={() => setTab('community')} className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${tab==='community'?'text-cyan-400 border-cyan-500':'text-gray-500 border-transparent hover:text-gray-300'}`}>
          <Users className="w-4 h-4" />{isRu ? 'Сообщество' : 'Community'}
        </button>
      </div>

      {/* SF category filter */}
      {tab === 'sketchfab' && (
        <div className="px-4 py-2 border-b border-white/5 flex-shrink-0 flex gap-2 overflow-x-auto scrollbar-none">
          {SF_CATS.map(c => (
            <button key={c.id} onClick={() => setSfCat(c.id)}
              className={`px-3 py-1.5 text-xs rounded-lg border flex-shrink-0 transition-all ${sfCat===c.id?'bg-cyan-500/20 border-cyan-500/40 text-cyan-400':'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>
              {isRu ? c.ru : c.en}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* LOCAL */}
        {tab === 'local' && (
          localLoading ? <Spinner /> : (
            <div className={viewMode==='grid' ? gridCls : 'flex flex-col gap-2'}>
              {local.map(m => (
                <ModelCard key={m.id} viewMode={viewMode} isRu={isRu}
                  name={m.name} thumb={m.thumbnail_url} sub={m.category}
                  stats={`⬇️ ${fmt(m.downloads)}`} featured={m.featured}
                  canDownload={true} downloading={downloading === m.id}
                  onPreview={() => setPreview({ url: m.file_url, name: m.name })}
                  onDownload={() => dlLocal(m.file_url, m.name, m.id)} />
              ))}
            </div>
          )
        )}

        {/* SKETCHFAB */}
        {tab === 'sketchfab' && (
          <>
            {sfTotal > 0 && <p className="text-xs text-gray-500 mb-3">{isRu ? `Найдено: ${fmt(sfTotal)} моделей с возможностью скачивания` : `Found: ${fmt(sfTotal)} downloadable models`}</p>}
            {sfModels.length === 0 && !sfLoading && (
              <div className="text-center py-16"><Sparkles className="w-12 h-12 text-gray-700 mx-auto mb-3" /><p className="text-gray-500">{isRu ? 'Нет результатов' : 'No results'}</p></div>
            )}
            <div className={viewMode==='grid' ? gridCls : 'flex flex-col gap-2'}>
              {sfModels.map(m => (
                <ModelCard key={m.uid} viewMode={viewMode} isRu={isRu}
                  name={m.name} thumb={getThumb(m)} sub={m.user?.displayName || ''}
                  stats={`👁 ${fmt(m.viewCount)} · ❤️ ${fmt(m.likeCount)}`}
                  canDownload={m.isDownloadable} downloading={downloading === m.uid}
                  onPreview={() => setPreview({ url: getThumb(m), name: m.name, sfUid: m.uid })}
                  onDownload={() => dlSketchfab(m.uid, m.name)} />
              ))}
            </div>
            {sfLoading && <Spinner />}
            <div ref={bottomRef} className="h-4" />
          </>
        )}

        {/* COMMUNITY */}
        {tab === 'community' && (
          communityLoading ? <Spinner /> : community.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">{isRu ? 'Пока нет публичных моделей' : 'No public models yet'}</p>
              <button onClick={onOpenInStudio} className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-medium rounded-xl">
                {isRu ? 'Создать модель' : 'Create a model'}
              </button>
            </div>
          ) : (
            <div className={viewMode==='grid' ? gridCls : 'flex flex-col gap-2'}>
              {community.map(m => {
                const proxyUrl = `${SUPABASE_URL}/functions/v1/generate-3d-model?proxy=${encodeURIComponent(m.file_url)}`;
                return (
                  <ModelCard key={m.id} viewMode={viewMode} isRu={isRu}
                    name={m.name} thumb={null} sub={m.prompt || ''}
                    stats={new Date(m.created_at).toLocaleDateString()} canDownload={false}
                    onPreview={() => setPreview({ url: proxyUrl, name: m.name })}
                    onDownload={() => {}} downloading={false} community />
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPreview(null)} />
          <div className="relative w-full max-w-2xl h-[75vh] bg-gray-900 rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
              <h3 className="text-white font-medium text-sm truncate flex-1 mr-2">{preview.name}</h3>
              <div className="flex items-center gap-2">
                {preview.sfUid ? (
                  <>
                    <button onClick={() => dlSketchfab(preview.sfUid!, preview.name)} disabled={downloading === preview.sfUid}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-medium rounded-lg">
                      <Download className="w-3.5 h-3.5" />{isRu ? 'Скачать' : 'Download'}
                    </button>
                    <a href={`https://sketchfab.com/models/${preview.sfUid}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs rounded-lg">
                      <ExternalLink className="w-3.5 h-3.5" />Sketchfab
                    </a>
                  </>
                ) : (
                  <button onClick={() => { const a = document.createElement('a'); a.href = preview.url; a.download = `${preview.name}.glb`; a.click(); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-medium rounded-lg">
                    <Download className="w-3.5 h-3.5" />GLB
                  </button>
                )}
                <button onClick={() => setPreview(null)} className="text-gray-500 hover:text-white p-1"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="flex-1">
              {preview.sfUid ? (
                <iframe title={preview.name} className="w-full h-full"
                  src={`https://sketchfab.com/models/${preview.sfUid}/embed?autostart=1&ui_hint=0&ui_watermark=0&ui_infos=0`}
                  allow="autoplay; fullscreen; xr-spatial-tracking" allowFullScreen />
              ) : (
                <Viewer3D modelUrl={preview.url} format="glb" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>;
}

function ModelCard({ name, thumb, sub, stats, featured, canDownload, downloading, onPreview, onDownload, viewMode, isRu, community }: {
  name: string; thumb: string | null; sub: string; stats: string;
  featured?: boolean; canDownload: boolean; downloading: boolean;
  onPreview: () => void; onDownload: () => void;
  viewMode: 'grid' | 'list'; isRu: boolean; community?: boolean;
}) {
  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-xl border border-white/5 hover:border-white/15 transition-all cursor-pointer" onClick={onPreview}>
        <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
          {thumb ? <img src={thumb} alt={name} className="w-full h-full object-cover" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center"><Sparkles className="w-5 h-5 text-cyan-500/40" /></div>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-200 font-medium truncate">{name}</p>
          <p className="text-xs text-gray-500 truncate">{sub}</p>
          <p className="text-xs text-gray-600">{stats}</p>
        </div>
        {canDownload && (
          <button onClick={e => { e.stopPropagation(); onDownload(); }} disabled={downloading}
            className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs rounded-lg flex-shrink-0">
            {downloading ? <div className="w-3 h-3 border border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" /> : <Download className="w-3 h-3" />}
            GLB
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="group bg-gray-900/50 rounded-xl border border-white/5 hover:border-white/15 overflow-hidden transition-all hover:scale-[1.02] cursor-pointer" onClick={onPreview}>
      <div className="aspect-square relative overflow-hidden bg-gray-800">
        {thumb ? <img src={thumb} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center"><Sparkles className="w-8 h-8 text-cyan-500/20" /></div>}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center text-white"><Eye className="w-4 h-4" /></div>
            {canDownload && (
              <button onClick={e => { e.stopPropagation(); onDownload(); }} disabled={downloading}
                className="w-9 h-9 bg-cyan-500/80 backdrop-blur rounded-lg flex items-center justify-center text-white">
                {downloading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
        {featured && <Star className="absolute top-2 left-2 w-4 h-4 text-yellow-400 fill-yellow-400" />}
        {canDownload && !community && <div className="absolute top-2 right-2 bg-green-500/80 text-white text-xs px-1.5 py-0.5 rounded-md">DL</div>}
      </div>
      <div className="p-2.5">
        <p className="text-xs text-gray-200 font-medium truncate">{name}</p>
        <p className="text-xs text-gray-600 truncate mt-0.5">{stats}</p>
      </div>
    </div>
  );
}
