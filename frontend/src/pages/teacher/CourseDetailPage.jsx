import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Eye, EyeOff, Upload, ExternalLink, Pencil, MessageCircle,
  PlayCircle, FileUp, Users, BookOpen, Plus, Trash2, Zap,
  CheckSquare, GripVertical, ChevronDown, ChevronUp,
  Monitor, RefreshCw, ClipboardList, Award, CheckCircle, FileText,
  BookMarked, Library,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import TeacherLayout from '../../components/layout/TeacherLayout';
import ResourceViewer from '../../components/ResourceViewer';

/* ─── Constants ─────────────────────────────────────────────────────────── */

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
  presentation:        { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-200'   },
  syllabus:            { bg: 'bg-purple-50',  text: 'text-purple-600', border: 'border-purple-200' },
  exercise:            { bg: 'bg-amber-50',   text: 'text-amber-600',  border: 'border-amber-200'  },
  exercise_solution:   { bg: 'bg-green-50',   text: 'text-green-600',  border: 'border-green-200'  },
  revision:            { bg: 'bg-cyan-50',    text: 'text-cyan-600',   border: 'border-cyan-200'   },
  revision_solution:   { bg: 'bg-teal-50',    text: 'text-teal-600',   border: 'border-teal-200'   },
  evaluation:          { bg: 'bg-red-50',     text: 'text-red-600',    border: 'border-red-200'    },
  evaluation_solution: { bg: 'bg-rose-50',    text: 'text-rose-600',   border: 'border-rose-200'   },
};

const INTERACTIVE_TYPES = ['exercise', 'revision', 'evaluation'];
const VIEWABLE_TYPES    = ['pdf', 'image', 'video_upload', 'video_youtube', 'link', 'pptx', 'docx', 'xlsx'];

/* ─── ResourceCard ─────────────────────────────────────────────────────── */

