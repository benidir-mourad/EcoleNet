import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import TeacherLayout from '../../components/layout/TeacherLayout';

export default function EnrollmentsPage() {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['pending-enrollments'],
    queryFn: () => api.get('/teacher/enrollments/pending').then(r => r.data),
  });

  const approve = useMutation({
    mutationFn: (id) => api.patch(`/teacher/enrollments/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries(['pending-enrollments']); toast.success('Inscription approuvée'); },
  });

  const reject = useMutation({
    mutationFn: (id) => api.patch(`/teacher/enrollments/${id}/reject`),
    onSuccess: () => { qc.invalidateQueries(['pending-enrollments']); toast.success('Inscription refusée'); },
  });

  const enrollments = data?.enrollments || [];

  return (
    <TeacherLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Inscriptions en attente</h1>

      {enrollments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          Aucune inscription en attente.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Élève</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Classe</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {enrollments.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-800">{e.student?.first_name} {e.student?.last_name}</p>
                    <p className="text-sm text-gray-500">{e.student?.email}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{e.school_class?.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(e.created_at).toLocaleDateString('fr-BE')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => approve.mutate(e.id)}
                        className="flex items-center gap-1.5 bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-600">
                        <CheckCircle size={15} /> Approuver
                      </button>
                      <button onClick={() => reject.mutate(e.id)}
                        className="flex items-center gap-1.5 bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-sm hover:bg-red-200">
                        <XCircle size={15} /> Refuser
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </TeacherLayout>
  );
}
