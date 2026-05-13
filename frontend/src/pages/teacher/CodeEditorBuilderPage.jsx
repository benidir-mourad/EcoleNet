import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft, Upload, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import TeacherLayout from '../../components/layout/TeacherLayout';

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'html',       label: 'HTML' },
  { value: 'css',        label: 'CSS' },
  { value: 'php',        label: 'PHP' },
  { value: 'sql',        label: 'SQL' },
  { value: 'python',     label: 'Python' },
  { value: 'text',       label: 'Texte libre' },
];

const TEST_FIELD_CONFIG = {
  contains: {
    value: 'Texte attendu',
    valuePlaceholder: 'Ex : return total',
  },
  not_contains: {
    value: 'Texte interdit',
    valuePlaceholder: 'Ex : alert(',
  },
  regex: {
    value: 'Expression régulière',
    valuePlaceholder: 'Ex : (for|while|reduce)',
  },
  html_tag: {
    value: 'Balise HTML',
    valuePlaceholder: 'Ex : article',
  },
  html_attribute: {
    value: 'Balise HTML',
    valuePlaceholder: 'Ex : img',
    property: 'Attribut attendu',
    propertyPlaceholder: 'Ex : alt',
  },
  css_selector: {
    value: 'Sélecteur CSS',
    valuePlaceholder: 'Ex : .card',
  },
  css_property: {
    value: 'Sélecteur CSS',
    valuePlaceholder: 'Ex : .card',
    property: 'Propriété CSS',
    propertyPlaceholder: 'Ex : display',
    expected: 'Valeur attendue',
    expectedPlaceholder: 'Ex : flex',
  },
  js_function: {
    value: 'Nom de fonction',
    valuePlaceholder: 'Ex : totalNotes',
  },
  sql_clause: {
    value: 'Clause SQL',
    valuePlaceholder: 'Ex : SELECT, WHERE, GROUP BY',
  },
  sql_table: {
    value: 'Table SQL',
    valuePlaceholder: 'Ex : students',
  },
  sql_column: {
    value: 'Colonne SQL',
    valuePlaceholder: 'Ex : email',
  },
  sql_where_condition: {
    value: 'Colonne',
    valuePlaceholder: 'Ex : is_active',
    property: 'Opérateur',
    propertyPlaceholder: 'Ex : =, >, LIKE',
    expected: 'Valeur attendue',
    expectedPlaceholder: 'Ex : 1',
  },
  sql_order_by: {
    value: 'Colonne de tri',
    valuePlaceholder: 'Ex : name',
    expected: 'Sens du tri',
    expectedPlaceholder: 'ASC ou DESC',
  },
  sql_join: {
    value: 'Table jointe',
    valuePlaceholder: 'Ex : enrollments',
    expected: 'Condition ON attendue',
    expectedPlaceholder: 'Ex : students.id = enrollments.student_id',
  },
};

const getTestFieldConfig = (type) => TEST_FIELD_CONFIG[type] || TEST_FIELD_CONFIG.contains;

