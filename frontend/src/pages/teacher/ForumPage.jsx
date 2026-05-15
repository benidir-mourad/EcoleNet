import { useEffect, useRef, useState } from 'react';
import { storageUrl } from '../../config';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Pin, Trash2, Plus, ChevronDown, ChevronUp, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import TeacherLayout from '../../components/layout/TeacherLayout';

function Avatar({ user, size = 8 }) {
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();
  const avatarUrl = user?.avatar ? storageUrl(user.avatar) : null;
  const cls = `w-${size} h-${size} rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden shrink-0`;
  return (
    <div className={cls}>
      {avatarUrl
        ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        : <span className="text-xs font-semibold text-indigo-700">{initials}</span>
      }
    </div>
  );
}

function ReplyItem({ reply, onDelete }) {
  return (
    <div className="flex gap-3 pl-4 border-l-2 border-gray-100">
      <Avatar user={reply.user} size={7} />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-700">
            {reply.user?.first_name} {reply.user?.last_name}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(reply.created_at).toLocaleString('fr-BE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="text-sm text-gray-700">{reply.content}</p>
      </div>
      <button onClick={() => onDelete(reply.id)} className="text-gray-300 hover:text-red-500 p-1">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function PostCard({ post, courseId, onDelete, onPin, focusedPostId }) {
  const qc = useQueryClient();
  const isFocused = focusedPostId === String(post.id);
  const cardRef = useRef(null);
  const [expanded, setExpanded] = useState(isFocused);
  const [replyText, setReplyText] = useState('');

  const sendReply = useMutation({
    mutationFn: () => api.post(`/teacher/forum/${post.id}/reply`, { content: replyText }),
    onSuccess: () => {
      qc.invalidateQueries(['teacher-forum', courseId]);
      setReplyText('');
      setExpanded(true);
    },
    onError: () => toast.error('Erreur lors de la réponse'),
  });

  useEffect(() => {
    if (!isFocused) return;

    setExpanded(true);
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [isFocused]);

  return (
    <div ref={cardRef} className={`bg-white rounded-xl shadow-sm p-5 ${post.is_pinned ? 'border-l-4 border-l-amber-400' : ''} ${isFocused ? 'ring-2 ring-indigo-300' : ''}`}>
      <div className="flex items-start gap-3">
        <Avatar user={post.user} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              {post.title && <h4 className="font-semibold text-gray-800 mb-0.5">{post.title}</h4>}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-600">{post.user?.first_name} {post.user?.last_name}</span>
                {post.is_pinned && (
                  <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Pin size={10} /> Épinglé
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {new Date(post.created_at).toLocaleString('fr-BE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-gray-700 text-sm">{post.content}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => onPin(post.id)}
                className={`p-1.5 rounded-lg transition ${post.is_pinned ? 'text-amber-500 bg-amber-50' : 'text-gray-300 hover:text-amber-500 hover:bg-amber-50'}`}>
                <Pin size={16} />
              </button>
              <button onClick={() => onDelete(post.id)}
                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {post.replies?.length > 0 && (
            <button onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 mt-2">
              <MessageCircle size={13} />
              {post.replies.length} réponse{post.replies.length > 1 ? 's' : ''}
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}

          {expanded && post.replies?.length > 0 && (
            <div className="mt-3 space-y-3">
              {post.replies.map(r => (
                <ReplyItem key={r.id} reply={r} onDelete={onDelete} />
              ))}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <input
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Répondre..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && replyText.trim() && sendReply.mutate()}
            />
            <button
              onClick={() => replyText.trim() && sendReply.mutate()}
              disabled={!replyText.trim() || sendReply.isPending}
              className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeacherForumPage() {
  const { courseId } = useParams();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-forum', courseId],
    queryFn: () => api.get(`/teacher/courses/${courseId}/forum`).then(r => r.data),
  });

  const { data: courseData } = useQuery({
    queryKey: ['teacher-course', courseId],
    queryFn: () => api.get(`/teacher/courses/${courseId}`).then(r => r.data),
  });

  const createPost = useMutation({
    mutationFn: () => api.post(`/teacher/courses/${courseId}/forum`, form),
    onSuccess: () => {
      qc.invalidateQueries(['teacher-forum', courseId]);
      setForm({ title: '', content: '' });
      setShowForm(false);
      toast.success('Post publié');
    },
    onError: () => toast.error('Erreur lors de la publication'),
  });

  const deletePost = useMutation({
    mutationFn: (id) => api.delete(`/teacher/forum/${id}`),
    onSuccess: () => { qc.invalidateQueries(['teacher-forum', courseId]); toast.success('Supprimé'); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const pinPost = useMutation({
    mutationFn: (id) => api.patch(`/teacher/forum/${id}/pin`),
    onSuccess: () => qc.invalidateQueries(['teacher-forum', courseId]),
  });

  const posts = data?.posts || [];
  const course = courseData?.course;
  const focusedPostId = searchParams.get('post');

  return (
    <TeacherLayout>
      <div className="mb-6">
        <Link to={`/teacher/courses/${courseId}`} className="text-sm text-indigo-600 hover:underline">
          ← {course?.name || 'Cours'}
        </Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-bold text-gray-800">Forum — {course?.name}</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm"
          >
            <Plus size={16} /> Nouvelle annonce
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">Nouvelle publication</h3>
          <div className="space-y-3">
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Titre (optionnel)"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <textarea
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
              placeholder="Contenu du message..."
              rows={4}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                Annuler
              </button>
              <button
                onClick={() => form.content.trim() && createPost.mutate()}
                disabled={!form.content.trim() || createPost.isPending}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60"
              >
                Publier
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-center text-gray-400 py-12">Chargement...</div>
      )}

      <div className="space-y-4">
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            courseId={courseId}
            focusedPostId={focusedPostId}
            onDelete={(id) => confirm('Supprimer ce post ?') && deletePost.mutate(id)}
            onPin={(id) => pinPost.mutate(id)}
          />
        ))}
        {!isLoading && posts.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
            <MessageCircle size={40} className="mx-auto mb-3 opacity-30" />
            <p>Aucune publication. Créez la première annonce !</p>
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}
