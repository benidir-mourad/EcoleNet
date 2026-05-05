import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, GripVertical, Save, ArrowLeft } from 'lucide-react';
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

export default function DragDropBuilderPage() {
  const { resourceId } = useParams();
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [pairs, setPairs] = useState([{ left: '', right: '' }, { left: '', right: '' }]);
  const [initialized, setInitialized] = useState(false);

  const { data } = useQuery({
    queryKey: ['teacher-dragdrop', resourceId],
    queryFn: () => api.get(`/teacher/resources/${resourceId}/dragdrop`).then(r => r.data),
  });

  useEffect(() => {
    if (data && !initialized) {
      if (data.exercise) {
        setTitle(data.exercise.title || '');
        setInstructions(data.exercise.instructions || '');
        const savedPairs = data.exercise.content?.pairs;
        if (savedPairs && savedPairs.length >= 2) {
          setPairs(savedPairs);
        }
      }
      setInitialized(true);
    }
  }, [data, initialized]);

  const save = useMutation({
    mutationFn: () => api.post(`/teacher/resources/${resourceId}/dragdrop`, { title, instructions, pairs }),
    onSuccess: () => {
      qc.invalidateQueries(['teacher-dragdrop', resourceId]);
      toast.success('Exercice enregistré');
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  });

  const addPair = () => setPairs([...pairs, { left: '', right: '' }]);

  const removePair = (i) => {
    if (pairs.length <= 2) { toast.error('Minimum 2 paires requises'); return; }
    setPairs(pairs.filter((_, idx) => idx !== i));
  };

  const updatePair = (i, field, value) => {
    setPairs(pairs.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  };

  const canSave = title.trim() && pairs.length >= 2 && pairs.every(p => p.left.trim() && p.right.trim());
  const previewPairs = pairs.filter(p => p.left && p.right);
  const previewKey = previewPairs.map(p => `${p.left}:${p.right}`).join('|');
  const shuffledPreviewPairs = useMemo(
    () => previewPairs
      .map((pair, index) => ({ pair, score: stableScore(`${previewKey}:${pair.right}:${index}`) }))
      .sort((a, b) => a.score - b.score)
      .map(({ pair }) => pair),
    [previewPairs, previewKey]
  );

  return (
    <TeacherLayout>
      <div className="mb-6">
        <Link to={`/teacher/resources/${resourceId}/qcm`}
          className="flex items-center gap-1 text-sm text-indigo-600 hover:underline w-fit">
          <ArrowLeft size={14} /> Retour au cours
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">Exercice Drag & Drop</h1>
        <p className="text-sm text-gray-500 mt-1">
          Créez des paires à associer. L'élève glisse les éléments de droite pour les déposer sur les termes de gauche.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Title & Instructions */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre de l'exercice *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="ex: Associe chaque concept à sa définition"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instructions (optionnel)</label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="Consignes supplémentaires pour l'élève..."
              rows={2}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Pairs */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Paires à associer</h3>
            <span className="text-xs text-gray-400">{pairs.length} paire{pairs.length > 1 ? 's' : ''}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3 px-7">
            <div className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Terme (gauche)</div>
            <div className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Correspondance (droite)</div>
          </div>

          <div className="space-y-2">
            {pairs.map((pair, i) => (
              <div key={i} className="flex items-center gap-2">
                <GripVertical size={16} className="text-gray-300 shrink-0" />
                <input
                  value={pair.left}
                  onChange={e => updatePair(i, 'left', e.target.value)}
                  placeholder={`Terme ${i + 1}`}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-gray-300 text-sm">↔</span>
                <input
                  value={pair.right}
                  onChange={e => updatePair(i, 'right', e.target.value)}
                  placeholder={`Définition ${i + 1}`}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => removePair(i)}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addPair}
            className="mt-3 w-full flex items-center justify-center gap-2 p-2.5 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition text-sm"
          >
            <Plus size={16} /> Ajouter une paire
          </button>
        </div>

        {/* Preview */}
        {previewPairs.length >= 2 && (
          <div className="bg-indigo-50 rounded-xl p-5">
            <h3 className="font-medium text-indigo-800 mb-3 text-sm">Aperçu pour l'élève</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-indigo-600 mb-2 uppercase tracking-wide">À placer (mélangé)</p>
                <div className="space-y-2">
                  {shuffledPreviewPairs.map((p, i) => (
                    <div key={i} className="bg-white border-2 border-indigo-200 rounded-lg px-3 py-2 text-sm text-gray-700 cursor-grab select-none">
                      {p.right}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-indigo-600 mb-2 uppercase tracking-wide">Zones de dépôt</p>
                <div className="space-y-2">
                  {previewPairs.map((p, i) => (
                    <div key={i} className="bg-white border-2 border-dashed border-indigo-200 rounded-lg px-3 py-2 text-sm min-h-[38px] flex items-center gap-2">
                      <span className="text-indigo-700 font-medium">{p.left}</span>
                      <span className="text-gray-300 text-xs italic">→ déposer ici</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => canSave && save.mutate()}
          disabled={!canSave || save.isPending}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-60 font-medium"
        >
          <Save size={18} />
          {save.isPending ? 'Enregistrement...' : 'Enregistrer l\'exercice'}
        </button>

        {!canSave && (
          <p className="text-center text-xs text-gray-400">
            Remplissez le titre et au moins 2 paires complètes pour enregistrer.
          </p>
        )}
      </div>
    </TeacherLayout>
  );
}
