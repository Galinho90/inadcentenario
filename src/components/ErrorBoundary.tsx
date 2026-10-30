import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** Rótulo do bloco que quebrou (aparece na mensagem). */
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * Evita que um erro de renderização em um bloco derrube a página inteira:
 * mostra a mensagem do erro e permite recarregar a seção.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `Erro ao renderizar ${this.props.label ?? "seção"}:`,
      error,
      info.componentStack
    );
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center space-y-3">
        <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
        <div>
          <h3 className="font-medium text-foreground">
            {this.props.label ? `Falha ao exibir ${this.props.label}` : "Algo deu errado"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => this.setState({ error: null })}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Tentar novamente
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (typeof window !== "undefined") window.location.reload();
          }}
        >
          Recarregar página
        </Button>
      </div>
    );
  }
}

export default ErrorBoundary;
