import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, Search, Download, Eye, ArrowLeft,
  Sparkles, Grid, List, Star, Users, Clock,
  Layers, Filter, ChevronDown, ExternalLink
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import Viewer3D from '../components/Viewer3D';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

interface LibraryProps {
  onClose: () => void;
  onOpenInStudio: () => void;
}

interface LocalModel {
  id: string;
  name: string;
  category: string;
  thumbnail_url: string;
  file_url: string;
  tags: string[];
  downloads: number;
  featured: boolean;
}

interface SketchfabModel {
  uid: string;
  name: string;
  thumbnails: { images: { url: string; width: number }[] };
  user: { displayName: string };
  viewCount: number;
  likeCount: number;
  downloadCount: number;
  isDownloadable: boolean;
}

interface CommunityModel {
  id: string;
  name: string;
  prompt: string;
  file_url: string;
  created_at: string;
}

const SKETCHFAB_CATEGORIES = [
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
  { id: 'art-abstract', ru: 'Искусство', en: 'Art' },
  { id: 'sports-fitness', ru: 'Спорт', en: 'Sports' },
];

export default function Library({ onClose, onOpenInStudio }: LibraryProps) {
  const { lang } = useLang();
  const isRu = lang === 'ru';

  const [tab, setTab] = useState<'local' | 'sketchfab' | 'community'>('local');
  const [search, setSearch] = useState('');
  const [sfCategory, setSfCategory] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Local models
  const [localModels, setLocalModels] = useState<LocalModel[]>([]);
  const [localLoading, setLocalLoading] = useState(false);

  // Sketchfab models
  const [sfModels, setSfModels] = useState<SketchfabModel[]>([]);
  const [sfLoading, setSfLoading] = useState(false);
  const [sfTotal, setSfTotal] = useState(0);
  const [sfPage, setSfPage] = useState(0);
  const [sfHasMore, setSfHasMore] = useState(true);

  // Community models
  const [communityModels, setCommunityModels] = useState<CommunityModel[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);

  // Preview
  const [preview, setPreview] = useState<{ url: string; name: string; sketchfabUid?: string } | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver>();

  // Load local models
  const loadLocal = useCallback(async () => {
    setLocalLoading(true);
    let q = supabase.from('library_models').select('*').order('featured', { ascending: false }).order('downloads', { ascending: false });
    if (search) q = q.ilike('name', `%${search}%`);
    const { data } = await q.limit(200);
    if (data) setLocalModels(data as LocalModel[]);
    setLocalLoading(false);
  }, [search]);

  // Load Sketchfab
  const loadSketchfab = useCallback(async (reset = false) => {
    setSfLoading(true);
    try {
      const offset = reset ? 0 : sfPage * 24;
      const params = new URLSearchParams({
        type: 'models',
        downloadable: 'true',
        count: '24',
        offset: String(offset),
        sort_by: '-likeCount',
        ...(search && { q: search }),
        ...(sfCategory && { categories: sfCategory }),
      });

      const res = await fetch(`https://api.sketchfab.com/v3/search?${params}`, {
        headers: { 'Authorization': `Token f8a254d9b48c40e9befa26962a40abec` },
      });
      const data = await res.json();
      const models = data.results || [];
      setSfTotal(data.count || 0);
      setSfHasMore(!!data.next);

      if (reset) {
        setSfModels(models);
        setSfPage(1);
      } else {
        setSfModels(prev => [...prev, ...models]);
        setSfPage(p => p + 1);
      }
    } catch (err) {
      console.error('Sketchfab error:', err);
    } finally {
      setSfLoading(false);
    }
  }, [search, sfCategory, sfPage]);

  // Load community
  const loadCommunity = useCallback(async () => {
    setCommunityLoading(true);
    const { data } = await supabase
      .from('models')
      .select('id, name, prompt, file_url, created_at')
      .eq('status', 'ready')
      .eq('source_type', 'ai_generated')
      .not('file_url', 'is', null)
      .neq('file_url', '')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) setCommunityModels(data as CommunityModel[]);
    setCommunityLoading(false);
  }, []);

  // Tab switch
  useEffect(() => {
    if (tab === 'local') loadLocal();
    else if (tab === 'sketchfab') loadSketchfab(true);
    else loadCommunity();
  }, [tab]);

  // Search debounce
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      if (tab === 'local') loadLocal();
      else if (tab === 'sketchfab') loadSketchfab(true);
    }, 500);
    return () => clearTimeout(searchTimeout.current);
  }, [search]);

  // Category change
  useEffect(() => {
    if (tab === 'sketchfab') loadSketchfab(true);
  }, [sfCategory]);

  // Infinite scroll for Sketchfab
  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && sfHasMore && !sfLoading && tab === 'sketchfab') {
        loadSketchfab(false);
      }
    }, { threshold: 0.1 });
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [sfHasMore, sfLoading, tab, loadSketchfab]);

  const getThumbnail = (model: SketchfabModel) => {
    const imgs = model.thumbnails?.images || [];
    return (imgs.find(i => i.width >= 200 && i.width <= 400) || imgs[0])?.url || '';
  };

  const fmt = (n: number) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n || 0);

  const handleLocalDownload = async (url: string, name: string, id: string) => {
    setDownloading(id);
    try {
      const r = await fetch(url);
      const blob = await r.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${name}.glb`;
      a.click();
    } catch (e) { console.error(e); }
    finally { setDownloading(null); }
  };

  const handleSketchfabDownload = async (uid: string, name: string) => {
    setDownloading(uid);
    try {
      // Get download URL from Sketchfab
      const res = await fetch(`https://api.sketchfab.com/v3/models/${uid}/download`, {
        headers: { 'Authorization': `Token f8a254d9b48c40e9befa26962a40abec` },
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
    } catch (e) {
      window.open(`https://sketchfab.com/models/${uid}`, '_blank');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 flex-shrink-0">
        <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
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
        <button onClick={() => setTab('local')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${tab==='local'?'text-cyan-400 border-cyan-500':'text-gray-500 border-transparent hover:text-gray-300'}`}>
          <Star className="w-4 h-4" />{isRu ? 'Наши модели' : 'Featured'}
          <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded-full">{localModels.length || '49+'}</span>
        </button>
        <button onClick={() => setTab('sketchfab')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${tab==='sketchfab'?'text-cyan-400 border-cyan-500':'text-gray-500 border-transparent hover:text-gray-300'}`}>
          <Sparkles className="w-4 h-4" />{isRu ? 'Sketchfab' : 'Sketchfab'}
          {sfTotal > 0 && <span className="text-xs bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full">{fmt(sfTotal)}+</span>}
        </button>
        <button onClick={() => setTab('community')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${tab==='community'?'text-cyan-400 border-cyan-500':'text-gray-500 border-transparent hover:text-gray-300'}`}>
          <Users className="w-4 h-4" />{isRu ? 'Сообщество' : 'Community'}
        </button>
      </div>

      {/* Sketchfab category filter */}
      {tab === 'sketchfab' && (
        <div className="px-4 py-2 border-b border-white/5 flex-shrink-0 flex gap-2 overflow-x-auto">
          {SKETCHFAB_CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setSfCategory(cat.id)}
              className={`px-3 py-1.5 text-xs rounded-lg border flex-shrink-0 transition-all ${sfCategory===cat.id?'bg-cyan-500/20 border-cyan-500/40 text-cyan-400':'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>
              {isRu ? cat.ru : cat.en}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* LOCAL TAB */}
        {tab === 'local' && (
          localLoading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>
          ) : (
            <div className={viewMode==='grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3' : 'flex flex-col gap-2'}>
              {localModels.map(model => viewMode === 'grid' ? (
                <div key={model.id} className="group bg-gray-900/50 rounded-xl border border-white/5 hover:border-white/15 overflow-hidden transition-all hover:scale-[1.02] cursor-pointer">
                  <div className="aspect-square relative overflow-hidden bg-gray-800" onClick={() => setPreview({ url: model.file_url, name: model.name })}>
                    <img src={model.thumbnail_url} alt={model.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center text-white"><Eye className="w-4 h-4" /></div>
                        <button onClick={e => { e.stopPropagation(); handleLocalDownload(model.file_url, model.name, model.id); }} disabled={downloading===model.id}
                          className="w-9 h-9 bg-cyan-500/80 backdrop-blur rounded-lg flex items-center justify-center text-white">
                          {downloading===model.id ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {model.featured && <Star className="absolute top-2 left-2 w-4 h-4 text-yellow-400 fill-yellow-400" />}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs text-gray-200 font-medium truncate">{model.name}</p>
                    <p className="text-xs text-gray-600 capitalize mt-0.5">{model.category} · ⬇️ {fmt(model.downloads)}</p>
                  </div>
                </div>
              ) : (
                <div key={model.id} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-xl border border-white/5 hover:border-white/15 transition-all cursor-pointer"
                  onClick={() => setPreview({ url: model.file_url, name: model.name })}>
                  <img src={model.thumbnail_url} alt={model.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-gray-800" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 font-medium truncate">{model.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{model.category}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleLocalDownload(model.file_url, model.name, model.id); }} disabled={downloading===model.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs rounded-lg flex-shrink-0">
                    {downloading===model.id ? <div className="w-3 h-3 border border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" /> : <Download className="w-3 h-3" />}
                    GLB
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {/* SKETCHFAB TAB */}
        {tab === 'sketchfab' && (
          <>
            {sfTotal > 0 && (
              <p className="text-xs text-gray-500 mb-3">{isRu ? `Найдено: ${fmt(sfTotal)} моделей` : `Found: ${fmt(sfTotal)} models`}</p>
            )}
            <div className={viewMode==='grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3' : 'flex flex-col gap-2'}>
              {sfModels.map(model => viewMode === 'grid' ? (
                <div key={model.uid} className="group bg-gray-900/50 rounded-xl border border-white/5 hover:border-white/15 overflow-hidden transition-all hover:scale-[1.02] cursor-pointer"
                  onClick={() => setPreview({ url: getThumbnail(model), name: model.name, sketchfabUid: model.uid })}>
                  <div className="aspect-square relative overflow-hidden bg-gray-800">
                    <img src={getThumbnail(model)} alt={model.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center text-white"><Eye className="w-4 h-4" /></div>
                        {model.isDownloadable && (
                          <button onClick={e => { e.stopPropagation(); handleSketchfabDownload(model.uid, model.name); }} disabled={downloading===model.uid}
                            className="w-9 h-9 bg-cyan-500/80 backdrop-blur rounded-lg flex items-center justify-center text-white">
                            {downloading===model.uid ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>
                    {model.isDownloadable && <div className="absolute top-2 right-2 bg-green-500/80 text-white text-xs px-1.5 py-0.5 rounded-md">DL</div>}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs text-gray-200 font-medium truncate">{model.name}</p>
                    <p className="text-xs text-gray-600 truncate mt-0.5">{model.user?.displayName}</p>
                    <p className="text-xs text-gray-700 mt-0.5">👁 {fmt(model.viewCount)} · ❤️ {fmt(model.likeCount)}</p>
                  </div>
                </div>
              ) : (
                <div key={model.uid} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-xl border border-white/5 hover:border-white/15 transition-all cursor-pointer"
                  onClick={() => setPreview({ url: getThumbnail(model), name: model.name, sketchfabUid: model.uid })}>
                  <img src={getThumbnail(model)} alt={model.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-gray-800" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 font-medium truncate">{model.name}</p>
                    <p className="text-xs text-gray-500 truncate">{model.user?.displayName}</p>
                    <p className="text-xs text-gray-700">👁 {fmt(model.viewCount)} · ❤️ {fmt(model.likeCount)}</p>
                  </div>
                  {model.isDownloadable && (
                    <button onClick={e => { e.stopPropagation(); handleSketchfabDownload(model.uid, model.name); }} disabled={downloading===model.uid}
                      className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs rounded-lg flex-shrink-0">
                      <Download className="w-3 h-3" />GLB
                    </button>
                  )}
                </div>
              ))}
            </div>
            {sfLoading && <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>}
            <div ref={loadMoreRef} className="h-4" />
          </>
        )}

        {/* COMMUNITY TAB */}
        {tab === 'community' && (
          communityLoading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>
          ) : communityModels.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">{isRu ? 'Пока нет публичных моделей' : 'No public models yet'}</p>
              <button onClick={onOpenInStudio} className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-medium rounded-xl">
                {isRu ? 'Создать первую модель' : 'Create first model'}
              </button>
            </div>
          ) : (
            <div className={viewMode==='grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3' : 'flex flex-col gap-2'}>
              {communityModels.map(model => {
                const proxyUrl = `${SUPABASE_URL}/functions/v1/generate-3d-model?proxy=${encodeURIComponent(model.file_url)}`;
                return viewMode === 'grid' ? (
                  <div key={model.id} className="group bg-gray-900/50 rounded-xl border border-white/5 hover:border-white/15 overflow-hidden transition-all cursor-pointer"
                    onClick={() => setPreview({ url: proxyUrl, name: model.name })}>
                    <div className="aspect-square bg-gray-800 flex items-center justify-center relative">
                      <Sparkles className="w-8 h-8 text-cyan-500/20" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                        <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs text-gray-200 font-medium truncate">{model.name}</p>
                      {model.prompt && <p className="text-xs text-gray-600 truncate mt-0.5">{model.prompt}</p>}
                      <div className="flex items-center gap-1 mt-1"><Clock className="w-3 h-3 text-gray-700" /><span className="text-xs text-gray-700">{new Date(model.created_at).toLocaleDateString()}</span></div>
                    </div>
                  </div>
                ) : (
                  <div key={model.id} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-xl border border-white/5 cursor-pointer hover:border-white/15 transition-all"
                    onClick={() => setPreview({ url: proxyUrl, name: model.name })}>
                    <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0"><Sparkles className="w-5 h-5 text-cyan-500/40" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 truncate">{model.name}</p>
                      {model.prompt && <p className="text-xs text-gray-600 truncate">{model.prompt}</p>}
                    </div>
                    <Eye className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  </div>
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
              <h3 className="text-white font-medium text-sm truncate flex-1">{preview.name}</h3>
              <div className="flex items-center gap-2 ml-2">
                {preview.sketchfabUid ? (
                  <>
                    <button onClick={() => handleSketchfabDownload(preview.sketchfabUid!, preview.name)}
                      disabled={downloading === preview.sketchfabUid}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-medium rounded-lg">
                      <Download className="w-3.5 h-3.5" />{isRu ? 'Скачать' : 'Download'}
                    </button>
                    <a href={`https://sketchfab.com/models/${preview.sketchfabUid}`} target="_blank" rel="noopener noreferrer"
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
              {preview.sketchfabUid ? (
                <iframe
                  title={preview.name}
                  className="w-full h-full"
                  src={`https://sketchfab.com/models/${preview.sketchfabUid}/embed?autostart=1&ui_hint=0&ui_watermark=0`}
                  allow="autoplay; fullscreen; xr-spatial-tracking"
                  allowFullScreen
                />
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
