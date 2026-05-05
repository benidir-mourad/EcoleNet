import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { GraduationCap, Code2, Terminal, Cpu, Wifi, Database } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../services/api';

const schema = z.object({
  first_name: z.string().min(2, 'Prénom requis'),
  last_name: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
  password_confirmation: z.string(),
}).refine((d) => d.password === d.password_confirmation, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['password_confirmation'],
});

function FloatingIcon({ Icon, style, className = '' }) {
  return (
    <div className={`absolute text-white/10 pointer-events-none ${className}`} style={style}>
      <Icon size={28} />
    </div>
  );
}

const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm';
const labelCls = 'block text-xs font-medium text-white/60 mb-1.5';

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await registerUser(data);
      toast.success('Inscription réussie ! En attente de validation.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de l'inscription"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0f0c29 0%, #1a1050 40%, #0d2450 70%, #0a2e1a 100%)',
      }}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Scan line */}
      <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent anim-scan pointer-events-none" />

      {/* Floating icons */}
      <FloatingIcon Icon={Code2}    style={{ top: '6%',  left: '4%'  }} className="anim-float" />
      <FloatingIcon Icon={Cpu}      style={{ top: '12%', right: '6%' }} className="anim-float-2" />
      <FloatingIcon Icon={Terminal} style={{ top: '70%', left: '5%'  }} className="anim-float-3" />
      <FloatingIcon Icon={Database} style={{ top: '78%', right: '5%' }} className="anim-float-4" />
      <FloatingIcon Icon={Wifi}     style={{ top: '45%', left: '2%'  }} className="anim-float-2" />

      {/* Card */}
      <div className="relative w-full max-w-md anim-slide-up">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-600/30 border border-emerald-400/30 mb-3">
              <GraduationCap size={24} className="text-emerald-300" />
            </div>
            <h1 className="text-2xl font-bold font-mono text-white">
              Ecole<span className="text-indigo-300">Net</span>
            </h1>
            <p className="text-xs text-white/30 mt-1 font-mono">// Créer votre compte élève</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Prénom</label>
                <input {...register('first_name')} className={inputCls} placeholder="Jean" />
                {errors.first_name && <p className="text-red-400 text-xs mt-1">{errors.first_name.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Nom</label>
                <input {...register('last_name')} className={inputCls} placeholder="Dupont" />
                {errors.last_name && <p className="text-red-400 text-xs mt-1">{errors.last_name.message}</p>}
              </div>
            </div>

            <div>
              <label className={labelCls}>Email</label>
              <input {...register('email')} type="email" className={inputCls} placeholder="votre@email.com" />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className={labelCls}>Mot de passe</label>
              <input {...register('password')} type="password" className={inputCls} placeholder="••••••••" />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className={labelCls}>Confirmer le mot de passe</label>
              <input {...register('password_confirmation')} type="password" className={inputCls} placeholder="••••••••" />
              {errors.password_confirmation && (
                <p className="text-red-400 text-xs mt-1">{errors.password_confirmation.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-semibold transition disabled:opacity-60 text-sm mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Inscription…
                </span>
              ) : "S'inscrire"}
            </button>
          </form>

          <p className="text-center text-sm text-white/30 mt-5">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-indigo-300 hover:text-indigo-200 font-medium transition">
              Se connecter
            </Link>
          </p>

          <div className="flex items-center justify-center gap-2 mt-5 pt-4 border-t border-white/5">
            <Code2 size={12} className="text-white/20" />
            <span className="text-xs text-white/20 font-mono">Laravel · React · MySQL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
