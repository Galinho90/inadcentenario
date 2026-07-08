import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

export function CopyButton({ value, label = "Número do processo", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!value) return;

    const done = () => {
      setCopied(true);
      toast.success(`${label} copiado`);
      setTimeout(() => setCopied(false), 1500);
    };

    // 1) API moderna do Clipboard
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        done();
        return;
      }
    } catch {
      // segue para fallback
    }

    // 2) Fallback via seleção + execCommand
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.contentEditable = "true";
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "0";
      ta.style.width = "1px";
      ta.style.height = "1px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);

      const range = document.createRange();
      range.selectNodeContents(ta);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      ta.setSelectionRange(0, value.length);

      const ok = document.execCommand("copy");
      sel?.removeAllRanges();
      document.body.removeChild(ta);

      if (ok) {
        done();
        return;
      }
    } catch {
      // segue para fallback manual
    }

    // 3) Último recurso: prompt para o usuário copiar manualmente
    try {
      window.prompt(`Copie ${label.toLowerCase()} (Ctrl+C / Cmd+C):`, value);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copiar ${label}`}
      title={`Copiar ${label}`}
      className={cn(
        "inline-flex items-center justify-center h-5 w-5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0",
        className
      )}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}
