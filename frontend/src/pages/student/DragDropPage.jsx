import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import StudentLayout from '../../components/layout/StudentLayout';

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function DragDropPage() {
  const { resourceId } = useParams();
  const [draggedItem, setDraggedItem] = useState(null);
  const [matches, setMatches] = useState({});
  const [result, setResult] = useState(null);
  const [shuffledRights, setShuffledRights] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['student-dragdrop', resourceId],
    queryFn: () => api.get(`/student/resources/${resourceId}/dragdrop`).then(r => r.data),
  });

  useEffect(() => {
    const pairs = data?.exercise?.content?.pairs;
    if (pairs && !shuffledRights) {
      setShuffledRights(shuffle(pairs.map(p => p.right)));
    }
  }, [data, shuffledRights]);

  const submit = useMutation({
    mutationFn: (answers) => api.post(`/student/resources/${resourceId}/dragdrop/attempt`, { answers }),
    onSuccess: (res) => setResult(res.data),
    onError: () => toast.error('Erreur lors de la soumission'),
  });

  const exercise = data?.exercise;
  const pairs = exercise?.content?.pairs || [];

  const placedRights = new Set(Object.values(matches));
  const availableRights = (shuffledRights || []).filter(r => !placedRights.has(r));

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (leftItem, e) => {
    e.preventDefault();
    if (!draggedItem) return;
    const newMatches = { ...matches };
    const prev = Object.entries(newMatches).find(([, v]) => v === draggedItem);
    if (prev) delete newMatches[prev[0]];
    newMatches[leftItem] = draggedItem;
    setMatches(newMatches);
    setDraggedItem(null);
  };

  const removeMatch = (leftItem) => {
    const newMatches = { ...matches };
    delete newMatches[leftItem];
    setMatches(newMatches);
  };

  const handleSubmit = () => {
    const answers = pairs.map(p => ({ left: p.left, right: matches[p.left] || '' }));
    submit.mutate(answers);
  };

  const handleRetry = () => {
    setMatches({});
    setResult(null);
    setShuffledRights(shuffle(pairs.map(p => p.right)));
  };

  const allMatched = pairs.length > 0 && pairs.every(p => matches[p.left]);

  if (isLoading) return (
    <StudentLayout>
      <div className="text-center text-gray-400 py-16">Chargement de l'exercice...</div>
    </StudentLayout>
  );

  if (!exercise) return (
    <StudentLayout>
      <div className="text-center py-16">
        <p className="text-gray-400 mb-4">Exercice Drag & Drop introuvable.</p>
        <Link to="/student/dashboard" className="text-emerald-600 hover:underline text-sm">← Tableau de bord</Link>
      </div>
    </StudentLayout>
  );

  return (
    <StudentLayout>
      <div className="mb-6">
        <Link to="/student/dashboard" className="text-sm text-emerald-600 hover:underline">← Tableau de bord</Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">{exercise.title}</h1>
        {exercise.instructions && (
          <p className="text-gray-500 text-sm mt-1">{exercise.instructions}</p>
        )}
      </div>

      {/* Results */}
      {result ? (
        <div className="max-w-2xl">
          <div className={`rounded-xl p-6 mb-6 text-center ${
            result.score === result.max_score
              ? 'bg-emerald-50 border border-emerald-200'
              : result.score >= result.max_score / 2
              ? 'bg-amber-50 border border-amber-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <p className="text-5xl font-bold text-gray-800 mb-1">{result.score} / {result.max_score}</p>
            <p className="text-lg font-medium text-gray-600">
              {Math.round((result.score / result.max_score) * 100)}%
              {result.score === result.max_score
                ? ' — Parfait !'
                : result.score >= result.max_score / 2
                ? ' — Bien joué !'
                : ' — Continue à t\'entraîner !'}
            </p>
          </div>

          <div className="space-y-3 mb-6">
            {result.results.map((r, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 bg-white rounded-xl p-4 shadow-sm border-l-4 ${
                  r.is_correct ? 'border-emerald-400' : 'border-red-400'
                }`}
              >
                {r.is_correct
                  ? <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                  : <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                }
                <div className="text-sm">
                  <p className="font-semibold text-gray-800">{r.left}</p>
                  <p className="text-gray-500 mt-0.5">
                    Ta réponse :{' '}
                    <span className={r.is_correct ? 'text-emerald-600 font-medium' : 'text-red-500 line-through'}>
                      {r.right_given || '(aucune)'}
                    </span>
                    {!r.is_correct && (
                      <span className="text-emerald-600 font-medium ml-2">→ {r.right_correct}</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleRetry}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl hover:bg-emerald-700 font-medium"
          >
            <RotateCcw size={16} /> Recommencer
          </button>
        </div>
      ) : (
        <div className="max-w-3xl">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6 text-sm text-blue-700">
            Glisse les éléments de droite et dépose-les sur le terme correspondant à gauche.
          </div>

          <div className="grid grid-cols-2 gap-8 mb-6">
            {/* Left column: terms */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Termes à compléter</p>
              <div className="space-y-3">
                {pairs.map((pair, i) => (
                  <div
                    key={i}
                    className={`bg-white border-2 rounded-xl px-4 py-3 min-h-[64px] transition-all ${
                      matches[pair.left] ? 'border-emerald-400' : 'border-dashed border-gray-200'
                    }`}
                    onDragOver={handleDragOver}
                    onDrop={e => handleDrop(pair.left, e)}
                  >
                    <p className="text-sm font-semibold text-gray-800 mb-1">{pair.left}</p>
                    {matches[pair.left] ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg font-medium">
                          {matches[pair.left]}
                        </span>
                        <button
                          onClick={() => removeMatch(pair.left)}
                          className="text-gray-300 hover:text-red-400 text-xs leading-none"
                        >✕</button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-300 italic">Dépose une réponse ici…</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right column: draggable answers */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Réponses disponibles ({availableRights.length})
              </p>
              <div className="space-y-3">
                {availableRights.map((right, i) => (
                  <div
                    key={i}
                    draggable
                    onDragStart={() => setDraggedItem(right)}
                    onDragEnd={() => setDraggedItem(null)}
                    className={`bg-white border-2 border-indigo-200 rounded-xl px-4 py-3 text-sm text-gray-700 cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:shadow-sm transition select-none ${
                      draggedItem === right ? 'opacity-40 scale-95' : ''
                    }`}
                  >
                    {right}
                  </div>
                ))}
                {availableRights.length === 0 && (
                  <p className="text-xs text-gray-400 italic text-center py-6 bg-white rounded-xl border-2 border-dashed border-gray-100">
                    Toutes les réponses ont été placées
                  </p>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!allMatched || submit.isPending}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-700 disabled:opacity-50 font-medium text-base"
          >
            {submit.isPending ? 'Correction en cours…' : 'Valider mes réponses'}
          </button>

          {!allMatched && pairs.length > 0 && (
            <p className="text-center text-xs text-gray-400 mt-2">
              {pairs.length - Object.keys(matches).length} terme{pairs.length - Object.keys(matches).length > 1 ? 's' : ''} à compléter
            </p>
          )}
        </div>
      )}
    </StudentLayout>
  );
}
