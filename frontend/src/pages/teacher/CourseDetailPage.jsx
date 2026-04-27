import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Upload, ExternalLink, CheckSquare, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import TeacherLayout from '../../components/layout/TeacherLayout';

const TYPE_LABELS = {
  presentation: 'Présentation',
  syllabus: 'Syllabus',
  exercise: 'Exercice',
  exercise_solution: 'Solution exercice',
  revision: 'Révision',
  revision_solution: 'Solution révision',
  evaluation: 'Évaluation',
  evaluation_solution: 'Correction évaluation',
};

const TYPE_BORDER = {
  presentation: 'border-l-blue-400',
  syllabus: 'border-l-purple-400',
  exercise: 'border-l-amber-400',
  exercise_solution: 'border-l-green-400',
  revision: 'border-l-cyan-400',
  revision_solution: 'border-l-teal-400',
  evaluation: 'border-l-red-400',
  evaluation_solution: 'border-l-rose-400',
};

const TYPE_BADGE = {
  presentation: 'text-blue-600 bg-blue-50',
  syllabus: 'text-purple-600 bg-purple-50',
  exercise: 'text-amber-600 bg-amber-50',
  exercise_solution: 'text-green-600 bg-green-50',
  revision: 'text-cyan-600 bg-cyan-50',
  revision_solution: 'text-teal-600 bg-teal-50',
  evaluation: 'text-red-600 bg-red-50',
  evaluation_solution: 'text-rose-600 bg-rose-50',
};

function ResourceCard({ resource, courseId }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [url, setUrl] = useState(resource.external_url || '');

  const toggleVisibility = useMutation({
    mutationFn: () => api.patch(`/teacher/resources/${resource.id}/visibility`),
    onSuccess: () => qc.invalidateQueries(['teacher-course', courseId]),
  });

  const updateUrl = useMutation({
    mutationFn: (u) => api.put(`/teacher/resources/${resource.id}`, { external_url: u, file_type: 'link' }),
    onSuccess: () => { qc.invalidateQueries(['teacher-course', courseId]); setShowUrlModal(false); toast.success('Lien enregistré'); },
  });

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/teacher/resources/${resource.id}/file`, form);
      qc.invalidateQueries(['teacher-course', courseId]);
      toast.success('Fichier uploadé');
    } catch { toast.error('Erreur upload'); }
    finally { setUploading(false); }
  };

  const isEmpty = !resource.file_path && !resource.external_url && !resource.file_type;

  return (
    <div className={`bg-white rounded-xl border-l-4 ${TYPE_BORDER[resource.type]} shadow-sm p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[resource.type]}`}>
              {TYPE_LABELS[resource.type]}
            </span>
            {!isEmpty && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${resource.is_visible ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {resource.is_visible ? 'Visible' : 'Masqué'}
              </span>
            )}
          </div>
          <h3 className="font-medium text-gray-800">{resource.title}</h3>
          {resource.file_name && <p className="text-xs text-gray-400 mt-1">{resource.file_name}</p>}
          {resource.external_url && (
            <a href={resource.external_url} target="_blank" rel="noreferrer"
              className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1">
              <ExternalLink size={12} /> {resource.external_url.slice(0, 50)}...
            </a>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isEmpty && (
            <button onClick={() => toggleVisibility.mutate()}
              className={`p-2 rounded-lg transition ${resource.is_visible ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}>
              {resource.is_visible ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          )}

          <label className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition">
            <Upload size={18} />
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>

          <button onClick={() => setShowUrlModal(true)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
            <ExternalLink size={18} />
          </button>

          <Link to={`/teacher/resources/${resource.id}/qcm`}
            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">
            <CheckSquare size={18} />
          </Link>
        </div>
      </div>

      {isEmpty && (
        <p className="text-xs text-gray-400 mt-3 italic">Aucun contenu — uploadez un fichier, ajoutez un lien ou créez un QCM</p>
      )}

      {showUrlModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold mb-4">Ajouter un lien</h3>
            <input value={url} onChange={e => setUrl(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              placeholder="https://..." />
            <div className="flex gap-3">
              <button onClick={() => setShowUrlModal(false)} className="flex-1 border border-gray-300 py-2 rounded-lg">Annuler</button>
              <button onClick={() => updateUrl.mutate(url)} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg">Enregistrer</button>
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

  const { data } = useQuery({
    queryKey: ['teacher-course', courseId],
    queryFn: () => api.get(`/teacher/courses/${courseId}`).then(r => r.data),
  });

  const updateName = useMutation({
    mutationFn: () => api.put(`/teacher/courses/${courseId}`, { name }),
    onSuccess: () => { qc.invalidateQueries(['teacher-course', courseId]); setEditName(false); toast.success('Renommé'); },
  });

  const course = data?.course;

  return (
    <TeacherLayout>
      <div className="mb-6">
        <Link to={`/teacher/classes/${course?.section?.class_id}`} className="text-sm text-indigo-600 hover:underline">
          ← {course?.section?.school_class?.name} / {course?.section?.name}
        </Link>
        <div className="flex items-center gap-3 mt-2">
          {editName ? (
            <div className="flex items-center gap-2">
              <input value={name} onChange={e => setName(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500" />
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
      </div>

      <div className="grid gap-4">
        {course?.resources?.map((r) => (
          <ResourceCard key={r.id} resource={r} courseId={courseId} />
        ))}
      </div>
    </TeacherLayout>
  );
}
