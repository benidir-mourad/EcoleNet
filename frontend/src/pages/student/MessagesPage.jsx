import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import api from '../../services/api';
import StudentLayout from '../../components/layout/StudentLayout';
import useAuthStore from '../../store/authStore';

export default function StudentMessagesPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [content, setContent] = useState('');
  const bottomRef = useRef(null);

  const { data } = useQuery({
    queryKey: ['student-conversation'],
    queryFn: () => api.get('/student/messages/conversation').then(r => r.data),
    refetchInterval: 5000,
  });

  const send = useMutation({
    mutationFn: () => api.post('/student/messages', { content }),
    onSuccess: () => { qc.invalidateQueries(['student-conversation']); setContent(''); },
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [data]);

  const messages = data?.messages || [];
  const teacher = data?.teacher;

  return (
    <StudentLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Messages</h1>

      <div className="bg-white rounded-xl shadow-sm flex flex-col" style={{ height: '60vh' }}>
        {teacher && (
          <div className="px-6 py-4 border-b">
            <p className="font-semibold text-gray-800">Professeur : {teacher.first_name} {teacher.last_name}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${
                msg.sender_id === user?.id
                  ? 'bg-emerald-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}>
                <p>{msg.content}</p>
                <p className={`text-xs mt-1 ${msg.sender_id === user?.id ? 'text-emerald-100' : 'text-gray-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-12">Aucun message. Posez votre première question !</div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-6 py-4 border-t">
          <form onSubmit={e => { e.preventDefault(); if (content.trim()) send.mutate(); }}
            className="flex gap-3">
            <input
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Écrire un message..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button type="submit" disabled={!content.trim() || send.isPending}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-60">
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </StudentLayout>
  );
}
