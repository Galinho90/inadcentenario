import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Mapeia código do tribunal CNJ (J + TR) para o endpoint do DataJud
// Formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
// J = segmento da justiça, TR = tribunal
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
  raw: string;
  digits: string;
  segmento: string;
  tribunalCode: string;
  endpoint: string | null;
  sigla: string | null;
}

function parseNumeroCNJ(numero: string): ParsedNumber | null {
  const digits = numero.replace(/\D/g, "");
  if (digits.length !== 20) return null;
  // NNNNNNN(7) DD(2) AAAA(4) J(1) TR(2) OOOO(4)
  const segmento = digits.substring(13, 14);
  const tribunalCode = digits.substring(14, 16);
  const key = `${segmento}_${tribunalCode}`;
  const endpoint = TRIBUNAL_MAP[key] ?? null;
  return {
    raw: numero,
    digits,
    segmento,
    tribunalCode,
    endpoint,
    sigla: endpoint ? endpoint.toUpperCase() : null,
  };
}

interface ConsultaResult {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("DATAJUD_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "DATAJUD_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { unidade, nome, numero_processo } = body ?? {};
    if (!unidade || !nome || !numero_processo) {
      return new Response(
        JSON.stringify({ error: "unidade, nome e numero_processo são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await consultarDataJud(String(numero_processo), apiKey);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: updErr } = await supabase
      .from("processos_judiciais")
      .update({
        fase_atual: result.fase_atual,
        tribunal: result.tribunal,
        consulta_status: result.consulta_status,
        consulta_erro: result.consulta_erro,
        ultima_consulta: new Date().toISOString(),
      })
      .eq("unidade", unidade)
      .eq("nome", nome);

    if (updErr) {
      return new Response(
        JSON.stringify({ error: updErr.message, result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
