import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Library, ChevronDown, ChevronRight, BookMarked, Trash2,
  Send, FileText, CheckSquare, GripVertical, Upload,
  Monitor, RefreshCw, ClipboardList, Award, CheckCircle,
  BookOpen, Pencil, Plus, FolderOpen, Folder,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import TeacherLayout from '../../components/layout/TeacherLayout';

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

const TYPE_ICONS = {
  competences: BookMarked, presentation: Monitor, syllabus: BookOpen, exercise: Pencil,
  exercise_solution: CheckCircle, revision: RefreshCw,
  revision_solution: CheckCircle, evaluation: ClipboardList,
  evaluation_solution: Award,
};

const FILE_TYPE_ICONS = {
  qcm: CheckSquare, drag_drop: GripVertical, file_upload: Upload,
  fill_blanks: FileText, ordering: CheckSquare, code_editor: Monitor,
  truth_table: CheckCircle,
};

// ── Parse "[4TTR | M1-HTML] Chap01 - Le web..." ──────────────────────────────

function parseName(name) {
  const match = name.match(/^\[([^|]+)\s*\|\s*([^\]]+)\]\s*(.+)$/);
  if (match) {
    return { classCode: match[1].trim(), moduleCode: match[2].trim(), chapName: match[3].trim() };
  }
  return { classCode: 'Autres', moduleCode: '', chapName: name };
}

function groupCourses(courses) {
  const grouped = {};
  courses.forEach(course => {
    const { classCode, moduleCode } = parseName(course.name);
    if (!grouped[classCode]) grouped[classCode] = {};
    const mod = moduleCode || '__other__';
    if (!grouped[classCode][mod]) grouped[classCode][mod] = [];
    grouped[classCode][mod].push(course);
  });
  // Sort chapters within each module by chapName
  Object.values(grouped).forEach(modules => {
    Object.values(modules).forEach(list => {
      list.sort((a, b) => parseName(a.name).chapName.localeCompare(parseName(b.name).chapName));
    });
  });
  return grouped;
}

/* ── AssignModal ─────────────────────────────────────────────────────────── */

