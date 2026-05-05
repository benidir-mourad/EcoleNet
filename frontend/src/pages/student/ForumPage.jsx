import { useState } from 'react';
import { storageUrl } from '../../config';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Pin, Plus, ChevronDown, ChevronUp, Send, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import StudentLayout from '../../components/layout/StudentLayout';
import useAuthStore from '../../store/authStore';

function Avatar({ user, color = 'emerald' }) {
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();
  const avatarUrl = user?.avatar ? storageUrl(user.avatar) : null;
  return (
    <div className={`w-8 h-8 rounded-full bg-${color}-100 flex items-center justify-center overflow-hidden shrink-0`}>
      {avatarUrl
        ? <img src={avatarUrl} alt="" className="w-8 h-8 object-cover" />
        : <span className={`text-xs font-semibold text-${color}-700`}>{initials}</span>
      }
    </div>
  );
}

function ReplyItem({ reply }) {
  const isTeacher = reply.user?.role === 'teacher';

  return (
    <div className={`flex gap-3 pl-4 border-l-2 ${isTeacher ? 'border-indigo-200' : 'border-gray-100'}`}>
      <Avatar user={reply.user} color={isTeacher ? 'indigo' : 'gray'} />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-700">
            {reply.user?.first_name} {reply.user?.last_name}
          </span>
          {isTeacher && (
            <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">Prof</span>
          )}
          <span className="text-xs text-gray-400">
            {new Date(reply.created_at).toLocaleString('fr-BE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="text-sm text-gray-700">{reply.content}</p>
      </div>
    </div>
  );
}

function PostCard({ post, courseId, onDelete }) {
  const qc = useQueryClient();
  const { user: me } = useAuthStore();
  const [expanded, setExpanded] = useState(post.is_pinned);
  const [replyText, setReplyText] = useState('');
  const isTeacher = post.user?.role === 'teacher';
  const isOwn = post.user_id === me?.id;

  const sendReply = useMutation({
    mutationFn: () => api.post(`/student/forum/${post.id}/reply`, { content: replyText }),
    onSuccess: () => {
      qc.invalidateQueries(['student-forum', courseId]);
      setReplyText('');
      setExpanded(true);
      toast.success('Réponse envoyée');
    },
    onError: () => toast.error('Erreur lors de la réponse'),
  });

  return (
    <div className={`bg-white rounded-xl shadow-sm p-5 ${post.is_pinned ? 'border-l-4 border-l-amber-400' : ''}`}>
      <div className="flex items-start gap-3">
        <Avatar user={post.user} color={isTeacher ? 'indigo' : 'emerald'} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-800 text-sm">
              {post.user?.first_name} {post.user?.last_name}
            </span>
            {isTeacher && (
              <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">Professeur</span>
            )}
            {post.is_pinned && (
              <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <Pin size={10} /> Épinglé
              </span>
            )}
            <span className="text-xs text-gray-400 ml-auto">
              {new Date(post.created_at).toLocaleString('fr-BE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
            {isOwn && (
              <button
                onClick={() => window.confirm('Supprimer ce post ?') && onDelete(post.id)}
                className="p-1 text-gray-300 hover:text-red-500 rounded transition"
                title="Supprimer"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>

          {post.title && <h4 className="font-semibold text-gray-800 mb-1">{post.title}</h4>}
          <p className="text-sm text-gray-700">{post.content}</p>

          {post.replies?.length > 0 && (
            <button onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-600 mt-2">
              <MessageCircle size={13} />
              {post.replies.length} réponse{post.replies.length > 1 ? 's' : ''}
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}

          {expanded && post.replies?.length > 0 && (
            <div className="mt-3 space-y-3">
              {post.replies.map(r => <ReplyItem key={r.id} reply={r} />)}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <input
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Répondre..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && replyText.trim() && sendReply.mutate()}
            />
            <button
              onClick={() => replyText.trim() && sendReply.mutate()}
              disabled={!replyText.trim() || sendReply.isPending}
              className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentForumPage() {
  const { courseId } = useParams();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['student-forum', courseId],
    queryFn: () => api.get(`/student/courses/${courseId}/forum`).then(r => r.data),
  });

  const { data: courseData } = useQuery({
    queryKey: ['student-course', courseId],
    queryFn: () => api.get(`/student/courses/${courseId}`).then(r => r.data),
  });

  const createPost = useMutation({
    mutationFn: () => api.post(`/student/courses/${courseId}/forum`, form),
    onSuccess: () => {
      qc.invalidateQueries(['student-forum', courseId]);
      setForm({ title: '', content: '' });
      setShowForm(false);
      toast.success('Question publiée');
    },
    onError: () => toast.error('Erreur lors de la publication'),
  });

  const deletePost = useMutation({
    mutationFn: (id) => api.delete(`/student/forum/${id}`),
    onSuccess: () => { qc.invalidateQueries(['student-forum', courseId]); toast.success('Post supprimé'); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const posts = data?.posts || [];
  const course = courseData?.course;

  return (
    <StudentLayout>
      <div className="mb-6">
        <Link to={`/student/courses/${courseId}`} className="text-sm text-emerald-600 hover:underline">
          ← {course?.name || 'Cours'}
        </Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-bold text-gray-800">Forum — {course?.name}</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm"
          >
            <Plus size={16} /> Poser une question
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">Nouvelle question</h3>
          <div className="space-y-3">
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Titre de votre question (optionnel)"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <textarea
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
              placeholder="Décrivez votre question en détail..."
              rows={4}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                Annuler
              </button>
              <button
                onClick={() => form.content.trim() && createPost.mutate()}
                disabled={!form.content.trim() || createPost.isPending}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                Publier
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && <div className="text-center text-gray-400 py-12">Chargement...</div>}

      <div className="space-y-4">
        {posts.map(post => (
          <PostCard key={post.id} post={post} courseId={courseId} onDelete={(id) => deletePost.mutate(id)} />
        ))}
        {!isLoading && posts.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
            <MessageCircle size={40} className="mx-auto mb-3 opacity-30" />
            <p>Aucune question pour l'instant. Posez la première !</p>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
