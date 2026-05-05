import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft, Plus, Trash2, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import TeacherLayout from '../../components/layout/TeacherLayout';

function stableScore(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) % 1000003;
  }
  return hash;
}

export default function OrderingBuilderPage() {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [title, setTitle]             = useState('');
  const [instructions, setInstructions] = useState('');
  const [items, setItems]             = useState(['', '']);
  const [initialized, setInitialized] = useState(false);

  const { data } = useQuery({
    queryKey: ['teacher-ordering', resourceId],
    queryFn: () => api.get(`/teacher/resources/${resourceId}/ordering`).then(r => r.data),
  });

  useEffect(() => {
    if (data?.exercise && !initialized) {
      setTitle(data.exercise.title || '');
      setInstructions(data.exercise.instructions || '');
      setItems(data.exercise.content?.items || ['', '']);
      setInitialized(true);
    }
  }, [data, initialized]);

  const save = useMutation({
    mutationFn: () => api.post(`/teacher/resources/${resourceId}/ordering`, {
      title, instructions, items: items.filter(i => i.trim()),
    }),
    onSuccess: () => { qc.invalidateQueries(['teacher-ordering', resourceId]); toast.success('Exercice sauvegardé'); },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const move = (idx, dir) => {
    const next = [...items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setItems(next);
  };

  const valid = title.trim() && items.filter(i => i.trim()).length >= 2;
  const filledItems = items.filter(item => item.trim());
  const filledItemsKey = filledItems.join('|');
  const shuffledItems = useMemo(
    () => filledItems
      .map((item, index) => ({ item, sort: stableScore(`${filledItemsKey}:${item}:${index}`) }))
      .sort((a, b) => a.sort - b.sort),
    [filledItems, filledItemsKey]
  );

  return (
    <TeacherLayout>
      <div className="mb-6">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-indigo-600 hover:underline mb-3">
          <ArrowLeft size={14} /> Retour au cours
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Ordonnancement de code</h1>
            <p className="text-sm text-gray-500 mt-1">Entrez les éléments dans le <strong>bon ordre</strong>. Les élèves devront les remettre dans cet ordre.</p>
          </div>
          <button onClick={() => save.mutate()} disabled={!valid || save.isPending}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60">
            <Save size={16} /> {save.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {/* Title + instructions */}
        <div className="bg-white rounded-xl shadow-sm p-5 grid gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Titre</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex : Remettez ce code JavaScript dans le bon ordre" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Consignes (optionnel)</label>
            <input value={instructions} onChange={e => setInstructions(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="Ex : Remettez ces lignes dans le bon ordre pour créer une boucle for" />
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Éléments (dans le bon ordre)</h2>
            <button onClick={() => setItems([...items, ''])}
              className="flex items-center gap-1.5 text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100">
              <Plus size={14} /> Ajouter une ligne
            </button>
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => move(idx, -1)} disabled={idx === 0}
                    className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-20">
                    <ArrowUp size={13} />
                  </button>
                  <button onClick={() => move(idx, 1)} disabled={idx === items.length - 1}
                    className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-20">
                    <ArrowDown size={13} />
                  </button>
                </div>
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {idx + 1}
                </div>
                <input
                  value={item}
                  onChange={e => { const n = [...items]; n[idx] = e.target.value; setItems(n); }}
                  className="flex-1 border rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={`Ligne ${idx + 1}…`}
                />
                <button onClick={() => setItems(items.filter((_, i) => i !== idx))}
                  disabled={items.length <= 2}
                  className="p-2 text-gray-300 hover:text-red-500 disabled:opacity-20 transition">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-5 bg-amber-50 rounded-xl p-4">
            <p className="text-xs font-medium text-amber-800 mb-2">Aperçu mélangé (vue élève) :</p>
            <div className="space-y-1.5">
              {shuffledItems.map(({ item }, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-amber-100">
                    <GripVertical size={14} className="text-gray-300" />
                    <span className="font-mono text-xs text-gray-700">{item}</span>
                  </div>
                ))}
            </div>
            <p className="text-xs text-amber-600 mt-2 italic">L'ordre sera mélangé aléatoirement pour les élèves.</p>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}
