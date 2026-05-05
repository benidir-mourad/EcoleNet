import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Code2, Cpu, Terminal, Database, Wifi, Binary, GraduationCap } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../services/api';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

/* Floating tech icon with animation */
function FloatingIcon({ Icon, style, className = '' }) {
  return (
    <div
      className={`absolute text-white/10 pointer-events-none ${className}`}
      style={style}
    >
      <Icon size={32} />
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Identifiants incorrects'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0f0c29 0%, #1a1050 40%, #0d2450 70%, #0a2e1a 100%)',
      }}
    >
      {/* Dot grid background */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Animated scan line */}
      <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent anim-scan pointer-events-none" />

      {/* Floating tech icons */}
      <FloatingIcon Icon={Code2}    style={{ top: '8%',  left: '5%'  }} className="anim-float" />
      <FloatingIcon Icon={Cpu}      style={{ top: '15%', right: '8%' }} className="anim-float-2" />
      <FloatingIcon Icon={Terminal} style={{ top: '65%', left: '7%'  }} className="anim-float-3" />
      <FloatingIcon Icon={Database} style={{ top: '75%', right: '6%' }} className="anim-float-4" />
      <FloatingIcon Icon={Wifi}     style={{ top: '40%', left: '3%'  }} className="anim-float-2" />
      <FloatingIcon Icon={Binary}   style={{ top: '35%', right: '4%' }} className="anim-float-3" />

      {/* Circuit decoration top-right */}
      <div className="absolute top-6 right-6 opacity-10 anim-circuit pointer-events-none">
        <svg viewBox="0 0 160 80" fill="none" stroke="white" strokeWidth="1.5" className="w-40">
          <line x1="0"   y1="20" x2="50"  y2="20" />
          <circle cx="50" cy="20" r="3" fill="white" />
          <line x1="50"  y1="20" x2="50"  y2="50" />
          <line x1="50"  y1="50" x2="100" y2="50" />
          <rect  x="100" y="42" width="30" height="16" rx="2" />
          <line x1="105" y1="42" x2="105" y2="35" />
          <line x1="115" y1="42" x2="115" y2="35" />
          <line x1="125" y1="42" x2="125" y2="35" />
          <line x1="130" y1="50" x2="160" y2="50" />
          <circle cx="20" cy="20" r="2" />
          <line x1="80"  y1="20" x2="160" y2="20" />
          <circle cx="120" cy="20" r="2" />
        </svg>
      </div>

      {/* Circuit decoration bottom-left */}
      <div className="absolute bottom-6 left-6 opacity-10 anim-circuit pointer-events-none" style={{ animationDelay: '2s' }}>
        <svg viewBox="0 0 140 60" fill="none" stroke="white" strokeWidth="1.5" className="w-36">
          <line x1="0"   y1="30" x2="40"  y2="30" />
          <circle cx="40" cy="30" r="3" fill="white" />
          <line x1="40"  y1="30" x2="40"  y2="10" />
          <line x1="40"  y1="10" x2="100" y2="10" />
          <circle cx="100" cy="10" r="2" />
          <line x1="100" y1="10" x2="100" y2="30" />
          <line x1="100" y1="30" x2="140" y2="30" />
          <rect  x="55"  y="22" width="25" height="16" rx="2" />
          <line x1="60"  y1="38" x2="60"  y2="55" />
          <line x1="72"  y1="38" x2="72"  y2="55" />
        </svg>
      </div>

      {/* Login card */}
      <div className="relative w-full max-w-md anim-slide-up">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 mb-4">
              <GraduationCap size={28} className="text-indigo-300" />
            </div>
            <h1 className="text-2xl font-bold font-mono text-white">
              Ecole<span className="text-indigo-300">Net</span>
              <span className="text-indigo-400 anim-blink">_</span>
            </h1>
            <p className="text-sm text-white/40 mt-1 font-mono">// Connexion à votre espace</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="votre@email.com"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Mot de passe</label>
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-semibold transition disabled:opacity-60 text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connexion…
                </span>
              ) : 'Se connecter'}
            </button>
          </form>

          <p className="text-center text-sm text-white/30 mt-6">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-indigo-300 hover:text-indigo-200 font-medium transition">
              S'inscrire
            </Link>
          </p>

          {/* Bottom tech label */}
          <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-white/5">
            <Code2 size={12} className="text-white/20" />
            <span className="text-xs text-white/20 font-mono">Laravel · React · MySQL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
