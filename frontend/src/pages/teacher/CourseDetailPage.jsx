import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Eye, EyeOff, Upload, ExternalLink, Pencil, MessageCircle,
  PlayCircle, FileUp, Users, BookOpen, Plus, Trash2, Zap,
  CheckSquare, GripVertical, ChevronDown, ChevronUp,
  Monitor, RefreshCw, ClipboardList, Award, CheckCircle, FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import TeacherLayout from '../../components/layout/TeacherLayout';
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
  presentation:        { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-200',   badge: 'text-blue-600 bg-blue-50'   },
  syllabus:            { bg: 'bg-purple-50',  text: 'text-purple-600', border: 'border-purple-200', badge: 'text-purple-600 bg-purple-50' },
  exercise:            { bg: 'bg-amber-50',   text: 'text-amber-600',  border: 'border-amber-200',  badge: 'text-amber-600 bg-amber-50'  },
  exercise_solution:   { bg: 'bg-green-50',   text: 'text-green-600',  border: 'border-green-200',  badge: 'text-green-600 bg-green-50'  },
  revision:            { bg: 'bg-cyan-50',    text: 'text-cyan-600',   border: 'border-cyan-200',   badge: 'text-cyan-600 bg-cyan-50'    },
  revision_solution:   { bg: 'bg-teal-50',    text: 'text-teal-600',   border: 'border-teal-200',   badge: 'text-teal-600 bg-teal-50'    },
  evaluation:          { bg: 'bg-red-50',     text: 'text-red-600',    border: 'border-red-200',    badge: 'text-red-600 bg-red-50'      },
  evaluation_solution: { bg: 'bg-rose-50',    text: 'text-rose-600',   border: 'border-rose-200',   badge: 'text-rose-600 bg-rose-50'    },
};

// Types that get the 4-option exercise format picker
const INTERACTIVE_TYPES = ['exercise', 'revision', 'evaluation'];

const VIEWABLE_TYPES = ['pdf', 'image', 'video_upload', 'video_youtube', 'link', 'pptx', 'docx', 'xlsx'];

/* ─── ResourceCard ─────────────────────────────────────────────────────── */

