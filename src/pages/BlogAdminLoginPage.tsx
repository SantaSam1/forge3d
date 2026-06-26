import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, Box } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function BlogAdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError('Неверный email или пароль');
      return;
    }
    navigate('/blog/admin');
  };

  return (
    <div className="bg-gray-950 min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Box className="w-6 h-6 text-cyan-400" />
          <span className="text-white font-semibold text-lg">3D-Prin · Admin</span>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900/50 border border-white/5 rounded-2xl p-6 space-y-4">
          <h1 className="text-white font-semibold text-lg mb-2">Вход в админку блога</h1>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-950 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Пароль</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-950 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-white font-medium py-2.5 rounded-xl transition-all text-sm"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Войти
          </button>
        </form>
      </div>
    </div>
  );
}
