import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Bold, Italic, Code, SquareCode,
  Heading2, List, Minus, ChevronLeft, ChevronRight,
  Eye, PenLine,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import TeacherLayout from '../../components/layout/TeacherLayout';
import MarkdownRenderer from '../../components/MarkdownRenderer';

function ToolBtn({ icon: Icon, label, title, onClick }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1.5 rounded text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition text-xs font-medium"
    >
      <Icon size={14} />
      {label && <span className="hidden sm:inline">{label}</span>}
    </button>
  );
}

/* Split markdown into pages on standalone --- lines */
function splitPages(md) {
  const parts = md.split(/\n---\n/).map(p => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [''];
}

export default function ExerciseEditorPage() {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const textareaRef = useRef(null);
  const [markdown, setMarkdown] = useState('');
  const [previewPage, setPreviewPage] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [mode, setMode] = useState('split'); // 'split' | 'edit' | 'preview'

  const { data } = useQuery({
    queryKey: ['teacher-exercise-edit', resourceId],
    queryFn: () => api.get(`/teacher/resources/${resourceId}/file_exercise`).then(r => r.data),
  });

  useEffect(() => {
    if (data?.exercise && !initialized) {
      setMarkdown(data.exercise.instructions || '');
      setInitialized(true);
    }
  }, [data, initialized]);

  const save = useMutation({
    mutationFn: () =>
      api.put(`/teacher/resources/${resourceId}/file_exercise`, { instructions: markdown }),
    onSuccess: () => toast.success('Énoncé enregistré'),
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const pages = splitPages(markdown);
  const pageIndex = Math.min(previewPage, pages.length - 1);

  /* Insert text at textarea cursor */
  const insert = useCallback((before, after = '', placeholder = '') => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = markdown.substring(start, end) || placeholder;
    const next = markdown.substring(0, start) + before + selected + after + markdown.substring(end);
    setMarkdown(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  }, [markdown]);

  /* Ctrl+S to save */
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      save.mutate();
    }
  };

  const exercise = data?.exercise;

  const showEditor  = mode === 'split' || mode === 'edit';
  const showPreview = mode === 'split' || mode === 'preview';

  return (
    <TeacherLayout>
      <div className="-m-8 flex flex-col bg-white" style={{ minHeight: 'calc(100vh - 56px)' }}>

        {/* ── Top bar ─────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 transition shrink-0"
            >
              <ArrowLeft size={15} /> Retour
            </button>
            <span className="text-gray-200 shrink-0">|</span>
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 text-sm truncate">
                Énoncé — {exercise?.title || '…'}
              </p>
              <p className="text-xs text-gray-400">
                {pages.length} page{pages.length > 1 ? 's' : ''} ·{' '}
                utilisez <kbd className="bg-gray-100 border border-gray-200 rounded px-1 text-[10px] font-mono">---</kbd> seul sur une ligne pour créer une nouvelle page
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View mode toggle */}
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden text-xs">
              {[
                { id: 'edit',    Icon: PenLine, label: 'Éditer' },
                { id: 'split',   Icon: null,    label: '⬛⬛' },
                { id: 'preview', Icon: Eye,     label: 'Aperçu' },
              ].map(({ id, Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setMode(id)}
                  className={`px-3 py-1.5 transition flex items-center gap-1 ${
                    mode === id ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {Icon ? <Icon size={12} /> : null}
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition disabled:opacity-60"
            >
              <Save size={13} />
              {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>

        {/* ── Toolbar ─────────────────────────────────── */}
        {showEditor && (
          <div className="flex items-center gap-0.5 px-4 py-1.5 border-b bg-gray-50 shrink-0 flex-wrap">
            <ToolBtn icon={Bold}       title="Gras (**texte**)"             onClick={() => insert('**', '**', 'texte')} />
            <ToolBtn icon={Italic}     title="Italique (*texte*)"           onClick={() => insert('*', '*', 'texte')} />
            <ToolBtn icon={Code}       title="Code inline"                  onClick={() => insert('`', '`', 'code')} />
            <ToolBtn icon={SquareCode} title="Bloc de code"                 onClick={() => insert('```python\n', '\n```', 'votre code ici')} />
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <ToolBtn icon={Heading2}   title="Titre de section (## Titre)"  onClick={() => insert('\n## ', '', 'Titre')} />
            <ToolBtn icon={List}       title="Liste à puces"                onClick={() => insert('\n- ', '', 'élément')} />
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <button
              type="button"
              title="Insérer un séparateur de page (---)"
              onClick={() => insert('\n\n---\n\n', '', '')}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold text-indigo-600 hover:bg-indigo-50 border border-dashed border-indigo-300 transition"
            >
              <Minus size={12} /> Nouvelle page
            </button>
            <span className="ml-auto text-xs text-gray-300 font-mono hidden md:block pr-2">
              Ctrl+S pour sauvegarder
            </span>
          </div>
        )}

        {/* ── Split pane ───────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Editor panel */}
          {showEditor && (
            <div className={`flex flex-col ${showPreview ? 'w-1/2' : 'w-full'} border-r`}>
              <div className="px-4 py-1.5 text-[11px] text-gray-400 bg-gray-50 border-b font-mono shrink-0 flex items-center gap-2">
                <PenLine size={11} /> Markdown
              </div>
              <textarea
                ref={textareaRef}
                value={markdown}
                onChange={e => { setMarkdown(e.target.value); setPreviewPage(0); }}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                className="flex-1 p-6 font-mono text-sm text-gray-800 resize-none focus:outline-none leading-relaxed bg-white"
                placeholder={`# Titre de l'exercice\n\nÉcrivez l'énoncé ici...\n\nVous pouvez utiliser du **Markdown** :\n\n\`\`\`python\ndef ma_fonction():\n    return "Hello World"\n\`\`\`\n\n> Conseil : utilisez des blocs de code avec le langage pour la coloration syntaxique.\n\n---\n\n# Page 2\n\nSuite de l'énoncé sur une nouvelle page...`}
              />
            </div>
          )}

          {/* Preview panel */}
          {showPreview && (
            <div className={`flex flex-col ${showEditor ? 'w-1/2' : 'w-full'} bg-gray-50`}>
              {/* Page navigation */}
              <div className="flex items-center justify-between px-4 py-2 border-b bg-white shrink-0">
                <div className="flex items-center gap-2">
                  <Eye size={12} className="text-gray-400" />
                  <span className="text-[11px] text-gray-500 font-medium font-mono">
                    Aperçu · Page {pageIndex + 1} / {pages.length}
                  </span>
                </div>
                {pages.length > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewPage(p => Math.max(0, p - 1))}
                      disabled={pageIndex === 0}
                      className="p-1 rounded text-gray-400 hover:text-gray-700 disabled:opacity-25 hover:bg-gray-100 transition"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    {pages.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPreviewPage(i)}
                        className={`w-6 h-6 rounded text-xs font-medium transition ${
                          i === pageIndex
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setPreviewPage(p => Math.min(pages.length - 1, p + 1))}
                      disabled={pageIndex === pages.length - 1}
                      className="p-1 rounded text-gray-400 hover:text-gray-700 disabled:opacity-25 hover:bg-gray-100 transition"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                )}
              </div>

              {/* Rendered markdown */}
              <div className="flex-1 overflow-auto p-8">
                {pages[pageIndex]?.trim() ? (
                  <div className="bg-white rounded-xl shadow-sm p-8 min-h-full">
                    <MarkdownRenderer content={pages[pageIndex]} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-300 text-sm italic">
                    Commencez à écrire pour voir l'aperçu…
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </TeacherLayout>
  );
}
