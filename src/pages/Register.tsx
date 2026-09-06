import { useState } from "react";
import { Link } from "react-router-dom";
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
import { UserPlus, Loader2, Eye, EyeOff, ArrowRight, CheckCircle2, ShieldCheck, LockKeyhole, Mail } from "lucide-react";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState<"form" | "confirm">("form");

  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Informe seu nome completo.");
      return;
    }
    if (!email.trim()) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (error) throw error;
      setStep("confirm");
    } catch (err: any) {
      const msg = err.message?.toLowerCase() ?? "";
      if (msg.includes("already")) {
        toast.error("Este e-mail já está cadastrado. Tente fazer login.");
      } else {
        toast.error(err.message || "Erro ao criar conta.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (step === "confirm") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-surface relative overflow-hidden">
        <div className="absolute top-0 right-0 h-80 w-80 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <div className="w-full max-w-md text-center space-y-6 relative">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 grid place-items-center shadow-elevated">
              <CheckCircle2 className="h-7 w-7 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight">
              Conta criada
            </h2>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
              Enviamos um link de confirmação para{" "}
              <strong className="text-foreground">{email}</strong>.
              <br />
              Clique no link do e-mail para ativar sua conta.
            </p>
          </div>

          <Card className="shadow-elevated border-border/60 text-left">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-muted-foreground">
                  Verifique também a caixa de spam ou promoções.
                </p>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-muted-foreground">
                  Seus dados estão protegidos e são de uso exclusivo do condomínio.
                </p>
              </div>
            </CardContent>
          </Card>

          <Button asChild className="w-full h-11 font-medium shadow-button">
            <Link to="/login">
              <LockKeyhole className="h-4 w-4 mr-2" />
              Ir para tela de login
            </Link>
          </Button>

          <p className="text-sm text-muted-foreground">
            Não recebeu o e-mail?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline underline-offset-2">
              Tentar novamente
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Painel esquerdo — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-10 text-white relative overflow-hidden">
        <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        {/* Logo */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur-sm grid place-items-center shadow-lg ring-1 ring-white/20">
              <span className="font-display font-bold text-white text-sm">IC</span>
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg leading-tight">Inadimplência</h2>
              <p className="text-white/60 text-sm">Gestão Condominal</p>
            </div>
          </div>
        </div>

        {/* Copy */}
        <div className="relative space-y-6">
          <div className="space-y-2">
            <p className="text-white/60 text-sm font-medium uppercase tracking-widest">Cadastro</p>
            <h1 className="text-4xl font-display font-bold leading-tight">
              Proteja os dados<br />do seu condomínio
            </h1>
            <p className="text-white/70 text-base leading-relaxed max-w-sm">
              Crie sua conta e tenha acesso seguro a todas as funcionalidades do sistema de gestão.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-emerald-500/20 grid place-items-center shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <p className="text-white/80 text-sm">Acesso restrito e individual por morador</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-emerald-500/20 grid place-items-center shrink-0">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <p className="text-white/80 text-sm">Dados criptografados e seguros</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-emerald-500/20 grid place-items-center shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <p className="text-white/80 text-sm">Conformidade com a LGPD</p>
            </div>
          </div>
        </div>

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
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 grid place-items-center shadow-elevated">
              <span className="text-white font-display font-bold text-xs">IC</span>
            </div>
            <div>
              <h1 className="font-display font-semibold text-lg">Inadimplência</h1>
              <p className="text-xs text-muted-foreground">Gestão Condominal</p>
            </div>
          </div>

          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight">
              Criar conta
            </h2>
            <p className="text-muted-foreground text-sm md:text-base">
              Preencha seus dados para se cadastrar no sistema.
            </p>
          </div>

          {/* Form */}
          <Card className="shadow-elevated border-border/60">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Nome completo
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                    className="h-11"
                  />
                </div>

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
                  <Label htmlFor="password" className="text-sm font-medium">
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-sm font-medium">
                    Confirmar senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Repita a senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && (
                    <p className={`text-xs flex items-center gap-1 ${passwordsMatch ? "text-emerald-600" : "text-destructive"}`}>
                      {passwordsMatch ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          Senhas coincidem
                        </>
                      ) : (
                        "As senhas não coincidem"
                      )}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium shadow-button hover:shadow-md transition-all"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Criar conta
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link
                to="/login"
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline underline-offset-2 transition-colors"
              >
                Fazer login
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