function AssignModal({ course, onClose }) {
  const [selectedSection, setSelectedSection] = useState(null);

  const { data: classesData } = useQuery({
    queryKey: ['teacher-classes-for-assign'],
    queryFn: () => api.get('/teacher/classes').then(r => r.data),
  });

  const assign = useMutation({
    mutationFn: () => api.post(`/teacher/library/${course.id}/assign`, { section_id: selectedSection }),
    onSuccess: (res) => {
      const c = res.data.course;
      toast.success(`« ${parseName(course.name).chapName} » attribué à ${c.section?.name || 'la section'} !`);
      onClose();
    },
    onError: () => toast.error("Erreur lors de l'attribution"),
  });

  const classes = classesData?.classes || [];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-1">
          <Send size={18} className="text-indigo-600" />
          <h3 className="font-semibold text-gray-800">Attribuer à une classe</h3>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Choisissez la section où dupliquer « <strong>{parseName(course.name).chapName}</strong> ».
          Le cours original restera dans votre bibliothèque.
        </p>

        {classes.length === 0 ? (
          <p className="text-sm text-gray-400 italic text-center py-4">Aucune classe disponible.</p>
        ) : (
          <div className="space-y-3">
            {classes.map(cls => (
              <div key={cls.id}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{cls.name}</p>
                <div className="space-y-1.5 pl-2">
                  {(cls.sections || []).map(sec => (
                    <button key={sec.id}
                      onClick={() => setSelectedSection(sec.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition text-left ${
                        selectedSection === sec.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50'
                      }`}>
                      <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${
                        selectedSection === sec.id ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'
                      }`} />
                      <span className="text-sm font-medium text-gray-800">{sec.name}</span>
                    </button>
                  ))}
                  {(cls.sections || []).length === 0 && (
                    <p className="text-xs text-gray-400 italic pl-2">Aucune section</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={() => assign.mutate()} disabled={!selectedSection || assign.isPending}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
            <Send size={14} />
            {assign.isPending ? 'Attribution…' : 'Attribuer'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── ResourceLine ────────────────────────────────────────────────────────── */

function ResourceLine({ resource }) {
  const Icon = FILE_TYPE_ICONS[resource.file_type] || TYPE_ICONS[resource.type] || FileText;
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <Icon size={12} className="text-gray-400 shrink-0" />
      <span className="truncate">{resource.title}</span>
      {TYPE_LABELS[resource.type] && (
        <span className="text-xs text-gray-400 shrink-0">{TYPE_LABELS[resource.type]}</span>
      )}
      {resource.file_type && (
        <span className="text-xs text-gray-400 shrink-0">{resource.file_type.replace('_', ' ')}</span>
      )}
    </div>
  );
}

/* ── ChapterRow ──────────────────────────────────────────────────────────── */

function ChapterRow({ course }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const deleteFromLibrary = useMutation({
    mutationFn: () => api.delete(`/teacher/library/${course.id}`),
    onSuccess: () => { qc.invalidateQueries(['teacher-library']); toast.success('Cours supprimé de la bibliothèque'); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const { chapName } = parseName(course.name);
  const totalResources = [
    ...(course.chapters || []).flatMap(ch => ch.resources || []),
    ...(course.root_resources || []),
  ].length;

  return (
    <>
      <div className="border-b border-gray-100 last:border-0">
        <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
          <button onClick={() => setOpen(o => !o)} className="text-gray-300 hover:text-gray-500 transition shrink-0">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <span className="flex-1 text-sm text-gray-800 font-medium truncate">{chapName}</span>
          <span className="text-xs text-gray-400 shrink-0 mr-2">
            {totalResources} ressource{totalResources !== 1 ? 's' : ''}
          </span>
          <button onClick={() => setShowAssign(true)}
            className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-indigo-700 font-medium shrink-0 transition">
            <Send size={12} /> Attribuer
          </button>
          {confirmDel ? (
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => deleteFromLibrary.mutate()} disabled={deleteFromLibrary.isPending}
                className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">
                Oui
              </button>
              <button onClick={() => setConfirmDel(false)} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">
                Non
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDel(true)} title="Supprimer de la bibliothèque"
              className="p-1.5 text-gray-200 hover:text-red-400 hover:bg-red-50 rounded transition shrink-0">
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {open && (
          <div className="pl-10 pr-4 pb-3 pt-1 space-y-2">
            {(course.chapters || []).length === 0 && (course.root_resources || []).length === 0 && (
              <p className="text-xs text-gray-400 italic">Cours vide</p>
            )}
            {(course.chapters || []).map(ch => (
              <div key={ch.id} className="rounded-lg border border-indigo-50 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50">
                  <BookMarked size={11} className="text-indigo-400 shrink-0" />
                  <span className="text-xs font-semibold text-indigo-800">{ch.title}</span>
                  <span className="text-xs text-indigo-400 ml-auto">
                    {(ch.resources || []).length} ressource{(ch.resources || []).length !== 1 ? 's' : ''}
                  </span>
                </div>
                {(ch.resources || []).length > 0 && (
                  <div className="px-3 py-2 space-y-1">
                    {(ch.resources || []).map(r => <ResourceLine key={r.id} resource={r} />)}
                  </div>
                )}
              </div>
            ))}
            {(course.root_resources || []).length > 0 && (
              <div className="space-y-1.5 pl-1">
                {(course.root_resources || []).map(r => <ResourceLine key={r.id} resource={r} />)}
              </div>
            )}
          </div>
        )}
      </div>

      {showAssign && <AssignModal course={course} onClose={() => setShowAssign(false)} />}
    </>
  );
}

/* ── ModuleGroup ─────────────────────────────────────────────────────────── */

function ModuleGroup({ moduleCode, courses }) {
  const [open, setOpen] = useState(false);
  const displayCode = moduleCode === '__other__' ? 'Divers' : moduleCode;

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left transition"
      >
        {open
          ? <FolderOpen size={16} className="text-amber-500 shrink-0" />
          : <Folder size={16} className="text-amber-400 shrink-0" />
        }
        <span className="flex-1 text-sm font-semibold text-gray-700">{displayCode}</span>
        <span className="text-xs text-gray-400 mr-2">
          {courses.length} chapitre{courses.length !== 1 ? 's' : ''}
        </span>
        {open ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
      </button>

      {open && (
        <div className="bg-white divide-y divide-gray-50">
          {courses.map(course => <ChapterRow key={course.id} course={course} />)}
        </div>
      )}
    </div>
  );
}

/* ── ClassGroup ──────────────────────────────────────────────────────────── */

function ClassGroup({ classCode, modules }) {
  const [open, setOpen] = useState(true);

  const totalChapters = Object.values(modules).reduce((sum, cs) => sum + cs.length, 0);
  const moduleCount = Object.keys(modules).length;

  const sortedModules = Object.entries(modules).sort(([a], [b]) =>
    a.localeCompare(b, undefined, { numeric: true })
  );

  return (
    <div className="rounded-2xl border border-indigo-200 overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-left transition"
      >
        <Library size={20} className="shrink-0" />
        <div className="flex-1">
          <span className="font-bold text-base">{classCode}</span>
          <span className="text-indigo-200 text-sm ml-3">
            {moduleCount} module{moduleCount !== 1 ? 's' : ''} · {totalChapters} chapitre{totalChapters !== 1 ? 's' : ''}
          </span>
        </div>
        {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>

      {open && (
        <div className="p-4 space-y-3 bg-white">
          {sortedModules.map(([moduleCode, courses]) => (
            <ModuleGroup key={moduleCode} moduleCode={moduleCode} courses={courses} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── LibraryPage ─────────────────────────────────────────────────────────── */

export default function LibraryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['teacher-library'],
    queryFn: () => api.get('/teacher/library').then(r => r.data),
  });

  const courses = data?.courses || [];
  const grouped = groupCourses(courses);
  const sortedClasses = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

  return (
    <TeacherLayout>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <Library size={24} className="text-indigo-600" />
              Bibliothèque de cours
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Vos cours archivés. Attribuez-les à n'importe quelle classe en un clic.
            </p>
          </div>
          <Link to="/teacher/classes"
            className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-100 text-sm font-medium transition">
            <BookOpen size={16} /> Classes & Cours
          </Link>
        </div>
      </div>

      {isLoading && <div className="text-center text-gray-400 py-12">Chargement…</div>}

      {!isLoading && courses.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-dashed border-gray-200 p-16 text-center">
          <Library size={48} className="mx-auto mb-4 text-gray-200" />
          <p className="text-gray-500 font-medium mb-2">Votre bibliothèque est vide</p>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            Archivez un cours depuis sa page pour le retrouver ici et le réutiliser dans d'autres classes.
          </p>
          <Link to="/teacher/classes"
            className="inline-flex items-center gap-2 mt-5 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm">
            <Plus size={16} /> Aller vers mes cours
          </Link>
        </div>
      )}

      <div className="space-y-5">
        {sortedClasses.map(([classCode, modules]) => (
          <ClassGroup key={classCode} classCode={classCode} modules={modules} />
        ))}
      </div>
    </TeacherLayout>
  );
}
