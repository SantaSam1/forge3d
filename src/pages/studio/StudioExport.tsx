import { Download, Link2, Check } from 'lucide-react';
import { useLang } from '../../lib/i18n';

const EXPORT_FORMATS = ['glb', 'obj', 'gltf', 'usdz', 'stl', 'fbx'] as const;

interface Props {
  modelUrl?: string;
  exportFormat: string;
  setExportFormat: (f: string) => void;
  downloading: boolean;
  copied: boolean;
  onDownload: (format: string) => void;
  onCopyLink: () => void;
}

export default function StudioExport({ modelUrl, exportFormat, setExportFormat, downloading, copied, onDownload, onCopyLink }: Props) {
  const { t, lang } = useLang();
  const isRu = lang === 'ru';

  if (!modelUrl) return null;

  return (
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
        <button onClick={() => onDownload(exportFormat)} disabled={downloading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 text-white text-xs font-medium rounded-lg">
          {downloading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          {downloading ? (isRu ? 'Загрузка...' : 'Loading...') : t.studio.export.download}
        </button>
        <button onClick={onCopyLink}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg border border-white/5">
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Link2 className="w-3.5 h-3.5" />}
          {copied ? t.studio.export.copied : t.studio.export.copy}
        </button>
      </div>
    </div>
  );
}
