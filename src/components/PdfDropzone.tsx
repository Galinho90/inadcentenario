import { useDropzone } from "react-dropzone";
import { Upload, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Props {
  onFile: (file: File) => void;
  fileName?: string | null;
  loading?: boolean;
  onReset?: () => void;
}

export function PdfDropzone({ onFile, fileName, loading, onReset }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
    onDrop: (files) => files[0] && onFile(files[0]),
  });

  if (fileName) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="h-5 w-5 text-primary shrink-0" />
          <span className="truncate text-sm font-medium">{fileName}</span>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <Button variant="outline" size="sm" onClick={onReset} disabled={loading}>
          Trocar arquivo
        </Button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-12 text-center cursor-pointer transition-colors",
        isDragActive ? "border-primary bg-accent" : "border-border hover:bg-accent/50"
      )}
    >
      <input {...getInputProps()} />
      <Upload className="h-10 w-10 text-muted-foreground" />
      <div>
        <p className="font-medium">Arraste o PDF aqui ou clique para enviar</p>
        <p className="text-sm text-muted-foreground mt-1">
          Apenas relatórios de inadimplência em PDF
        </p>
      </div>
    </div>
  );
}
