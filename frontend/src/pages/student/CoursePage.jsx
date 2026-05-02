import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  FileText, Video, Link as LinkIcon, CheckSquare,
  GripVertical, MessageCircle, Eye, Upload,
  BookMarked, ChevronDown, ChevronUp,
  Monitor, RefreshCw, ClipboardList, Award, CheckCircle, BookOpen, Pencil,
} from 'lucide-react';
import api from '../../services/api';
import StudentLayout from '../../components/layout/StudentLayout';
import ResourceViewer from '../../components/ResourceViewer';

const TYPE_LABELS = {
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
  presentation:        Monitor,
  syllabus:            BookOpen,
  exercise:            Pencil,
  exercise_solution:   CheckCircle,
  revision:            RefreshCw,
  revision_solution:   CheckCircle,
  evaluation:          ClipboardList,
  evaluation_solution: Award,
};

const TYPE_STYLE = {
  presentation:        { bg: 'bg-blue-50',   text: 'text-blue-600'   },
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
  qcm: CheckSquare, drag_drop: GripVertical, excel_interactive: CheckSquare, file_upload: Upload,
};

const VIEWABLE    = ['pdf', 'image', 'video_upload', 'video_youtube', 'link', 'pptx', 'docx', 'xlsx'];
const INTERACTIVE = ['qcm', 'drag_drop', 'file_upload'];

/* ─── ResourceRow ────────────────────────────────────────────────────────── */

function ResourceRow({ resource, onView, onMark }) {
  const style  = TYPE_STYLE[resource.type] || { bg: 'bg-gray-50', text: 'text-gray-600' };
  const TypeIcon = TYPE_ICON_MAP[resource.type] || FileText;
  const FileIcon = FILE_ICONS[resource.file_type] || FileText;
  const isEmpty  = !resource.file_path && !resource.external_url && !INTERACTIVE.includes(resource.file_type);
  const canView  = !isEmpty && VIEWABLE.includes(resource.file_type);

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${style.bg}`}>
        {resource.file_type ? <FileIcon size={18} className={style.text} /> : <TypeIcon size={18} className={style.text} />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 truncate text-sm">{resource.title}</p>
        <p className="text-xs text-gray-400">{TYPE_LABELS[resource.type]}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {canView && (
          <button onClick={() => { onMark(resource.id); onView(resource); }}
            className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-700">
            <Eye size={13} /> Voir
          </button>
        )}
        {resource.file_type === 'qcm' && (
          <Link to={`/student/resources/${resource.id}/qcm`} onClick={() => onMark(resource.id)}
            className="flex items-center gap-1.5 bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-amber-600">
            <CheckSquare size={13} /> QCM
          </Link>
        )}
        {resource.file_type === 'drag_drop' && (
          <Link to={`/student/resources/${resource.id}/dragdrop`} onClick={() => onMark(resource.id)}
            className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-purple-700">
            <GripVertical size={13} /> Exercice
          </Link>
        )}
        {resource.file_type === 'file_upload' && (
          <Link to={`/student/resources/${resource.id}/exercise`} onClick={() => onMark(resource.id)}
            className="flex items-center gap-1.5 bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-amber-700">
            <Upload size={13} /> Remettre
          </Link>
        )}
        {isEmpty && <span className="text-xs text-gray-300 italic">Non disponible</span>}
      </div>
    </div>
  );
}

/* ─── TypeSection (collapsible group inside chapter) ─────────────────────── */

function TypeSection({ type, resources, onView, onMark }) {
  const [open, setOpen] = useState(true);
  const style  = TYPE_STYLE[type] || { bg: 'bg-gray-50', text: 'text-gray-600' };
  const Icon   = TYPE_ICON_MAP[type] || FileText;

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
          {resources.map(r => <ResourceRow key={r.id} resource={r} onView={onView} onMark={onMark} />)}
        </div>
      )}
    </div>
  );
}

/* ─── ChapterCard ─────────────────────────────────────────────────────────── */

function ChapterCard({ chapter, onView, onMark }) {
  const [open, setOpen] = useState(true);

  // Group visible resources by type, skip empty types
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
            <p className="text-sm text-gray-400 italic text-center py-4">Aucune ressource disponible dans ce chapitre.</p>
          ) : (
            <div className="grid gap-3">
              {byType.map(({ type, resources }) => (
                <TypeSection key={type} type={type} resources={resources} onView={onView} onMark={onMark} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── CoursePage ─────────────────────────────────────────────────────────── */

export default function CoursePage() {
  const { courseId } = useParams();
  const [viewingResource, setViewingResource] = useState(null);

  const { data } = useQuery({
    queryKey: ['student-course', courseId],
    queryFn: () => api.get(`/student/courses/${courseId}`).then(r => r.data),
  });

  const markViewed = useMutation({
    mutationFn: (resourceId) => api.post(`/student/resources/${resourceId}/view`),
  });

  const course   = data?.course;
  const chapters = course?.chapters || [];

  return (
    <StudentLayout>
      {/* Header */}
      <div className="mb-6">
        <Link to="/student/dashboard" className="text-sm text-emerald-600 hover:underline">← Tableau de bord</Link>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{course?.name}</h1>
            <p className="text-gray-500 text-sm">{course?.section?.name}</p>
          </div>
          <Link to={`/student/courses/${courseId}/forum`}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg hover:bg-emerald-100 text-sm font-medium transition">
            <MessageCircle size={16} /> Forum du cours
          </Link>
        </div>
      </div>

      {/* Chapters */}
      <div className="grid gap-5">
        {chapters.map(ch => (
          <ChapterCard
            key={ch.id}
            chapter={ch}
            onView={setViewingResource}
            onMark={(id) => markViewed.mutate(id)}
          />
        ))}

        {chapters.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400 border border-dashed border-gray-200">
            <BookMarked size={40} className="mx-auto mb-3 opacity-20" />
            <p>Aucun chapitre disponible pour ce cours.</p>
          </div>
        )}
      </div>

      {viewingResource && (
        <ResourceViewer resource={viewingResource} onClose={() => setViewingResource(null)} />
      )}
    </StudentLayout>
  );
}
