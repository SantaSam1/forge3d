import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, LogOut, Plus, Pencil, Trash2, Loader2, Image as ImageIcon,
  Eye, EyeOff, X, Upload,
} from 'lucide-react';
import { supabase, BlogPost } from '../lib/supabase';
import { slugify } from '../lib/slugify';
import { useSEO } from '../lib/useSEO';
import type { User } from '@supabase/supabase-js';

type Draft = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_url: string;
  tags: string;
  published: boolean;
};

const emptyDraft: Draft = { slug: '', title: '', excerpt: '', content: '', cover_url: '', tags: '', published: false };

export default function BlogAdminPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingInline, setUploadingInline] = useState(false);
  const [formError, setFormError] = useState('');

  useSEO({ title: 'Админка блога', description: '', noindex: true });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setCheckingAuth(false);
      if (!data.user) navigate('/blog/admin/login');
    });
  }, [navigate]);

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    const { data } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
    setPosts((data as BlogPost[]) || []);
    setLoadingPosts(false);
  }, []);

  useEffect(() => {
    if (user) loadPosts();
  }, [user, loadPosts]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/blog/admin/login');
  };

  const startNew = () => { setFormError(''); setEditing({ ...emptyDraft }); };

  const startEdit = (post: BlogPost) => {
    setFormError('');
    setEditing({
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      cover_url: post.cover_url,
      tags: post.tags.join(', '),
      published: post.published,
    });
  };

  const handleDelete = async (post: BlogPost) => {
    if (!confirm(`Удалить статью «${post.title}»?`)) return;
    await supabase.from('blog_posts').delete().eq('id', post.id);
    loadPosts();
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('blog-images').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) {
      setFormError('Ошибка загрузки изображения: ' + error.message);
      return null;
    }
    const { data } = supabase.storage.from('blog-images').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploadingCover(true);
    const url = await uploadImage(file);
    if (url) setEditing({ ...editing, cover_url: url });
    setUploadingCover(false);
  };

  const handleInlineUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploadingInline(true);
    const url = await uploadImage(file);
    if (url) {
      setEditing({ ...editing, content: editing.content + `\n\n![](${url})\n\n` });
    }
    setUploadingInline(false);
  };

  const handleSave = async (publish: boolean) => {
    if (!editing) return;
    setFormError('');

    const title = editing.title.trim();
    if (!title) { setFormError('Укажите заголовок'); return; }

    const slug = editing.slug.trim() ? slugify(editing.slug) : slugify(title);
    if (!slug) { setFormError('Не удалось сформировать slug — измените заголовок'); return; }

    setSaving(true);

    const tags = editing.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const payload = {
      slug,
      title,
      excerpt: editing.excerpt.trim(),
      content: editing.content,
      cover_url: editing.cover_url,
      tags,
      published: publish,
      published_at: publish ? new Date().toISOString() : null,
    };

    let error;
    if (editing.id) {
      // Keep original published_at if already published and staying published
      const original = posts.find((p) => p.id === editing.id);
      if (publish && original?.published_at) payload.published_at = original.published_at;
      ({ error } = await supabase.from('blog_posts').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('blog_posts').insert(payload));
    }

    setSaving(false);

    if (error) {
      setFormError(error.message.includes('duplicate') ? 'Такой slug уже существует — измените заголовок или slug' : error.message);
      return;
    }

    setEditing(null);
    loadPosts();
  };

  if (checkingAuth) {
    return (
      <div className="bg-gray-950 min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="bg-gray-950 min-h-screen text-gray-300">
      <div className="border-b border-white/5 sticky top-0 bg-gray-950 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold text-white">Админка блога</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 truncate max-w-[160px]">{user.email}</span>
            <button onClick={handleSignOut} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
              <LogOut className="w-4 h-4" /> Выйти
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {!editing ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold text-white">Статьи</h1>
              <button
                onClick={startNew}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-medium rounded-xl transition-all"
              >
                <Plus className="w-4 h-4" /> Новая статья
              </button>
            </div>

            {loadingPosts ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16 text-gray-500">Пока нет статей. Создайте первую!</div>
            ) : (
              <div className="space-y-2">
                {posts.map((post) => (
                  <div key={post.id} className="flex items-center gap-4 bg-gray-900/50 border border-white/5 rounded-xl p-4">
                    <div className="w-14 h-14 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {post.cover_url ? (
                        <img src={post.cover_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium truncate">{post.title}</h3>
                        {post.published ? (
                          <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full"><Eye className="w-3 h-3" />Опубликовано</span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full"><EyeOff className="w-3 h-3" />Черновик</span>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm truncate">/blog/{post.slug}</p>
                    </div>
                    <button onClick={() => startEdit(post)} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(post)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold text-white">{editing.id ? 'Редактировать статью' : 'Новая статья'}</h1>
              <button onClick={() => setEditing(null)} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 bg-gray-900/50 border border-white/5 rounded-2xl p-6">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Заголовок</label>
                <input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
                  placeholder="Как выбрать формат 3D-модели для печати"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">
                  URL (slug) — оставьте пустым, сформируется из заголовка
                </label>
                <input
                  value={editing.slug}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
                  placeholder="kak-vybrat-format-3d-modeli"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Краткое описание (для списка статей)</label>
                <textarea
                  value={editing.excerpt}
                  onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
                  rows={2}
                  className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50 resize-none"
                  placeholder="Короткий анонс статьи в 1-2 предложения"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Теги (через запятую)</label>
                <input
                  value={editing.tags}
                  onChange={(e) => setEditing({ ...editing, tags: e.target.value })}
                  className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
                  placeholder="печать, ИИ, гайды"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Обложка статьи</label>
                <div className="flex items-center gap-3">
                  {editing.cover_url && (
                    <img src={editing.cover_url} alt="" className="w-20 h-20 object-cover rounded-lg border border-white/10" />
                  )}
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-gray-300 cursor-pointer transition-all">
                    {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {editing.cover_url ? 'Заменить' : 'Загрузить изображение'}
                    <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" disabled={uploadingCover} />
                  </label>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs text-gray-500">
                    Текст статьи (поддерживается markdown: **жирный**, *курсив*, заголовки ##, списки -, цитаты &gt;)
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer">
                    {uploadingInline ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                    Вставить картинку
                    <input type="file" accept="image/*" onChange={handleInlineUpload} className="hidden" disabled={uploadingInline} />
                  </label>
                </div>
                <textarea
                  value={editing.content}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  rows={16}
                  className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50 font-mono resize-y"
                  placeholder={'## Введение\n\nТекст статьи...\n\n![](url-картинки-после-загрузки)\n\n- пункт списка\n- ещё пункт'}
                />
              </div>

              {formError && <p className="text-red-400 text-sm">{formError}</p>}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-all"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Опубликовать
                </button>
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-60 text-gray-300 text-sm font-medium rounded-xl transition-all"
                >
                  Сохранить как черновик
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
