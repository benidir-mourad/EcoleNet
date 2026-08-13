import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload, CheckCircle, Clock, FileText, X, ArrowLeft,
  ChevronLeft, ChevronRight, BookOpen, Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import StudentLayout from '../../components/layout/StudentLayout';
import MarkdownRenderer from '../../components/MarkdownRenderer';

/* Split markdown into pages on standalone --- lines */
function splitPages(md) {
  if (!md?.trim()) return [];
  const parts = md.split(/\n---\n/).map(p => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [];
}

export default function ExercisePage() {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [file, setFile] = useState(null);
  const [content, setContent] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const fileInputRef = useRef();

  const { data, isLoading } = useQuery({
    queryKey: ['student-exercise', resourceId],
    queryFn: () => api.get(`/student/resources/${resourceId}/submission`).then(r => r.data),
  });

  const submit = useMutation({
    mutationFn: () => {
      const form = new FormData();
      if (file) form.append('file', file);
      if (content.trim()) form.append('content', content);
      return api.post(`/student/resources/${resourceId}/submit`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['student-exercise', resourceId]);
      setFile(null);
      setContent('');
      toast.success('Travail remis avec succès !');
    },
    onError: e => toast.error(e.response?.data?.message || 'Erreur lors de la remise'),
  });

  const exercise  = data?.exercise;
  const submission = data?.submission;
  const isGraded   = submission?.status === 'corrected';
  const isSubmitted = !!submission;
  const isDeadlinePassed = exercise?.deadline && new Date(exercise.deadline) < new Date();
  const canSubmit  = (file || content.trim()) && !submit.isPending;

  const pages    = splitPages(exercise?.instructions || '');
  const pageIdx  = Math.min(currentPage, Math.max(pages.length - 1, 0));
  const hasPages = pages.length > 0;

  return (
    <StudentLayout>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-emerald-600 hover:underline"
        >
          <ArrowLeft size={14} /> Retour au cours
        </button>
        <div className="mt-3">
          <h1 className="text-2xl font-bold text-gray-800">
            {exercise?.title || 'Exercice'}
          </h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
            {exercise?.max_score && <span>Note max : {exercise.max_score}</span>}
            {exercise?.deadline && (
              <span className={isDeadlinePassed ? 'text-red-500 font-medium' : ''}>
                Date limite :{' '}
                {new Date(exercise.deadline).toLocaleString('fr-BE', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
                {isDeadlinePassed && ' — Délai dépassé'}
              </span>
            )}
          </div>
        </div>
      </div>

      {isLoading && <div className="text-center text-gray-400 py-12">Chargement...</div>}

      {/* ── Énoncé paginé ─────────────────────────────── */}
      {hasPages && (
        <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
          {/* Page nav header */}
          <div className="flex items-center justify-between px-5 py-3 bg-emerald-50 border-b border-emerald-100">
            <div className="flex items-center gap-2">
              <BookOpen size={15} className="text-emerald-600" />
              <span className="text-sm font-medium text-emerald-800">
                Énoncé
                {pages.length > 1 && (
                  <span className="ml-2 text-emerald-600">· Page {pageIdx + 1} / {pages.length}</span>
                )}
              </span>
            </div>

            {pages.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={pageIdx === 0}
                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100 disabled:opacity-30 transition"
                >
                  <ChevronLeft size={15} />
                </button>
                {pages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                      i === pageIdx
                        ? 'bg-emerald-600 text-white'
                        : 'text-emerald-600 hover:bg-emerald-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(pages.length - 1, p + 1))}
                  disabled={pageIdx === pages.length - 1}
                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100 disabled:opacity-30 transition"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-7">
            <MarkdownRenderer content={pages[pageIdx] || ''} />
          </div>

          {/* Bottom navigation for multi-page */}
          {pages.length > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t bg-gray-50">
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={pageIdx === 0}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-700 disabled:opacity-30 transition"
              >
                <ChevronLeft size={15} /> Page précédente
              </button>
              <span className="text-xs text-gray-400">{pageIdx + 1} / {pages.length}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(pages.length - 1, p + 1))}
                disabled={pageIdx === pages.length - 1}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-700 disabled:opacity-30 transition"
              >
                Page suivante <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Fichier modèle à télécharger ─────────────── */}
      {exercise?.template_file_name && (
        <div className="bg-indigo-50 rounded-xl p-4 flex items-center justify-between border border-indigo-200 mb-6">
          <div>
            <p className="text-sm font-medium text-indigo-800">Fichier modèle à compléter</p>
            <p className="text-xs text-indigo-600 mt-0.5">{exercise.template_file_name}</p>
          </div>
          <a
            href={exercise.template_file_url}
            download
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition">
            <Download size={14} /> Télécharger
          </a>
        </div>
      )}

      {/* ── Statut de la remise ────────────────────────── */}
      {isGraded && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={18} className="text-green-600" />
            <span className="font-semibold text-green-800">Corrigé</span>
            <span className="text-lg font-bold text-green-700 ml-auto">
              {submission.score} / {exercise?.max_score}
            </span>
          </div>
          {submission.teacher_comment && (
            <p className="text-sm text-gray-700 mt-2 border-t border-green-200 pt-2">
              {submission.teacher_comment}
            </p>
          )}
        </div>
      )}

      {isSubmitted && !isGraded && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Clock size={18} className="text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Remis le{' '}
              {new Date(submission.submitted_at).toLocaleString('fr-BE', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">En attente de correction</p>
          </div>
        </div>
      )}

      {/* ── Formulaire de remise ───────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-5">
          {isSubmitted ? 'Soumettre à nouveau' : 'Déposer votre travail'}
        </h2>

        {/* File drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition mb-4 ${
            file
              ? 'border-emerald-400 bg-emerald-50'
              : 'border-gray-200 hover:border-emerald-400 hover:bg-emerald-50'
          }`}
        >
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText size={20} className="text-emerald-600" />
              <span className="text-sm text-emerald-700 font-medium">{file.name}</span>
              <button
                onClick={e => { e.stopPropagation(); setFile(null); }}
                className="text-gray-400 hover:text-red-500 transition"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <Upload size={28} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500">Cliquez pour choisir un fichier</p>
              <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, images… (max 20 Mo)</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={e => setFile(e.target.files[0] || null)}
          />
        </div>

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Ou rédigez votre réponse ici (optionnel si un fichier est fourni)…"
          rows={4}
          className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-5"
        />

        <button
          onClick={() => canSubmit && submit.mutate()}
          disabled={!canSubmit}
          className="w-full bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 transition"
        >
          {submit.isPending ? 'Envoi en cours…' : isSubmitted ? 'Resoumettre le travail' : 'Remettre le travail'}
        </button>
      </div>
    </StudentLayout>
  );
}
