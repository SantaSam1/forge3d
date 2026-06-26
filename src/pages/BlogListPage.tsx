import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Box, Calendar, Tag as TagIcon } from 'lucide-react';
import { useSEO } from '../lib/useSEO';
import { useLang } from '../lib/i18n';
import { supabase, BlogPost } from '../lib/supabase';

export default function BlogListPage() {
  const { lang } = useLang();
  const isRu = lang === 'ru';
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useSEO({
    title: isRu ? 'Блог' : 'Blog',
    description: isRu
      ? 'Статьи и новости о 3D-моделировании, ИИ-генерации моделей и цифровом производстве.'
      : 'Articles and news about 3D modeling, AI model generation, and digital fabrication.',
    canonical: '/blog',
  });

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false });
      if (active) {
        if (!error && data) setPosts(data as BlogPost[]);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags))).sort();
  const visiblePosts = activeTag ? posts.filter((p) => p.tags.includes(activeTag)) : posts;

  const formatDate = (d: string | null) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString(isRu ? 'ru-RU' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  return (
    <div className="bg-gray-950 min-h-screen text-gray-300">
      <div className="border-b border-white/5 bg-gray-950 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center">
          <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <Box className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold text-white">3D-Prin</span>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            {isRu ? 'Блог о 3D-моделировании' : '3D Modeling Blog'}
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
            {isRu
              ? 'Статьи, новости и гайды о 3D-печати, ИИ-генерации моделей и цифровом дизайне.'
              : 'Articles, news and guides on 3D printing, AI model generation, and digital design.'}
          </p>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            <button
              onClick={() => setActiveTag(null)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                activeTag === null
                  ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                  : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {isRu ? 'Все' : 'All'}
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                  activeTag === tag
                    ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                    : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            {isRu ? 'Пока нет статей. Загляните позже!' : 'No articles yet. Check back soon!'}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            {visiblePosts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group bg-gray-900/50 border border-white/5 rounded-2xl overflow-hidden hover:border-cyan-500/20 transition-all"
              >
                {post.cover_url ? (
                  <div className="aspect-video w-full overflow-hidden bg-gray-800">
                    <img
                      src={post.cover_url}
                      alt={post.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-gradient-to-br from-cyan-500/10 to-blue-600/10 flex items-center justify-center">
                    <Box className="w-10 h-10 text-cyan-500/30" />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(post.published_at)}
                  </div>
                  <h2 className="text-white font-semibold text-lg mb-2 group-hover:text-cyan-400 transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-gray-500 text-sm leading-relaxed line-clamp-3">{post.excerpt}</p>
                  {post.tags.length > 0 && (
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      <TagIcon className="w-3.5 h-3.5 text-gray-600" />
                      {post.tags.map((tag) => (
                        <span key={tag} className="text-xs text-gray-500">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