function ResourceCard({ resource, courseId, onPreview }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [uploading, setUploading]         = useState(false);
  const [showUrlModal, setShowUrlModal]   = useState(false);
  const [showSubModal, setShowSubModal]   = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [subConfig, setSubConfig]         = useState({ instructions: '', max_score: 20, deadline: '' });
  const [url, setUrl]                     = useState(resource.external_url || '');

  const toggleVisibility = useMutation({
    mutationFn: () => api.patch(`/teacher/resources/${resource.id}/visibility`),
    onSuccess: () => qc.invalidateQueries(['teacher-course', courseId]),
  });

  const updateUrl = useMutation({
    mutationFn: (u) => api.put(`/teacher/resources/${resource.id}`, { external_url: u, file_type: 'link' }),
    onSuccess: () => {
      qc.invalidateQueries(['teacher-course', courseId]);
      setShowUrlModal(false);
      toast.success('Lien enregistré');
    },
  });

  const enableSubmission = useMutation({
    mutationFn: () => api.post(`/teacher/resources/${resource.id}/file_exercise`, {
      instructions: subConfig.instructions || null,
      max_score:    Number(subConfig.max_score) || 20,
      deadline:     subConfig.deadline || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries(['teacher-course', courseId]);
      setShowSubModal(false);
      toast.success('Remise de fichier activée');
    },
    onError: () => toast.error("Erreur lors de l'activation"),
  });

  const deleteResource = useMutation({
    mutationFn: () => api.delete(`/teacher/resources/${resource.id}`),
    onSuccess: () => {
      qc.invalidateQueries(['teacher-course', courseId]);
      toast.success('Ressource supprimée');
    },
  });

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toast.error('Fichier trop volumineux (max 50 Mo)'); e.target.value = ''; return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/teacher/resources/${resource.id}/file`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      qc.invalidateQueries(['teacher-course', courseId]);
      toast.success(`"${file.name}" uploadé avec succès`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur upload');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const isEmpty = !resource.file_path && !resource.external_url && !resource.file_type;

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-800 truncate">{resource.title}</h3>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {resource.file_type && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-500">
                {resource.file_type.toUpperCase().replace('_', ' ')}
              </span>
            )}
            {!isEmpty && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${resource.is_visible ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {resource.is_visible ? 'Visible' : 'Masqué'}
              </span>
            )}
            {resource.file_name && <span className="text-xs text-gray-400">{resource.file_name}</span>}
          </div>
          {resource.external_url && (
            <a href={resource.external_url} target="_blank" rel="noreferrer"
              className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1">
              <ExternalLink size={11} />
              {resource.external_url.length > 45 ? resource.external_url.slice(0, 45) + '…' : resource.external_url}
            </a>
          )}
          {isEmpty && <p className="text-xs text-gray-400 mt-1 italic">Aucun contenu</p>}
        </div>

        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
          {!isEmpty && VIEWABLE_TYPES.includes(resource.file_type) && (
            <button onClick={() => onPreview(resource)} title="Prévisualiser"
              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition">
              <PlayCircle size={16} />
            </button>
          )}
          {!isEmpty && (
            <button onClick={() => toggleVisibility.mutate()}
              title={resource.is_visible ? 'Masquer' : 'Rendre visible'}
              className={`p-2 rounded-lg transition ${resource.is_visible ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}>
              {resource.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          )}
          <label title="Uploader un fichier"
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition">
            {uploading ? <span className="text-xs px-1">…</span> : <Upload size={16} />}
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
          <button title="Ajouter un lien URL" onClick={() => setShowUrlModal(true)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
            <ExternalLink size={16} />
          </button>
          <button title="Changer le type d'exercice interactif" onClick={() => setShowTypeModal(true)}
            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">
            <Zap size={16} />
          </button>
          {resource.file_type === 'file_upload' && (
            <>
              <Link title="Modifier l'énoncé" to={`/teacher/resources/${resource.id}/exercise-editor`}
                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                <BookOpen size={16} />
              </Link>
              <Link title="Voir les remises" to={`/teacher/resources/${resource.id}/submissions`}
                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition">
                <Users size={16} />
              </Link>
            </>
          )}
          {confirmDelete ? (
            <div className="flex items-center gap-1 ml-1">
              <button onClick={() => deleteResource.mutate()} disabled={deleteResource.isPending}
                className="px-2 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-60">
                Supprimer
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">Non</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} title="Supprimer"
              className="p-2 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* URL modal */}
      {showUrlModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold mb-4">Ajouter un lien</h3>
            <input value={url} onChange={e => setUrl(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              placeholder="https://..." autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setShowUrlModal(false)} className="flex-1 border border-gray-300 py-2 rounded-lg">Annuler</button>
              <button onClick={() => updateUrl.mutate(url)} disabled={!url.trim()}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg disabled:opacity-60">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise type reconfiguration modal */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-1">Type d'exercice interactif</h3>
            <p className="text-sm text-gray-500 mb-4">Choisissez le format pour « {resource.title} »</p>
            <div className="grid gap-2.5">
              <button onClick={() => { setShowTypeModal(false); navigate(`/teacher/resources/${resource.id}/qcm`); }}
                className="flex items-center gap-3 p-3.5 border-2 border-gray-100 hover:border-amber-300 hover:bg-amber-50 rounded-xl transition text-left">
                <CheckSquare size={18} className="text-amber-500 shrink-0" />
                <div><p className="font-medium text-gray-800 text-sm">QCM</p><p className="text-xs text-gray-500">Questions à choix multiples</p></div>
              </button>
              <button onClick={() => { setShowTypeModal(false); navigate(`/teacher/resources/${resource.id}/dragdrop`); }}
                className="flex items-center gap-3 p-3.5 border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 rounded-xl transition text-left">
                <GripVertical size={18} className="text-purple-500 shrink-0" />
                <div><p className="font-medium text-gray-800 text-sm">Glisser-Déposer</p><p className="text-xs text-gray-500">Associer des éléments</p></div>
              </button>
              <button onClick={() => { setShowTypeModal(false); navigate(`/teacher/resources/${resource.id}/fill-blanks`); }}
                className="flex items-center gap-3 p-3.5 border-2 border-gray-100 hover:border-sky-300 hover:bg-sky-50 rounded-xl transition text-left">
                <FileText size={18} className="text-sky-500 shrink-0" />
                <div><p className="font-medium text-gray-800 text-sm">Texte à trous</p><p className="text-xs text-gray-500">Compléter des mots manquants</p></div>
              </button>
              <button onClick={() => { setShowTypeModal(false); navigate(`/teacher/resources/${resource.id}/ordering`); }}
                className="flex items-center gap-3 p-3.5 border-2 border-gray-100 hover:border-orange-300 hover:bg-orange-50 rounded-xl transition text-left">
                <ChevronDown size={18} className="text-orange-500 shrink-0" />
                <div><p className="font-medium text-gray-800 text-sm">Ordonnancement</p><p className="text-xs text-gray-500">Remettre dans le bon ordre</p></div>
              </button>
              <button onClick={() => { setShowTypeModal(false); navigate(`/teacher/resources/${resource.id}/code-editor`); }}
                className="flex items-center gap-3 p-3.5 border-2 border-gray-100 hover:border-violet-300 hover:bg-violet-50 rounded-xl transition text-left">
                <Monitor size={18} className="text-violet-500 shrink-0" />
                <div><p className="font-medium text-gray-800 text-sm">Éditeur de code</p><p className="text-xs text-gray-500">JS, HTML, CSS, PHP, SQL, Python…</p></div>
              </button>
              <button onClick={() => { setShowTypeModal(false); navigate(`/teacher/resources/${resource.id}/truth-table`); }}
                className="flex items-center gap-3 p-3.5 border-2 border-gray-100 hover:border-teal-300 hover:bg-teal-50 rounded-xl transition text-left">
                <CheckCircle size={18} className="text-teal-500 shrink-0" />
                <div><p className="font-medium text-gray-800 text-sm">Table de vérité</p><p className="text-xs text-gray-500">Portes logiques AND/OR/NOT…</p></div>
              </button>
              <button onClick={() => { setShowTypeModal(false); setShowSubModal(true); }}
                className="flex items-center gap-3 p-3.5 border-2 border-gray-100 hover:border-emerald-300 hover:bg-emerald-50 rounded-xl transition text-left">
                <FileUp size={18} className="text-emerald-500 shrink-0" />
                <div><p className="font-medium text-gray-800 text-sm">Remise de fichier</p><p className="text-xs text-gray-500">Les élèves déposent un fichier</p></div>
              </button>
            </div>
            <button onClick={() => setShowTypeModal(false)} className="w-full mt-4 text-sm text-gray-400 hover:text-gray-600 text-center py-1">Annuler</button>
          </div>
        </div>
      )}

      {/* Submission config modal */}
      {showSubModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold mb-1">Activer la remise de fichier</h3>
            <p className="text-sm text-gray-500 mb-4">Les élèves pourront déposer un fichier ou saisir du texte.</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Consignes (optionnel)</label>
                <textarea value={subConfig.instructions} onChange={e => setSubConfig({ ...subConfig, instructions: e.target.value })}
                  rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Décrivez ce que les élèves doivent remettre…" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm text-gray-600 mb-1 block">Note max</label>
                  <input type="number" min={1} max={100} value={subConfig.max_score}
                    onChange={e => setSubConfig({ ...subConfig, max_score: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex-1">
                  <label className="text-sm text-gray-600 mb-1 block">Date limite (optionnel)</label>
                  <input type="datetime-local" value={subConfig.deadline}
                    onChange={e => setSubConfig({ ...subConfig, deadline: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowSubModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
                <button onClick={() => enableSubmission.mutate()} disabled={enableSubmission.isPending}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60">
                  {enableSubmission.isPending ? 'Activation…' : 'Activer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── TypeGroup ─────────────────────────────────────────────────────────── */

function TypeGroup({ type, resources, courseId, onPreview, onAdd }) {
  const [open, setOpen] = useState(resources.length > 0);
  const style = TYPE_STYLE[type] || { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };
  const Icon  = TYPE_ICON_MAP[type] || FileText;

  return (
    <div className={`rounded-xl border ${style.border} overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-white/60 transition bg-white/30"
        onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${style.bg}`}>
            <Icon size={14} className={style.text} />
          </div>
          <span className="font-medium text-gray-700 text-sm">{TYPE_LABELS[type]}</span>
          {resources.length > 0 && (
            <span className="text-xs bg-white/80 text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded-full">{resources.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button onClick={() => onAdd(type)}
            className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition ${style.bg} ${style.text} hover:opacity-80`}>
            <Plus size={13} /> Ajouter
          </button>
          <span className="text-gray-300">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3 bg-white/20">
          {resources.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Aucune ressource — cliquez sur «&nbsp;Ajouter&nbsp;»</p>
          ) : (
            resources.map(r => <ResourceCard key={r.id} resource={r} courseId={courseId} onPreview={onPreview} />)
          )}
        </div>
      )}
    </div>
  );
}

/* ─── AddResourceModal ──────────────────────────────────────────────────── */

function AddResourceModal({ type, chapterId, courseId, onClose }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isInteractive = INTERACTIVE_TYPES.includes(type);
  const [format, setFormat]   = useState(isInteractive ? null : 'file');
  const [title, setTitle]     = useState(TYPE_LABELS[type] || '');
  const [subConfig, setSubConfig] = useState({ instructions: '', max_score: 20, deadline: '' });
  const [pendingSubId, setPendingSubId] = useState(null);
  const style = TYPE_STYLE[type] || { bg: 'bg-gray-50', text: 'text-gray-600' };

  const createResource = useMutation({
    mutationFn: () => api.post(`/teacher/chapters/${chapterId}/resources`, { type, title }),
  });

  const enableSubmission = useMutation({
    mutationFn: (id) => api.post(`/teacher/resources/${id}/file_exercise`, {
      instructions: subConfig.instructions || null,
      max_score:    Number(subConfig.max_score) || 20,
      deadline:     subConfig.deadline || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries(['teacher-course', courseId]);
      toast.success('Remise de fichier activée');
      onClose();
    },
    onError: () => toast.error("Erreur lors de l'activation"),
  });

  const handleConfirm = async () => {
    if (!title.trim()) return;
    try {
      const res   = await createResource.mutateAsync();
      const newId = res.data.resource.id;
      qc.invalidateQueries(['teacher-course', courseId]);
      if (format === 'qcm')          { navigate(`/teacher/resources/${newId}/qcm`); }
      else if (format === 'dragdrop')    { navigate(`/teacher/resources/${newId}/dragdrop`); }
      else if (format === 'fill_blanks') { navigate(`/teacher/resources/${newId}/fill-blanks`); }
      else if (format === 'ordering')    { navigate(`/teacher/resources/${newId}/ordering`); }
      else if (format === 'code_editor') { navigate(`/teacher/resources/${newId}/code-editor`); }
      else if (format === 'truth_table') { navigate(`/teacher/resources/${newId}/truth-table`); }
      else if (format === 'file_upload') { setPendingSubId(newId); }
      else { toast.success('Ressource ajoutée'); onClose(); }
    } catch {
      toast.error("Erreur lors de l'ajout");
    }
  };

  /* Submission config step */
  if (pendingSubId) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
          <h3 className="font-semibold mb-1">Configurer la remise de fichier</h3>
          <p className="text-sm text-gray-500 mb-4">Les élèves pourront déposer un fichier ou saisir du texte.</p>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Consignes (optionnel)</label>
              <textarea value={subConfig.instructions} onChange={e => setSubConfig({ ...subConfig, instructions: e.target.value })}
                rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Décrivez ce que les élèves doivent remettre…" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm text-gray-600 mb-1 block">Note max</label>
                <input type="number" min={1} max={100} value={subConfig.max_score}
                  onChange={e => setSubConfig({ ...subConfig, max_score: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex-1">
                <label className="text-sm text-gray-600 mb-1 block">Date limite (optionnel)</label>
                <input type="datetime-local" value={subConfig.deadline}
                  onChange={e => setSubConfig({ ...subConfig, deadline: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">Passer</button>
              <button onClick={() => enableSubmission.mutate(pendingSubId)} disabled={enableSubmission.isPending}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60">
                {enableSubmission.isPending ? 'Activation…' : 'Activer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* Format picker step */
  if (isInteractive && format === null) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>{TYPE_LABELS[type]}</span>
          <h3 className="font-semibold mt-2 mb-1">Quel type de contenu ?</h3>
          <p className="text-sm text-gray-500 mb-5">Choisissez le format de cette ressource.</p>
          <div className="grid gap-2.5">
            <button onClick={() => setFormat('file')}
              className="flex items-center gap-3 p-3.5 border-2 border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 rounded-xl transition text-left">
              <FileText size={18} className="text-indigo-500 shrink-0" />
              <div><p className="font-medium text-gray-800 text-sm">Fichier / Document</p><p className="text-xs text-gray-500">PDF, présentation, vidéo, lien…</p></div>
            </button>
            <button onClick={() => setFormat('qcm')}
              className="flex items-center gap-3 p-3.5 border-2 border-gray-100 hover:border-amber-300 hover:bg-amber-50 rounded-xl transition text-left">
              <CheckSquare size={18} className="text-amber-500 shrink-0" />
              <div><p className="font-medium text-gray-800 text-sm">QCM</p><p className="text-xs text-gray-500">Questions à choix multiples, auto-corrigées</p></div>
            </button>
            <button onClick={() => setFormat('dragdrop')}
              className="flex items-center gap-3 p-3.5 border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 rounded-xl transition text-left">
              <GripVertical size={18} className="text-purple-500 shrink-0" />
              <div><p className="font-medium text-gray-800 text-sm">Glisser-Déposer</p><p className="text-xs text-gray-500">Associer des éléments par glisser-déposer</p></div>
            </button>
            <button onClick={() => setFormat('fill_blanks')}
              className="flex items-center gap-3 p-3.5 border-2 border-gray-100 hover:border-sky-300 hover:bg-sky-50 rounded-xl transition text-left">
              <FileText size={18} className="text-sky-500 shrink-0" />
              <div><p className="font-medium text-gray-800 text-sm">Texte à trous</p><p className="text-xs text-gray-500">Compléter des mots manquants dans un texte</p></div>
            </button>
            <button onClick={() => setFormat('ordering')}
              className="flex items-center gap-3 p-3.5 border-2 border-gray-100 hover:border-orange-300 hover:bg-orange-50 rounded-xl transition text-left">
              <ChevronDown size={18} className="text-orange-500 shrink-0" />
              <div><p className="font-medium text-gray-800 text-sm">Ordonnancement</p><p className="text-xs text-gray-500">Remettre des lignes dans le bon ordre</p></div>
            </button>
            <button onClick={() => setFormat('code_editor')}
              className="flex items-center gap-3 p-3.5 border-2 border-gray-100 hover:border-violet-300 hover:bg-violet-50 rounded-xl transition text-left">
              <Monitor size={18} className="text-violet-500 shrink-0" />
              <div><p className="font-medium text-gray-800 text-sm">Éditeur de code</p><p className="text-xs text-gray-500">JS, HTML, CSS, PHP, SQL, Python…</p></div>
            </button>
            <button onClick={() => setFormat('truth_table')}
              className="flex items-center gap-3 p-3.5 border-2 border-gray-100 hover:border-teal-300 hover:bg-teal-50 rounded-xl transition text-left">
              <CheckCircle size={18} className="text-teal-500 shrink-0" />
              <div><p className="font-medium text-gray-800 text-sm">Table de vérité</p><p className="text-xs text-gray-500">Portes logiques AND/OR/NOT…</p></div>
            </button>
            <button onClick={() => setFormat('file_upload')}
              className="flex items-center gap-3 p-3.5 border-2 border-gray-100 hover:border-emerald-300 hover:bg-emerald-50 rounded-xl transition text-left">
              <FileUp size={18} className="text-emerald-500 shrink-0" />
              <div><p className="font-medium text-gray-800 text-sm">Remise de fichier</p><p className="text-xs text-gray-500">Les élèves déposent un fichier ou du texte</p></div>
            </button>
          </div>
          <button onClick={onClose} className="w-full mt-4 text-sm text-gray-400 hover:text-gray-600 text-center py-1">Annuler</button>
        </div>
      </div>
    );
  }

  /* Title input step */
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>{TYPE_LABELS[type]}</span>
          {format && format !== 'file' && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {{ qcm: 'QCM', dragdrop: 'Glisser-Déposer', fill_blanks: 'Texte à trous',
                 ordering: 'Ordonnancement', code_editor: 'Éditeur de code',
                 truth_table: 'Table de vérité', file_upload: 'Remise de fichier' }[format] || format}
            </span>
          )}
        </div>
        <h3 className="font-semibold mb-4">Nom de la ressource</h3>
        <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleConfirm()}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
          placeholder="Titre de la ressource" autoFocus />
        <div className="flex gap-3">
          {isInteractive
            ? <button onClick={() => setFormat(null)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">← Retour</button>
            : <button onClick={onClose}               className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
          }
          <button onClick={handleConfirm} disabled={!title.trim() || createResource.isPending}
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60">
            {createResource.isPending ? 'Création…'
              : ['qcm','dragdrop','fill_blanks','ordering','code_editor','truth_table'].includes(format) ? 'Créer et configurer'
              : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── ChapterSection ─────────────────────────────────────────────────────── */

function ChapterSection({ chapter, courseId, onPreview }) {
  const qc = useQueryClient();
  const [open, setOpen]           = useState(true);
  const [editing, setEditing]     = useState(false);
  const [title, setTitle]         = useState(chapter.title);
  const [confirmDel, setConfirmDel] = useState(false);
  const [addState, setAddState]   = useState(null); // { type } | null

  const updateChapter = useMutation({
    mutationFn: () => api.put(`/teacher/chapters/${chapter.id}`, { title }),
    onSuccess: () => { qc.invalidateQueries(['teacher-course', courseId]); setEditing(false); toast.success('Chapitre renommé'); },
  });

  const deleteChapter = useMutation({
    mutationFn: () => api.delete(`/teacher/chapters/${chapter.id}`),
    onSuccess: () => { qc.invalidateQueries(['teacher-course', courseId]); toast.success('Chapitre supprimé'); },
  });

  const byType = Object.fromEntries(
    Object.keys(TYPE_LABELS).map(type => [
      type,
      (chapter.resources || []).filter(r => r.type === type),
    ])
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden">
      {/* Chapter header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
            <BookMarked size={16} className="text-white" />
          </div>
          {editing ? (
            <div className="flex items-center gap-2 flex-1">
              <input value={title} onChange={e => setTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') updateChapter.mutate(); if (e.key === 'Escape') setEditing(false); }}
                className="flex-1 border rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus />
              <button onClick={() => updateChapter.mutate()} disabled={!title.trim()}
                className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm disabled:opacity-60">OK</button>
              <button onClick={() => { setEditing(false); setTitle(chapter.title); }} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="font-bold text-gray-800 truncate">{chapter.title}</h2>
              <button onClick={() => setEditing(true)} className="p-1 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 shrink-0">
                <Pencil size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-3">
          {confirmDel ? (
            <>
              <button onClick={() => deleteChapter.mutate()} disabled={deleteChapter.isPending}
                className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-60">
                Supprimer tout
              </button>
              <button onClick={() => setConfirmDel(false)} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">Non</button>
            </>
          ) : (
            <button onClick={() => setConfirmDel(true)} title="Supprimer le chapitre"
              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
              <Trash2 size={16} />
            </button>
          )}
          <button onClick={() => setOpen(o => !o)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition">
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Chapter content: 8 type groups */}
      {open && (
        <div className="p-5 grid gap-3">
          {Object.keys(TYPE_LABELS).map(type => (
            <TypeGroup
              key={type}
              type={type}
              resources={byType[type]}
              courseId={courseId}
              onPreview={onPreview}
              onAdd={(t) => setAddState({ type: t })}
            />
          ))}
        </div>
      )}

      {addState && (
        <AddResourceModal
          type={addState.type}
          chapterId={chapter.id}
          courseId={courseId}
          onClose={() => setAddState(null)}
        />
      )}
    </div>
  );
}

/* ─── CourseDetailPage ──────────────────────────────────────────────────── */

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editName, setEditName]             = useState(false);
  const [name, setName]                     = useState('');
  const [viewingResource, setViewingResource] = useState(null);
  const [showAddChapter, setShowAddChapter]   = useState(false);
  const [chapterTitle, setChapterTitle]       = useState('');
  const [confirmArchive, setConfirmArchive]   = useState(false);

  const { data } = useQuery({
    queryKey: ['teacher-course', courseId],
    queryFn: () => api.get(`/teacher/courses/${courseId}`).then(r => r.data),
  });

  const updateName = useMutation({
    mutationFn: () => api.put(`/teacher/courses/${courseId}`, { name }),
    onSuccess: () => { qc.invalidateQueries(['teacher-course', courseId]); setEditName(false); toast.success('Renommé'); },
  });

  const addChapter = useMutation({
    mutationFn: () => api.post(`/teacher/courses/${courseId}/chapters`, { title: chapterTitle }),
    onSuccess: () => {
      qc.invalidateQueries(['teacher-course', courseId]);
      setShowAddChapter(false);
      setChapterTitle('');
      toast.success('Chapitre ajouté');
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const archiveCourse = useMutation({
    mutationFn: () => api.post(`/teacher/courses/${courseId}/archive`),
    onSuccess: () => {
      toast.success('Cours archivé dans la bibliothèque');
      navigate('/teacher/library');
    },
    onError: () => toast.error("Erreur lors de l'archivage"),
  });

  const course   = data?.course;
  const chapters = course?.chapters || [];
  const rootRes  = course?.root_resources || [];

  return (
    <TeacherLayout>
      {/* Header */}
      <div className="mb-6">
        <Link to={`/teacher/classes/${course?.section?.class_id}`} className="text-sm text-indigo-600 hover:underline">
          ← {course?.section?.school_class?.name} / {course?.section?.name}
        </Link>
        <div className="flex items-center justify-between mt-2 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {editName ? (
              <div className="flex items-center gap-2">
                <input value={name} onChange={e => setName(e.target.value)}
                  className="border rounded-lg px-3 py-1.5 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
                <button onClick={() => updateName.mutate()} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm">OK</button>
                <button onClick={() => setEditName(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-800">{course?.name}</h1>
                <button onClick={() => { setName(course?.name || ''); setEditName(true); }}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50">
                  <Pencil size={16} />
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowAddChapter(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium transition">
              <Plus size={16} /> Ajouter un chapitre
            </button>
            <Link to={`/teacher/courses/${courseId}/forum`}
              className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-100 text-sm font-medium transition">
              <MessageCircle size={16} /> Forum
            </Link>
            {confirmArchive ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Archiver ce cours ?</span>
                <button onClick={() => archiveCourse.mutate()} disabled={archiveCourse.isPending}
                  className="px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-60">
                  {archiveCourse.isPending ? '…' : 'Oui, archiver'}
                </button>
                <button onClick={() => setConfirmArchive(false)} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">
                  Non
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmArchive(true)} title="Archiver dans la bibliothèque"
                className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-lg hover:bg-amber-100 text-sm font-medium transition">
                <Library size={16} /> Archiver
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chapters */}
      <div className="grid gap-5">
        {chapters.map(ch => (
          <ChapterSection key={ch.id} chapter={ch} courseId={courseId} onPreview={setViewingResource} />
        ))}

        {/* Legacy root resources (no chapter) */}
        {rootRes.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <span className="font-semibold text-gray-600 text-sm">Ressources sans chapitre</span>
            </div>
            <div className="p-5 grid gap-3">
              {Object.keys(TYPE_LABELS).map(type => {
                const res = rootRes.filter(r => r.type === type);
                if (res.length === 0) return null;
                return (
                  <TypeGroup key={type} type={type} resources={res} courseId={courseId}
                    onPreview={setViewingResource} onAdd={() => {}} />
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {chapters.length === 0 && rootRes.length === 0 && (
          <div className="text-center text-gray-400 py-16 bg-white rounded-2xl shadow-sm border border-dashed border-gray-200">
            <BookMarked size={36} className="mx-auto mb-3 opacity-20" />
            <p className="mb-4 text-sm">Ce cours n'a pas encore de chapitre.</p>
            <button onClick={() => setShowAddChapter(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm">
              <Plus size={16} /> Créer le premier chapitre
            </button>
          </div>
        )}
      </div>

      {viewingResource && (
        <ResourceViewer resource={viewingResource} onClose={() => setViewingResource(null)} />
      )}

      {/* Add chapter modal */}
      {showAddChapter && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold mb-4">Nouveau chapitre</h3>
            <input value={chapterTitle} onChange={e => setChapterTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && chapterTitle.trim() && addChapter.mutate()}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              placeholder="Ex: Chapitre 1 — Introduction aux réseaux" autoFocus />
            <div className="flex gap-3">
              <button onClick={() => { setShowAddChapter(false); setChapterTitle(''); }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
              <button onClick={() => addChapter.mutate()} disabled={!chapterTitle.trim() || addChapter.isPending}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60">
                {addChapter.isPending ? 'Création…' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
