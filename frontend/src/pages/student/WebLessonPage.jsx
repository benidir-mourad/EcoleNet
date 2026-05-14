import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import api from '../../services/api';
import StudentLayout from '../../components/layout/StudentLayout';

const calloutStyle = {
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
};

const splitFillBlankText = (text = '') => {
  const parts = [];
  const regex = /\[\[(.*?)\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'blank', answer: match[1] || '' });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts;
};

const exercisePath = (resource) => {
  const paths = {
    qcm: 'qcm',
    drag_drop: 'dragdrop',
    fill_blanks: 'fill-blanks',
    ordering: 'ordering',
    code_editor: 'code-editor',
    truth_table: 'truth-table',
    file_upload: 'exercise',
  };

  return paths[resource?.file_type] ? `/student/resources/${resource.id}/${paths[resource.file_type]}` : null;
};

function LessonBlock({ block }) {
  const [fillAnswers, setFillAnswers] = useState({});
  const [fillChecked, setFillChecked] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizChecked, setQuizChecked] = useState(false);

  if (block.type === 'heading') {
    return <h2 className="text-xl font-bold text-gray-900">{block.text}</h2>;
  }

  if (block.type === 'code') {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-950">
        <div className="border-b border-white/10 px-4 py-2 text-xs font-medium uppercase text-gray-400">
          {block.language || 'code'}
        </div>
        <pre className="overflow-x-auto p-4 text-sm text-gray-100"><code>{block.code}</code></pre>
      </div>
    );
  }

  if (block.type === 'callout') {
    return (
      <div className={`rounded-xl border p-4 text-sm leading-6 ${calloutStyle[block.tone] || calloutStyle.info}`}>
        {block.text}
      </div>
    );
  }

  if (block.type === 'fill_blank') {
    const parts = splitFillBlankText(block.text);
    const blanks = parts.filter(part => part.type === 'blank');
    const normalize = (value) => {
      const trimmed = String(value || '').trim();
      return block.case_sensitive ? trimmed : trimmed.toLowerCase();
    };
    const correctCount = blanks.filter((blank, index) => normalize(fillAnswers[index]) === normalize(blank.answer)).length;

    return (
      <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
        {block.prompt && <p className="mb-4 text-sm font-semibold text-sky-900">{block.prompt}</p>}
        <div className="text-base leading-9 text-gray-800">
          {parts.map((part, index) => {
            if (part.type === 'text') return <span key={index}>{part.value}</span>;

            const blankIndex = parts.slice(0, index).filter(item => item.type === 'blank').length;
            const isCorrect = fillChecked && normalize(fillAnswers[blankIndex]) === normalize(part.answer);
            const isWrong = fillChecked && !isCorrect;

            return (
              <input
                key={index}
                value={fillAnswers[blankIndex] || ''}
                onChange={e => {
                  setFillAnswers(values => ({ ...values, [blankIndex]: e.target.value }));
                  setFillChecked(false);
                }}
                className={`mx-1 inline-block w-32 rounded-lg border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${isCorrect ? 'border-emerald-300 bg-emerald-50' : isWrong ? 'border-red-300 bg-red-50' : 'border-sky-200 bg-white'}`}
                aria-label={`Trou ${blankIndex + 1}`}
              />
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setFillChecked(true)}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            Corriger
          </button>
          {fillChecked && (
            <span className="text-sm font-medium text-gray-700">
              {correctCount}/{blanks.length} bonne{correctCount > 1 ? 's' : ''} reponse{correctCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (block.type === 'quiz') {
    const options = block.options || [];
    const correctIndexes = options
      .map((option, index) => option.is_correct ? index : null)
      .filter(index => index !== null);
    const selectedIndexes = Object.entries(quizAnswers)
      .filter(([, selected]) => selected)
      .map(([index]) => Number(index));
    const isCorrect = correctIndexes.length === selectedIndexes.length
      && correctIndexes.every(index => selectedIndexes.includes(index));

    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
        <p className="mb-4 text-base font-semibold text-amber-950">{block.question || 'Question'}</p>
        <div className="space-y-2">
          {options.map((option, index) => {
            const selected = Boolean(quizAnswers[index]);
            const showCorrect = quizChecked && option.is_correct;
            const showWrong = quizChecked && selected && !option.is_correct;

            return (
              <label
                key={index}
                className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 text-sm ${showCorrect ? 'border-emerald-300 text-emerald-800' : showWrong ? 'border-red-300 text-red-800' : 'border-amber-100 text-gray-800'}`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={e => {
                    setQuizAnswers(values => ({ ...values, [index]: e.target.checked }));
                    setQuizChecked(false);
                  }}
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setQuizChecked(true)}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Corriger
          </button>
          {quizChecked && (
            <span className={`text-sm font-semibold ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
              {isCorrect ? 'Bonne reponse' : 'A corriger'}
            </span>
          )}
        </div>
        {quizChecked && block.explanation && (
          <p className="mt-3 rounded-xl bg-white/70 px-4 py-3 text-sm text-gray-700">{block.explanation}</p>
        )}
      </div>
    );
  }

  if (block.type === 'exercise_link') {
    const linkedResource = block.linked_resource;
    const path = exercisePath(linkedResource);

    return (
      <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">Exercice associe</p>
        <h3 className="mt-2 text-lg font-bold text-gray-900">{linkedResource?.title || 'Exercice indisponible'}</h3>
        {block.text && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">{block.text}</p>}
        {path ? (
          <Link
            to={path}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            {block.button_label || 'Commencer l exercice'} <ExternalLink size={15} />
          </Link>
        ) : (
          <p className="mt-4 rounded-lg bg-white/70 px-3 py-2 text-sm text-violet-700">
            Cet exercice n'est pas encore disponible pour les eleves.
          </p>
        )}
      </div>
    );
  }

  return <p className="whitespace-pre-line text-base leading-7 text-gray-700">{block.text}</p>;
}

export default function WebLessonPage() {
  const { resourceId } = useParams();
  const [pageIndex, setPageIndex] = useState(0);

  const { data } = useQuery({
    queryKey: ['student-web-lesson', resourceId],
    queryFn: () => api.get(`/student/resources/${resourceId}/web-lesson`).then(r => r.data),
  });

  useEffect(() => {
    api.post(`/student/resources/${resourceId}/view`).catch(() => {});
  }, [resourceId]);

  const pages = data?.lesson?.content?.pages || [];
  const page = pages[pageIndex] || pages[0];
  const percent = pages.length > 0 ? Math.round(((pageIndex + 1) / pages.length) * 100) : 0;

  return (
    <StudentLayout>
      <div className="mb-6">
        <Link to={`/student/courses/${data?.resource?.course_id || ''}`}
          className="mb-3 flex items-center gap-1 text-sm text-emerald-600 hover:underline">
          <ArrowLeft size={14} /> Retour au cours
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{data?.resource?.title || 'Lecon web'}</h1>
            <p className="text-sm text-gray-500">{pages.length} page{pages.length > 1 ? 's' : ''}</p>
          </div>
          <span className="text-sm font-medium text-emerald-700">{percent}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {!page ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-gray-400">
          Cette lecon n'a pas encore de contenu.
        </div>
      ) : (
        <article className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <p className="text-sm text-gray-400">Page {pageIndex + 1} sur {pages.length}</p>
              <h2 className="text-2xl font-bold text-gray-900">{page.title}</h2>
            </div>
          </div>

          <div className="space-y-6">
            {(page.blocks || []).map((block, index) => <LessonBlock key={index} block={block} />)}
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={() => setPageIndex(index => Math.max(0, index - 1))}
              disabled={pageIndex === 0}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft size={16} /> Precedent
            </button>
            <button
              type="button"
              onClick={() => setPageIndex(index => Math.min(pages.length - 1, index + 1))}
              disabled={pageIndex >= pages.length - 1}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              Suivant <ChevronRight size={16} />
            </button>
          </div>
        </article>
      )}
    </StudentLayout>
  );
}
