import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Eye, ArrowLeft, EyeOff, AlertCircle,
  FileText, Video, Link as LinkIcon, CheckSquare, GripVertical,
  Upload, BookMarked, ChevronDown, ChevronUp,
  Monitor, RefreshCw, ClipboardList, Award, CheckCircle, BookOpen, Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ResourceViewer from '../../components/ResourceViewer';

/* ─── Shared constants (mirrors CoursePage student view) ────────────────── */

const TYPE_LABELS = {
  competences:         'Compétences',
  presentation:        'Présentation',
  syllabus:            'Syllabus',
  exercise:            'Exercice',
  exercise_solution:   "Solution d'exercice",
  revision:            'Révision',
  revision_solution:   'Solution de révision',
  evaluation:          'Évaluation',
  evaluation_solution: "Correction d'évaluation",
};

const TYPE_ICON_MAP = {
  competences: BookMarked, presentation: Monitor, syllabus: BookOpen, exercise: Pencil,
  exercise_solution: CheckCircle, revision: RefreshCw, revision_solution: CheckCircle,
  evaluation: ClipboardList, evaluation_solution: Award,
};

const TYPE_STYLE = {
  competences:         { bg: 'bg-indigo-50',  text: 'text-indigo-600' },
  presentation:        { bg: 'bg-blue-50',    text: 'text-blue-600'   },
  syllabus:            { bg: 'bg-purple-50',  text: 'text-purple-600' },
  exercise:            { bg: 'bg-amber-50',   text: 'text-amber-600'  },
  exercise_solution:   { bg: 'bg-green-50',   text: 'text-green-600'  },
  revision:            { bg: 'bg-cyan-50',    text: 'text-cyan-600'   },
  revision_solution:   { bg: 'bg-teal-50',    text: 'text-teal-600'   },
  evaluation:          { bg: 'bg-red-50',     text: 'text-red-600'    },
  evaluation_solution: { bg: 'bg-rose-50',    text: 'text-rose-600'   },
};

const FILE_ICONS = {
  pdf: FileText, pptx: FileText, docx: FileText, xlsx: FileText, image: FileText,
  video_upload: Video, video_youtube: Video, link: LinkIcon,
  qcm: CheckSquare, drag_drop: GripVertical, file_upload: Upload,
  fill_blanks: FileText, ordering: CheckSquare, code_editor: Monitor, truth_table: CheckCircle,
  web_lesson: BookOpen, html_embed: Monitor, html_interactive: Monitor,
};

const VIEWABLE = ['pdf', 'image', 'video_upload', 'video_youtube', 'link', 'pptx', 'docx', 'xlsx', 'html_embed', 'html_interactive'];

function notAvailable() {
  toast('Mode aperçu — les exercices interactifs ne peuvent pas être effectués ici.', { icon: '👁️' });
}

/* ─── ResourceRow (student style, preview-aware) ────────────────────────── */

