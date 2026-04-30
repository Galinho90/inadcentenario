import { useEffect, useState } from "react";

export interface JudicialSettings {
  /** Mínimo de boletos vencidos (com atraso > minAtrasoDias) para marcar como judicial. */
  minBoletos: number;
  /** Dias mínimos de atraso para um boleto contar no critério judicial. */
  minAtrasoDias: number;
}

export const DEFAULT_SETTINGS: JudicialSettings = {
  minBoletos: 3,
  minAtrasoDias: 30,
};

const STORAGE_KEY = "judicial-settings:v1";
const EVENT_NAME = "judicial-settings:change";

function read(): JudicialSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      minBoletos: clamp(Number(parsed.minBoletos) || DEFAULT_SETTINGS.minBoletos, 1, 99),
      minAtrasoDias: clamp(Number(parsed.minAtrasoDias) || DEFAULT_SETTINGS.minAtrasoDias, 0, 3650),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function getJudicialSettings(): JudicialSettings {
  return read();
}

export function saveJudicialSettings(s: JudicialSettings) {
  const normalized: JudicialSettings = {
    minBoletos: clamp(s.minBoletos, 1, 99),
    minAtrasoDias: clamp(s.minAtrasoDias, 0, 3650),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: normalized }));
}

/** Hook reativo: re-renderiza componentes quando as configs mudam. */
export function useJudicialSettings(): JudicialSettings {
  const [s, setS] = useState<JudicialSettings>(() => read());

  useEffect(() => {
    function onChange(e: Event) {
      const detail = (e as CustomEvent<JudicialSettings>).detail;
      setS(detail ?? read());
    }
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setS(read());
    }
    window.addEventListener(EVENT_NAME, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return s;
}
