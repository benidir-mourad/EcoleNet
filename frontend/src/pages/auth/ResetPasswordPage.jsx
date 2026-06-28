import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { GraduationCap, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import api, { getApiErrorMessage } from '../../services/api';

const schema = z.object({
  password: z.string().min(8, 'Minimum 8 caractères'),
  password_confirmation: z.string(),
}).refine(d => d.password === d.password_confirmation, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['password_confirmation'],
});

const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm';
const labelCls = 'block text-xs font-medium text-white/60 mb-1.5';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  // Missing token or email in URL
  if (!token || !email) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #1a1050 40%, #0d2450 70%, #0a2e1a 100%)' }}
      >
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
          <AlertCircle size={40} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-lg font-bold text-white mb-2">Lien invalide</h2>
          <p className="text-white/40 text-sm mb-5">
            Ce lien de réinitialisation est incomplet ou invalide. Veuillez recommencer.
          </p>
          <Link to="/forgot-password" className="text-indigo-300 hover:text-indigo-200 text-sm transition">
            Redemander un lien
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = async ({ password, password_confirmation }) => {
    setLoading(true);
    setError('');
    try {
      await api.post('/reset-password', { token, email, password, password_confirmation });
      setDone(true);
      toast.success('Mot de passe réinitialisé !');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Une erreur est survenue. Veuillez réessayer.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #1a1050 40%, #0d2450 70%, #0a2e1a 100%)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative w-full max-w-md anim-slide-up">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 mb-3">
              <GraduationCap size={24} className="text-indigo-300" />
            </div>
            <h1 className="text-2xl font-bold font-mono text-white">
              Ecole<span className="text-indigo-300">Net</span>
            </h1>
          </div>

          {done ? (
            /* ── Success state ── */
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-400/30">
                <CheckCircle size={28} className="text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Mot de passe réinitialisé !</h2>
              <p className="text-white/40 text-sm">
                Vous allez être redirigé vers la page de connexion…
              </p>
            </div>
          ) : (
            /* ── Form ── */
            <>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white mb-1">Nouveau mot de passe</h2>
                <p className="text-white/40 text-sm">
                  Choisissez un mot de passe sécurisé pour{' '}
                  <span className="text-indigo-300">{email}</span>
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className={labelCls}>
                    <Lock size={11} className="inline mr-1" />
                    Nouveau mot de passe
                  </label>
                  <input
                    {...register('password')}
                    type="password"
                    placeholder="••••••••"
                    className={inputCls}
                    autoFocus
                  />
                  {errors.password && (
                    <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label className={labelCls}>
                    <Lock size={11} className="inline mr-1" />
                    Confirmer le mot de passe
                  </label>
                  <input
                    {...register('password_confirmation')}
                    type="password"
                    placeholder="••••••••"
                    className={inputCls}
                  />
                  {errors.password_confirmation && (
                    <p className="text-red-400 text-xs mt-1">{errors.password_confirmation.message}</p>
                  )}
                </div>

                {error && (
                  <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                    <p className="text-red-400 text-xs">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-semibold transition disabled:opacity-60 text-sm mt-2"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Réinitialisation…
                    </span>
                  ) : 'Réinitialiser le mot de passe'}
                </button>
              </form>

              <p className="text-center text-sm text-white/30 mt-5">
                <Link to="/forgot-password" className="text-indigo-300 hover:text-indigo-200 transition">
                  Redemander un lien
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
