import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Eye, EyeOff, Upload, ExternalLink, Pencil, MessageCircle,
  PlayCircle, FileUp, Users, BookOpen, Plus, Trash2, Zap,
  CheckSquare, GripVertical,
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

const TYPE_BORDER = {
  presentation:        'border-l-blue-400',
  syllabus:            'border-l-purple-400',
  exercise:            'border-l-amber-400',
  exercise_solution:   'border-l-green-400',
  revision:            'border-l-cyan-400',
  revision_solution:   'border-l-teal-400',
  evaluation:          'border-l-red-400',
  evaluation_solution: 'border-l-rose-400',
};

const TYPE_BADGE = {
  presentation:        'text-blue-600 bg-blue-50',
  syllabus:            'text-purple-600 bg-purple-50',
  exercise:            'text-amber-600 bg-amber-50',
  exercise_solution:   'text-green-600 bg-green-50',
  revision:            'text-cyan-600 bg-cyan-50',
  revision_solution:   'text-teal-600 bg-teal-50',
  evaluation:          'text-red-600 bg-red-50',
  evaluation_solution: 'text-rose-600 bg-rose-50',
};

const VIEWABLE_TYPES = ['pdf', 'image', 'video_upload', 'video_youtube', 'link', 'pptx', 'docx', 'xlsx'];

