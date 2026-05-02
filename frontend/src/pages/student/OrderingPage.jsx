import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, RotateCcw, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import StudentLayout from '../../components/layout/StudentLayout';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function OrderingPage() {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [result, setResult] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['student-ordering', resourceId],
    queryFn: () => api.get(`/student/resources/${resourceId}/ordering`).then(r => r.data),
  });

  const exercise = data?.exercise;
  const items = exercise?.content?.items || [];

  useEffect(() => {
    if (items.length > 0 && !order) {
      setOrder(shuffle(items.map((item, i) => ({ item, origIdx: i }))));
    }
  }, [items.length]);

  const attempt = useMutation({
    mutationFn: () => {
      const studentOrder = order.map(o => o.origIdx);
      return api.post(`/student/resources/${resourceId}/ordering/attempt`, { order: studentOrder });
    },
    onSuccess: (res) => setResult(res.data),
    onError: () => toast.error('Erreur lors de la soumission'),
  });

  const move = (idx, dir) => {
    if (result) return;
    const next = [...order];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setOrder(next);
  };

  const reset = () => {
    setResult(null);
    setOrder(shuffle(items.map((item, i) => ({ item, origIdx: i }))));
  };

  return (
    <StudentLayout>
      <div className="mb-6">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-emerald-600 hover:underline">
          <ArrowLeft size={14} /> Retour au cours
        </button>
        <h1 className="text-2xl font-bold text-gray-800 mt-3">{exercise?.title || 'Ordonnancement'}</h1>
        {exercise?.instructions && (
          <p className="text-gray-500 text-sm mt-1">{exercise.instructions}</p>
        )}
      </div>

      {isLoading && <div className="text-center text-gray-400 py-12">Chargement…</div>}

      {result && (
        <div className={`rounded-xl p-5 mb-6 ${result.score === result.max_score ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle size={20} className={result.score === result.max_score ? 'text-green-600' : 'text-amber-600'} />
              <span className="font-semibold text-gray-800">
                Score : <span className={result.score === result.max_score ? 'text-green-700' : 'text-amber-700'}>
                  {result.score} / {result.max_score}
                </span>
              </span>
            </div>
            <button onClick={reset}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
              <RotateCcw size={14} /> Réessayer
            </button>
          </div>
        </div>
      )}

      {exercise && order && (
        <div className="bg-white rounded-xl shadow-sm p-7">
          <p className="text-sm text-gray-500 mb-4">Remettez les éléments dans le bon ordre :</p>
          <div className="space-y-2">
            {order.map((entry, idx) => {
              const isCorrect = result ? result.details?.[idx]?.is_correct : null;
              return (
                <div key={idx}
                  className={`flex items-center gap-3 rounded-xl border-2 p-3 transition ${
                    result
                      ? isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                      : 'border-gray-200 bg-white'
                  }`}>
                  <GripVertical size={16} className="text-gray-300 shrink-0" />
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button onClick={() => move(idx, -1)} disabled={!!result || idx === 0}
                      className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20">
                      <ArrowUp size={13} />
                    </button>
                    <button onClick={() => move(idx, 1)} disabled={!!result || idx === order.length - 1}
                      className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20">
                      <ArrowDown size={13} />
                    </button>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <span className="font-mono text-sm text-gray-800 flex-1">{entry.item}</span>
                  {result && !isCorrect && (
                    <span className="text-xs text-green-700 font-semibold whitespace-nowrap">
                      → pos. {result.details?.[idx]?.correct_position + 1}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {result && result.score < result.max_score && (
            <div className="mt-5 bg-green-50 rounded-xl p-4 border border-green-200">
              <p className="text-sm font-medium text-green-800 mb-2">Ordre correct :</p>
              <div className="space-y-1">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm font-mono text-green-800">
                    <span className="w-5 text-center font-bold">{i + 1}.</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!result && (
            <button
              onClick={() => attempt.mutate()}
              disabled={attempt.isPending}
              className="mt-8 w-full bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 transition">
              {attempt.isPending ? 'Correction…' : 'Valider'}
            </button>
          )}
        </div>
      )}
    </StudentLayout>
  );
}
