import { useRef } from 'react';
import { Wand2, Send } from 'lucide-react';
import { useLang } from '../../lib/i18n';

interface Message { role: 'user' | 'assistant'; text: string; }

interface Props {
  input: string;
  setInput: (v: string) => void;
  messages: Message[];
  loading: boolean;
  onSend: () => void;
  onApplyPrompt: (text: string) => void;
}

export default function StudioAgent({ input, setInput, messages, loading, onSend, onApplyPrompt }: Props) {
  const { lang } = useLang();
  const isRu = lang === 'ru';
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="border-t border-white/5 p-3 flex-shrink-0">
      <div className="flex items-center gap-2 mb-2">
        <Wand2 className="w-3.5 h-3.5 text-purple-400" />
        <p className="text-xs font-medium text-gray-400">{isRu ? 'AI Генератор промптов' : 'AI Prompt Generator'}</p>
      </div>
      <div ref={scrollRef} className={`overflow-y-auto flex flex-col gap-1.5 transition-all ${messages.length > 0 ? 'max-h-32 mb-2' : 'max-h-0'}`}>
        {messages.map((msg, i) => (
          <div key={i}
            onMouseDown={e => e.preventDefault()}
            onClick={() => msg.role === 'assistant' && onApplyPrompt(msg.text)}
            className={`text-[11px] px-2.5 py-1.5 rounded-lg leading-relaxed cursor-pointer ${msg.role === 'user' ? 'bg-white/5 text-gray-400 text-right' : 'bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20'}`}>
            {msg.role === 'assistant' && (
              <span className="block text-[9px] text-purple-400 mb-0.5">{isRu ? '↑ нажмите чтобы применить' : '↑ click to apply'}</span>
            )}
            {msg.text}
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onSend()}
          placeholder={isRu ? 'например: робот из будущего...' : 'e.g. futuristic robot...'}
          className="flex-1 bg-gray-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 min-w-0" />
        <button onClick={onSend} disabled={loading || !input.trim()}
          className="w-7 h-7 flex items-center justify-center bg-purple-500/20 hover:bg-purple-500/30 disabled:opacity-40 text-purple-400 rounded-lg flex-shrink-0">
          {loading ? <div className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" /> : <Send className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}
