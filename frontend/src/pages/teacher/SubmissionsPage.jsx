import { useState } from 'react';
import { storageUrl } from '../../config';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Download, CheckCircle, Clock, ArrowLeft, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import TeacherLayout from '../../components/layout/TeacherLayout';

function SubmissionCard({ submission, exercise, resourceId }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [score, setScore] = useState(submission.score ?? '');
  const [comment, setComment] = useState(submission.teacher_comment ?? '');

  const correct = useMutation({
    mutationFn: () =>
      api.patch(`/teacher/submissions/${submission.id}/correct`, {
        score: Number(score),
        teacher_comment: comment || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries(['teacher-resource-submissions', resourceId]);
      setEditing(false);
      toast.success('Correction enregistrée');
    },
    onError: () => toast.error('Erreur lors de la correction'),
  });

  const student = submission.student;
  const isGraded = submission.status === 'corrected';

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 text-sm font-semibold text-indigo-700">
          {student?.first_name?.[0]}{student?.last_name?.[0]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="font-medium text-gray-800">
              {student?.first_name} {student?.last_name}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${isGraded ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              {isGraded ? `${submission.score} / ${exercise?.max_score}` : 'En attente'}
            </span>
            <span className="text-xs text-gray-400 ml-auto">
              {new Date(submission.submitted_at).toLocaleString('fr-BE', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>

          {submission.file_path && (
            <a
              href={storageUrl(submission.file_path)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline mb-2"
            >
              <Download size={14} /> Télécharger le fichier
            </a>
          )}

          {submission.content && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 max-h-32 overflow-y-auto mb-3">
              {submission.content}
            </div>
          )}

          {isGraded && !editing && (
            <div className="bg-green-50 rounded-lg p-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-green-800">
                  Note : {submission.score} / {exercise?.max_score}
                </p>
                {submission.teacher_comment && (
                  <p className="text-sm text-gray-600 mt-1">{submission.teacher_comment}</p>
                )}
              </div>
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition shrink-0"
                title="Modifier la note"
              >
                <Pencil size={14} />
              </button>
            </div>
          )}

          {(!isGraded || editing) && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 shrink-0">Note :</label>
                <input
                  type="number"
                  min={0}
                  max={exercise?.max_score}
                  value={score}
                  onChange={e => setScore(e.target.value)}
                  className="w-20 border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0"
                />
                <span className="text-sm text-gray-400">/ {exercise?.max_score}</span>
              </div>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Commentaire pour l'élève (optionnel)"
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex gap-2">
                {editing && (
                  <button
                    onClick={() => { setEditing(false); setScore(submission.score ?? ''); setComment(submission.teacher_comment ?? ''); }}
                    className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                )}
                <button
                  onClick={() => correct.mutate()}
                  disabled={score === '' || correct.isPending}
                  className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60"
                >
                  <CheckCircle size={14} />
                  {correct.isPending ? 'Enregistrement...' : 'Enregistrer la note'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SubmissionsPage() {
  const { resourceId } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-resource-submissions', resourceId],
    queryFn: () => api.get(`/teacher/resources/${resourceId}/submissions`).then(r => r.data),
  });

  const exercise = data?.exercise;
  const submissions = data?.submissions || [];
  const gradedCount = submissions.filter(s => s.status === 'corrected').length;

  return (
    <TeacherLayout>
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-indigo-600 hover:underline"
        >
          <ArrowLeft size={14} /> Retour au cours
        </button>

        <div className="mt-3">
          <h1 className="text-2xl font-bold text-gray-800">
            Remises — {exercise?.title || 'Exercice'}
          </h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <Users size={14} />
              {submissions.length} remise{submissions.length > 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle size={14} />
              {gradedCount} corrigée{gradedCount > 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1 text-amber-600">
              <Clock size={14} />
              {submissions.length - gradedCount} en attente
            </span>
            {exercise?.max_score && <span>Note max : {exercise.max_score}</span>}
            {exercise?.deadline && (
              <span>
                Date limite :{' '}
                {new Date(exercise.deadline).toLocaleDateString('fr-BE', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                })}
              </span>
            )}
          </div>
          {exercise?.instructions && (
            <div className="mt-3 bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
              {exercise.instructions}
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="text-center text-gray-400 py-12">Chargement...</div>
      )}

      <div className="space-y-4">
        {submissions.map(s => (
          <SubmissionCard key={s.id} submission={s} exercise={exercise} resourceId={resourceId} />
        ))}
        {!isLoading && submissions.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p>Aucune remise pour l'instant.</p>
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}
