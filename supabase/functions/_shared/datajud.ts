// Lógica compartilhada de consulta ao DataJud (CNJ).
// Mantida fora dos arquivos `index.ts` para não disparar `Deno.serve` ao importar.

const TRIBUNAL_MAP: Record<string, string> = {
  // Justiça Federal (J=4) - TRFs
  "4_01": "trf1", "4_02": "trf2", "4_03": "trf3",
  "4_04": "trf4", "4_05": "trf5", "4_06": "trf6",
  // Justiça do Trabalho (J=5) - TRTs
  ...Object.fromEntries(
    Array.from({ length: 24 }, (_, i) => {
      const n = String(i + 1).padStart(2, "0");
      return [`5_${n}`, `trt${i + 1}`];
    })
  ),
  // Justiça Estadual (J=8)
  "8_01": "tjac", "8_02": "tjal", "8_03": "tjap", "8_04": "tjam",
  "8_05": "tjba", "8_06": "tjce", "8_07": "tjdft", "8_08": "tjes",
  "8_09": "tjgo", "8_10": "tjma", "8_11": "tjmt", "8_12": "tjms",
  "8_13": "tjmg", "8_14": "tjpa", "8_15": "tjpb", "8_16": "tjpr",
  "8_17": "tjpe", "8_18": "tjpi", "8_19": "tjrj", "8_20": "tjrn",
  "8_21": "tjrs", "8_22": "tjro", "8_23": "tjrr", "8_24": "tjsc",
  "8_25": "tjse", "8_26": "tjsp", "8_27": "tjto",
  // Superiores
  "3_00": "tst", "6_00": "stm",
};

interface ParsedNumber {
  digits: string;
  segmento: string;
  tribunalCode: string;
  endpoint: string | null;
  sigla: string | null;
}

function parseNumeroCNJ(numero: string): ParsedNumber | null {
  const digits = numero.replace(/\D/g, "");
  if (digits.length !== 20) return null;
  const segmento = digits.substring(13, 14);
  const tribunalCode = digits.substring(14, 16);
  const key = `${segmento}_${tribunalCode}`;
  const endpoint = TRIBUNAL_MAP[key] ?? null;
  return {
    digits,
    segmento,
    tribunalCode,
    endpoint,
    sigla: endpoint ? endpoint.toUpperCase() : null,
  };
}

export interface ConsultaResult {
  fase_atual: string | null;
  tribunal: string | null;
  consulta_status: "ok" | "nao_encontrado" | "erro";
  consulta_erro: string | null;
}

export async function consultarDataJud(
  numero: string,
  apiKey: string
): Promise<ConsultaResult> {
  const parsed = parseNumeroCNJ(numero);
  if (!parsed) {
    return {
      fase_atual: null,
      tribunal: null,
      consulta_status: "erro",
      consulta_erro: "Número CNJ inválido (esperado 20 dígitos)",
    };
  }
  if (!parsed.endpoint) {
    return {
      fase_atual: null,
      tribunal: null,
      consulta_status: "erro",
      consulta_erro: `Tribunal ${parsed.segmento}.${parsed.tribunalCode} não suportado`,
    };
  }

  const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${parsed.endpoint}/_search`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `APIKey ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: { match: { numeroProcesso: parsed.digits } },
        size: 1,
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      return {
        fase_atual: null,
        tribunal: parsed.sigla,
        consulta_status: "erro",
        consulta_erro: `HTTP ${resp.status}: ${txt.slice(0, 200)}`,
      };
    }
    const data = await resp.json();
    const hits = data?.hits?.hits ?? [];
    if (hits.length === 0) {
      return {
        fase_atual: null,
        tribunal: parsed.sigla,
        consulta_status: "nao_encontrado",
        consulta_erro: null,
      };
    }
    const src = hits[0]._source ?? {};
    const movimentos = (src.movimentos ?? []) as Array<{
      nome?: string;
      dataHora?: string;
    }>;
    let fase: string | null = null;
    if (movimentos.length > 0) {
      const sorted = [...movimentos].sort((a, b) => {
        const da = a.dataHora ? new Date(a.dataHora).getTime() : 0;
        const db = b.dataHora ? new Date(b.dataHora).getTime() : 0;
        return db - da;
      });
      fase = sorted[0]?.nome ?? null;
    }
    return {
      fase_atual: fase,
      tribunal: parsed.sigla,
      consulta_status: "ok",
      consulta_erro: null,
    };
  } catch (e) {
    return {
      fase_atual: null,
      tribunal: parsed.sigla,
      consulta_status: "erro",
      consulta_erro: e instanceof Error ? e.message : String(e),
    };
  }
}