function ResourceRow({ resource, onView }) {
  const style    = TYPE_STYLE[resource.type] || { bg: 'bg-gray-50', text: 'text-gray-600' };
  const TypeIcon = TYPE_ICON_MAP[resource.type] || FileText;
  const FileIcon = FILE_ICONS[resource.file_type] || FileText;
  const isEmpty  = !resource.file_path && !resource.external_url;
  const canView  = !isEmpty && VIEWABLE.includes(resource.file_type);

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${style.bg}`}>
        {resource.file_type
          ? <FileIcon size={18} className={style.text} />
          : <TypeIcon size={18} className={style.text} />
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 truncate text-sm">{resource.title}</p>
        <p className="text-xs text-gray-400">{TYPE_LABELS[resource.type]}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {canView && (
          <button onClick={() => onView(resource)}
            className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-700">
            <Eye size={13} /> Voir
          </button>
        )}
        {resource.file_type === 'qcm' && (
          <button onClick={notAvailable}
            className="flex items-center gap-1.5 bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-amber-600">
            <CheckSquare size={13} /> QCM
          </button>
        )}
        {resource.file_type === 'drag_drop' && (
          <button onClick={notAvailable}
            className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-purple-700">
            <GripVertical size={13} /> Exercice
          </button>
        )}
        {resource.file_type === 'file_upload' && (
          <button onClick={notAvailable}
            className="flex items-center gap-1.5 bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-amber-700">
            <Upload size={13} /> Remettre
          </button>
        )}
        {resource.file_type === 'fill_blanks' && (
          <button onClick={notAvailable}
            className="flex items-center gap-1.5 bg-sky-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-sky-700">
            <FileText size={13} /> Exercice
          </button>
        )}
        {resource.file_type === 'ordering' && (
          <button onClick={notAvailable}
            className="flex items-center gap-1.5 bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-orange-600">
            <CheckSquare size={13} /> Ordonner
          </button>
        )}
        {resource.file_type === 'code_editor' && (
          <button onClick={notAvailable}
            className="flex items-center gap-1.5 bg-violet-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-violet-700">
            <Monitor size={13} /> Coder
          </button>
        )}
        {resource.file_type === 'truth_table' && (
          <button onClick={notAvailable}
            className="flex items-center gap-1.5 bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-teal-700">
            <CheckCircle size={13} /> Table
          </button>
        )}
        {resource.file_type === 'web_lesson' && (
          <button onClick={notAvailable}
            className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-700">
            <BookOpen size={13} /> Lire
          </button>
        )}
        {isEmpty && <span className="text-xs text-gray-300 italic">Non disponible</span>}
      </div>
    </div>
  );
}

/* ─── TypeSection ────────────────────────────────────────────────────────── */

function TypeSection({ type, resources, onView }) {
  const [open, setOpen] = useState(true);
  const style = TYPE_STYLE[type] || { bg: 'bg-gray-50', text: 'text-gray-600' };
  const Icon  = TYPE_ICON_MAP[type] || FileText;

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${style.bg}`}>
            <Icon size={12} className={style.text} />
          </div>
          <span className="text-sm font-medium text-gray-700">{TYPE_LABELS[type]}</span>
          <span className="text-xs text-gray-400">({resources.length})</span>
        </div>
        <span className="text-gray-400">{open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</span>
      </div>
      {open && (
        <div className="p-3 space-y-2">
          {resources.map(r => <ResourceRow key={r.id} resource={r} onView={onView} />)}
        </div>
      )}
    </div>
  );
}

/* ─── ChapterCard ────────────────────────────────────────────────────────── */

