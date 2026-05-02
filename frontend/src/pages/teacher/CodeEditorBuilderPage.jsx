import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft, Upload } from 'lucide-react';
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

export default function CodeEditorBuilderPage() {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [title, setTitle]             = useState('');
  const [instructions, setInstructions] = useState('');
  const [language, setLanguage]       = useState('javascript');
  const [starterCode, setStarterCode] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [maxScore, setMaxScore]       = useState(20);
  const [deadline, setDeadline]       = useState('');
  const [initialized, setInitialized] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);

  const { data } = useQuery({
    queryKey: ['teacher-code-editor', resourceId],
    queryFn: () => api.get(`/teacher/resources/${resourceId}/code-editor`).then(r => r.data),
  });

  useEffect(() => {
    if (data?.exercise && !initialized) {
      const ex = data.exercise;
      setTitle(ex.title || '');
      setInstructions(ex.instructions || '');
      setLanguage(ex.content?.language || 'javascript');
      setStarterCode(ex.content?.starter_code || '');
      setExpectedOutput(ex.content?.expected_output || '');
      setMaxScore(ex.max_score || 20);
      setDeadline(ex.deadline ? new Date(ex.deadline).toISOString().slice(0, 16) : '');
      setInitialized(true);
    }
  }, [data, initialized]);

  const save = useMutation({
    mutationFn: () => api.post(`/teacher/resources/${resourceId}/code-editor`, {
      title, instructions, language, starter_code: starterCode,
      expected_output: expectedOutput || null, max_score: Number(maxScore), deadline: deadline || null,
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
      </div>
    </TeacherLayout>
  );
}
