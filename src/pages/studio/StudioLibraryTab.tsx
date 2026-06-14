import { useRef, useCallback, useState } from 'react';
import { Search, Layers, Package } from 'lucide-react';
import { useLang } from '../../lib/i18n';

interface LibraryItem {
  id: string; name: string; category: string;
  thumbnail_url: string; file_url: string; tags: string[]; downloads: number;
}

interface Props {
  items: LibraryItem[];
  search: string;
  setSearch: (v: string) => void;
  onLoad: (url: string, name: string) => void;
  onOpenBrowser: () => void;
}

const ITEM_HEIGHT = 68; // px per row (p-2.5 + img 48px + gap)
const OVERSCAN = 5;     // extra rows rendered above/below viewport

function VirtualList({ items, onLoad }: { items: LibraryItem[]; onLoad: (url: string, name: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  if (items.length === 0) {
    return <p className="text-center text-gray-600 text-sm py-8">Модели не найдены</p>;
  }

  const containerHeight = 420; // fixed height of scroll container
  const totalHeight = items.length * ITEM_HEIGHT;

  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(items.length - 1, Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + OVERSCAN);
  const visibleItems = items.slice(startIndex, endIndex + 1);

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      style={{ height: containerHeight, overflowY: 'auto', position: 'relative' }}
    >
      {/* Spacer that creates full scrollable height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Only visible rows rendered */}
        <div style={{ position: 'absolute', top: startIndex * ITEM_HEIGHT, left: 0, right: 0 }}>
          {visibleItems.map(item => (
            <div
              key={item.id}
              style={{ height: ITEM_HEIGHT, boxSizing: 'border-box', padding: '4px 0' }}
              onClick={() => item.file_url && onLoad(item.file_url, item.name)}
              className="flex items-center gap-3 px-1 bg-gray-900/50 hover:bg-gray-900 rounded-xl border border-white/5 cursor-pointer group mb-1"
            >
              <img
                src={item.thumbnail_url}
                alt={item.name}
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-gray-800"
                loading="lazy"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-200 font-medium truncate">{item.name}</div>
                <div className="text-xs text-gray-500 capitalize">{item.category}</div>
              </div>
              <Layers className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 flex-shrink-0 mr-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StudioLibraryTab({ items, search, setSearch, onLoad, onOpenBrowser }: Props) {
  const { t, lang } = useLang();
  const isRu = lang === 'ru';

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase()) ||
    i.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={onOpenBrowser}
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
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t.library.search}
          className="w-full bg-gray-900 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      <div className="text-xs text-gray-600 text-right">
        {filtered.length} {isRu ? 'моделей' : 'models'}
      </div>

      <VirtualList items={filtered} onLoad={onLoad} />
    </div>
  );
}
