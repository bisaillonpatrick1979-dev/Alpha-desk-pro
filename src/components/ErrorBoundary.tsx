import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  /** Nom du panneau, affiché dans le message de repli. */
  label: string;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Isole chaque panneau du tableau de bord.
 *
 * Sans cela, une exception dans un seul graphique démonte l'arbre React entier
 * et laisse l'utilisateur devant une page noire, positions et historique
 * compris. Ici seule la section fautive est remplacée.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[alpha-desk] Panneau « ${this.props.label} » en erreur :`, error, info.componentStack);
  }

  private handleRetry = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="bg-[#0a0a0a] border border-rose-500/30 rounded-2xl p-5 space-y-3">
        <div className="flex items-center space-x-2 text-rose-300">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="font-bold text-sm">Le panneau « {this.props.label} » n'a pas pu s'afficher</h3>
        </div>

        <p className="text-xs text-white/60 font-mono">
          {this.state.error.message || 'Erreur inconnue.'}
        </p>

        <p className="text-xs text-white/40">
          Le reste du tableau de bord continue de fonctionner normalement.
        </p>

        <button
          onClick={this.handleRetry}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold bg-[#111] hover:bg-white/10 text-white border border-white/15 rounded-xl transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#00d2ff]" />
          <span>Réessayer</span>
        </button>
      </div>
    );
  }
}