function ChapterCard({ chapter, onView }) {
  const [open, setOpen] = useState(true);

  const byType = Object.keys(TYPE_LABELS)
    .map(type => ({ type, resources: (chapter.resources || []).filter(r => r.type === type) }))
    .filter(({ resources }) => resources.length > 0);

  const totalResources = chapter.resources?.length || 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
            <BookMarked size={16} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">{chapter.title}</h3>
            {totalResources > 0 && (
              <p className="text-xs text-gray-400">{totalResources} ressource{totalResources > 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
        <span className="text-gray-400">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </div>

      {open && (
        <div className="p-5">
          {byType.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-4">Aucune ressource visible dans ce chapitre.</p>
          ) : (
            <div className="grid gap-3">
              {byType.map(({ type, resources }) => (
                <TypeSection key={type} type={type} resources={resources} onView={onView} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── CoursePreviewPage ──────────────────────────────────────────────────── */

export default function CoursePreviewPage() {
  const { courseId } = useParams();
  const [viewingResource, setViewingResource] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-course', courseId],
    queryFn: () => api.get(`/teacher/courses/${courseId}`).then(r => r.data),
  });

  const course = data?.course;

  // Only visible resources — what the student actually sees
  const chapters = (course?.chapters || []).map(ch => ({
    ...ch,
    resources: (ch.resources || []).filter(r => r.is_visible),
  }));

  const totalHidden = (course?.chapters || []).reduce(
    (sum, ch) => sum + (ch.resources || []).filter(r => !r.is_visible).length,
    0
  );

  const hasVisibleContent = chapters.some(ch => ch.resources.length > 0);
  const hasRootResources  = (course?.root_resources || []).length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Preview banner ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-amber-400 shadow-md">
        <div className="flex items-center justify-between px-6 py-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Eye size={18} className="text-amber-900" />
            <span className="font-bold text-amber-900">Mode aperçu élève</span>
            <span className="hidden text-amber-800 text-sm sm:inline">
              — Voici ce que voit un élève inscrit
            </span>
          </div>
          <Link
            to={`/teacher/courses/${courseId}`}
            className="flex items-center gap-1.5 bg-amber-900/20 hover:bg-amber-900/30 text-amber-900 px-3 py-1.5 rounded-lg text-sm font-medium transition"
          >
            <ArrowLeft size={14} /> Retour mode éditeur
          </Link>
        </div>
      </div>

      {/* ── Library course warning ─────────────────────────────────────── */}
      {course?.is_archived && (
        <div className="max-w-5xl mx-auto px-6 pt-4">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>
              <strong>Cours en bibliothèque</strong> — les élèves n'accèdent pas à cette version archivée.
              Ils voient uniquement la version <strong>attribuée à leur classe</strong>.
              Prévisualisez depuis la fiche de la classe, pas depuis la bibliothèque.
            </span>
          </div>
        </div>
      )}

      {/* ── Hidden resources notice ────────────────────────────────────── */}
      {(totalHidden > 0 || hasRootResources) && (
        <div className="max-w-5xl mx-auto px-6 pt-4 flex flex-col gap-2">
          {totalHidden > 0 && (
            <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-700">
              <EyeOff size={15} className="shrink-0" />
              <span>
                <strong>{totalHidden} ressource{totalHidden > 1 ? 's' : ''}</strong>{' '}
                masquée{totalHidden > 1 ? 's' : ''} dans les chapitres — activez l'icône 👁️ depuis le mode éditeur.
              </span>
            </div>
          )}
          {hasRootResources && (
            <div className="flex items-center gap-2 bg-white border border-orange-200 rounded-xl px-4 py-2.5 text-sm text-orange-700">
              <EyeOff size={15} className="shrink-0" />
              <span>
                Des ressources sans chapitre existent — les élèves n'y ont pas accès.{' '}
                <Link to={`/teacher/courses/${courseId}`} className="underline font-medium">
                  Organisez-les en chapitres.
                </Link>
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Student-style course header ────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 pt-6 pb-2">
        <p className="text-sm text-emerald-600 mb-1">← Tableau de bord</p>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{course?.name || '…'}</h1>
            {course?.section?.name && (
              <p className="text-gray-500 text-sm">{course.section.name}</p>
            )}
          </div>
          <button
            onClick={() => toast('Forum du cours', { icon: '💬' })}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Forum du cours
          </button>
        </div>
      </div>

      {/* ── Chapters ───────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 pb-16 pt-4 grid gap-5">
        {isLoading && <p className="text-center text-gray-400 py-12">Chargement…</p>}

        {!isLoading && hasVisibleContent && chapters.map(ch => (
          ch.resources.length > 0
            ? <ChapterCard key={ch.id} chapter={ch} onView={setViewingResource} />
            : null
        ))}

        {!isLoading && !hasVisibleContent && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-dashed border-gray-200">
            <EyeOff size={40} className="mx-auto mb-4 text-gray-300" />
            <p className="font-semibold text-gray-600 mb-2">Les élèves ne voient rien pour l'instant</p>
            <p className="text-sm text-gray-400 mb-6">
              {totalHidden > 0
                ? `${totalHidden} ressource${totalHidden > 1 ? 's sont masquées' : ' est masquée'} — activez la visibilité depuis le mode éditeur (icône 👁️).`
                : hasRootResources
                  ? 'Vos ressources ne sont pas dans des chapitres — les élèves n\'y ont pas accès.'
                  : 'Ce cours ne contient aucune ressource visible.'}
            </p>
            <Link
              to={`/teacher/courses/${courseId}`}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 font-medium text-sm"
            >
              <ArrowLeft size={16} />
              {hasRootResources ? 'Organiser en chapitres' : 'Activer la visibilité'}
            </Link>
          </div>
        )}
      </div>

      {viewingResource && (
        <ResourceViewer resource={viewingResource} onClose={() => setViewingResource(null)} />
      )}
    </div>
  );
}
