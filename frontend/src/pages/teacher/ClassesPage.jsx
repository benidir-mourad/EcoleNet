import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronRight, Pencil, Trash2, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
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

export default function ClassesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', year: '' });

  const { data } = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: () => api.get('/teacher/classes').then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d) => api.post('/teacher/classes', d),
    onSuccess: () => { qc.invalidateQueries(['teacher-classes']); toast.success('Classe créée'); setShowModal(false); },
    onError: () => toast.error('Erreur'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/teacher/classes/${id}`, d),
    onSuccess: () => { qc.invalidateQueries(['teacher-classes']); toast.success('Modifié'); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/teacher/classes/${id}`),
    onSuccess: () => { qc.invalidateQueries(['teacher-classes']); toast.success('Supprimé'); },
  });

  const openCreate = () => { setForm({ name: '', description: '', year: '' }); setShowModal(true); };
  const openEdit = (cls) => { setForm({ name: cls.name, description: cls.description || '', year: cls.year || '' }); setEditing(cls); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) updateMut.mutate({ id: editing.id, ...form });
    else createMut.mutate(form);
  };

  return (
    <TeacherLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Classes & Cours</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
          <Plus size={18} /> Nouvelle classe
        </button>
      </div>

      <div className="grid gap-4">
        {data?.classes?.map((cls) => (
          <div key={cls.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">{cls.name}</h2>
                {cls.year && <p className="text-sm text-gray-500">Année: {cls.year}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(cls)} className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50">
                  <Pencil size={16} />
                </button>
                <button onClick={() => confirm('Supprimer cette classe ?') && deleteMut.mutate(cls.id)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                  <Trash2 size={16} />
                </button>
                <Link to={`/teacher/classes/${cls.id}`} className="flex items-center gap-1 text-sm text-indigo-600 hover:underline ml-2">
                  Gérer <ChevronRight size={16} />
                </Link>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {cls.sections?.map((sec) => (
                <span key={sec.id} className="bg-indigo-50 text-indigo-700 text-xs px-3 py-1 rounded-full">
                  {sec.name} ({sec.courses?.length || 0} cours)
                </span>
              ))}
              {(!cls.sections || cls.sections.length === 0) && (
                <span className="text-gray-400 text-sm">Aucune section</span>
              )}
            </div>
          </div>
        ))}

        {(!data?.classes || data.classes.length === 0) && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
            <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
            <p>Aucune classe. Créez votre première classe.</p>
          </div>
        )}
      </div>

      {(showModal || editing) && (
        <Modal title={editing ? 'Modifier la classe' : 'Nouvelle classe'} onClose={() => { setShowModal(false); setEditing(null); }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required placeholder="Ex: 5e technique informatique" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
              <input value={form.year} onChange={e => setForm({ ...form, year: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ex: 2025-2026" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={3} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowModal(false); setEditing(null); }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50">
                Annuler
              </button>
              <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">
                {editing ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </TeacherLayout>
  );
}
