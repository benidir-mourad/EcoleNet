import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import StudentLayout from '../../components/layout/StudentLayout';

function parseParts(template) {
  const parts = [];
  const regex = /\[\[(.*?)\]\]/g;
  let last = 0, m, blankIdx = 0;
  while ((m = regex.exec(template)) !== null) {
    if (m.index > last) parts.push({ type: 'text', value: template.slice(last, m.index) });
    parts.push({ type: 'blank', index: blankIdx++ });
    last = regex.lastIndex;
  }
  if (last < template.length) parts.push({ type: 'text', value: template.slice(last) });
  return parts;
}

export default function FillBlanksPage() {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['student-fill-blanks', resourceId],
    queryFn: () => api.get(`/student/resources/${resourceId}/fill-blanks`).then(r => r.data),
  });

  const attempt = useMutation({
    mutationFn: () => {
      const exercise = data?.exercise;
      const template = exercise?.content?.template || '';
      const regex = /\[\[(.*?)\]\]/g;
      let count = 0;
      while (regex.exec(template)) count++;
      const answersArray = Array.from({ length: count }, (_, i) => answers[i] || '');
      return api.post(`/student/resources/${resourceId}/fill-blanks/attempt`, { answers: answersArray });
    },
    onSuccess: (res) => setResult(res.data),
    onError: () => toast.error('Erreur lors de la soumission'),
  });

  const exercise = data?.exercise;
  const template = exercise?.content?.template || '';
  const parts    = parseParts(template);
  const nbBlanks = parts.filter(p => p.type === 'blank').length;
  const allFilled = nbBlanks > 0 && Object.values(answers).filter(a => a?.trim()).length === nbBlanks;

  const reset = () => { setAnswers({}); setResult(null); };

  return (
    <StudentLayout>
      <div className="mb-6">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-emerald-600 hover:underline">
          <ArrowLeft size={14} /> Retour au cours
        </button>
        <h1 className="text-2xl font-bold text-gray-800 mt-3">{exercise?.title || 'Texte à trous'}</h1>
        {exercise?.instructions && (
          <p className="text-gray-500 text-sm mt-1">{exercise.instructions}</p>
        )}
      </div>

      {isLoading && <div className="text-center text-gray-400 py-12">Chargement…</div>}

      {/* Result banner */}
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

      {/* Exercise */}
      {exercise && (
        <div className="bg-white rounded-xl shadow-sm p-7">
          <div className="font-mono text-sm leading-10 whitespace-pre-wrap">
            {parts.map((p, i) => {
              if (p.type === 'text') return <span key={i}>{p.value}</span>;
              const res = result?.results?.[p.index];
              const inputClass = result
                ? res?.is_correct
                  ? 'border-green-400 bg-green-50 text-green-800'
                  : 'border-red-400 bg-red-50 text-red-800'
                : 'border-indigo-300 bg-indigo-50 focus:ring-2 focus:ring-indigo-400';
              return (
                <span key={i} className="inline-flex flex-col items-center mx-1 relative" style={{ verticalAlign: 'middle' }}>
                  <input
                    value={result ? (res?.is_correct ? answers[p.index] || '' : answers[p.index] || '') : (answers[p.index] || '')}
                    onChange={e => !result && setAnswers({ ...answers, [p.index]: e.target.value })}
                    readOnly={!!result}
                    className={`border-2 rounded-lg px-2 py-0.5 text-center focus:outline-none transition w-28 ${inputClass}`}
                    placeholder={`Trou ${p.index + 1}`}
                  />
                  {result && !res?.is_correct && (
                    <span className="text-xs text-green-700 font-semibold mt-0.5 whitespace-nowrap">
                      → {res.correct_answer}
                    </span>
                  )}
                </span>
              );
            })}
          </div>

          {!result && (
            <button
              onClick={() => attempt.mutate()}
              disabled={!allFilled || attempt.isPending}
              className="mt-8 w-full bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {attempt.isPending ? 'Correction…' : 'Valider'}
            </button>
          )}
        </div>
      )}
    </StudentLayout>
  );
}
