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
