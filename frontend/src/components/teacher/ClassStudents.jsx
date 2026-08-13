import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Mail, ArrowRightLeft, Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getApiErrorMessage } from '../../services/api';
import { avatarUrl } from '../../config';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-BE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function ProgressBar({ percent }) {
  const tone = percent >= 70 ? 'bg-emerald-500' : percent >= 30 ? 'bg-amber-500' : 'bg-red-400';

  return (
    <div className="flex items-center gap-2 min-w-[7rem]">
      <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-500 tabular-nums w-9 text-right">{percent}%</span>
    </div>
  );
}

/* ── Déplacer un élève vers une autre classe ─────────────────────────────── */
function TransferModal({ student, currentClassId, onClose }) {
  const qc = useQueryClient();
  const [targetId, setTargetId] = useState('');

  const { data: classesData } = useQuery({
    queryKey: ['teacher-classes-for-transfer'],
    queryFn: () => api.get('/teacher/classes').then(r => r.data),
  });

  const others = (classesData?.classes || []).filter(c => String(c.id) !== String(currentClassId));

  const transfer = useMutation({
    mutationFn: () => api.patch(`/teacher/enrollments/${student.enrollment_id}/transfer`, {
      class_id: Number(targetId),
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['class-students', String(currentClassId)] });
      toast.success(res.data.message);
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Le déplacement a échoué.')),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-800">Déplacer {student.full_name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-500">
            L’élève garde ses résultats. Il recevra une notification l’informant de son changement de classe.
          </p>

          <select
            value={targetId}
            onChange={e => setTargetId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— Classe de destination —</option>
            {others.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {others.length === 0 && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Tu ne gères qu’une seule classe : il n’y a nulle part où le déplacer.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Annuler
            </button>
            <button
              onClick={() => transfer.mutate()}
              disabled={!targetId || transfer.isPending}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {transfer.isPending ? 'Déplacement…' : 'Déplacer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Liste des élèves d'une classe ───────────────────────────────────────── */
export default function ClassStudents({ classId, className }) {
  const [transferring, setTransferring] = useState(null);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['class-students', String(classId)],
    queryFn: () => api.get(`/teacher/classes/${classId}/students`).then(r => r.data),
  });

  const students = data?.students || [];

  // Le téléchargement passe par axios pour porter le jeton : un lien direct
  // partirait sans en-tête d'authentification.
  const exportGrades = async () => {
    setExporting(true);
    try {
      const res = await api.get(`/teacher/classes/${classId}/grades.xlsx`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `notes-${className || 'classe'}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('L’export a échoué.');
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center text-gray-400 py-12">Chargement…</div>;
  }

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-14 text-center">
        <Users size={44} className="mx-auto mb-4 text-gray-200" />
        <p className="text-gray-500 font-medium mb-1">Aucun élève dans cette classe</p>
        <p className="text-gray-400 text-sm">
          Les élèves apparaissent ici une fois leur demande d’inscription validée.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-700">{students.length}</span>{' '}
          {students.length > 1 ? 'élèves inscrits' : 'élève inscrit'}
        </p>

        <button
          onClick={exportGrades}
          disabled={exporting}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-60"
        >
          {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          Exporter les notes
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[46rem]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wide px-5 py-3">Élève</th>
                <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wide px-5 py-3">Inscrit le</th>
                <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wide px-5 py-3">Progression</th>
                <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wide px-5 py-3">Dernière activité</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {student.avatar
                        ? <img src={avatarUrl(student.avatar)} alt="" className="w-8 h-8 rounded-full object-cover" />
                        : <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-semibold">
                            {student.first_name?.[0]}{student.last_name?.[0]}
                          </div>}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{student.full_name}</p>
                        <p className="text-xs text-gray-400 truncate">{student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDate(student.enrolled_at)}</td>
                  <td className="px-5 py-3">
                    <ProgressBar percent={student.progress_percent} />
                    <p className="text-[11px] text-gray-400 mt-1">
                      {student.viewed_resources} / {student.total_resources} ressources
                    </p>
                  </td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDate(student.last_activity_at)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href="/teacher/messages"
                        title="Écrire à cet élève"
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      >
                        <Mail size={15} />
                      </a>
                      <button
                        onClick={() => setTransferring(student)}
                        title="Changer de classe"
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      >
                        <ArrowRightLeft size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {transferring && (
        <TransferModal
          student={transferring}
          currentClassId={classId}
          onClose={() => setTransferring(null)}
        />
      )}
    </>
  );
}
