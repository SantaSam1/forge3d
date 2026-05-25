import { useState, useEffect, useCallback } from 'react';
import {
  X, Search, Download, Eye, ArrowLeft, Filter,
  Sparkles, Grid, List, Star, Users, Clock, Layers
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import Viewer3D from '../components/Viewer3D';

interface LibraryProps {
  onClose: () => void;
  onOpenInStudio: () => void;
}

interface LibraryModel {
  id: string;
  name: string;
  category: string;
  thumbnail_url: string;
  file_url: string;
  tags: string[];
  downloads: number;
  featured: boolean;
}

interface UserModel {
  id: string;
  name: string;
  prompt: string;
  file_url: string;
  created_at: string;
  status: string;
}

const CATEGORIES_RU: Record<string, string> = {
  '': 'Все', 'characters': 'Персонажи', 'animals': 'Животные',
  'objects': 'Объекты', 'props': 'Реквизит', 'games': 'Игры',
  'food': 'Еда', 'furniture': 'Мебель', 'anatomy': 'Анатомия',
  'primitives': 'Примитивы', 'weapons': 'Оружие', 'architecture': 'Архитектура',
};

const CATEGORIES_EN: Record<string, string> = {
  '': 'All', 'characters': 'Characters', 'animals': 'Animals',
  'objects': 'Objects', 'props': 'Props', 'games': 'Games',
  'food': 'Food', 'furniture': 'Furniture', 'anatomy': 'Anatomy',
  'primitives': 'Primitives', 'weapons': 'Weapons', 'architecture': 'Architecture',
};

export default function Library({ onClose, onOpenInStudio }: LibraryProps) {
  const { lang } = useLang();
  const isRu = lang === 'ru';

  const [tab, setTab] = useState<'featured' | 'community'>('featured');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [libraryModels, setLibraryModels] = useState<LibraryModel[]>([]);
  const [communityModels, setCommunityModels] = useState<UserModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewModel, setPreviewModel] = useState<{ url: string; name: string } | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const categories = isRu ? CATEGORIES_RU : CATEGORIES_EN;

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('library_models').select('*').order('downloads', { ascending: false });
    if (category) q = q.eq('category', category);
    if (search) q = q.ilike('name', `%${search}%`);
    const { data } = await q.limit(100);
    if (data) setLibraryModels(data as LibraryModel[]);
    setLoading(false);
  }, [category, search]);

  const loadCommunity = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('models')
      .select('id, name, prompt, file_url, created_at, status')
      .eq('status', 'ready')
      .eq('source_type', 'ai_generated')
      .not('file_url', 'is', null)
      .neq('file_url', '')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) setCommunityModels(data as UserModel[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'featured') loadLibrary();
    else loadCommunity();
  }, [tab, loadLibrary, loadCommunity]);

  useEffect(() => {
    if (tab === 'featured') loadLibrary();
  }, [category, search]);

  const handleDownload = async (url: string, name: string, id: string) => {
    setDownloading(id);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${name}.glb`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      // Increment downloads counter
      await supabase.from('library_models').update({ downloads: libraryModels.find(m => m.id === id)?.downloads ?? 0 + 1 }).eq('id', id);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(null);
    }
  };

  const featuredModels = libraryModels.filter(m => m.featured);
  const regularModels = libraryModels.filter(m => !m.featured);

  return (
    <div className="fixed inset-0 z-40 bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 flex-shrink-0">
        <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-semibold">{isRu ? 'Библиотека 3D моделей' : '3D Model Library'}</h1>
          <p className="text-xs text-gray-500">{isRu ? 'Бесплатные модели для скачивания' : 'Free models to download'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-white'}`}>
            <Grid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-white'}`}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 flex-shrink-0">
        <button onClick={() => setTab('featured')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all border-b-2 ${tab === 'featured' ? 'text-cyan-400 border-cyan-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>
          <Star className="w-4 h-4" />
          {isRu ? 'Избранные' : 'Featured'}
        </button>
        <button onClick={() => setTab('community')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all border-b-2 ${tab === 'community' ? 'text-cyan-400 border-cyan-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>
          <Users className="w-4 h-4" />
          {isRu ? 'От сообщества' : 'Community'}
        </button>
      </div>

      {/* Search + filters (only for featured) */}
      {tab === 'featured' && (
        <div className="px-4 py-3 border-b border-white/5 flex-shrink-0 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={isRu ? 'Поиск моделей...' : 'Search models...'}
              className="w-full bg-gray-900 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {Object.entries(categories).map(([id, label]) => (
              <button key={id} onClick={() => setCategory(id)}
                className={`px-3 py-1.5 text-xs rounded-lg border flex-shrink-0 transition-all ${category === id ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        ) : tab === 'featured' ? (
          <>
            {/* Featured section */}
            {featuredModels.length > 0 && !search && !category && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <h2 className="text-sm font-semibold text-gray-300">{isRu ? 'Лучшие модели' : 'Top Models'}</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {featuredModels.map(model => (
                    <ModelCard key={model.id} model={model} isRu={isRu}
                      onPreview={() => setPreviewModel({ url: model.file_url, name: model.name })}
                      onDownload={() => handleDownload(model.file_url, model.name, model.id)}
                      downloading={downloading === model.id} viewMode="grid" />
                  ))}
                </div>
              </div>
            )}

            {/* All models */}
            {regularModels.length > 0 && (
              <div>
                {!search && !category && (
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="w-4 h-4 text-gray-400" />
                    <h2 className="text-sm font-semibold text-gray-300">{isRu ? 'Все модели' : 'All Models'}</h2>
                  </div>
                )}
                <div className={viewMode === 'grid'
                  ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3'
                  : 'flex flex-col gap-2'}>
                  {(search || category ? libraryModels : regularModels).map(model => (
                    <ModelCard key={model.id} model={model} isRu={isRu}
                      onPreview={() => setPreviewModel({ url: model.file_url, name: model.name })}
                      onDownload={() => handleDownload(model.file_url, model.name, model.id)}
                      downloading={downloading === model.id} viewMode={viewMode} />
                  ))}
                </div>
              </div>
            )}

            {libraryModels.length === 0 && (
              <div className="text-center py-16">
                <Sparkles className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500">{isRu ? 'Модели не найдены' : 'No models found'}</p>
              </div>
            )}
          </>
        ) : (
          /* Community tab */
          <div>
            <p className="text-xs text-gray-500 mb-4">
              {isRu ? 'Модели созданные пользователями нашего сервиса с помощью ИИ' : 'Models created by our users using AI generation'}
            </p>
            {communityModels.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">{isRu ? 'Пока нет публичных моделей' : 'No public models yet'}</p>
                <p className="text-xs text-gray-600">{isRu ? 'Будьте первым кто создаст модель!' : 'Be the first to create a model!'}</p>
                <button onClick={onOpenInStudio}
                  className="mt-4 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-medium rounded-xl transition-all">
                  {isRu ? 'Открыть студию' : 'Open Studio'}
                </button>
              </div>
            ) : (
              <div className={viewMode === 'grid'
                ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3'
                : 'flex flex-col gap-2'}>
                {communityModels.map(model => (
                  <div key={model.id}
                    className={viewMode === 'grid'
                      ? 'bg-gray-900/50 rounded-xl border border-white/5 hover:border-white/15 overflow-hidden group cursor-pointer transition-all'
                      : 'flex items-center gap-3 p-3 bg-gray-900/50 rounded-xl border border-white/5 hover:border-white/15 cursor-pointer transition-all'}
                    onClick={() => setPreviewModel({ url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-3d-model?proxy=${encodeURIComponent(model.file_url)}`, name: model.name })}>
                    {viewMode === 'grid' ? (
                      <>
                        <div className="aspect-square bg-gray-800 flex items-center justify-center relative">
                          <Sparkles className="w-8 h-8 text-cyan-500/30" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-all">
                            <Eye className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs text-gray-200 font-medium truncate">{model.name}</p>
                          {model.prompt && <p className="text-xs text-gray-600 truncate mt-0.5">{model.prompt}</p>}
                          <div className="flex items-center gap-1 mt-1.5">
                            <Clock className="w-3 h-3 text-gray-600" />
                            <span className="text-xs text-gray-600">{new Date(model.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-5 h-5 text-cyan-500/50" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-200 font-medium truncate">{model.name}</p>
                          {model.prompt && <p className="text-xs text-gray-600 truncate">{model.prompt}</p>}
                          <p className="text-xs text-gray-700 mt-0.5">{new Date(model.created_at).toLocaleDateString()}</p>
                        </div>
                        <Eye className="w-4 h-4 text-gray-600 flex-shrink-0" />
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3D Preview Modal */}
      {previewModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPreviewModel(null)} />
          <div className="relative w-full max-w-2xl h-[70vh] bg-gray-900 rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
              <h3 className="text-white font-medium text-sm truncate">{previewModel.name}</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => {
                  const a = document.createElement('a');
                  a.href = previewModel.url;
                  a.download = `${previewModel.name}.glb`;
                  a.click();
                }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-medium rounded-lg transition-all">
                  <Download className="w-3.5 h-3.5" />
                  {isRu ? 'Скачать GLB' : 'Download GLB'}
                </button>
                <button onClick={() => setPreviewModel(null)} className="text-gray-500 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1">
              <Viewer3D modelUrl={previewModel.url} format="glb" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModelCard({ model, isRu, onPreview, onDownload, downloading, viewMode }: {
  model: LibraryModel; isRu: boolean;
  onPreview: () => void; onDownload: () => void;
  downloading: boolean; viewMode: 'grid' | 'list';
}) {
  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-xl border border-white/5 hover:border-white/15 transition-all">
        <img src={model.thumbnail_url} alt={model.name}
          className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-gray-800" loading="lazy" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-200 font-medium truncate">{model.name}</p>
          <p className="text-xs text-gray-500 capitalize mt-0.5">{model.category}</p>
          <div className="flex gap-1 mt-1 flex-wrap">
            {model.tags?.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-800 text-gray-500 rounded">{tag}</span>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button onClick={onPreview}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs rounded-lg transition-all">
            <Eye className="w-3 h-3" />{isRu ? 'Просмотр' : 'Preview'}
          </button>
          <button onClick={onDownload} disabled={downloading}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs rounded-lg transition-all">
            {downloading ? <div className="w-3 h-3 border border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" /> : <Download className="w-3 h-3" />}
            GLB
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-gray-900/50 rounded-xl border border-white/5 hover:border-white/15 overflow-hidden transition-all hover:scale-[1.02]">
      <div className="aspect-square relative overflow-hidden bg-gray-800 cursor-pointer" onClick={onPreview}>
        <img src={model.thumbnail_url} alt={model.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <button onClick={e => { e.stopPropagation(); onPreview(); }}
              className="w-9 h-9 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center text-white hover:bg-white/30">
              <Eye className="w-4 h-4" />
            </button>
            <button onClick={e => { e.stopPropagation(); onDownload(); }} disabled={downloading}
              className="w-9 h-9 bg-cyan-500/80 backdrop-blur rounded-lg flex items-center justify-center text-white hover:bg-cyan-500">
              {downloading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {model.featured && (
          <div className="absolute top-2 left-2">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs text-gray-200 font-medium truncate">{model.name}</p>
        <p className="text-xs text-gray-600 capitalize mt-0.5">{model.category}</p>
        <p className="text-xs text-gray-700 mt-1">⬇️ {model.downloads?.toLocaleString()}</p>
      </div>
    </div>
  );
}
