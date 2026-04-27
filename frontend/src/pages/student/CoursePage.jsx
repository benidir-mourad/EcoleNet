import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Video, Link as LinkIcon, CheckSquare, Download } from 'lucide-react';
import api from '../../services/api';
import StudentLayout from '../../components/layout/StudentLayout';

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

const FILE_ICONS = {
  pdf: FileText,
  pptx: FileText,
  docx: FileText,
  xlsx: FileText,
  image: FileText,
  video_upload: Video,
  video_youtube: Video,
  link: LinkIcon,
  qcm: CheckSquare,
  drag_drop: CheckSquare,
  excel_interactive: CheckSquare,
};

export default function CoursePage() {
  const { courseId } = useParams();

  const { data } = useQuery({
    queryKey: ['student-course', courseId],
    queryFn: () => api.get(`/student/courses/${courseId}`).then(r => r.data),
  });

  const course = data?.course;
  const resources = course?.resources || [];

  return (
    <StudentLayout>
      <div className="mb-6">
        <Link to="/student/dashboard" className="text-sm text-emerald-600 hover:underline">← Tableau de bord</Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">{course?.name}</h1>
        <p className="text-gray-500 text-sm">{course?.section?.name}</p>
      </div>

      <div className="grid gap-4">
        {resources.map(resource => {
          const Icon = FILE_ICONS[resource.file_type] || FileText;
          const isEmpty = !resource.file_path && !resource.external_url;

          return (
            <div key={resource.id} className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                    <Icon size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{resource.title}</p>
                    <p className="text-xs text-gray-400">{TYPE_LABELS[resource.type]}</p>
                  </div>
                </div>

                {!isEmpty && (
                  <div className="flex items-center gap-2">
                    {resource.file_type === 'qcm' && (
                      <Link to={`/student/resources/${resource.id}/qcm`}
                        className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-emerald-700">
                        Faire le QCM
                      </Link>
                    )}
                    {resource.file_type === 'video_youtube' && resource.external_url && (
                      <a href={resource.external_url} target="_blank" rel="noreferrer"
                        className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-600">
                        Voir vidéo
                      </a>
                    )}
                    {resource.file_type === 'link' && resource.external_url && (
                      <a href={resource.external_url} target="_blank" rel="noreferrer"
                        className="bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-600">
                        Ouvrir lien
                      </a>
                    )}
                    {resource.file_path && !['qcm', 'drag_drop', 'excel_interactive'].includes(resource.file_type) && (
                      <a href={`http://localhost:8000/storage/${resource.file_path}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-200">
                        <Download size={14} /> Télécharger
                      </a>
                    )}
                  </div>
                )}

                {isEmpty && (
                  <span className="text-xs text-gray-300 italic">Non disponible</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </StudentLayout>
  );
}
