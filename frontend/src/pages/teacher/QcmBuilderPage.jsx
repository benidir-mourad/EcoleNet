import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import TeacherLayout from '../../components/layout/TeacherLayout';

const emptyQuestion = () => ({
  question: '',
  points: 1,
  explanation: '',
  options: [
    { label: '', is_correct: false },
    { label: '', is_correct: false },
  ],
});

export default function QcmBuilderPage() {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['qcm', resourceId],
    queryFn: () => api.get(`/teacher/resources/${resourceId}/qcm`).then(r => r.data),
  });

  const [questions, setQuestions] = useState(null);

  const currentQuestions = questions ?? (data?.questions?.length > 0
    ? data.questions.map(q => ({
        question: q.question,
        points: q.points,
        explanation: q.explanation || '',
        options: q.options.map(o => ({ label: o.label, is_correct: o.is_correct })),
      }))
    : [emptyQuestion()]);

  const save = useMutation({
    mutationFn: () => api.post(`/teacher/resources/${resourceId}/qcm`, { questions: currentQuestions }),
    onSuccess: () => { qc.invalidateQueries(['qcm', resourceId]); toast.success('QCM enregistré !'); },
    onError: () => toast.error('Erreur'),
  });

  const setQ = (fn) => setQuestions(prev => {
    const qs = prev ?? currentQuestions;
    return fn([...qs]);
  });

  const updateQuestion = (i, field, value) => setQ(qs => { qs[i] = { ...qs[i], [field]: value }; return qs; });
  const updateOption = (qi, oi, field, value) => setQ(qs => {
    const opts = [...qs[qi].options];
    opts[oi] = { ...opts[oi], [field]: value };
    if (field === 'is_correct' && value) {
      opts.forEach((o, idx) => { if (idx !== oi) opts[idx] = { ...o, is_correct: false }; });
    }
    qs[qi] = { ...qs[qi], options: opts };
    return qs;
  });
  const addOption = (qi) => setQ(qs => { qs[qi].options.push({ label: '', is_correct: false }); return qs; });
  const removeOption = (qi, oi) => setQ(qs => { qs[qi].options.splice(oi, 1); return qs; });
  const addQuestion = () => setQ(qs => { qs.push(emptyQuestion()); return qs; });
  const removeQuestion = (i) => setQ(qs => { qs.splice(i, 1); return qs; });

  if (isLoading) return <TeacherLayout><div className="text-gray-400">Chargement...</div></TeacherLayout>;

  return (
    <TeacherLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate(-1)} className="text-sm text-indigo-600 hover:underline">← Retour</button>
          <h1 className="text-2xl font-bold text-gray-800 mt-1">Éditeur QCM</h1>
        </div>
        <button onClick={() => save.mutate()}
          disabled={save.isPending}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60">
          <CheckCircle size={18} /> {save.isPending ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      <div className="space-y-6">
        {currentQuestions.map((q, qi) => (
          <div key={qi} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                Question {qi + 1}
              </span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-sm text-gray-600">
                  Points:
                  <input type="number" min="1" value={q.points}
                    onChange={e => updateQuestion(qi, 'points', parseInt(e.target.value))}
                    className="w-16 border rounded px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </label>
                {currentQuestions.length > 1 && (
                  <button onClick={() => removeQuestion(qi)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>

            <textarea value={q.question} onChange={e => updateQuestion(qi, 'question', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Saisissez la question..." rows={2} />

            <div className="space-y-2 mb-4">
              {q.options.map((opt, oi) => (
                <div key={oi} className={`flex items-center gap-3 p-3 rounded-lg border ${opt.is_correct ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                  <input type="radio" name={`q${qi}`} checked={opt.is_correct}
                    onChange={() => updateOption(qi, oi, 'is_correct', true)}
                    className="accent-green-500" />
                  <input value={opt.label} onChange={e => updateOption(qi, oi, 'label', e.target.value)}
                    className="flex-1 bg-transparent focus:outline-none text-gray-800"
                    placeholder={`Option ${oi + 1}`} />
                  {q.options.length > 2 && (
                    <button onClick={() => removeOption(qi, oi)} className="text-gray-400 hover:text-red-500">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => addOption(qi)}
                className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                <Plus size={14} /> Ajouter une option
              </button>
              <input value={q.explanation} onChange={e => updateQuestion(qi, 'explanation', e.target.value)}
                className="text-sm border-b border-dashed focus:outline-none text-gray-500 w-64"
                placeholder="Explication (optionnel)" />
            </div>
          </div>
        ))}
      </div>

      <button onClick={addQuestion}
        className="mt-6 w-full border-2 border-dashed border-indigo-300 text-indigo-600 py-4 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition flex items-center justify-center gap-2">
        <Plus size={20} /> Ajouter une question
      </button>
    </TeacherLayout>
  );
}
