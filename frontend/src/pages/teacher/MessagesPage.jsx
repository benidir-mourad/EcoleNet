import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import api from '../../services/api';
import TeacherLayout from '../../components/layout/TeacherLayout';
import useAuthStore from '../../store/authStore';

export default function TeacherMessagesPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [selectedUser, setSelectedUser] = useState(null);
  const [content, setContent] = useState('');
  const bottomRef = useRef(null);

  const { data: conversations } = useQuery({
    queryKey: ['teacher-conversations'],
    queryFn: () => api.get('/teacher/messages').then(r => r.data),
    refetchInterval: 5000,
  });

  const { data: convData } = useQuery({
    queryKey: ['teacher-conversation', selectedUser?.id],
    queryFn: () => api.get(`/teacher/messages/${selectedUser.id}`).then(r => r.data),
    enabled: !!selectedUser,
    refetchInterval: 3000,
  });

  const send = useMutation({
    mutationFn: () => api.post(`/teacher/messages/${selectedUser.id}`, { content }),
    onSuccess: () => {
      qc.invalidateQueries(['teacher-conversation', selectedUser?.id]);
      qc.invalidateQueries(['teacher-conversations']);
      setContent('');
    },
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [convData]);

  const convList = conversations?.conversations || [];
  const messages = convData?.messages || [];

  const getPartner = (conv) => {
    return conv.sender_id === user?.id ? conv.receiver : conv.sender;
  };

  return (
    <TeacherLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Messages</h1>

      <div className="flex gap-6 bg-white rounded-xl shadow-sm overflow-hidden" style={{ height: '70vh' }}>
        {/* Conversation list */}
        <div className="w-72 border-r overflow-y-auto">
          {convList.map(conv => {
            const partner = getPartner(conv);
            return (
              <button key={conv.id} onClick={() => setSelectedUser(partner)}
                className={`w-full text-left px-4 py-4 border-b hover:bg-gray-50 transition ${selectedUser?.id === partner?.id ? 'bg-indigo-50 border-r-2 border-r-indigo-500' : ''}`}>
                <p className="font-medium text-gray-800">{partner?.first_name} {partner?.last_name}</p>
                <p className="text-sm text-gray-400 truncate">{conv.content}</p>
              </button>
            );
          })}
          {convList.length === 0 && (
            <div className="p-6 text-center text-gray-400 text-sm">Aucun message</div>
          )}
        </div>

        {/* Chat panel */}
        {selectedUser ? (
          <div className="flex-1 flex flex-col">
            <div className="px-6 py-4 border-b">
              <p className="font-semibold text-gray-800">{selectedUser.first_name} {selectedUser.last_name}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${
                    msg.sender_id === user?.id
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    <p>{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.sender_id === user?.id ? 'text-indigo-200' : 'text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="px-6 py-4 border-t">
              <form onSubmit={e => { e.preventDefault(); if (content.trim()) send.mutate(); }} className="flex gap-3">
                <input value={content} onChange={e => setContent(e.target.value)}
                  placeholder="Répondre..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <button type="submit" disabled={!content.trim() || send.isPending}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60">
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Sélectionnez une conversation
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}
