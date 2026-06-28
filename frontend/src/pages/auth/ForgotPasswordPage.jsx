import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GraduationCap, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import api, { getApiErrorMessage } from '../../services/api';

const schema = z.object({
  email: z.string().email('Adresse email invalide'),
});

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentEmail, setSentEmail] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ email }) => {
    setLoading(true);
    setError('');
    try {
      await api.post('/forgot-password', { email });
      setSentEmail(email);
      setSent(true);
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

          {sent ? (
            /* ── Confirmation ── */
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-400/30">
                <CheckCircle size={28} className="text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Email envoyé !</h2>
              <p className="text-white/50 text-sm mb-1">
                Un lien de réinitialisation a été envoyé à
              </p>
              <p className="text-indigo-300 font-medium text-sm mb-6">{sentEmail}</p>
              <p className="text-white/30 text-xs mb-6">
                Vérifiez vos spams si vous ne le recevez pas. Le lien expire dans 60 minutes.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-indigo-300 hover:text-indigo-200 text-sm transition"
              >
                <ArrowLeft size={14} /> Retour à la connexion
              </Link>
            </div>
          ) : (
            /* ── Form ── */
            <>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white mb-1">Mot de passe oublié ?</h2>
                <p className="text-white/40 text-sm">
                  Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">
                    Adresse email
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="votre@email.com"
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
                  )}
                </div>

                {error && (
                  <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-semibold transition disabled:opacity-60 text-sm"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Envoi…
                    </span>
                  ) : 'Envoyer le lien'}
                </button>
              </form>

              <p className="text-center text-sm text-white/30 mt-5">
                <Link to="/login" className="inline-flex items-center gap-1.5 text-indigo-300 hover:text-indigo-200 transition">
                  <ArrowLeft size={13} /> Retour à la connexion
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
