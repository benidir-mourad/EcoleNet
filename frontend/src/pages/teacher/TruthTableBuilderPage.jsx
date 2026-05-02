import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft, Plus, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import TeacherLayout from '../../components/layout/TeacherLayout';

function generateRows(variables) {
  const n = variables.length;
  const count = Math.pow(2, n);
  return Array.from({ length: count }, (_, i) => ({
    inputs: Array.from({ length: n }, (__, b) => (i >> (n - 1 - b)) & 1),
    outputs: [],
  }));
}

export default function TruthTableBuilderPage() {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [title, setTitle]             = useState('');
  const [instructions, setInstructions] = useState('');
  const [variables, setVariables]     = useState(['A', 'B']);
  const [outputLabels, setOutputLabels] = useState(['Sortie']);
  const [rows, setRows]               = useState(() => generateRows(['A', 'B']).map(r => ({ ...r, outputs: [null] })));
  const [initialized, setInitialized] = useState(false);

  const { data } = useQuery({
    queryKey: ['teacher-truth-table', resourceId],
    queryFn: () => api.get(`/teacher/resources/${resourceId}/truth-table`).then(r => r.data),
  });

  useEffect(() => {
    if (data?.exercise && !initialized) {
      const ex = data.exercise;
      setTitle(ex.title || '');
      setInstructions(ex.instructions || '');
      if (ex.content) {
        setVariables(ex.content.variables || ['A', 'B']);
        setOutputLabels(ex.content.output_labels || ['Sortie']);
        setRows(ex.content.rows || []);
      }
      setInitialized(true);
    }
  }, [data, initialized]);

  const regenerate = () => {
    const newRows = generateRows(variables).map(r => ({ ...r, outputs: outputLabels.map(() => null) }));
    setRows(newRows);
  };

  const addVariable = () => {
    if (variables.length >= 4) { toast.error('Maximum 4 variables'); return; }
    const next = String.fromCharCode(65 + variables.length);
    const newVars = [...variables, next];
    setVariables(newVars);
    setRows(generateRows(newVars).map(r => ({ ...r, outputs: outputLabels.map(() => null) })));
  };

  const removeVariable = (idx) => {
    if (variables.length <= 1) return;
    const newVars = variables.filter((_, i) => i !== idx);
    setVariables(newVars);
    setRows(generateRows(newVars).map(r => ({ ...r, outputs: outputLabels.map(() => null) })));
  };

  const addOutput = () => {
    setOutputLabels([...outputLabels, `S${outputLabels.length + 1}`]);
    setRows(rows.map(r => ({ ...r, outputs: [...r.outputs, null] })));
  };

  const removeOutput = (idx) => {
    if (outputLabels.length <= 1) return;
    setOutputLabels(outputLabels.filter((_, i) => i !== idx));
    setRows(rows.map(r => ({ ...r, outputs: r.outputs.filter((_, i) => i !== idx) })));
  };

  const setOutput = (rIdx, oIdx, val) => {
    setRows(rows.map((r, i) => i === rIdx
      ? { ...r, outputs: r.outputs.map((o, j) => j === oIdx ? val : o) }
      : r
    ));
  };

  const save = useMutation({
    mutationFn: () => api.post(`/teacher/resources/${resourceId}/truth-table`, {
      title, instructions, variables, output_labels: outputLabels,
      rows: rows.map(r => ({ inputs: r.inputs, outputs: r.outputs.map(o => o ?? 0) })),
    }),
    onSuccess: () => { qc.invalidateQueries(['teacher-truth-table', resourceId]); toast.success('Table sauvegardée'); },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const allFilled = rows.every(r => r.outputs.every(o => o !== null));

  return (
    <TeacherLayout>
      <div className="mb-6">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-indigo-600 hover:underline mb-3">
          <ArrowLeft size={14} /> Retour au cours
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Table de vérité</h1>
            <p className="text-sm text-gray-500 mt-1">Définissez les variables et remplissez les valeurs de sortie correctes.</p>
          </div>
          <button onClick={() => save.mutate()} disabled={!title.trim() || !allFilled || save.isPending}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60">
            <Save size={16} /> {save.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {/* Title */}
        <div className="bg-white rounded-xl shadow-sm p-5 grid gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Titre</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex : Table de vérité — portes logiques AND/OR" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Consignes (optionnel)</label>
            <input value={instructions} onChange={e => setInstructions(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex : Complétez la table de vérité pour les expressions suivantes" />
          </div>
        </div>

        {/* Variables & outputs config */}
        <div className="bg-white rounded-xl shadow-sm p-5 grid gap-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">Variables d'entrée</h2>
              <button onClick={addVariable} disabled={variables.length >= 4}
                className="flex items-center gap-1 text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 disabled:opacity-50">
                <Plus size={13} /> Ajouter
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {variables.map((v, i) => (
                <div key={i} className="flex items-center gap-1 bg-blue-50 rounded-lg px-2 py-1">
                  <input value={v} onChange={e => { const n = [...variables]; n[i] = e.target.value.slice(0, 3).toUpperCase(); setVariables(n); }}
                    className="w-10 bg-transparent font-mono font-bold text-blue-700 text-center focus:outline-none text-sm" />
                  <button onClick={() => removeVariable(i)} disabled={variables.length <= 1}
                    className="text-blue-300 hover:text-red-500 disabled:opacity-30"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">Colonnes de sortie</h2>
              <div className="flex gap-2">
                <button onClick={regenerate}
                  className="flex items-center gap-1 text-sm bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-100">
                  <RefreshCw size={13} /> Régénérer les lignes
                </button>
                <button onClick={addOutput}
                  className="flex items-center gap-1 text-sm bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100">
                  <Plus size={13} /> Ajouter
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {outputLabels.map((lbl, i) => (
                <div key={i} className="flex items-center gap-1 bg-emerald-50 rounded-lg px-2 py-1">
                  <input value={lbl} onChange={e => { const n = [...outputLabels]; n[i] = e.target.value.slice(0, 20); setOutputLabels(n); }}
                    className="w-28 bg-transparent font-mono font-bold text-emerald-700 focus:outline-none text-sm" />
                  <button onClick={() => removeOutput(i)} disabled={outputLabels.length <= 1}
                    className="text-emerald-300 hover:text-red-500 disabled:opacity-30"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Truth table */}
        <div className="bg-white rounded-xl shadow-sm p-5 overflow-x-auto">
          <h2 className="font-semibold text-gray-800 mb-4">Table de vérité — remplissez les sorties</h2>
          <table className="w-full border-collapse text-sm font-mono">
            <thead>
              <tr className="bg-gray-50">
                {variables.map((v, i) => (
                  <th key={i} className="border border-gray-200 px-4 py-2 text-blue-700 font-bold">{v}</th>
                ))}
                <th className="border border-gray-300 bg-gray-200 w-4"></th>
                {outputLabels.map((lbl, i) => (
                  <th key={i} className="border border-gray-200 px-4 py-2 text-emerald-700 font-bold">{lbl}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {row.inputs.map((val, iIdx) => (
                    <td key={iIdx} className="border border-gray-200 px-4 py-2 text-center text-blue-800 font-semibold">{val}</td>
                  ))}
                  <td className="border border-gray-300 bg-gray-200 w-4"></td>
                  {outputLabels.map((_, oIdx) => (
                    <td key={oIdx} className="border border-gray-200 p-1 text-center">
                      <div className="flex justify-center gap-2">
                        {[0, 1].map(val => (
                          <button key={val}
                            onClick={() => setOutput(rIdx, oIdx, val)}
                            className={`w-9 h-9 rounded-lg font-bold text-sm transition ${
                              row.outputs[oIdx] === val
                                ? val === 1 ? 'bg-emerald-500 text-white' : 'bg-red-400 text-white'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!allFilled && (
            <p className="text-xs text-amber-600 mt-3 italic">⚠ Remplissez toutes les cases de sortie avant de sauvegarder.</p>
          )}
        </div>
      </div>
    </TeacherLayout>
  );
}
