import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  FileText, Video, Link as LinkIcon, CheckSquare,
  GripVertical, MessageCircle, Eye, Upload,
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

const TYPE_COLORS = {
  presentation:      'bg-blue-50 text-blue-600',
  syllabus:          'bg-purple-50 text-purple-600',
  exercise:          'bg-amber-50 text-amber-600',
  exercise_solution: 'bg-green-50 text-green-600',
  revision:          'bg-cyan-50 text-cyan-600',
  revision_solution: 'bg-teal-50 text-teal-600',
  evaluation:        'bg-red-50 text-red-600',
  evaluation_solution: 'bg-rose-50 text-rose-600',
};

const FILE_ICONS = {
  pdf:               FileText,
  pptx:              FileText,
  docx:              FileText,
  xlsx:              FileText,
  image:             FileText,
  video_upload:      Video,
  video_youtube:     Video,
  link:              LinkIcon,
  qcm:               CheckSquare,
  drag_drop:         GripVertical,
  excel_interactive: CheckSquare,
  file_upload:       Upload,
};

/* Ressources pouvant être ouvertes dans le visionneur ou via Office */
const VIEWABLE = ['pdf', 'image', 'video_upload', 'video_youtube', 'link', 'pptx', 'docx', 'xlsx'];

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

  const openResource = (resource) => {
    markViewed.mutate(resource.id);
    setViewingResource(resource);
  };

  const course = data?.course;
  const resources = course?.resources?.filter(r => r.is_visible) || [];

  return (
    <StudentLayout>
      <div className="mb-6">
        <Link to="/student/dashboard" className="text-sm text-emerald-600 hover:underline">← Tableau de bord</Link>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{course?.name}</h1>
            <p className="text-gray-500 text-sm">{course?.section?.name}</p>
          </div>
          <Link
            to={`/student/courses/${courseId}/forum`}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg hover:bg-emerald-100 text-sm font-medium transition"
          >
            <MessageCircle size={16} /> Forum du cours
          </Link>
        </div>
      </div>

      <div className="grid gap-3">
        {resources.map(resource => {
          const Icon = FILE_ICONS[resource.file_type] || FileText;
          const INTERACTIVE = ['qcm', 'drag_drop', 'file_upload'];
          const isEmpty = !resource.file_path && !resource.external_url && !INTERACTIVE.includes(resource.file_type);
          const colorCls = TYPE_COLORS[resource.type] || 'bg-gray-50 text-gray-600';
          const canView = !isEmpty && VIEWABLE.includes(resource.file_type);

          return (
            <div key={resource.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colorCls}`}>
                  <Icon size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{resource.title}</p>
                  <p className="text-xs text-gray-400">{TYPE_LABELS[resource.type]}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Visionneur / ouverture */}
                  {canView && (
                    <button
                      onClick={() => openResource(resource)}
                      className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-emerald-700"
                    >
                      <Eye size={14} /> Visualiser
                    </button>
                  )}

                  {/* QCM */}
                  {resource.file_type === 'qcm' && (
                    <Link
                      to={`/student/resources/${resource.id}/qcm`}
                      onClick={() => markViewed.mutate(resource.id)}
                      className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-emerald-700"
                    >
                      <CheckSquare size={14} /> Faire le QCM
                    </Link>
                  )}

                  {/* Drag & Drop */}
                  {resource.file_type === 'drag_drop' && (
                    <Link
                      to={`/student/resources/${resource.id}/dragdrop`}
                      onClick={() => markViewed.mutate(resource.id)}
                      className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-purple-700"
                    >
                      <GripVertical size={14} /> Faire l'exercice
                    </Link>
                  )}

                  {/* Remise de fichier */}
                  {resource.file_type === 'file_upload' && (
                    <Link
                      to={`/student/resources/${resource.id}/exercise`}
                      onClick={() => markViewed.mutate(resource.id)}
                      className="flex items-center gap-1.5 bg-amber-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-amber-700"
                    >
                      <Upload size={14} /> Remettre
                    </Link>
                  )}

                  {isEmpty && (
                    <span className="text-xs text-gray-300 italic">Non disponible</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {resources.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p>Aucune ressource disponible pour ce cours.</p>
          </div>
        )}
      </div>

      {viewingResource && (
        <ResourceViewer resource={viewingResource} onClose={() => setViewingResource(null)} />
      )}
    </StudentLayout>
  );
}