export default function CodeEditorBuilderPage() {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [title, setTitle]             = useState('');
  const [instructions, setInstructions] = useState('');
  const [language, setLanguage]       = useState('javascript');
  const [starterCode, setStarterCode] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [autoCorrect, setAutoCorrect] = useState(false);
  const [tests, setTests] = useState([]);
  const [maxScore, setMaxScore]       = useState(20);
  const [deadline, setDeadline]       = useState('');
  const [initialized, setInitialized] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);

  const { data } = useQuery({
    queryKey: ['teacher-code-editor', resourceId],
    queryFn: () => api.get(`/teacher/resources/${resourceId}/code-editor`).then(r => r.data),
  });

  const { data: presetsData } = useQuery({
    queryKey: ['teacher-code-editor-presets'],
    queryFn: () => api.get('/teacher/code-editor-presets').then(r => r.data),
  });

  useEffect(() => {
    if (data?.exercise && !initialized) {
      const ex = data.exercise;
      setTitle(ex.title || '');
      setInstructions(ex.instructions || '');
      setLanguage(ex.content?.language || 'javascript');
      setStarterCode(ex.content?.starter_code || '');
      setExpectedOutput(ex.content?.expected_output || '');
      setAutoCorrect(Boolean(ex.auto_correct));
      setTests(ex.content?.tests || []);
      setMaxScore(ex.max_score || 20);
      setDeadline(ex.deadline ? new Date(ex.deadline).toISOString().slice(0, 16) : '');
      setInitialized(true);
    }
  }, [data, initialized]);

  const save = useMutation({
    mutationFn: () => api.post(`/teacher/resources/${resourceId}/code-editor`, {
      title, instructions, language, starter_code: starterCode,
      expected_output: expectedOutput || null,
      auto_correct: autoCorrect,
      tests: tests.filter(test => test.label?.trim()),
      max_score: Number(maxScore),
      deadline: deadline || null,
    }),
    onSuccess: () => { qc.invalidateQueries(['teacher-code-editor', resourceId]); toast.success('Exercice sauvegardé'); },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const handleTemplateUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingTemplate(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/teacher/resources/${resourceId}/template`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      qc.invalidateQueries(['teacher-code-editor', resourceId]);
      toast.success(`Template "${file.name}" uploadé`);
    } catch {
      toast.error("Erreur lors de l'upload du template");
    } finally {
      setUploadingTemplate(false);
      e.target.value = '';
    }
  };

  const exercise = data?.exercise;
  const presets = presetsData?.presets || [];

  const applyPreset = (preset) => {
    setTitle(preset.title || '');
    setInstructions(preset.instructions || '');
    setLanguage(preset.language || 'javascript');
    setStarterCode(preset.starter_code || '');
    setExpectedOutput(preset.expected_output || '');
    setTests(preset.tests || []);
    setAutoCorrect((preset.tests || []).length > 0);
    setMaxScore((preset.tests || []).reduce((total, test) => total + Number(test.points || 1), 0) || 20);
    toast.success('Modele applique');
  };

  const addTest = () => setTests(items => [...items, {
    label: '',
    type: 'contains',
    value: '',
    points: 1,
    failure_feedback: '',
  }]);
  const updateTest = (index, patch) => setTests(items => items.map((item, i) => i === index ? { ...item, ...patch } : item));
  const removeTest = (index) => setTests(items => items.filter((_, i) => i !== index));

  return (
    <TeacherLayout>
      <div className="mb-6">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-indigo-600 hover:underline mb-3">
          <ArrowLeft size={14} /> Retour au cours
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Éditeur de code</h1>
          <button onClick={() => save.mutate()} disabled={!title.trim() || save.isPending}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60">
            <Save size={16} /> {save.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {presets.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} className="text-indigo-500" />
              <h2 className="font-semibold text-gray-800">Modeles rapides</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {presets.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="text-left rounded-xl border border-gray-200 p-4 hover:border-indigo-300 hover:bg-indigo-50 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-800">{preset.title}</p>
                      <p className="mt-1 text-sm text-gray-500">{preset.summary}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium uppercase text-gray-600">
                      {preset.language}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Config */}
        <div className="bg-white rounded-xl shadow-sm p-5 grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Titre</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ex : Exercice JS — boucles" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Langage</label>
              <select value={language} onChange={e => setLanguage(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Consignes / Énoncé</label>
            <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={4}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Expliquez ce que les élèves doivent faire…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Note max</label>
              <input type="number" min={1} max={100} value={maxScore} onChange={e => setMaxScore(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Date limite (optionnel)</label>
              <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </div>

        {/* Starter code */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Code de départ (optionnel)</h2>
          <p className="text-sm text-gray-500 mb-3">Ce code sera pré-rempli dans l'éditeur de l'élève. Idéal pour des fichiers .js avec des <code className="bg-gray-100 px-1 rounded">// TODO</code>.</p>
          <textarea
            value={starterCode}
            onChange={e => setStarterCode(e.target.value)}
            rows={10}
            className="w-full border rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={language === 'javascript'
              ? "// Complétez les fonctions suivantes\n\nfunction addition(a, b) {\n  // TODO: retourner la somme de a et b\n}\n\nfunction estPair(n) {\n  // TODO: retourner true si n est pair\n}"
              : language === 'sql'
              ? "-- Complétez les requêtes suivantes\n\n-- 1. Sélectionner tous les utilisateurs\nSELECT ___\n\n-- 2. Insérer un utilisateur\nINSERT INTO ___"
              : `// Code de départ pour ${language}`}
          />
        </div>

        {/* Template file upload */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-1">Fichier modèle à télécharger (optionnel)</h2>
          <p className="text-sm text-gray-500 mb-4">
            Les élèves pourront télécharger ce fichier, le compléter, et le resoumettre.
            Utile pour les fichiers .js, .html, .php avec des TODO.
          </p>
          {exercise?.template_file_name && (
            <div className="bg-green-50 rounded-xl p-3 mb-3 flex items-center gap-2">
              <span className="text-sm text-green-700 font-medium">📎 {exercise.template_file_name}</span>
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-indigo-400 hover:bg-indigo-50 transition">
            <Upload size={18} className="text-gray-400" />
            <span className="text-sm text-gray-500">
              {uploadingTemplate ? 'Upload en cours…' : 'Choisir un fichier modèle (.js, .html, .php, .css…)'}
            </span>
            <input type="file" className="hidden" onChange={handleTemplateUpload} disabled={uploadingTemplate} />
          </label>
        </div>

        {/* Expected output */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-1">Résultat attendu (optionnel)</h2>
          <p className="text-sm text-gray-500 mb-3">Affiché à l'élève comme référence. Non utilisé pour la correction automatique.</p>
          <textarea value={expectedOutput} onChange={e => setExpectedOutput(e.target.value)} rows={4}
            className="w-full border rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Ex : [1, 2, 3, 4, 5]&#10;true&#10;false" />
        </div>

        {/* Auto correction */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="font-semibold text-gray-800">Auto-correction</h2>
              <p className="text-sm text-gray-500 mt-1">
                Ajoutez des règles simples pour HTML, CSS et JavaScript. Le code n'est pas exécuté côté serveur.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={autoCorrect}
                onChange={e => setAutoCorrect(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Activer
            </label>
          </div>

          <div className="space-y-3">
            {tests.map((test, index) => {
              const fieldConfig = getTestFieldConfig(test.type || 'contains');

              return (
              <div key={index} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_180px_120px_auto]">
                  <input
                    value={test.label || ''}
                    onChange={e => updateTest(index, { label: e.target.value })}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nom du test"
                  />
                  <select
                    value={test.type || 'contains'}
                    onChange={e => updateTest(index, { type: e.target.value, property: '', expected: '' })}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="contains">Contient</option>
                    <option value="not_contains">Ne contient pas</option>
                    <option value="regex">Regex</option>
                    <option value="html_tag">Balise HTML</option>
                    <option value="html_attribute">Attribut HTML</option>
                    <option value="css_selector">Sélecteur CSS</option>
                    <option value="css_property">Propriété CSS</option>
                    <option value="js_function">Fonction JS</option>
                    <option value="sql_clause">Clause SQL</option>
                    <option value="sql_table">Table SQL</option>
                    <option value="sql_column">Colonne SQL</option>
                    <option value="sql_where_condition">Condition WHERE SQL</option>
                    <option value="sql_order_by">Tri ORDER BY SQL</option>
                    <option value="sql_join">Jointure SQL</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={test.points || 1}
                    onChange={e => updateTest(index, { points: Number(e.target.value) })}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Points"
                  />
                  <button
                    type="button"
                    onClick={() => removeTest(index)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Retirer
                  </button>
                </div>

                <div className="mt-3 grid gap-3 text-xs font-medium text-gray-600 lg:grid-cols-3">
                  <span>{fieldConfig.value}</span>
                  {fieldConfig.property ? <span>{fieldConfig.property}</span> : <span className="hidden lg:block" />}
                  {fieldConfig.expected ? <span>{fieldConfig.expected}</span> : <span className="hidden lg:block" />}
                </div>
                <div className="grid gap-3 mt-3 lg:grid-cols-3">
                  <input
                    value={test.value || ''}
                    onChange={e => updateTest(index, { value: e.target.value })}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={fieldConfig.valuePlaceholder}
                  />
                  <input
                    value={test.property || ''}
                    onChange={e => updateTest(index, { property: e.target.value })}
                    className={`${fieldConfig.property ? '' : 'hidden'} rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    placeholder={fieldConfig.propertyPlaceholder || ''}
                  />
                  <input
                    value={test.expected || ''}
                    onChange={e => updateTest(index, { expected: e.target.value })}
                    className={`${fieldConfig.expected ? '' : 'hidden'} rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    placeholder={fieldConfig.expectedPlaceholder || ''}
                  />
                </div>

                <input
                  value={test.failure_feedback || ''}
                  onChange={e => updateTest(index, { failure_feedback: e.target.value })}
                  className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Feedback si le test échoue"
                />
              </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addTest}
            className="mt-4 rounded-lg border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
          >
            Ajouter un test
          </button>
        </div>
      </div>
    </TeacherLayout>
  );
}
