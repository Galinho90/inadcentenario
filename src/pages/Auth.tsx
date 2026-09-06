import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { LogIn, Loader2, Eye, EyeOff, ArrowRight, ShieldCheck, BarChart3, Users } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Informe seu e-mail para continuar.");
      return;
    }
    if (!password) {
      toast.error("Informe sua senha.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      navigate("/", { replace: true });
    } catch (err: any) {
      const msg = err.message?.toLowerCase() ?? "";
      if (msg.includes("invalid")) {
        toast.error("E-mail ou senha incorretos.");
      } else if (msg.includes("not confirmed") || msg.includes("email not confirmed")) {
        toast.error("E-mail ainda não confirmado. Verifique sua caixa de entrada.");
      } else {
        toast.error(err.message || "Erro ao autenticar");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Painel esquerdo — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-gradient-to-br from-primary via-primary to-blue-700 p-10 text-white relative overflow-hidden">
        {/* Decorativos */}
        <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-white/5" />

        {/* Logo */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur-sm grid place-items-center shadow-lg ring-1 ring-white/20">
              <span className="font-display font-bold text-white text-sm">IC</span>
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg leading-tight">Inadimplência</h2>
              <p className="text-white/60 text-sm">Gestão Condominal</p>
            </div>
          </div>
        </div>

        {/* Copy principal */}
        <div className="relative space-y-6">
          <div className="space-y-2">
            <p className="text-white/60 text-sm font-medium uppercase tracking-widest">Sistema de gestão</p>
            <h1 className="text-4xl font-display font-bold leading-tight">
              Controle total da<br />inadimplência do<br />seu condomínio
            </h1>
            <p className="text-white/70 text-base leading-relaxed max-w-sm">
              Identifique, acompanhe e cobre inadimplentes com segurança e eficiência — tudo em uma única plataforma.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white/15 backdrop-blur-sm grid place-items-center shrink-0">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
              <p className="text-white/80 text-sm">Dashboard em tempo real com gráficos e métricas</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white/15 backdrop-blur-sm grid place-items-center shrink-0">
                <Users className="h-4 w-4 text-white" />
              </div>
              <p className="text-white/80 text-sm">Gestão de moradores e histórico completo</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white/15 backdrop-blur-sm grid place-items-center shrink-0">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <p className="text-white/80 text-sm">Dados protegidos e acesso restrito</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative">
          <Separator className="bg-white/20 mb-4" />
          <p className="text-white/40 text-xs">
            Condomínio Residencial Centenário — Acesso restrito a moradores autorizados.
          </p>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10 bg-gradient-surface relative overflow-hidden">
        <div className="absolute top-0 right-0 h-80 w-80 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <div className="w-full max-w-md space-y-8 relative">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 grid place-items-center shadow-elevated">
              <span className="text-primary-foreground font-display font-bold text-xs">IC</span>
            </div>
            <div>
              <h1 className="font-display font-semibold text-lg">Inadimplência</h1>
              <p className="text-xs text-muted-foreground">Gestão Condominal</p>
            </div>
          </div>

          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight">
              Boas-vindas
            </h2>
            <p className="text-muted-foreground text-sm md:text-base">
              Entre com suas credenciais para acessar o sistema.
            </p>
          </div>

          {/* Form */}
          <Card className="shadow-elevated border-border/60">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Senha
                    </Label>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="current-password"
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium shadow-button hover:shadow-md transition-all"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      Acessar conta
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* CTA registro */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Ainda não tem conta?{" "}
              <Link
                to="/register"
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline underline-offset-2 transition-colors"
              >
                Criar conta
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
