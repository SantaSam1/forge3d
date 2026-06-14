import { Upload } from 'lucide-react';
import { useLang } from '../../lib/i18n';

interface Props {
  isPro: boolean;
  remaining: number;
  imagePreview?: string;
  imageFile?: File;
  generatingFromImage: boolean;
  imageFileRef: React.RefObject<HTMLInputElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onDrop: (e: React.DragEvent) => void;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageGenerate: () => void;
}

export default function StudioUploadTab({
  isPro, remaining, imagePreview, imageFile, generatingFromImage,
  imageFileRef, fileInputRef, onDrop, onImageSelect, onImageGenerate,
}: Props) {
  const { t, lang } = useLang();
  const isRu = lang === 'ru';

  return (
    <div className="flex flex-col gap-5">
      {/* 3D file upload */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium text-gray-400 block">{t.studio.upload.label}</label>
        <div onDrop={onDrop} onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()}
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
        <input ref={imageFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onImageSelect} />
        {imageFile && (
          <button onClick={onImageGenerate} disabled={generatingFromImage || (!isPro && remaining === 0)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium text-sm rounded-xl transition-all">
            {generatingFromImage
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{isRu ? 'Генерация...' : 'Generating...'}</>
              : <>{isRu ? '✨ Создать 3D из фото' : '✨ Create 3D from photo'}</>}
          </button>
        )}
        <p className="text-xs text-gray-600 text-center">
          {isRu ? 'Лучшие результаты: чёткое фото объекта на однотонном фоне' : 'Best results: clear photo of object on plain background'}
        </p>
      </div>
    </div>
  );
}