function ResourceCard({ resource, courseId, onPreview }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [uploading, setUploading]           = useState(false);
  const [showUrlModal, setShowUrlModal]     = useState(false);
  const [showSubModal, setShowSubModal]     = useState(false);
  const [showTypeModal, setShowTypeModal]   = useState(false);
  const [confirmDelete, setConfirmDelete]   = useState(false);
  const [subConfig, setSubConfig]           = useState({ instructions: '', max_score: 20, deadline: '' });
  const [url, setUrl]                       = useState(resource.external_url || '');

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
      max_score: Number(subConfig.max_score) || 20,
      deadline: subConfig.deadline || null,
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
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h3 className="font-medium text-gray-800 truncate">{resource.title}</h3>
          </div>
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
          </div>
          {resource.file_name && <p className="text-xs text-gray-400 mt-1">{resource.file_name}</p>}
          {resource.external_url && (
            <a href={resource.external_url} target="_blank" rel="noreferrer"
              className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1">
              <ExternalLink size={11} />
              {resource.external_url.length > 45 ? resource.external_url.slice(0, 45) + '…' : resource.external_url}
            </a>
          )}
          {isEmpty && <p className="text-xs text-gray-400 mt-1 italic">Aucun contenu</p>}
        </div>

        {/* Buttons */}
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
                className="px-2 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">
                Non
              </button>
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

      {/* Exercise type picker (reconfiguration) */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold mb-1">Type d'exercice interactif</h3>
            <p className="text-sm text-gray-500 mb-5">Choisissez le format pour « {resource.title} »</p>
            <div className="grid gap-3">
              <button
                onClick={() => { setShowTypeModal(false); navigate(`/teacher/resources/${resource.id}/qcm`); }}
                className="flex items-center gap-3 p-4 border-2 border-gray-100 hover:border-amber-300 hover:bg-amber-50 rounded-xl transition text-left"
              >
                <CheckSquare size={20} className="text-amber-500 shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">QCM</p>
                  <p className="text-xs text-gray-500">Questions à choix multiples, corrigées automatiquement</p>
                </div>
              </button>
              <button
                onClick={() => { setShowTypeModal(false); navigate(`/teacher/resources/${resource.id}/dragdrop`); }}
                className="flex items-center gap-3 p-4 border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 rounded-xl transition text-left"
              >
                <GripVertical size={20} className="text-purple-500 shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">Glisser-Déposer</p>
                  <p className="text-xs text-gray-500">Associer des éléments par glisser-déposer</p>
                </div>
              </button>
              <button
                onClick={() => { setShowTypeModal(false); setShowSubModal(true); }}
                className="flex items-center gap-3 p-4 border-2 border-gray-100 hover:border-emerald-300 hover:bg-emerald-50 rounded-xl transition text-left"
              >
                <FileUp size={20} className="text-emerald-500 shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">Remise de fichier</p>
                  <p className="text-xs text-gray-500">Les élèves déposent un fichier ou du texte</p>
                </div>
              </button>
            </div>
            <button onClick={() => setShowTypeModal(false)}
              className="w-full mt-4 text-sm text-gray-400 hover:text-gray-600 text-center py-1">Annuler</button>
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
                <textarea value={subConfig.instructions}
                  onChange={e => setSubConfig({ ...subConfig, instructions: e.target.value })}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <button onClick={() => setShowSubModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
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
  const Icon = TYPE_ICON_MAP[type] || FileText;

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${style.border} overflow-hidden`}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none hover:bg-gray-50 transition"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${style.bg}`}>
            <Icon size={16} className={style.text} />
          </div>
          <span className="font-semibold text-gray-800">{TYPE_LABELS[type]}</span>
          {resources.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
              {resources.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onAdd(type)}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition ${style.bg} ${style.text} hover:opacity-80`}
          >
            <Plus size={14} /> Ajouter
          </button>
          <span className="text-gray-300 ml-1">
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </div>

      {/* Content */}
      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-gray-100 pt-4">
          {resources.length === 0 ? (
            <p className="text-sm text-gray-400 italic">
              Aucune ressource — cliquez sur «&nbsp;Ajouter&nbsp;» pour en créer une.
            </p>
          ) : (
            resources.map(r => (
              <ResourceCard key={r.id} resource={r} courseId={courseId} onPreview={onPreview} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ─── AddResourceModal ──────────────────────────────────────────────────── */

function AddResourceModal({ type, courseId, onClose }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isInteractive = INTERACTIVE_TYPES.includes(type);
  const [format, setFormat]   = useState(isInteractive ? null : 'file');
  const [title, setTitle]     = useState(TYPE_LABELS[type] || '');
  const [subConfig, setSubConfig] = useState({ instructions: '', max_score: 20, deadline: '' });
  const [pendingSubId, setPendingSubId] = useState(null);

  const style = TYPE_STYLE[type] || { bg: 'bg-gray-50', text: 'text-gray-600' };

  const createResource = useMutation({
    mutationFn: () => api.post(`/teacher/courses/${courseId}/resources`, { type, title }),
  });

  const enableSubmission = useMutation({
    mutationFn: (id) => api.post(`/teacher/resources/${id}/file_exercise`, {
      instructions: subConfig.instructions || null,
      max_score: Number(subConfig.max_score) || 20,
      deadline: subConfig.deadline || null,
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
      const res = await createResource.mutateAsync();
      const newId = res.data.resource.id;
      qc.invalidateQueries(['teacher-course', courseId]);

      if (format === 'qcm') {
        navigate(`/teacher/resources/${newId}/qcm`);
      } else if (format === 'dragdrop') {
        navigate(`/teacher/resources/${newId}/dragdrop`);
      } else if (format === 'file_upload') {
        setPendingSubId(newId);
      } else {
        toast.success('Ressource ajoutée');
        onClose();
      }
    } catch {
      toast.error("Erreur lors de l'ajout");
    }
  };

  // ── Submission config step ────────────────────────────────────────────────
  if (pendingSubId) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
          <h3 className="font-semibold mb-1">Configurer la remise de fichier</h3>
          <p className="text-sm text-gray-500 mb-4">Les élèves pourront déposer un fichier ou saisir du texte.</p>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Consignes (optionnel)</label>
              <textarea value={subConfig.instructions}
                onChange={e => setSubConfig({ ...subConfig, instructions: e.target.value })}
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              <button onClick={onClose}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">Passer</button>
              <button onClick={() => enableSubmission.mutate(pendingSubId)}
                disabled={enableSubmission.isPending}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60">
                {enableSubmission.isPending ? 'Activation…' : 'Activer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Format picker step (interactive types) ────────────────────────────────
  if (isInteractive && format === null) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
              {TYPE_LABELS[type]}
            </span>
          </div>
          <h3 className="font-semibold mb-1">Quel type de contenu ?</h3>
          <p className="text-sm text-gray-500 mb-5">Choisissez le format de cette ressource.</p>
          <div className="grid gap-3">
            <button onClick={() => setFormat('file')}
              className="flex items-center gap-3 p-4 border-2 border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 rounded-xl transition text-left">
              <FileText size={20} className="text-indigo-500 shrink-0" />
              <div>
                <p className="font-medium text-gray-800">Fichier / Document</p>
                <p className="text-xs text-gray-500">PDF, présentation, vidéo, lien…</p>
              </div>
            </button>
            <button onClick={() => setFormat('qcm')}
              className="flex items-center gap-3 p-4 border-2 border-gray-100 hover:border-amber-300 hover:bg-amber-50 rounded-xl transition text-left">
              <CheckSquare size={20} className="text-amber-500 shrink-0" />
              <div>
                <p className="font-medium text-gray-800">QCM</p>
                <p className="text-xs text-gray-500">Questions à choix multiples, corrigées automatiquement</p>
              </div>
            </button>
            <button onClick={() => setFormat('dragdrop')}
              className="flex items-center gap-3 p-4 border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 rounded-xl transition text-left">
              <GripVertical size={20} className="text-purple-500 shrink-0" />
              <div>
                <p className="font-medium text-gray-800">Glisser-Déposer</p>
                <p className="text-xs text-gray-500">Associer des éléments par glisser-déposer</p>
              </div>
            </button>
            <button onClick={() => setFormat('file_upload')}
              className="flex items-center gap-3 p-4 border-2 border-gray-100 hover:border-emerald-300 hover:bg-emerald-50 rounded-xl transition text-left">
              <FileUp size={20} className="text-emerald-500 shrink-0" />
              <div>
                <p className="font-medium text-gray-800">Remise de fichier</p>
                <p className="text-xs text-gray-500">Les élèves déposent un fichier ou du texte</p>
              </div>
            </button>
          </div>
          <button onClick={onClose} className="w-full mt-4 text-sm text-gray-400 hover:text-gray-600 text-center py-1">Annuler</button>
        </div>
      </div>
    );
  }

  // ── Title input step ──────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
            {TYPE_LABELS[type]}
          </span>
          {format && format !== 'file' && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {format === 'qcm' ? 'QCM' : format === 'dragdrop' ? 'Glisser-Déposer' : 'Remise de fichier'}
            </span>
          )}
        </div>
        <h3 className="font-semibold mb-4">Nom de la ressource</h3>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleConfirm()}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
          placeholder="Titre de la ressource"
          autoFocus
        />
        <div className="flex gap-3">
          {isInteractive ? (
            <button onClick={() => setFormat(null)}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
              ← Retour
            </button>
          ) : (
            <button onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
              Annuler
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={!title.trim() || createResource.isPending}
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60"
          >
            {createResource.isPending ? 'Création…' : format === 'qcm' ? 'Créer et ouvrir le QCM' : format === 'dragdrop' ? 'Créer et ouvrir le glisser-déposer' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── CourseDetailPage ──────────────────────────────────────────────────── */

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const qc = useQueryClient();
  const [editName, setEditName]       = useState(false);
  const [name, setName]               = useState('');
  const [viewingResource, setViewingResource] = useState(null);
  const [addingType, setAddingType]   = useState(null);

  const { data } = useQuery({
    queryKey: ['teacher-course', courseId],
    queryFn: () => api.get(`/teacher/courses/${courseId}`).then(r => r.data),
  });

  const updateName = useMutation({
    mutationFn: () => api.put(`/teacher/courses/${courseId}`, { name }),
    onSuccess: () => { qc.invalidateQueries(['teacher-course', courseId]); setEditName(false); toast.success('Renommé'); },
  });

  const course    = data?.course;
  const resources = course?.resources || [];

  // Group by type
  const byType = Object.fromEntries(
    Object.keys(TYPE_LABELS).map(type => [
      type,
      resources.filter(r => r.type === type),
    ])
  );

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
                  className="border rounded-lg px-3 py-1.5 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus />
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
          <Link
            to={`/teacher/courses/${courseId}/forum`}
            className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-100 text-sm font-medium transition"
          >
            <MessageCircle size={16} /> Forum
          </Link>
        </div>
      </div>

      {/* Type groups */}
      <div className="grid gap-4">
        {Object.keys(TYPE_LABELS).map(type => (
          <TypeGroup
            key={type}
            type={type}
            resources={byType[type]}
            courseId={courseId}
            onPreview={setViewingResource}
            onAdd={setAddingType}
          />
        ))}
      </div>

      {viewingResource && (
        <ResourceViewer resource={viewingResource} onClose={() => setViewingResource(null)} />
      )}

      {addingType && (
        <AddResourceModal
          type={addingType}
          courseId={courseId}
          onClose={() => setAddingType(null)}
        />
      )}
    </TeacherLayout>
  );
}
