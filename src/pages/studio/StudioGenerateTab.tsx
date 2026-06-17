import { Sparkles, AlertCircle } from 'lucide-react';
import { useLang } from '../../lib/i18n';

interface Props {
  prompt: string;
  setPrompt: (v: string) => void;
  generating: boolean;
  isPro: boolean;
  remaining: number;
  countLoaded: boolean;
  FREE_LIMIT: number;
  quickPrompts: string[];
  onGenerate: () => void;
}

export default function StudioGenerateTab({
  prompt, setPrompt, generating, isPro, remaining, countLoaded, FREE_LIMIT, quickPrompts, onGenerate
}: Props) {
  const { t, lang } = useLang();
  const isRu = lang === 'ru';

  return (
    <div className="flex flex-col gap-4">
      {(!isPro && remaining === 0) && (
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
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
          placeholder={t.studio.generate.placeholder} rows={5}
          className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 resize-none" />
      </div>
      <button onClick={onGenerate} disabled={generating || !prompt.trim() || (countLoaded && !isPro && remaining === 0)}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium text-sm rounded-xl transition-all">
        {generating
          ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t.studio.generate.generating}</>
          : <><Sparkles className="w-4 h-4" />{t.studio.generate.button}</>}
      </button>
      <p className="text-xs text-gray-600 text-center">{t.studio.generate.hint}</p>
      <div>
        <p className="text-xs text-gray-600 mb-2">{isRu ? 'Быстрые промпты:' : 'Quick prompts:'}</p>
        <div className="flex flex-col gap-1.5">
          {quickPrompts.map(q => (
            <button key={q} onClick={() => setPrompt(q)}
              className="text-left text-xs text-gray-500 hover:text-cyan-400 px-2 py-1.5 bg-white/5 hover:bg-cyan-500/5 rounded-lg transition-colors border border-transparent hover:border-cyan-500/20">
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
