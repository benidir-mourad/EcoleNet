import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft, Eye, EyeOff, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import TeacherLayout from '../../components/layout/TeacherLayout';

/* Parse [[answer]] → parts array for preview */
function parseParts(template) {
  const parts = [];
  const regex = /\[\[(.*?)\]\]/g;
  let last = 0, m;
  while ((m = regex.exec(template)) !== null) {
    if (m.index > last) parts.push({ type: 'text', value: template.slice(last, m.index) });
    parts.push({ type: 'blank', answer: m[1], index: parts.filter(p => p.type === 'blank').length });
    last = regex.lastIndex;
  }
  if (last < template.length) parts.push({ type: 'text', value: template.slice(last) });
  return parts;
}

export default function FillBlanksBuilderPage() {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const textareaRef = useRef();

  const [title, setTitle]             = useState('');
  const [instructions, setInstructions] = useState('');
  const [template, setTemplate]       = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data } = useQuery({
    queryKey: ['teacher-fill-blanks', resourceId],
    queryFn: () => api.get(`/teacher/resources/${resourceId}/fill-blanks`).then(r => r.data),
  });

  useEffect(() => {
    if (data?.exercise && !initialized) {
      setTitle(data.exercise.title || '');
      setInstructions(data.exercise.instructions || '');
      setTemplate(data.exercise.content?.template || '');
      setCaseSensitive(data.exercise.content?.case_sensitive || false);
      setInitialized(true);
    }
  }, [data, initialized]);

  const save = useMutation({
    mutationFn: () => api.post(`/teacher/resources/${resourceId}/fill-blanks`, {
      title, instructions, template, case_sensitive: caseSensitive,
    }),
    onSuccess: () => { qc.invalidateQueries(['teacher-fill-blanks', resourceId]); toast.success('Exercice sauvegardé'); },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const insertBlank = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const sel   = template.slice(start, end).trim() || 'réponse';
    const newTemplate = template.slice(0, start) + `[[${sel}]]` + template.slice(end);
    setTemplate(newTemplate);
    setTimeout(() => { el.focus(); el.setSelectionRange(start + sel.length + 4, start + sel.length + 4); }, 0);
  };

  const parts   = parseParts(template);
  const nbBlanks = parts.filter(p => p.type === 'blank').length;

  return (
    <TeacherLayout>
      <div className="mb-6">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-indigo-600 hover:underline mb-3">
          <ArrowLeft size={14} /> Retour au cours
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Texte à trous</h1>
            <p className="text-sm text-gray-500 mt-1">
              Utilisez <code className="bg-gray-100 px-1 rounded">[[réponse]]</code> pour marquer un trou.
              {nbBlanks > 0 && <span className="text-indigo-600 font-medium ml-2">{nbBlanks} trou{nbBlanks > 1 ? 's' : ''} détecté{nbBlanks > 1 ? 's' : ''}</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowPreview(p => !p)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
              {showPreview ? 'Éditer' : 'Aperçu élève'}
            </button>
            <button onClick={() => save.mutate()} disabled={!title.trim() || !template.trim() || save.isPending}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60">
              <Save size={16} /> {save.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {/* Title + instructions */}
        <div className="bg-white rounded-xl shadow-sm p-5 grid gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Titre de l'exercice</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex : Complétez la requête SQL" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Consignes (optionnel)</label>
            <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={2}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="Expliquez ce que les élèves doivent faire…" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="cs" checked={caseSensitive} onChange={e => setCaseSensitive(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded" />
            <label htmlFor="cs" className="text-sm text-gray-700">Sensible à la casse (distinguer majuscules/minuscules)</label>
          </div>
        </div>

        {/* Template editor OR preview */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          {showPreview ? (
            <div>
              <h2 className="font-semibold text-gray-800 mb-4">Aperçu — vue élève</h2>
              {parts.length === 0 ? (
                <p className="text-gray-400 italic text-sm">Écrivez le texte du côté édition pour voir l'aperçu.</p>
              ) : (
                <div className="font-mono text-sm bg-gray-50 rounded-xl p-5 leading-9 border">
                  {parts.map((p, i) =>
                    p.type === 'text'
                      ? <span key={i} className="whitespace-pre-wrap">{p.value}</span>
                      : <span key={i} className="inline-block mx-1">
                          <input
                            className="border-2 border-indigo-300 rounded-lg px-2 py-0.5 w-28 text-center bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            placeholder={`Trou ${p.index + 1}`}
                            readOnly
                          />
                        </span>
                  )}
                </div>
              )}
              {nbBlanks > 0 && (
                <div className="mt-4 bg-amber-50 rounded-xl p-4">
                  <p className="text-sm font-medium text-amber-800 mb-2">Réponses correctes :</p>
                  <div className="flex flex-wrap gap-2">
                    {parts.filter(p => p.type === 'blank').map((p, i) => (
                      <span key={i} className="bg-white border border-amber-200 px-3 py-1 rounded-lg text-sm font-mono">
                        Trou {i + 1} : <strong>{p.answer}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-800">Texte de l'exercice</h2>
                <button onClick={insertBlank}
                  className="flex items-center gap-1.5 text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition">
                  <Plus size={14} /> Insérer un trou
                </button>
              </div>
              <textarea
                ref={textareaRef}
                value={template}
                onChange={e => setTemplate(e.target.value)}
                rows={12}
                className="w-full border rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={"Exemple :\nSELECT [[*]] FROM [[users]] WHERE id = [[1]];\n\nOu pour du HTML :\n<[[div]] class=\"[[container]]\">\n  <h1>[[Titre]]</h1>\n</[[div]]>"}
              />
              <p className="text-xs text-gray-400 mt-2">
                Sélectionnez un mot puis cliquez «&nbsp;Insérer un trou&nbsp;» pour le transformer en trou, ou tapez directement <code>[[réponse]]</code>.
              </p>
            </div>
          )}
        </div>
      </div>
    </TeacherLayout>
  );
}
