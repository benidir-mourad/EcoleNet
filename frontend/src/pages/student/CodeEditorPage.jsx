import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Send, Download, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import StudentLayout from '../../components/layout/StudentLayout';

export default function CodeEditorPage() {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['student-code-editor', resourceId],
    queryFn: () => api.get(`/student/resources/${resourceId}/code-editor`).then(r => r.data),
  });

  useEffect(() => {
    if (data?.exercise && !initialized) {
      const starter = data.exercise.content?.starter_code || '';
      setCode(starter);
      setInitialized(true);
    }
  }, [data, initialized]);

  const submit = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append('content', code);
      return api.post(`/student/resources/${resourceId}/submit`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => { setSubmitted(true); toast.success('Code remis avec succès !'); },
    onError: () => toast.error('Erreur lors de la remise'),
  });

  const exercise = data?.exercise;
  const language = exercise?.content?.language || 'text';
  const expectedOutput = exercise?.content?.expected_output;
  const templateFileName = exercise?.template_file_name;
  const templateFilePath = exercise?.template_file_path;
  const templateUrl = templateFilePath
    ? `${import.meta.env.VITE_API_URL?.replace('/api', '')}/storage/${templateFilePath}`
    : null;

  const LANG_COLORS = {
    javascript: 'bg-yellow-100 text-yellow-800',
    html: 'bg-orange-100 text-orange-800',
    css: 'bg-blue-100 text-blue-800',
    php: 'bg-purple-100 text-purple-800',
    sql: 'bg-cyan-100 text-cyan-800',
    python: 'bg-green-100 text-green-800',
    text: 'bg-gray-100 text-gray-600',
  };

  return (
    <StudentLayout>
      <div className="mb-6">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-emerald-600 hover:underline">
          <ArrowLeft size={14} /> Retour au cours
        </button>
        <div className="flex items-center gap-3 mt-3">
          <h1 className="text-2xl font-bold text-gray-800">{exercise?.title || 'Éditeur de code'}</h1>
          {language !== 'text' && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${LANG_COLORS[language] || LANG_COLORS.text}`}>
              {language.toUpperCase()}
            </span>
          )}
        </div>
        {exercise?.instructions && (
          <p className="text-gray-500 text-sm mt-1 whitespace-pre-wrap">{exercise.instructions}</p>
        )}
      </div>

      {isLoading && <div className="text-center text-gray-400 py-12">Chargement…</div>}

      {exercise && (
        <div className="grid gap-4">
          {/* Template download */}
          {templateFileName && (
            <div className="bg-indigo-50 rounded-xl p-4 flex items-center justify-between border border-indigo-200">
              <div>
                <p className="text-sm font-medium text-indigo-800">Fichier modèle disponible</p>
                <p className="text-xs text-indigo-600 mt-0.5">{templateFileName}</p>
              </div>
              <a href={templateUrl} download
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition">
                <Download size={14} /> Télécharger
              </a>
            </div>
          )}

          {/* Code editor */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">Votre code</h2>
              {submitted && (
                <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                  <CheckCircle size={15} /> Remis
                </div>
              )}
            </div>
            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              readOnly={submitted}
              rows={18}
              spellCheck={false}
              className={`w-full border rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y ${
                submitted ? 'bg-gray-50 text-gray-600' : ''
              }`}
              placeholder={`Écrivez votre code ${language !== 'text' ? language.toUpperCase() : ''} ici…`}
            />
          </div>

          {/* Expected output */}
          {expectedOutput && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Résultat attendu (référence) :</p>
              <pre className="font-mono text-xs text-gray-600 whitespace-pre-wrap">{expectedOutput}</pre>
            </div>
          )}

          {!submitted ? (
            <button
              onClick={() => submit.mutate()}
              disabled={!code.trim() || submit.isPending}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
              <Send size={16} />
              {submit.isPending ? 'Remise en cours…' : 'Remettre mon code'}
            </button>
          ) : (
            <div className="bg-green-50 rounded-xl p-5 border border-green-200 text-center">
              <CheckCircle size={24} className="text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-green-800">Code remis avec succès !</p>
              <p className="text-sm text-green-600 mt-1">Votre enseignant pourra consulter et noter votre travail.</p>
            </div>
          )}
        </div>
      )}
    </StudentLayout>
  );
}
