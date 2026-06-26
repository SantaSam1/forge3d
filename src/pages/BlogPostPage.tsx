import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Box, Calendar } from 'lucide-react';
import { useSEO } from '../lib/useSEO';
import { useLang } from '../lib/i18n';
import { supabase, BlogPost } from '../lib/supabase';
import { renderMarkdown } from '../lib/renderMarkdown';

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { lang } = useLang();
  const isRu = lang === 'ru';
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    setNotFound(false);
    (async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .maybeSingle();
      if (active) {
        if (error || !data) setNotFound(true);
        else setPost(data as BlogPost);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [slug]);

  useSEO({
    title: post?.title || (isRu ? 'Статья' : 'Article'),
    description: post?.excerpt || '',
    canonical: post ? `/blog/${post.slug}` : undefined,
    ogImage: post?.cover_url || undefined,
  });

  const formatDate = (d: string | null) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString(isRu ? 'ru-RU' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-gray-950 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="bg-gray-950 min-h-screen flex flex-col items-center justify-center text-gray-300 px-4">
        <h1 className="text-2xl font-bold text-white mb-3">
          {isRu ? 'Статья не найдена' : 'Article not found'}
        </h1>
        <button
          onClick={() => navigate('/blog')}
          className="px-5 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 rounded-xl text-sm transition-all"
        >
          {isRu ? 'Назад в блог' : 'Back to blog'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-950 min-h-screen text-gray-300">
      <div className="border-b border-white/5 bg-gray-950 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center">
          <Link to="/blog" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <Box className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold text-white">3D-Prin</span>
          </Link>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Calendar className="w-4 h-4" />
          {formatDate(post.published_at)}
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-6 leading-tight">{post.title}</h1>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {post.tags.map((tag) => (
              <span key={tag} className="text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-lg">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {post.cover_url && (
          <div className="rounded-2xl overflow-hidden mb-10 border border-white/5">
            <img src={post.cover_url} alt={post.title} className="w-full h-auto" />
          </div>
        )}

        <div
          className="blog-content prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
        />

        <div className="mt-16 pt-8 border-t border-white/5">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {isRu ? 'Все статьи' : 'All articles'}
          </Link>
        </div>
      </article>
    </div>
  );
}
