import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, Code2, FileText, Heading, MessageSquare, Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import TeacherLayout from '../../components/layout/TeacherLayout';

const BLOCK_TYPES = [
  { type: 'heading', label: 'Titre', icon: Heading },
  { type: 'paragraph', label: 'Texte', icon: MessageSquare },
  { type: 'code', label: 'Code', icon: Code2 },
  { type: 'callout', label: 'Encadre', icon: BookOpen },
  { type: 'fill_blank', label: 'Texte a trous', icon: FileText },
];

const emptyPage = (title = 'Nouvelle page') => ({
  title,
  blocks: [
    { type: 'heading', text: title },
    { type: 'paragraph', text: '' },
  ],
});

const newBlock = (type) => {
  if (type === 'code') return { type, language: 'javascript', code: '' };
  if (type === 'callout') return { type, tone: 'info', text: '' };
  if (type === 'fill_blank') {
    return {
      type,
      prompt: '',
      text: 'Une variable se declare avec [[let]].',
      case_sensitive: false,
    };
  }
  return { type, text: '' };
};

export default function WebLessonBuilderPage() {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [pages, setPages] = useState([emptyPage()]);
  const [currentPage, setCurrentPage] = useState(0);
  const [publish, setPublish] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data } = useQuery({
    queryKey: ['teacher-web-lesson', resourceId],
    queryFn: () => api.get(`/teacher/resources/${resourceId}/web-lesson`).then(r => r.data),
  });

  useEffect(() => {
    if (initialized || !data) return;
    const storedPages = data.lesson?.content?.pages;
    setPages(storedPages?.length ? storedPages : [emptyPage(data.resource?.title || 'Nouvelle page')]);
    setPublish(Boolean(data.resource?.is_visible));
    setInitialized(true);
  }, [data, initialized]);

  const save = useMutation({
    mutationFn: () => api.post(`/teacher/resources/${resourceId}/web-lesson`, {
      content: { pages },
      is_visible: publish,
    }),
    onSuccess: () => {
      qc.invalidateQueries(['teacher-web-lesson', resourceId]);
      qc.invalidateQueries(['teacher-course']);
      toast.success('Lecon web sauvegardee');
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const page = pages[currentPage] || pages[0];

  const updatePage = (patch) => {
    setPages(items => items.map((item, index) => index === currentPage ? { ...item, ...patch } : item));
  };

  const updateBlock = (blockIndex, patch) => {
    updatePage({
      blocks: page.blocks.map((block, index) => index === blockIndex ? { ...block, ...patch } : block),
    });
  };

  const addPage = () => {
    setPages(items => {
      const next = [...items, emptyPage(`Page ${items.length + 1}`)];
      setCurrentPage(next.length - 1);
      return next;
    });
  };

  const removePage = (index) => {
    if (pages.length === 1) return;
    setPages(items => items.filter((_, itemIndex) => itemIndex !== index));
    setCurrentPage(current => Math.max(0, Math.min(current, pages.length - 2)));
  };

  const addBlock = (type) => {
    updatePage({ blocks: [...(page.blocks || []), newBlock(type)] });
  };

  const removeBlock = (index) => {
    updatePage({ blocks: page.blocks.filter((_, itemIndex) => itemIndex !== index) });
  };

  return (
    <TeacherLayout>
      <div className="mb-6">
        <button onClick={() => navigate(-1)}
          className="mb-3 flex items-center gap-1 text-sm text-indigo-600 hover:underline">
          <ArrowLeft size={14} /> Retour au cours
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Lecon web</h1>
            <p className="text-sm text-gray-500">Construisez un cours pagine avec texte, code, encadres et activites.</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={publish}
                onChange={e => setPublish(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Publier
            </label>
            <button onClick={() => save.mutate()} disabled={save.isPending}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
              <Save size={16} /> {save.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Pages</h2>
            <button onClick={addPage}
              className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50"
              title="Ajouter une page" aria-label="Ajouter une page">
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-2">
            {pages.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(index)}
                  className={`flex-1 rounded-lg px-3 py-2 text-left text-sm ${index === currentPage ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-indigo-50'}`}
                >
                  {index + 1}. {item.title || 'Sans titre'}
                </button>
                <button
                  type="button"
                  onClick={() => removePage(index)}
                  disabled={pages.length === 1}
                  className="rounded-lg p-2 text-gray-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                  title="Supprimer la page" aria-label="Supprimer la page"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <Link to={`/student/resources/${resourceId}/web-lesson`}
            className="mt-4 block rounded-lg border border-gray-200 px-3 py-2 text-center text-sm text-gray-600 hover:bg-gray-50">
            Previsualiser cote eleve
          </Link>
        </aside>

        <main className="rounded-xl bg-white p-5 shadow-sm">
          <label className="mb-2 block text-sm font-medium text-gray-700">Titre de la page</label>
          <input
            value={page.title}
            onChange={e => updatePage({ title: e.target.value })}
            className="mb-5 w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Titre de cette page"
          />

          <div className="space-y-4">
            {(page.blocks || []).map((block, index) => (
              <section key={index} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <select
                    value={block.type}
                    onChange={e => updateBlock(index, newBlock(e.target.value))}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {BLOCK_TYPES.map(item => <option key={item.type} value={item.type}>{item.label}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeBlock(index)}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                    title="Supprimer le bloc" aria-label="Supprimer le bloc"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {block.type === 'code' ? (
                  <div className="grid gap-3">
                    <input
                      value={block.language || ''}
                      onChange={e => updateBlock(index, { language: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Langage: javascript, html, css, php, sql..."
                    />
                    <textarea
                      value={block.code || ''}
                      onChange={e => updateBlock(index, { code: e.target.value })}
                      rows={9}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Collez ou ecrivez le code ici"
                    />
                  </div>
                ) : block.type === 'callout' ? (
                  <div className="grid gap-3">
                    <select
                      value={block.tone || 'info'}
                      onChange={e => updateBlock(index, { tone: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="info">Information</option>
                      <option value="success">A retenir</option>
                      <option value="warning">Attention</option>
                    </select>
                    <textarea
                      value={block.text || ''}
                      onChange={e => updateBlock(index, { text: e.target.value })}
                      rows={4}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Texte de l'encadre"
                    />
                  </div>
                ) : block.type === 'fill_blank' ? (
                  <div className="grid gap-3">
                    <input
                      value={block.prompt || ''}
                      onChange={e => updateBlock(index, { prompt: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Consigne courte, ex : Completez la phrase"
                    />
                    <textarea
                      value={block.text || ''}
                      onChange={e => updateBlock(index, { text: e.target.value })}
                      rows={5}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ecrivez le texte avec les reponses entre doubles crochets : [[let]], [[const]]..."
                    />
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={Boolean(block.case_sensitive)}
                        onChange={e => updateBlock(index, { case_sensitive: e.target.checked })}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Respecter la casse
                    </label>
                  </div>
                ) : (
                  <textarea
                    value={block.text || ''}
                    onChange={e => updateBlock(index, { text: e.target.value })}
                    rows={block.type === 'heading' ? 2 : 6}
                    className={`w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${block.type === 'heading' ? 'text-lg font-semibold' : 'text-sm'}`}
                    placeholder={block.type === 'heading' ? 'Titre de section' : 'Texte du cours'}
                  />
                )}
              </section>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {BLOCK_TYPES.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => addBlock(item.type)}
                  className="flex items-center gap-2 rounded-lg border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                >
                  <Icon size={15} /> {item.label}
                </button>
              );
            })}
          </div>
        </main>
      </div>
    </TeacherLayout>
  );
}
