// Monta um link de consulta pública para o processo no portal do tribunal
// a partir do número CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO).
// Quando não há URL específica conhecida, cai num fallback de busca Google.

export type TribunalLink = {
  url: string;
  label: string; // ex: "TJSP — e-SAJ"
  sistema: string; // ex: "e-SAJ", "PJe", "e-Proc", "Projudi"
};

// Apenas dígitos
const onlyDigits = (s: string) => s.replace(/\D/g, "");

// Decompõe o número CNJ em partes
function parseCNJ(numero: string) {
  const d = onlyDigits(numero);
  if (d.length !== 20) return null;
  return {
    sequencial: d.slice(0, 7),
    dv: d.slice(7, 9),
    ano: d.slice(9, 13),
    segmento: d.slice(13, 14), // 1 STF, 2 CNJ, 3 STJ, 4 JF, 5 JT, 6 JE, 7 JM Un, 8 JE, 9 JM Est
    tribunal: d.slice(14, 16),
    origem: d.slice(16, 20),
  };
}

// Mapa parcial dos principais TJs (segmento 8) — código TR -> sigla/UF
const TJ_POR_CODIGO: Record<string, string> = {
  "01": "AC", "02": "AL", "03": "AP", "04": "AM", "05": "BA",
  "06": "CE", "07": "DF", "08": "ES", "09": "GO", "10": "MA",
  "11": "MT", "12": "MS", "13": "MG", "14": "PA", "15": "PB",
  "16": "PR", "17": "PE", "18": "PI", "19": "RJ", "20": "RN",
  "21": "RS", "22": "RO", "23": "RR", "24": "SC", "25": "SP",
  "26": "SE", "27": "TO",
};

export function getTribunalLink(numero: string): TribunalLink | null {
  const p = parseCNJ(numero);
  if (!p) return null;

  const numeroFormatado = `${p.sequencial}-${p.dv}.${p.ano}.${p.segmento}.${p.tribunal}.${p.origem}`;

  // Justiça Federal (segmento 4) — todas usam PJe
  if (p.segmento === "4") {
    const trf = p.tribunal; // 01..06
    return {
      url: `https://pje.trf${parseInt(trf, 10)}.jus.br/consultapublica/ConsultaPublica/listView.seam`,
      label: `TRF${parseInt(trf, 10)} — PJe`,
      sistema: "PJe",
    };
  }

  // Justiça do Trabalho (segmento 5) — PJe TRT
  if (p.segmento === "5") {
    const trt = parseInt(p.tribunal, 10);
    return {
      url: `https://pje.trt${trt}.jus.br/consultaprocessual/`,
      label: `TRT${trt} — PJe`,
      sistema: "PJe",
    };
  }

  // Justiça Estadual (segmento 8)
  if (p.segmento === "8") {
    const uf = TJ_POR_CODIGO[p.tribunal];
    if (uf === "SP") {
      return {
        url: `https://esaj.tjsp.jus.br/cpopg/search.do?conversationId=&cbPesquisa=NUMPROC&numeroDigitoAnoUnificado=${p.sequencial}-${p.dv}.${p.ano}&foroNumeroUnificado=${p.origem}&dadosConsulta.valorConsultaNuUnificado=${numeroFormatado}&dadosConsulta.tipoNuProcesso=UNIFICADO`,
        label: "TJSP — e-SAJ",
        sistema: "e-SAJ",
      };
    }
    if (uf === "RJ") {
      return {
        url: `https://www3.tjrj.jus.br/consultaprocessual/#/consultapublica#porNumero`,
        label: "TJRJ — Consulta Pública",
        sistema: "TJRJ",
      };
    }
    if (uf === "RS") {
      return {
        url: `https://www.tjrs.jus.br/novo/busca/?return=proc&client=wp_index&proc=${onlyDigits(numero)}`,
        label: "TJRS — Consulta Pública",
        sistema: "TJRS",
      };
    }
    if (uf) {
      // Fallback genérico para os demais TJs (PJe é o mais comum)
      return {
        url: `https://www.google.com/search?q=${encodeURIComponent(`processo ${numeroFormatado} TJ${uf}`)}`,
        label: `TJ${uf} — Buscar`,
        sistema: "Buscar",
      };
    }
  }

  // Fallback: busca no Google
  return {
    url: `https://www.google.com/search?q=${encodeURIComponent(`processo ${numeroFormatado}`)}`,
    label: "Buscar processo",
    sistema: "Buscar",
  };
}
