import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import TeacherLayout from '../../components/layout/TeacherLayout';

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export default function ClassDetailPage() {
  const { classId } = useParams();
  const qc = useQueryClient();
  const [sectionModal, setSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [sectionForm, setSectionForm] = useState({ name: '', description: '' });

  const { data } = useQuery({
    queryKey: ['teacher-class', classId],
    queryFn: () => api.get(`/teacher/classes/${classId}`).then(r => r.data),
  });

  const createSection = useMutation({
    mutationFn: (d) => api.post(`/teacher/classes/${classId}/sections`, d),
    onSuccess: () => { qc.invalidateQueries(['teacher-class', classId]); toast.success('Section créée'); setSectionModal(false); },
  });

  const updateSection = useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/teacher/sections/${id}`, d),
    onSuccess: () => { qc.invalidateQueries(['teacher-class', classId]); toast.success('Modifié'); setEditingSection(null); },
  });

  const deleteSection = useMutation({
    mutationFn: (id) => api.delete(`/teacher/sections/${id}`),
    onSuccess: () => { qc.invalidateQueries(['teacher-class', classId]); toast.success('Supprimé'); },
  });

  const handleSectionSubmit = (e) => {
    e.preventDefault();
    if (editingSection) updateSection.mutate({ id: editingSection.id, ...sectionForm });
    else createSection.mutate(sectionForm);
  };

  const cls = data?.class;

  return (
    <TeacherLayout>
      <div className="mb-6">
        <Link to="/teacher/classes" className="text-sm text-indigo-600 hover:underline">← Classes</Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">{cls?.name}</h1>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-700">Sections</h2>
        <button onClick={() => { setSectionForm({ name: '', description: '' }); setSectionModal(true); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 text-sm">
          <Plus size={16} /> Section
        </button>
      </div>

      <div className="space-y-4">
        {cls?.sections?.map((sec) => (
          <div key={sec.id} className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">{sec.name}</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => { setSectionForm({ name: sec.name, description: sec.description || '' }); setEditingSection(sec); }}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50">
                  <Pencil size={15} />
                </button>
                <button onClick={() => confirm('Supprimer?') && deleteSection.mutate(sec.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              {sec.courses?.map((course) => (
                <Link key={course.id} to={`/teacher/courses/${course.id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-indigo-50 transition group">
                  <span className="text-gray-800 group-hover:text-indigo-700">{course.name}</span>
                  <ChevronRight size={16} className="text-gray-400 group-hover:text-indigo-600" />
                </Link>
              ))}

              <Link to={`/teacher/sections/${sec.id}/courses/new`}
                className="flex items-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition text-sm">
                <Plus size={16} /> Ajouter un cours
              </Link>
            </div>
          </div>
        ))}

        {(!cls?.sections || cls.sections.length === 0) && (
          <div className="text-center text-gray-400 py-12">Aucune section.</div>
        )}
      </div>

      {(sectionModal || editingSection) && (
        <Modal title={editingSection ? 'Modifier la section' : 'Nouvelle section'}
          onClose={() => { setSectionModal(false); setEditingSection(null); }}>
          <form onSubmit={handleSectionSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input value={sectionForm.name} onChange={e => setSectionForm({ ...sectionForm, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={sectionForm.description} onChange={e => setSectionForm({ ...sectionForm, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={2} />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setSectionModal(false); setEditingSection(null); }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50">Annuler</button>
              <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">
                {editingSection ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </TeacherLayout>
  );
}
