import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { consultarDataJud } from "../_shared/datajud.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: processos, error } = await supabase
      .from("processos_judiciais")
      .select("unidade, nome, numero_processo");

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let atualizados = 0;
    let erros = 0;

    for (const p of processos ?? []) {
      const result = await consultarDataJud(p.numero_processo, apiKey);
      const { error: updErr } = await supabase
        .from("processos_judiciais")
        .update({
          fase_atual: result.fase_atual,
          tribunal: result.tribunal,
          consulta_status: result.consulta_status,
          consulta_erro: result.consulta_erro,
          ultima_consulta: new Date().toISOString(),
        })
        .eq("unidade", p.unidade)
        .eq("nome", p.nome);
      if (updErr || result.consulta_status === "erro") {
        erros++;
      } else {
        atualizados++;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    return new Response(
      JSON.stringify({
        ok: true,
        total: processos?.length ?? 0,
        atualizados,
        erros,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
