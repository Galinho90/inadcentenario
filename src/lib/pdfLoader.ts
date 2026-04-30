import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - vite worker url import
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

/** Extrai texto de um PDF preservando quebras de linha aproximadas por Y. */
export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    let line = "";
    const lines: string[] = [];

    for (const item of content.items as any[]) {
      const y = item.transform?.[5];
      const str = item.str ?? "";
      if (lastY === null) {
        line = str;
      } else if (Math.abs(y - lastY) < 2) {
        line += " " + str;
      } else {
        lines.push(line);
        line = str;
      }
      lastY = y;
    }
    if (line) lines.push(line);
    fullText += lines.join("\n") + "\n";
  }

  return fullText;
}
