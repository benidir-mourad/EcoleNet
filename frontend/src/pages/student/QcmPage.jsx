import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle, XCircle, Trophy } from 'lucide-react';
import api from '../../services/api';
import StudentLayout from '../../components/layout/StudentLayout';

export default function QcmPage() {
  const { resourceId } = useParams();
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const { data } = useQuery({
    queryKey: ['student-resource', resourceId],
    queryFn: () => api.get(`/student/resources/${resourceId}`).then(r => r.data),
  });

  const submit = useMutation({
    mutationFn: () => api.post(`/student/resources/${resourceId}/qcm/attempt`, { answers }),
    onSuccess: (res) => setResult(res.data),
    onError: () => {},
  });

  const resource = data?.resource;
  const questions = resource?.qcm_questions || [];

  if (result) {
    const pct = result.percentage;
    const passed = pct >= 50;
    return (
      <StudentLayout>
        <div className="max-w-2xl mx-auto">
          <div className={`rounded-xl p-8 text-center mb-6 ${passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <Trophy size={48} className={`mx-auto mb-4 ${passed ? 'text-green-500' : 'text-red-400'}`} />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {pct}% — {result.score}/{result.max_score} points
            </h2>
            <p className={`font-medium ${passed ? 'text-green-700' : 'text-red-700'}`}>
              {passed ? 'Félicitations !' : 'Continue à réviser !'}
            </p>
          </div>

          <div className="space-y-4 mb-8">
            {result.questions?.map((q) => {
              const correct = Array.isArray(q.correct_ids)
                ? q.correct_ids.includes(parseInt(q.your_answer))
                : q.correct_ids == q.your_answer;
              return (
                <div key={q.id} className={`bg-white rounded-xl p-5 border-l-4 ${correct ? 'border-green-400' : 'border-red-400'}`}>
                  <div className="flex items-start gap-3">
                    {correct ? <CheckCircle size={20} className="text-green-500 shrink-0 mt-0.5" /> : <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" />}
                    <div>
                      <p className="font-medium text-gray-800">{q.question}</p>
                      {q.explanation && <p className="text-sm text-gray-500 mt-2 italic">{q.explanation}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-4">
            <button onClick={() => { setResult(null); setAnswers({}); }}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50">
              Recommencer
            </button>
            <Link to={`/student/courses/${resource?.course_id}`}
              className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg text-center hover:bg-emerald-700">
              Retour au cours
            </Link>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">QCM — {resource?.title}</h1>
          <p className="text-gray-500 text-sm">{questions.length} question(s)</p>
        </div>

        <div className="space-y-6 mb-8">
          {questions.map((q, qi) => (
            <div key={q.id} className="bg-white rounded-xl shadow-sm p-6">
              <p className="font-medium text-gray-800 mb-4">
                <span className="text-emerald-600 font-semibold mr-2">{qi + 1}.</span>
                {q.question}
              </p>
              <div className="space-y-2">
                {q.options?.map(opt => (
                  <label key={opt.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      answers[q.id] == opt.id ? 'bg-emerald-50 border-emerald-400' : 'bg-gray-50 border-gray-200 hover:bg-emerald-50'
                    }`}>
                    <input type="radio" name={`q${q.id}`} value={opt.id}
                      checked={answers[q.id] == opt.id}
                      onChange={() => setAnswers({ ...answers, [q.id]: opt.id })}
                      className="accent-emerald-500" />
                    <span className="text-gray-800">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => submit.mutate()}
          disabled={Object.keys(answers).length < questions.length || submit.isPending}
          className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-60"
        >
          {submit.isPending ? 'Correction...' : 'Soumettre le QCM'}
        </button>

        {Object.keys(answers).length < questions.length && (
          <p className="text-center text-sm text-gray-400 mt-2">
            {questions.length - Object.keys(answers).length} question(s) sans réponse
          </p>
        )}
      </div>
    </StudentLayout>
  );
}