function ResourceCard({ resource, courseId, onPreview }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showExerciseTypeModal, setShowExerciseTypeModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [subConfig, setSubConfig] = useState({ instructions: '', max_score: 20, deadline: '' });
  const [url, setUrl] = useState(resource.external_url || '');

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
    mutationFn: () =>
      api.post(`/teacher/resources/${resource.id}/file_exercise`, {
        instructions: subConfig.instructions || null,
        max_score: Number(subConfig.max_score) || 20,
        deadline: subConfig.deadline || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries(['teacher-course', courseId]);
      setShowSubmissionModal(false);
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
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 50 Mo)');
      e.target.value = '';
      return;
    }
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
      toast.error(err.response?.data?.message || err.message || 'Erreur upload');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const isEmpty = !resource.file_path && !resource.external_url && !resource.file_type;

  return (
    <div className={`bg-white rounded-xl border-l-4 ${TYPE_BORDER[resource.type] || 'border-l-gray-300'} shadow-sm p-5`}>
      <div className="flex items-start justify-between gap-4">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[resource.type] || 'text-gray-600 bg-gray-50'}`}>
              {TYPE_LABELS[resource.type] || resource.type}
            </span>
            {!isEmpty && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${resource.is_visible ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {resource.is_visible ? 'Visible' : 'Masqué'}
              </span>
            )}
            {resource.file_type && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-500">
                {resource.file_type.toUpperCase()}
              </span>
            )}
          </div>
          <h3 className="font-medium text-gray-800 truncate">{resource.title}</h3>
          {resource.file_name && <p className="text-xs text-gray-400 mt-0.5">{resource.file_name}</p>}
          {resource.external_url && (
            <a href={resource.external_url} target="_blank" rel="noreferrer"
              className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1">
              <ExternalLink size={12} />
              {resource.external_url.length > 50 ? resource.external_url.slice(0, 50) + '…' : resource.external_url}
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
          {!isEmpty && VIEWABLE_TYPES.includes(resource.file_type) && (
            <button onClick={() => onPreview(resource)} title="Prévisualiser"
              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition">
              <PlayCircle size={18} />
            </button>
          )}

          {!isEmpty && (
            <button onClick={() => toggleVisibility.mutate()}
              title={resource.is_visible ? 'Masquer' : 'Rendre visible'}
              className={`p-2 rounded-lg transition ${resource.is_visible ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}>
              {resource.is_visible ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          )}

          <label title="Uploader un fichier"
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition">
            {uploading ? <span className="text-xs px-1">…</span> : <Upload size={18} />}
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>

          <button title="Ajouter un lien URL" onClick={() => setShowUrlModal(true)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
            <ExternalLink size={18} />
          </button>

          {/* Unified exercise type picker */}
          <button
            title="Configurer comme exercice interactif"
            onClick={() => setShowExerciseTypeModal(true)}
            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">
            <Zap size={18} />
          </button>

          {resource.file_type === 'file_upload' && (
            <>
              <Link title="Modifier l'énoncé" to={`/teacher/resources/${resource.id}/exercise-editor`}
                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                <BookOpen size={18} />
              </Link>
              <Link title="Voir les remises" to={`/teacher/resources/${resource.id}/submissions`}
                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition">
                <Users size={18} />
              </Link>
            </>
          )}

          {/* Delete with inline confirmation */}
          {confirmDelete ? (
            <div className="flex items-center gap-1 ml-1">
              <button onClick={() => deleteResource.mutate()} disabled={deleteResource.isPending}
                className="px-2 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-60">
                Oui, supprimer
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">
                Annuler
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} title="Supprimer cette ressource"
              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {isEmpty && (
        <p className="text-xs text-gray-400 mt-3 italic">
          Aucun contenu — uploadez un fichier, ajoutez un lien ou configurez comme exercice interactif
        </p>
      )}

      {/* URL modal */}
      {showUrlModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold mb-4">Ajouter un lien</h3>
            <input value={url} onChange={e => setUrl(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              placeholder="https://..." autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setShowUrlModal(false)}
                className="flex-1 border border-gray-300 py-2 rounded-lg">Annuler</button>
              <button onClick={() => updateUrl.mutate(url)} disabled={!url.trim()}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg disabled:opacity-60">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise type picker modal */}
      {showExerciseTypeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold mb-1">Type d'exercice interactif</h3>
            <p className="text-sm text-gray-500 mb-5">Choisissez le format pour « {resource.title} »</p>
            <div className="grid gap-3">
              <button
                onClick={() => { setShowExerciseTypeModal(false); navigate(`/teacher/resources/${resource.id}/qcm`); }}
                className="flex items-center gap-3 p-4 border-2 border-gray-100 hover:border-amber-300 hover:bg-amber-50 rounded-xl transition text-left"
              >
                <CheckSquare size={22} className="text-amber-500 shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">QCM</p>
                  <p className="text-xs text-gray-500">Questions à choix multiples, corrigées automatiquement</p>
                </div>
              </button>
              <button
                onClick={() => { setShowExerciseTypeModal(false); navigate(`/teacher/resources/${resource.id}/dragdrop`); }}
                className="flex items-center gap-3 p-4 border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 rounded-xl transition text-left"
              >
                <GripVertical size={22} className="text-purple-500 shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">Glisser-Déposer</p>
                  <p className="text-xs text-gray-500">Associer des éléments par glisser-déposer</p>
                </div>
              </button>
              <button
                onClick={() => { setShowExerciseTypeModal(false); setShowSubmissionModal(true); }}
                className="flex items-center gap-3 p-4 border-2 border-gray-100 hover:border-emerald-300 hover:bg-emerald-50 rounded-xl transition text-left"
              >
                <FileUp size={22} className="text-emerald-500 shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">Remise de fichier</p>
                  <p className="text-xs text-gray-500">Les élèves déposent un fichier ou saisissent du texte</p>
                </div>
              </button>
            </div>
            <button onClick={() => setShowExerciseTypeModal(false)}
              className="w-full mt-4 text-sm text-gray-400 hover:text-gray-600 text-center py-1">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Submission config modal */}
      {showSubmissionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold mb-1">Activer la remise de fichier</h3>
            <p className="text-sm text-gray-500 mb-4">Les élèves pourront déposer un fichier ou saisir du texte.</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Consignes (optionnel)</label>
                <textarea
                  value={subConfig.instructions}
                  onChange={e => setSubConfig({ ...subConfig, instructions: e.target.value })}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Décrivez ce que les élèves doivent remettre…"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm text-gray-600 mb-1 block">Note max</label>
                  <input
                    type="number" min={1} max={100}
                    value={subConfig.max_score}
                    onChange={e => setSubConfig({ ...subConfig, max_score: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm text-gray-600 mb-1 block">Date limite (optionnel)</label>
                  <input
                    type="datetime-local"
                    value={subConfig.deadline}
                    onChange={e => setSubConfig({ ...subConfig, deadline: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowSubmissionModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Annuler
                </button>
                <button
                  onClick={() => enableSubmission.mutate()}
                  disabled={enableSubmission.isPending}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60"
                >
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

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const qc = useQueryClient();
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState('');
  const [viewingResource, setViewingResource] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newType, setNewType] = useState('exercise');
  const [newTitle, setNewTitle] = useState(TYPE_LABELS['exercise']);

  const { data } = useQuery({
    queryKey: ['teacher-course', courseId],
    queryFn: () => api.get(`/teacher/courses/${courseId}`).then(r => r.data),
  });

  const updateName = useMutation({
    mutationFn: () => api.put(`/teacher/courses/${courseId}`, { name }),
    onSuccess: () => { qc.invalidateQueries(['teacher-course', courseId]); setEditName(false); toast.success('Renommé'); },
  });

  const addResource = useMutation({
    mutationFn: () => api.post(`/teacher/courses/${courseId}/resources`, { type: newType, title: newTitle }),
    onSuccess: () => {
      qc.invalidateQueries(['teacher-course', courseId]);
      setShowAddModal(false);
      toast.success('Ressource ajoutée');
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const course = data?.course;

  const handleTypeChange = (type) => {
    setNewType(type);
    setNewTitle(TYPE_LABELS[type] || '');
  };

  return (
    <TeacherLayout>
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium transition"
            >
              <Plus size={16} /> Ajouter une ressource
            </button>
            <Link
              to={`/teacher/courses/${courseId}/forum`}
              className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-100 text-sm font-medium transition"
            >
              <MessageCircle size={16} /> Forum
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {course?.resources?.map((r) => (
          <ResourceCard key={r.id} resource={r} courseId={courseId} onPreview={setViewingResource} />
        ))}
        {(!course?.resources || course.resources.length === 0) && (
          <div className="text-center text-gray-400 py-12 bg-white rounded-xl shadow-sm">
            <p className="mb-4">Aucune ressource pour ce cours.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm"
            >
              <Plus size={16} /> Ajouter la première ressource
            </button>
          </div>
        )}
      </div>

      {viewingResource && (
        <ResourceViewer resource={viewingResource} onClose={() => setViewingResource(null)} />
      )}

      {/* Add resource modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold mb-4">Ajouter une ressource</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Type de ressource</label>
                <select
                  value={newType}
                  onChange={e => handleTypeChange(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Object.entries(TYPE_LABELS).map(([type, label]) => (
                    <option key={type} value={type}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Titre</label>
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Titre de la ressource"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Annuler
                </button>
                <button
                  onClick={() => addResource.mutate()}
                  disabled={!newTitle.trim() || addResource.isPending}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60"
                >
                  {addResource.isPending ? 'Ajout…' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
