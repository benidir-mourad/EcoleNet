import { Component } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

/**
 * Sans frontière d'erreur, une exception de rendu — une donnée inattendue de l'API,
 * une clé absente — démonte l'arbre React entier et laisse une page blanche. La
 * personne en face n'a alors rien à signaler d'autre que « ça ne marche plus ».
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Laisse une trace exploitable dans la console du navigateur.
    console.error('Erreur de rendu interceptée', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 border-2 border-amber-200">
            <AlertTriangle size={26} className="text-amber-600" />
          </div>

          <h1 className="text-lg font-bold text-gray-800 mb-2">Cette page n’a pas pu s’afficher</h1>
          <p className="text-sm text-gray-500 mb-6">
            Le reste de l’application fonctionne. Recharge la page ; si le problème persiste,
            signale-le en indiquant ce que tu essayais de faire.
          </p>

          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
          >
            <RotateCw size={16} /> Recharger
          </button>

          {import.meta.env.DEV && (
            <pre className="mt-6 text-left text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto text-gray-600">
              {String(this.state.error?.stack || this.state.error)}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
