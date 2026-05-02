import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import StudentLayout from '../../components/layout/StudentLayout';

export default function TruthTablePage() {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['student-truth-table', resourceId],
    queryFn: () => api.get(`/student/resources/${resourceId}/truth-table`).then(r => r.data),
  });

  const exercise = data?.exercise;
  const variables = exercise?.content?.variables || [];
  const outputLabels = exercise?.content?.output_labels || [];
  const rows = exercise?.content?.rows || [];

  const totalCells = rows.length * outputLabels.length;
  const filledCells = Object.keys(answers).filter(k => answers[k] !== undefined).length;
  const allFilled = totalCells > 0 && filledCells === totalCells;

  const setCell = (rIdx, oIdx, val) => {
    if (result) return;
    setAnswers(prev => ({ ...prev, [`${rIdx}_${oIdx}`]: val }));
  };

  const attempt = useMutation({
    mutationFn: () => {
      const studentAnswers = rows.map((_, rIdx) =>
        outputLabels.map((_, oIdx) => answers[`${rIdx}_${oIdx}`] ?? 0)
      );
      return api.post(`/student/resources/${resourceId}/truth-table/attempt`, { answers: studentAnswers });
    },
    onSuccess: (res) => setResult(res.data),
    onError: () => toast.error('Erreur lors de la soumission'),
  });

  const reset = () => { setAnswers({}); setResult(null); };

  return (
    <StudentLayout>
      <div className="mb-6">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-emerald-600 hover:underline">
          <ArrowLeft size={14} /> Retour au cours
        </button>
        <h1 className="text-2xl font-bold text-gray-800 mt-3">{exercise?.title || 'Table de vérité'}</h1>
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

      {exercise && rows.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-7">
          <p className="text-sm text-gray-500 mb-5">Complétez les colonnes de sortie :</p>
          <div className="overflow-x-auto">
            <table className="border-collapse text-sm font-mono w-full">
              <thead>
                <tr className="bg-gray-50">
                  {variables.map((v, i) => (
                    <th key={i} className="border border-gray-200 px-4 py-2 text-blue-700 font-bold">{v}</th>
                  ))}
                  <th className="border border-gray-300 bg-gray-200 w-4"></th>
                  {outputLabels.map((lbl, i) => (
                    <th key={i} className="border border-gray-200 px-4 py-2 text-emerald-700 font-bold">{lbl}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {row.inputs.map((val, iIdx) => (
                      <td key={iIdx} className="border border-gray-200 px-4 py-2 text-center text-blue-800 font-semibold">{val}</td>
                    ))}
                    <td className="border border-gray-300 bg-gray-200 w-4"></td>
                    {outputLabels.map((_, oIdx) => {
                      const key = `${rIdx}_${oIdx}`;
                      const selected = answers[key];
                      const cellResult = result?.details?.[rIdx]?.[oIdx];
                      const isCorrect = cellResult?.is_correct;
                      return (
                        <td key={oIdx} className="border border-gray-200 p-1 text-center">
                          <div className="flex justify-center gap-2 items-center">
                            {[0, 1].map(val => {
                              let cls = 'w-9 h-9 rounded-lg font-bold text-sm transition ';
                              if (result) {
                                if (selected === val) {
                                  cls += isCorrect
                                    ? 'bg-green-500 text-white ring-2 ring-green-400'
                                    : 'bg-red-400 text-white ring-2 ring-red-400';
                                } else if (!isCorrect && cellResult?.correct === val) {
                                  cls += 'bg-green-200 text-green-800 ring-2 ring-green-400';
                                } else {
                                  cls += 'bg-gray-100 text-gray-300';
                                }
                              } else {
                                cls += selected === val
                                  ? val === 1 ? 'bg-emerald-500 text-white' : 'bg-red-400 text-white'
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200';
                              }
                              return (
                                <button key={val} onClick={() => setCell(rIdx, oIdx, val)} className={cls}>
                                  {val}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!result && (
            <>
              {!allFilled && (
                <p className="text-xs text-amber-600 mt-3 italic">⚠ Remplissez toutes les cases avant de valider.</p>
              )}
              <button
                onClick={() => attempt.mutate()}
                disabled={!allFilled || attempt.isPending}
                className="mt-6 w-full bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 transition">
                {attempt.isPending ? 'Correction…' : 'Valider'}
              </button>
            </>
          )}
        </div>
      )}
    </StudentLayout>
  );
}
