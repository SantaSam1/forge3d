import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Sparkles, Upload, BookOpen, RefreshCw, Download, Link2, X,
  ArrowLeft, Cpu, Layers, ChevronDown, Search, Check, Clock, AlertCircle, History
} from 'lucide-react';
import Viewer3D from '../components/Viewer3D';
import { useLang } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import type { Model } from '../lib/supabase';
import type { ToastData } from '../components/Toast';

const EXPORT_FORMATS = ['glb', 'obj', 'gltf', 'usdz', 'stl', 'fbx'] as const;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const FREE_LIMIT = 5;

interface StudioProps {
  onClose: () => void;
  addToast: (msg: string, type: ToastData['type']) => void;
}

type Tab = 'generate' | 'upload' | 'library' | 'history';

interface LibraryItem {
  id: string;
  name: string;
  category: string;
  thumbnail_url: string;
  file_url: string;
  tags: string[];
  downloads: number;
}

export default function Studio({ onClose, addToast }: StudioProps) {
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [modelUrl, setModelUrl] = useState<string | undefined>();
  const [modelFormat, setModelFormat] = useState<string>('glb');
  const [modelName, setModelName] = useState('');
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [exportFormat, setExportFormat] = useState<string>('glb');
  const [copied, setCopied] = useState(false);
  const [userModels, setUserModels] = useState<Model[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current user and generation count on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);

      // Load generation count
      const query = supabase
        .from('models')
        .select('id', { count: 'exact', head: true })
        .eq('source_type', 'ai_generated');

      if (uid) query.eq('user_id', uid);
      else query.is('user_id', null);

      query.then(({ count }) => setGenerationCount(count ?? 0));
    });
  }, []);

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'generate', label: t.studio.tabs.generate, icon: Sparkles },
    { id: 'upload', label: t.studio.tabs.upload, icon: Upload },
    { id: 'library', label: t.studio.tabs.library, icon: BookOpen },
    { id: 'history', label: 'History', icon: History },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    if (generationCount >= FREE_LIMIT) {
      addToast(`Free limit reached (${FREE_LIMIT} generations). Upgrade to Pro.`, 'error');
      return;
    }

    setGenerating(true);
    addToast('Starting generation...', 'info');

    try {
      const FUNC_URL = `${SUPABASE_URL}/functions/v1/generate-3d-model`;

      const res = await fetch(FUNC_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, user_id: userId }),
      });

      const data = await res.json();

      if (res.status === 429) {
        addToast(`Free limit reached. Upgrade to Pro.`, 'error');
        return;
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to start generation');
      }

      const { task_id, model_id } = data;
      addToast('Generating 3D model... (~1 min)', 'info');

      let attempts = 0;
      const poll = async (): Promise<void> => {
        if (attempts >= 40) throw new Error('Timeout');
        attempts++;
        await new Promise(r => setTimeout(r, 3000));

        const statusRes = await fetch(FUNC_URL, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ task_id, model_id }),
});
        const statusData = await statusRes.json();

        if (statusData.status === 'success') {
          setModelUrl(statusData.url);
          setModelFormat('glb');
          setModelName(prompt.slice(0, 40));
          setGenerationCount(c => c + 1);
          addToast('3D model ready!', 'success');
          return;
        }
        if (statusData.status === 'failed') throw new Error('Generation failed');
        return poll();
      };

      await poll();

    } catch (err) {
      addToast(t.messages.generationFailed, 'error');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'glb';
    const url = URL.createObjectURL(file);
    setModelUrl(url);
    setModelFormat(ext);
    setModelName(file.name.replace(/\.[^.]+$/, ''));
    addToast(t.messages.uploadSuccess, 'success');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'glb';
    const url = URL.createObjectURL(file);
    setModelUrl(url);
    setModelFormat(ext);
    setModelName(file.name.replace(/\.[^.]+$/, ''));
    addToast(t.messages.uploadSuccess, 'success');
  };

  const loadLibrary = useCallback(async () => {
    if (libraryLoaded) return;
    const { data } = await supabase.from('library_models').select('*').order('name');
    if (data) setLibraryItems(data as LibraryItem[]);
    setLibraryLoaded(true);
  }, [libraryLoaded]);

  const loadUserModels = useCallback(async (force = false) => {
    if (modelsLoaded && !force) return;
    const query = supabase
      .from('models')
      .select('*')
      .eq('source_type', 'ai_generated')
      .order('created_at', { ascending: false })
      .limit(20);

    if (userId) query.eq('user_id', userId);
    else query.is('user_id', null);

    const { data } = await query;
    if (data) setUserModels(data as Model[]);
    setModelsLoaded(true);
  }, [modelsLoaded, userId]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'library') loadLibrary();
    if (tab === 'history') loadUserModels();
  };

  const handleLibraryUse = (item: LibraryItem) => {
    if (item.file_url) {
      setModelUrl(item.file_url);
      setModelFormat('glb');
      setModelName(item.name);
    }
    addToast(`${item.name} loaded`, 'info');
    setActiveTab('generate');
  };

  const handleHistoryLoad = (m: Model) => {
    if (m.file_url) {
      setModelUrl(m.file_url);
      setModelFormat(m.format || 'glb');
      setModelName(m.name);
      setActiveTab('generate');
      addToast(`${m.name} loaded`, 'info');
    }
  };

  const filteredLibrary = libraryItems.filter(
    (it) =>
      it.name.toLowerCase().includes(librarySearch.toLowerCase()) ||
      it.tags.some((tag) => tag.toLowerCase().includes(librarySearch.toLowerCase()))
  );

  const handleCopyLink = () => {
    if (modelUrl) {
      navigator.clipboard.writeText(modelUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const statusIcon = (status: string) => {
    if (status === 'ready') return <Check className="w-3 h-3 text-green-400" />;
    if (status === 'processing') return <Clock className="w-3 h-3 text-yellow-400 animate-pulse" />;
    if (status === 'failed') return <AlertCircle className="w-3 h-3 text-red-400" />;
    return <Clock className="w-3 h-3 text-gray-500" />;
  };

  const remaining = Math.max(0, FREE_LIMIT - generationCount);

  return (
    <div className="fixed inset-0 z-40 bg-gray-950 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="text-white font-medium text-sm">{t.studio.title}</span>
            {modelName && (
              <>
                <span className="text-gray-600">/</span>
                <span className="text-gray-400 text-sm truncate max-w-[200px]">{modelName}</span>
              </>
            )}
          </div>
        </div>
        {/* Generation counter */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg border border-white/10">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span className="text-xs text-gray-400">
              <span className={remaining === 0 ? 'text-red-400 font-medium' : 'text-white font-medium'}>
                {remaining}
              </span>
              /{FREE_LIMIT} free
            </span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-80 flex-shrink-0 border-r border-white/5 flex flex-col bg-gray-950">
          {/* Tabs */}
          <div className="flex border-b border-white/5">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-all ${
                  activeTab === id
                    ? 'text-cyan-400 border-b-2 border-cyan-500'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Generate tab */}
            {activeTab === 'generate' && (
              <div className="flex flex-col gap-4">
                {/* Limit warning */}
                {remaining === 0 && (
                  <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-red-400">Free limit reached</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        You've used all {FREE_LIMIT} free generations. Upgrade to Pro for unlimited access.
                      </p>
                    </div>
                  </div>
                )}
                {remaining > 0 && remaining <= 2 && (
                  <div className="flex items-center gap-2 p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                    <AlertCircle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                    <p className="text-xs text-yellow-300">{remaining} generation{remaining !== 1 ? 's' : ''} remaining</p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-2">
                    {t.studio.generate.label}
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={t.studio.generate.placeholder}
                    rows={5}
                    className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 resize-none leading-relaxed"
                  />
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={generating || !prompt.trim() || remaining === 0}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium text-sm rounded-xl transition-all"
                >
                  {generating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t.studio.generate.generating}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {t.studio.generate.button}
                    </>
                  )}
                </button>
                <p className="text-gray-600 text-xs text-center">{t.studio.generate.hint}</p>

                {/* Quick prompts */}
                <div>
                  <p className="text-xs text-gray-600 mb-2">Quick prompts:</p>
                  <div className="flex flex-col gap-1.5">
                    {[
                      'a low poly spaceship',
                      'a futuristic helmet with visor',
                      'an ancient stone temple',
                      'a cute robot character',
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => setPrompt(q)}
                        className="text-left text-xs text-gray-500 hover:text-cyan-400 px-2 py-1.5 bg-white/5 hover:bg-cyan-500/5 rounded-lg transition-colors border border-transparent hover:border-cyan-500/20"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Upload tab */}
            {activeTab === 'upload' && (
              <div className="flex flex-col gap-4">
                <label className="text-xs font-medium text-gray-400 block">
                  {t.studio.upload.label}
                </label>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/10 hover:border-cyan-500/30 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors group"
                >
                  <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center group-hover:bg-cyan-500/10 transition-colors">
                    <Upload className="w-5 h-5 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-300">{t.studio.upload.button}</p>
                    <p className="text-xs text-gray-600 mt-1">{t.studio.upload.draghint}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 text-center">{t.studio.upload.hint}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".glb,.gltf,.obj,.stl,.fbx,.usdz"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            )}

            {/* Library tab */}
            {activeTab === 'library' && (
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <input
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder={t.library.search}
                    className="w-full bg-gray-900 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  {filteredLibrary.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2.5 bg-gray-900/50 hover:bg-gray-900 rounded-xl border border-white/5 hover:border-white/10 group transition-all cursor-pointer"
                      onClick={() => handleLibraryUse(item)}
                    >
                      <img
                        src={item.thumbnail_url}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-gray-800"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-200 font-medium truncate">{item.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5 capitalize">{item.category}</div>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {item.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-800 text-gray-500 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <Layers className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                    </div>
                  ))}
                  {filteredLibrary.length === 0 && (
                    <p className="text-center text-gray-600 text-sm py-8">No models found</p>
                  )}
                </div>
              </div>
            )}

            {/* History tab */}
            {activeTab === 'history' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-gray-400">Your generations</p>
                  <button
                    onClick={() => loadUserModels(true)}
                    className="text-xs text-cyan-500 hover:text-cyan-400 transition-colors"
                  >
                    Refresh
                  </button>
                </div>
                {!modelsLoaded ? (
                  <div className="flex justify-center py-8">
                    <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                  </div>
                ) : userModels.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 text-sm">No generations yet</p>
                    <p className="text-gray-700 text-xs mt-1">Generate your first 3D model above</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {userModels.map((m) => (
                      <div
                        key={m.id}
                        className={`p-3 bg-gray-900/50 rounded-xl border border-white/5 transition-all ${
                          m.status === 'ready' ? 'hover:border-white/10 hover:bg-gray-900 cursor-pointer' : ''
                        }`}
                        onClick={() => m.status === 'ready' && handleHistoryLoad(m)}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-300 truncate font-medium">{m.name}</p>
                            {m.prompt && (
                              <p className="text-xs text-gray-600 mt-0.5 truncate">{m.prompt}</p>
                            )}
                            <p className="text-xs text-gray-700 mt-1">
                              {new Date(m.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                            {statusIcon(m.status)}
                            <span className={`text-xs ${
                              m.status === 'ready' ? 'text-green-400' :
                              m.status === 'processing' ? 'text-yellow-400' :
                              m.status === 'failed' ? 'text-red-400' : 'text-gray-500'
                            }`}>
                              {m.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Export panel */}
          {modelUrl && (
            <div className="border-t border-white/5 p-4 flex-shrink-0">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {t.studio.export.title}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {EXPORT_FORMATS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setExportFormat(f)}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                      exportFormat === f
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'bg-gray-800 text-gray-500 hover:text-gray-300 border border-white/5'
                    }`}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <a
                  href={modelUrl}
                  download={`${modelName || 'model'}.${exportFormat}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t.studio.export.download}
                </a>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors border border-white/5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Link2 className="w-3.5 h-3.5" />}
                  {copied ? t.studio.export.copied : t.studio.export.copy}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Viewer area */}
        <div className="flex-1 relative">
          <Viewer3D modelUrl={modelUrl} format={modelFormat} />
        </div>
      </div>
    </div>
  );
}
