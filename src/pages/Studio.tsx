import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Sparkles, Upload, BookOpen, RefreshCw, Download, Link2, X,
  ArrowLeft, Cpu, Layers, ChevronDown, Search, Check, Home, History, User, Menu, AlertCircle, Clock,
  Package, Send, Wand2
} from 'lucide-react';
import Viewer3D from '../components/Viewer3D';
import AssetBrowser from '../components/AssetBrowser';
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

type MobileTab = 'generate' | 'library' | 'history' | 'profile';
type DesktopTab = 'generate' | 'upload' | 'library' | 'convert';

interface LibraryItem {
  id: string; name: string; category: string;
  thumbnail_url: string; file_url: string; tags: string[]; downloads: number;
}

export default function Studio({ onClose, addToast }: StudioProps) {
  const { t, lang } = useLang();
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('generate');
  const [activeDesktopTab, setActiveDesktopTab] = useState<DesktopTab>('generate');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [modelUrl, setModelUrl] = useState<string | undefined>();
  const [modelFormat, setModelFormat] = useState<string>('glb');
  const [modelName, setModelName] = useState('');
  const [modelDownloadUrl, setModelDownloadUrl] = useState<string | undefined>();
  const [downloading, setDownloading] = useState(false);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [exportFormat, setExportFormat] = useState<string>('glb');
  const [copied, setCopied] = useState(false);
  const [userModels, setUserModels] = useState<Model[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const [countLoaded, setCountLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | undefined>();
  const [imageFile, setImageFile] = useState<File | undefined>();
  const [generatingFromImage, setGeneratingFromImage] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);

  // AI Agent state
  const [agentInput, setAgentInput] = useState('');
  const [agentMessages, setAgentMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [agentLoading, setAgentLoading] = useState(false);
  const agentScrollRef = useRef<HTMLDivElement>(null);

  const isRu = lang === 'ru';

  const mobileNavItems = [
    { id: 'generate' as MobileTab, label: isRu ? 'Студия' : 'Studio', icon: Home },
    { id: 'library' as MobileTab, label: isRu ? 'Библ.' : 'Library', icon: Layers },
    { id: 'history' as MobileTab, label: isRu ? 'История' : 'History', icon: History },
    { id: 'profile' as MobileTab, label: isRu ? 'Профиль' : 'Profile', icon: User },
  ];

  const desktopTabs = [
    { id: 'generate' as DesktopTab, label: t.studio.tabs.generate, icon: Sparkles },
    { id: 'upload' as DesktopTab, label: t.studio.tabs.upload, icon: Upload },
    { id: 'library' as DesktopTab, label: t.studio.tabs.library, icon: BookOpen },
    { id: 'convert' as DesktopTab, label: t.studio.tabs.convert, icon: RefreshCw },
  ];

  const quickPrompts = isRu
    ? ['низкополигональный космический корабль', 'футуристический шлем с забралом', 'древний каменный храм', 'милый робот-персонаж']
    : ['a low poly spaceship', 'a futuristic helmet with visor', 'an ancient stone temple', 'a cute robot character'];

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      setUserEmail(data.user?.email ?? null);
      const q = supabase.from('models').select('id', { count: 'exact', head: true }).eq('source_type', 'ai_generated');
      if (uid) q.eq('user_id', uid); else q.is('user_id', null);
      q.then(({ count }) => { setGenerationCount(count ?? 0); setCountLoaded(true); });
    });
  }, []);

  const remaining = Math.max(0, FREE_LIMIT - generationCount);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (remaining === 0) {
      addToast(isRu ? `Лимит исчерпан (${FREE_LIMIT}). Перейдите на Pro.` : `Free limit reached. Upgrade to Pro.`, 'error');
      return;
    }
    setGenerating(true);
    addToast(isRu ? 'Запуск генерации...' : 'Starting generation...', 'info');
    try {
      const FUNC_URL = `${SUPABASE_URL}/functions/v1/generate-3d-model`;
      const res = await fetch(FUNC_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, user_id: userId }),
      });
      const data = await res.json();
      if (res.status === 429) { addToast(isRu ? 'Лимит исчерпан. Перейдите на Pro.' : 'Free limit reached. Upgrade to Pro.', 'error'); return; }
      if (!res.ok || data.error) throw new Error(data.error || 'Failed');
      const { task_id, model_id } = data;
      addToast(isRu ? 'Генерация 3D-модели... (~1 мин)' : 'Generating 3D model... (~1 min)', 'info');
      let attempts = 0;
      const poll = async (): Promise<void> => {
        if (attempts >= 40) throw new Error('Timeout');
        attempts++;
        await new Promise(r => setTimeout(r, 3000));
        const sr = await fetch(FUNC_URL, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id, model_id }),
        });
        const sd = await sr.json();
        if (sd.status === 'success') {
          const proxyUrl = `${SUPABASE_URL}/functions/v1/generate-3d-model?proxy=${encodeURIComponent(sd.url)}`;
          setModelUrl(proxyUrl); setModelDownloadUrl(sd.url); setModelFormat('glb'); setModelName(prompt.slice(0, 40));
          setGenerationCount(c => c + 1);
          addToast(isRu ? '3D-модель готова!' : '3D model ready!', 'success');
          return;
        }
        if (sd.status === 'failed') throw new Error('Generation failed');
        return poll();
      };
      await poll();
    } catch (err) {
      addToast(t.messages.generationFailed, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'glb';
    setModelUrl(URL.createObjectURL(file)); setModelFormat(ext);
    setModelName(file.name.replace(/\.[^.]+$/, ''));
    addToast(t.messages.uploadSuccess, 'success');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0]; if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'glb';
    setModelUrl(URL.createObjectURL(file)); setModelFormat(ext);
    setModelName(file.name.replace(/\.[^.]+$/, ''));
    addToast(t.messages.uploadSuccess, 'success');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleImageGenerate = async () => {
    if (!imageFile) return;
    if (remaining === 0) {
      addToast(isRu ? 'Лимит исчерпан. Перейдите на Pro.' : 'Free limit reached. Upgrade to Pro.', 'error');
      return;
    }
    setGeneratingFromImage(true);
    addToast(isRu ? 'Создание 3D из фото...' : 'Creating 3D from photo...', 'info');
    try {
      const FUNC_URL = `${SUPABASE_URL}/functions/v1/generate-3d-model`;
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      const res = await fetch(FUNC_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: base64,
          image_mime: imageFile.type,
          user_id: userId,
        }),
      });
      const data = await res.json();
      if (res.status === 429) { addToast(isRu ? 'Лимит исчерпан.' : 'Free limit reached.', 'error'); return; }
      if (!res.ok || data.error) throw new Error(data.error || 'Failed');
      const { task_id, model_id } = data;
      addToast(isRu ? 'Генерация 3D-модели... (~1-2 мин)' : 'Generating 3D model... (~1-2 min)', 'info');
      let attempts = 0;
      const poll = async (): Promise<void> => {
        if (attempts >= 40) throw new Error('Timeout');
        attempts++;
        await new Promise(r => setTimeout(r, 3000));
        const sr = await fetch(FUNC_URL, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id, model_id }),
        });
        const sd = await sr.json();
        if (sd.status === 'success') {
          const proxyUrl = `${SUPABASE_URL}/functions/v1/generate-3d-model?proxy=${encodeURIComponent(sd.url)}`;
          setModelUrl(proxyUrl); setModelDownloadUrl(sd.url);
          setModelFormat('glb'); setModelName(imageFile.name.replace(/\.[^.]+$/, ''));
          setGenerationCount(c => c + 1);
          addToast(isRu ? '3D-модель готова!' : '3D model ready!', 'success');
          return;
        }
        if (sd.status === 'failed') throw new Error('Generation failed');
        return poll();
      };
      await poll();
    } catch (err) {
      addToast(isRu ? `Ошибка: ${String(err)}` : `Error: ${String(err)}`, 'error');
    } finally {
      setGeneratingFromImage(false);
    }
  };

  const loadLibrary = useCallback(async () => {
    if (libraryLoaded) return;
    const { data } = await supabase.from('library_models').select('*').order('name');
    if (data) setLibraryItems(data as LibraryItem[]);
    setLibraryLoaded(true);
  }, [libraryLoaded]);

  const loadUserModels = useCallback(async (force = false) => {
    if (modelsLoaded && !force) return;
    const q = supabase.from('models').select('*').eq('source_type', 'ai_generated').order('created_at', { ascending: false }).limit(20);
    if (userId) q.eq('user_id', userId); else q.is('user_id', null);
    const { data } = await q;
    if (data) setUserModels(data as Model[]);
    setModelsLoaded(true);
  }, [modelsLoaded, userId]);

  const handleHistoryLoad = (m: Model) => {
    if (!m.file_url) return;
    const proxyUrl = `${SUPABASE_URL}/functions/v1/generate-3d-model?proxy=${encodeURIComponent(m.file_url)}`;
    setModelUrl(proxyUrl); setModelDownloadUrl(m.file_url); setModelFormat(m.format || 'glb'); setModelName(m.name);
    setActiveMobileTab('generate');
    addToast(`${m.name} ${isRu ? 'загружено' : 'loaded'}`, 'info');
  };

  const filteredLibrary = libraryItems.filter(it =>
    it.name.toLowerCase().includes(librarySearch.toLowerCase()) ||
    it.tags?.some(tag => tag.toLowerCase().includes(librarySearch.toLowerCase()))
  );

  const handleCopyLink = () => {
    if (modelUrl) { navigator.clipboard.writeText(modelUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const handleDownload = async (targetFormat: string) => {
    const sourceUrl = modelDownloadUrl || modelUrl;
    if (!sourceUrl) return;
    setDownloading(true);
    const filename = `${modelName || 'model'}.${targetFormat}`;

    try {
      if (targetFormat === 'glb' || targetFormat === 'gltf') {
        const response = await fetch(modelUrl || sourceUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        addToast(isRu ? 'Файл скачан!' : 'File downloaded!', 'success');
        return;
      }

      addToast(isRu ? `Конвертация в ${targetFormat.toUpperCase()}...` : `Converting to ${targetFormat.toUpperCase()}...`, 'info');

      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const { OBJExporter } = await import('three/examples/jsm/exporters/OBJExporter.js');
      const { STLExporter } = await import('three/examples/jsm/exporters/STLExporter.js');

      const loader = new GLTFLoader();
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(modelUrl || sourceUrl, resolve, undefined, reject);
      });

      let content: string | ArrayBuffer;
      let mimeType: string;

      if (targetFormat === 'obj') {
        const exporter = new OBJExporter();
        content = exporter.parse(gltf.scene);
        mimeType = 'text/plain';
      } else if (targetFormat === 'stl') {
        const exporter = new STLExporter();
        content = exporter.parse(gltf.scene, { binary: true }) as unknown as ArrayBuffer;
        mimeType = 'application/octet-stream';
      } else {
        // FBX, USDZ — not supported client-side, download as GLB
        addToast(
          isRu ? `${targetFormat.toUpperCase()} не поддерживается в браузере, скачиваем GLB` : `${targetFormat.toUpperCase()} not supported in browser, downloading GLB`,
          'info'
        );
        const response = await fetch(modelUrl || sourceUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${modelName || 'model'}.glb`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        addToast(isRu ? 'Файл скачан!' : 'File downloaded!', 'success');
        return;
      }

      const blob = new Blob([content], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      addToast(isRu ? 'Файл скачан!' : 'File downloaded!', 'success');

    } catch (err) {
      console.error('Download failed:', err);
      addToast(isRu ? `Ошибка скачивания: ${String(err)}` : `Download error: ${String(err)}`, 'error');
    } finally {
      setDownloading(false);
    }
  };

  const statusIcon = (status: string) => {
    if (status === 'ready') return <Check className="w-3 h-3 text-green-400" />;
    if (status === 'processing') return <Clock className="w-3 h-3 text-yellow-400 animate-pulse" />;
    return <AlertCircle className="w-3 h-3 text-red-400" />;
  };

  // Desktop sidebar generate panel


  // Auto-scroll agent messages — preserve focus
  useEffect(() => {
    if (agentScrollRef.current) {
      const focused = document.activeElement as HTMLElement | null;
      agentScrollRef.current.scrollTop = agentScrollRef.current.scrollHeight;
      // Restore focus after DOM update
      requestAnimationFrame(() => focused?.focus());
    }
  }, [agentMessages]);

  const handleAgentSend = async () => {
    const userText = agentInput.trim();
    if (!userText || agentLoading) return;
    setAgentMessages(prev => [...prev, { role: 'user', text: userText }]);
    setAgentInput('');
    setAgentLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('groq-prompt', {
        body: { userText, isRu },
      });
      if (error || !data?.prompt) throw new Error(error?.message || 'No prompt');
      const result = data.prompt as string;
      setAgentMessages(prev => [...prev, { role: 'assistant', text: result }]);
    } catch {
      setAgentMessages(prev => [...prev, {
        role: 'assistant',
        text: isRu ? '⚠️ Ошибка. Проверьте Edge Function groq-prompt в Supabase.' : '⚠️ Error. Check groq-prompt Edge Function in Supabase.'
      }]);
    } finally {
      setAgentLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-40 bg-gray-950 flex flex-col lg:flex-row w-screen h-screen overflow-hidden">

      {/* ═══ DESKTOP SIDEBAR ═══ */}
      <aside className="hidden lg:flex w-80 flex-shrink-0 border-r border-white/5 flex-col bg-gray-950">
        <div className="flex border-b border-white/5">
          {desktopTabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setActiveDesktopTab(id); if (id === 'library') loadLibrary(); }}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-all ${activeDesktopTab === id ? 'text-cyan-400 border-b-2 border-cyan-500' : 'text-gray-500 hover:text-gray-300'}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeDesktopTab === 'generate' && (
            <div className="flex flex-col gap-4">
              {remaining === 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-xs font-medium text-red-400">{isRu ? 'Лимит исчерпан' : 'Free limit reached'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{isRu ? `Использованы все ${FREE_LIMIT} генерации. Перейдите на Pro.` : `All ${FREE_LIMIT} free generations used. Upgrade to Pro.`}</p>
                </div>
              )}
              {remaining > 0 && remaining <= 2 && (
                <div className="flex items-center gap-2 p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
                  <p className="text-xs text-yellow-300">{isRu ? `Осталось ${remaining} генерации` : `${remaining} generation${remaining !== 1 ? 's' : ''} remaining`}</p>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-2">{t.studio.generate.label}</label>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={t.studio.generate.placeholder} rows={5}
                  className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 resize-none" />
              </div>
              <button onClick={handleGenerate} disabled={generating || !prompt.trim() || (countLoaded && remaining === 0)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium text-sm rounded-xl transition-all">
                {generating ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t.studio.generate.generating}</> : <><Sparkles className="w-4 h-4" />{t.studio.generate.button}</>}
              </button>
              <p className="text-xs text-gray-600 text-center">{t.studio.generate.hint}</p>
              <div>
                <p className="text-xs text-gray-600 mb-2">{isRu ? 'Быстрые промпты:' : 'Quick prompts:'}</p>
                <div className="flex flex-col gap-1.5">
                  {quickPrompts.map(q => (
                    <button key={q} onClick={() => setPrompt(q)} className="text-left text-xs text-gray-500 hover:text-cyan-400 px-2 py-1.5 bg-white/5 hover:bg-cyan-500/5 rounded-lg transition-colors border border-transparent hover:border-cyan-500/20">{q}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeDesktopTab === 'upload' && (
            <div className="flex flex-col gap-5">
              {/* 3D file upload */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-medium text-gray-400 block">{t.studio.upload.label}</label>
                <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/10 hover:border-cyan-500/30 rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer group">
                  <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center group-hover:bg-cyan-500/10">
                    <Upload className="w-5 h-5 text-gray-500 group-hover:text-cyan-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-300">{t.studio.upload.button}</p>
                    <p className="text-xs text-gray-600 mt-1">{t.studio.upload.hint}</p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-xs text-gray-600">{isRu ? 'или' : 'or'}</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              {/* Image to 3D */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-medium text-gray-400 block">
                  {isRu ? 'Фото → 3D модель' : 'Photo → 3D model'}
                </label>
                <div onClick={() => imageFileRef.current?.click()}
                  className="border-2 border-dashed border-purple-500/20 hover:border-purple-500/40 rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer group relative overflow-hidden">
                  {imagePreview ? (
                    <div className="relative w-full">
                      <img src={imagePreview} alt="preview" className="w-full h-32 object-contain rounded-lg" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <p className="text-xs text-white">{isRu ? 'Нажмите чтобы изменить' : 'Click to change'}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center group-hover:bg-purple-500/20">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-300">{isRu ? 'Загрузить фото' : 'Upload photo'}</p>
                        <p className="text-xs text-gray-600 mt-1">JPG, PNG, WEBP {isRu ? '(макс. 10 МБ)' : '(max 10 MB)'}</p>
                      </div>
                    </>
                  )}
                </div>
                {imageFile && (
                  <button onClick={handleImageGenerate} disabled={generatingFromImage || remaining === 0}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium text-sm rounded-xl transition-all">
                    {generatingFromImage
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{isRu ? 'Генерация...' : 'Generating...'}</>
                      : <>{isRu ? '✨ Создать 3D из фото' : '✨ Create 3D from photo'}</>
                    }
                  </button>
                )}
                <p className="text-xs text-gray-600 text-center">
                  {isRu ? 'Лучшие результаты: чёткое фото объекта на однотонном фоне' : 'Best results: clear photo of object on plain background'}
                </p>
              </div>
              <input ref={imageFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleImageSelect} />
            </div>
          )}

          {activeDesktopTab === 'library' && (
            <div className="flex flex-col gap-3">
              {/* Asset Browser shortcut */}
              <button
                onClick={() => setBrowserOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 hover:from-cyan-500/20 hover:to-purple-500/20 border border-cyan-500/20 text-cyan-300 text-sm font-medium rounded-xl transition-all"
              >
                <Package className="w-4 h-4" />
                {isRu ? '🌐 Открыть Asset Browser' : '🌐 Open Asset Browser'}
              </button>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-xs text-gray-600">{isRu ? 'или локальная' : 'or local'}</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} placeholder={t.library.search}
                  className="w-full bg-gray-900 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50" />
              </div>
              <div className="flex flex-col gap-2">
                {filteredLibrary.map(item => (
                  <div key={item.id} onClick={() => { if (item.file_url) { setModelUrl(item.file_url); setModelFormat('glb'); setModelName(item.name); } }}
                    className="flex items-center gap-3 p-2.5 bg-gray-900/50 hover:bg-gray-900 rounded-xl border border-white/5 cursor-pointer group">
                    <img src={item.thumbnail_url} alt={item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-gray-800" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-200 font-medium truncate">{item.name}</div>
                      <div className="text-xs text-gray-500 capitalize">{item.category}</div>
                    </div>
                    <Layers className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeDesktopTab === 'convert' && (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-gray-400">{isRu ? 'Конвертация форматов будет доступна в следующем обновлении.' : 'Format conversion coming in next update.'}</p>
            </div>
          )}
        </div>

        {/* Desktop history */}
        <div className="border-t border-white/5 p-3 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">{isRu ? 'История' : 'History'}</p>
            <button onClick={() => loadUserModels(true)} className="text-xs text-cyan-500 hover:text-cyan-400">{isRu ? 'Обновить' : 'Refresh'}</button>
          </div>
          {userModels.slice(0, 5).map(m => (
            <div key={m.id} onClick={() => m.status === 'ready' && handleHistoryLoad(m)}
              className={`flex items-center gap-2 p-2 rounded-lg mb-1 ${m.status === 'ready' ? 'hover:bg-white/5 cursor-pointer' : 'opacity-50'}`}>
              {statusIcon(m.status)}
              <span className="text-xs text-gray-400 truncate flex-1">{m.name}</span>
            </div>
          ))}
        </div>

        {/* AI Agent — Groq prompt generator */}
        <div className="border-t border-white/5 p-3 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <Wand2 className="w-3.5 h-3.5 text-purple-400" />
            <p className="text-xs font-medium text-gray-400">{isRu ? 'AI Генератор промптов' : 'AI Prompt Generator'}</p>
          </div>
          {/* Messages */}
          <div ref={agentScrollRef} className={`overflow-y-auto flex flex-col gap-1.5 transition-all ${agentMessages.length > 0 ? 'max-h-32 mb-2' : 'max-h-0'}`}>
            {agentMessages.map((msg, i) => (
                <div key={i}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => msg.role === 'assistant' && setPrompt(msg.text)}
                  className={`text-[11px] px-2.5 py-1.5 rounded-lg leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-white/5 text-gray-400 text-right'
                      : 'bg-purple-500/10 text-purple-300 border border-purple-500/20 cursor-pointer hover:bg-purple-500/20'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <span className="block text-[9px] text-purple-400 mb-0.5">
                      {isRu ? '↑ нажмите чтобы применить' : '↑ click to apply'}
                    </span>
                  )}
                  {msg.text}
                </div>
              ))}
          </div>
          {/* Input */}
          <div className="flex gap-1.5">
            <input
              value={agentInput}
              onChange={e => setAgentInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAgentSend()}
              placeholder={isRu ? 'например: робот из будущего...' : 'e.g. futuristic robot...'}
              className="flex-1 bg-gray-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 min-w-0"
            />
            <button
              onClick={handleAgentSend}
              disabled={agentLoading || !agentInput.trim()}
              className="flex items-center justify-center w-7 h-7 bg-purple-500/20 hover:bg-purple-500/30 disabled:opacity-40 text-purple-400 rounded-lg flex-shrink-0 transition-all"
            >
              {agentLoading
                ? <div className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                : <Send className="w-3 h-3" />
              }
            </button>
          </div>
        </div>

        {/* Desktop export */}
        {modelUrl && (
          <div className="border-t border-white/5 p-4 flex-shrink-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t.studio.export.title}</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {EXPORT_FORMATS.map(f => (
                <button key={f} onClick={() => setExportFormat(f)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-all ${exportFormat === f ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-gray-800 text-gray-500 border border-white/5'}`}>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleDownload(exportFormat)}
                disabled={downloading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 text-white text-xs font-medium rounded-lg">
                {downloading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {downloading ? (isRu ? 'Загрузка...' : 'Loading...') : t.studio.export.download}
              </button>
              <button onClick={handleCopyLink}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg border border-white/5">
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Link2 className="w-3.5 h-3.5" />}
                {copied ? t.studio.export.copied : t.studio.export.copy}
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* Mobile header */}
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 flex-shrink-0 lg:hidden bg-gray-950 sticky top-0 z-30">
          <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="text-white font-medium text-sm">3D-Prin</span>
            {remaining < FREE_LIMIT && (
              <span className="text-xs text-gray-500">{remaining}/{FREE_LIMIT}</span>
            )}
          </div>
          <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-2 -mr-2 text-gray-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Desktop header */}
        <header className="hidden lg:flex h-14 border-b border-white/5 items-center justify-between px-4 flex-shrink-0 bg-gray-950">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1"><ArrowLeft className="w-4 h-4" /></button>
            <div className="h-4 w-px bg-white/10" />
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="text-white font-medium text-sm">{t.studio.title}</span>
            {modelName && <><span className="text-gray-600">/</span><span className="text-gray-400 text-sm truncate max-w-[200px]">{modelName}</span></>}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setBrowserOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs rounded-lg transition-all"
            >
              <Package className="w-3.5 h-3.5" />
              {isRu ? 'Ассеты' : 'Assets'}
            </button>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg border border-white/10">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span className="text-xs text-gray-400"><span className={remaining === 0 ? 'text-red-400 font-medium' : 'text-white font-medium'}>{remaining}</span>/{FREE_LIMIT} free</span>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white p-1"><X className="w-4 h-4" /></button>
          </div>
        </header>

        {/* Mobile dropdown menu */}
        {showMobileMenu && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileMenu(false)} />
            <div className="absolute top-14 right-4 w-56 bg-gray-900 rounded-xl border border-white/10 shadow-2xl overflow-hidden">
              <div className="p-2">
                <button onClick={() => { setBrowserOpen(true); setShowMobileMenu(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 rounded-lg">
                  <Package className="w-4 h-4 text-cyan-400" />{isRu ? 'Ассеты / 3D модели' : 'Assets / 3D Models'}
                </button>
                <button onClick={() => { fileInputRef.current?.click(); setShowMobileMenu(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 rounded-lg">
                  <Upload className="w-4 h-4" />{t.studio.tabs.upload}
                </button>
                <div className="border-t border-white/5 mt-2 pt-2" />
                <button onClick={() => { onClose(); setShowMobileMenu(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-400 hover:bg-white/5 rounded-lg">
                  <X className="w-4 h-4" />{isRu ? 'Закрыть студию' : 'Close Studio'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ 3D VIEWER ═══ */}
        <div className="h-[300px] sm:h-[380px] lg:flex-1 relative flex-shrink-0">
          <Viewer3D modelUrl={modelUrl} format={modelFormat} />
        </div>

        {/* ═══ MOBILE: Library / History / Profile screens ═══ */}
        {(activeMobileTab === 'library' || activeMobileTab === 'history' || activeMobileTab === 'profile') && (
          <div className="flex-1 overflow-y-auto bg-gray-900/30 lg:hidden pb-16">
            <div className="p-4">

              {/* Library */}
              {/* Mobile image-to-3D floating button when on generate tab */}
            {activeMobileTab === 'generate' && (
              <div className="px-4 pt-2 pb-0">
                <button onClick={() => imageFileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-medium rounded-xl transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                  </svg>
                  {isRu ? 'Фото → 3D' : 'Photo → 3D'}
                </button>
                {imageFile && !generatingFromImage && (
                  <button onClick={handleImageGenerate}
                    className="mt-2 w-full flex items-center justify-center gap-2 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-xl transition-all">
                    ✨ {isRu ? `Создать 3D из "${imageFile.name}"` : `Create 3D from "${imageFile.name}"`}
                  </button>
                )}
                {generatingFromImage && (
                  <div className="mt-2 flex items-center justify-center gap-2 py-2 bg-purple-600/20 border border-purple-500/30 rounded-xl">
                    <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                    <span className="text-xs text-purple-300">{isRu ? 'Генерация 3D из фото...' : 'Generating 3D from photo...'}</span>
                  </div>
                )}
              </div>
            )}

            {activeMobileTab === 'library' && (
                <>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} onFocus={loadLibrary}
                      placeholder={t.library.search}
                      className="w-full bg-gray-900 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {filteredLibrary.map(item => (
                      <div key={item.id} onClick={() => { if (item.file_url) { setModelUrl(item.file_url); setModelFormat('glb'); setModelName(item.name); setActiveMobileTab('generate'); } }}
                        className="bg-gray-900/80 rounded-xl border border-white/5 overflow-hidden active:scale-[0.98] transition-transform cursor-pointer">
                        <img src={item.thumbnail_url} alt={item.name} className="w-full aspect-square object-cover" />
                        <div className="p-2.5">
                          <div className="text-sm text-gray-200 font-medium truncate">{item.name}</div>
                          <div className="text-xs text-gray-500 capitalize mt-0.5">{item.category}</div>
                        </div>
                      </div>
                    ))}
                    {filteredLibrary.length === 0 && <p className="col-span-2 text-center text-gray-600 text-sm py-8">{isRu ? 'Модели не найдены' : 'No models found'}</p>}
                  </div>
                </>
              )}

              {/* History */}
              {activeMobileTab === 'history' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-300">{isRu ? 'История генераций' : 'Generation History'}</h3>
                    <button onClick={() => loadUserModels(true)} className="text-xs text-cyan-500">{isRu ? 'Обновить' : 'Refresh'}</button>
                  </div>
                  {!modelsLoaded ? (
                    <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>
                  ) : userModels.length === 0 ? (
                    <div className="text-center py-12">
                      <History className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">{isRu ? 'Нет генераций' : 'No generations yet'}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {userModels.map(m => (
                        <div key={m.id} onClick={() => m.status === 'ready' && handleHistoryLoad(m)}
                          className={`flex items-center gap-3 p-3 bg-gray-900/80 rounded-xl border border-white/5 ${m.status === 'ready' ? 'active:scale-[0.98] cursor-pointer' : 'opacity-60'}`}>
                          <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Layers className="w-4 h-4 text-cyan-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-200 truncate">{m.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{new Date(m.created_at).toLocaleDateString()}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            {statusIcon(m.status)}
                            <span className={`text-xs ${m.status === 'ready' ? 'text-green-400' : m.status === 'processing' ? 'text-yellow-400' : 'text-red-400'}`}>
                              {m.status === 'ready' ? (isRu ? 'готово' : 'ready') : m.status === 'processing' ? (isRu ? 'обработка' : 'processing') : (isRu ? 'ошибка' : 'failed')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Profile */}
              {activeMobileTab === 'profile' && (
                <div className="flex flex-col gap-4">
                  <div className="p-4 bg-gray-900/80 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {userEmail ? userEmail.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">{userEmail || (isRu ? 'Гость' : 'Guest')}</p>
                        <p className="text-xs text-gray-500">{isRu ? 'Бесплатный план' : 'Free plan'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                      <span className="text-xs text-gray-400">{isRu ? 'Генерации' : 'Generations'}</span>
                      <span className="text-xs text-white font-medium">{generationCount}/{FREE_LIMIT}</span>
                    </div>
                  </div>
                  {userEmail ? (
                    <button onClick={async () => { await supabase.auth.signOut(); setUserEmail(null); setUserId(null); }}
                      className="w-full py-3 text-sm text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/5">
                      {isRu ? 'Выйти' : 'Sign out'}
                    </button>
                  ) : (
                    <p className="text-xs text-gray-500 text-center">{isRu ? 'Войдите чтобы сохранять модели' : 'Sign in to save your models'}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ MOBILE STICKY PROMPT ═══ */}
        {activeMobileTab === 'generate' && (
          <div className="sticky bottom-16 p-3 border-t border-white/5 bg-gray-950/90 backdrop-blur-xl lg:hidden flex-shrink-0">
            {remaining > 0 && remaining <= 2 && (
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-3 h-3 text-yellow-400" />
                <p className="text-xs text-yellow-300">{isRu ? `Осталось ${remaining} генерации` : `${remaining} generation${remaining !== 1 ? 's' : ''} remaining`}</p>
              </div>
            )}
            <div className="flex gap-2">
              <input value={prompt} onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleGenerate()}
                placeholder={isRu ? 'Опишите 3D-модель...' : 'Describe your 3D model...'}
                className="flex-1 bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50" />
              <button onClick={handleGenerate} disabled={generating || !prompt.trim() || (countLoaded && remaining === 0)}
                className="w-12 h-12 flex items-center justify-center bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl transition-all flex-shrink-0">
                {generating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-5 h-5" />}
              </button>
            </div>
            {modelUrl && (
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 gap-2">
                <div className="flex gap-1.5 overflow-x-auto flex-1">
                  {EXPORT_FORMATS.map(f => (
                    <button key={f} onClick={() => setExportFormat(f)}
                      className={`px-2.5 py-1 text-xs rounded-lg flex-shrink-0 transition-all ${exportFormat === f ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-gray-800 text-gray-500 border border-white/5'}`}>
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button onClick={() => handleDownload(exportFormat)}
                  disabled={downloading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 text-white text-xs font-medium rounded-lg flex-shrink-0">
                  {downloading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  {t.studio.export.download}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ MOBILE GROQ AGENT ═══ */}
        {activeMobileTab === 'generate' && (
          <div className="lg:hidden px-3 pb-2 bg-gray-950/90 backdrop-blur-xl border-t border-white/5 flex-shrink-0">
            <div className="flex items-center gap-2 py-2">
              <Wand2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
              <p className="text-xs font-medium text-gray-400">{isRu ? 'AI Генератор промптов' : 'AI Prompt Generator'}</p>
            </div>
            <div ref={agentScrollRef} className={`overflow-y-auto flex flex-col gap-1 transition-all ${agentMessages.length > 0 ? 'max-h-24 mb-2' : 'max-h-0'}`}>
              {agentMessages.map((msg, i) => (
                <div key={i}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => msg.role === 'assistant' && setPrompt(msg.text)}
                  className={`text-[11px] px-2 py-1 rounded-lg leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-white/5 text-gray-400 text-right'
                      : 'bg-purple-500/10 text-purple-300 border border-purple-500/20 cursor-pointer hover:bg-purple-500/20'
                  }`}>
                  {msg.role === 'assistant' && <span className="block text-[9px] text-purple-400 mb-0.5">{isRu ? '↑ нажмите чтобы применить' : '↑ click to apply'}</span>}
                  {msg.text}
                </div>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                value={agentInput}
                onChange={e => setAgentInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAgentSend()}
                placeholder={isRu ? 'например: робот из будущего...' : 'e.g. futuristic robot...'}
                className="flex-1 bg-gray-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 min-w-0"
              />
              <button onClick={handleAgentSend} disabled={agentLoading || !agentInput.trim()}
                className="w-8 h-8 flex items-center justify-center bg-purple-500/20 hover:bg-purple-500/30 disabled:opacity-40 text-purple-400 rounded-lg flex-shrink-0">
                {agentLoading
                  ? <div className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                  : <Send className="w-3 h-3" />}
              </button>
            </div>
          </div>
        )}

        {/* Desktop prompt bar */}
        <div className="hidden lg:block sticky bottom-0 p-4 border-t border-white/5 bg-gray-950/90 backdrop-blur-xl">
          <div className="flex gap-3">
            <input value={prompt} onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleGenerate()}
              placeholder={t.studio.generate.placeholder}
              className="flex-1 bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50" />
            <button onClick={handleGenerate} disabled={generating || !prompt.trim() || (countLoaded && remaining === 0)}
              className="flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium text-sm rounded-xl transition-all">
              {generating ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t.studio.generate.generating}</> : <><Sparkles className="w-4 h-4" />{t.studio.generate.button}</>}
            </button>
          </div>
        </div>
      </main>

      {/* ═══ MOBILE BOTTOM NAV ═══ */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-gray-950 border-t border-white/5 lg:hidden flex items-center justify-around px-2 z-30">
        {mobileNavItems.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setActiveMobileTab(id); if (id === 'library') loadLibrary(); if (id === 'history') loadUserModels(); }}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${activeMobileTab === id ? 'text-cyan-400' : 'text-gray-500'}`}>
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </nav>

      <input ref={fileInputRef} type="file" accept=".glb,.gltf,.obj,.stl,.fbx,.usdz" className="hidden" onChange={handleFileUpload} />
      <input ref={imageFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleImageSelect} />

      {/* ═══ ASSET BROWSER ═══ */}
      <AssetBrowser
        isOpen={browserOpen}
        onClose={() => setBrowserOpen(false)}
        isRu={isRu}
        onImport={(url, name, format) => {
          setModelUrl(url);
          setModelFormat(format);
          setModelName(name);
          setBrowserOpen(false);
          addToast(isRu ? `${name} импортировано` : `${name} imported`, 'success');
        }}
      />
    </div>
  );
}
