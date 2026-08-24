import React, { useState } from 'react';
import {
  Lock,
  Mail,
  LogIn,
  AlertCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginView: React.FC = () => {
  const {
    login,
    loginComEmailSenha,
    erroAuth,
    isLoading,
    limparErro,
  } = useAuth();

  const [loginInput, setLoginInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput.trim() || !senhaInput) return;
    limparErro();

    try {
      // Tenta efetuar o login com credenciais
      const fnLogin = login || loginComEmailSenha;
      await fnLogin(loginInput.trim(), senhaInput);
    } catch (err: any) {
      console.error('Falha de autenticação no login:', err);
    }
  };

  return (
    <div
      id="tela-login-crm"
      className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center items-center p-4 sm:p-6 text-[#1A1A1A] relative font-sans"
    >
      <div className="w-full max-w-md relative z-10 space-y-4 animate-in fade-in duration-200">
        {/* Cabeçalho Neutro do Sistema */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E2E8F0] text-[#0F172A] text-xs font-semibold tracking-wide shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-[#0F172A]" />
            <span className="uppercase text-[11px] tracking-wider font-bold">Acesso ao Sistema • CRM</span>
          </div>

          <div className="flex flex-col items-center justify-center gap-1.5 pt-1">
            <div className="w-12 h-12 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shadow-md">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0F172A] uppercase">
                Portal de Autenticação
              </h1>
              <p className="text-xs font-medium text-[#64748B] tracking-wide">
                Gestão Integrada & Controle de Acessos
              </p>
            </div>
          </div>
        </div>

        {/* Card Principal de Autenticação */}
        <div className="bg-white text-[#0F172A] rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden">
          <div className="p-5 sm:p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0F172A]" />
                <span>Identificação de Usuário</span>
              </h2>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Informe seu e-mail e senha para acessar o painel do sistema.
              </p>
            </div>

            {/* Mensagem de Erro de Autenticação Segura */}
            {erroAuth && (
              <div
                id="alerta-erro-auth"
                className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium space-y-1 shadow-2xs animate-in fade-in"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 leading-snug">
                    <span className="font-semibold text-rose-950">Falha na Autenticação</span>
                    <div className="text-[11px] text-rose-700">
                      {erroAuth || 'Credenciais inválidas. Verifique seu e-mail e senha e tente novamente.'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Formulário de Login */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label
                  htmlFor="input-login"
                  className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block"
                >
                  E-mail:
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="input-login"
                    type="email"
                    required
                    autoComplete="username"
                    value={loginInput}
                    onChange={(e) => {
                      setLoginInput(e.target.value);
                      if (erroAuth) limparErro();
                    }}
                    placeholder="seu.email@clinica.com.br"
                    className="w-full h-10 pl-10 pr-3.5 text-xs sm:text-sm rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] focus:bg-white focus:border-[#0F172A] focus:outline-hidden transition-all placeholder:text-[#94A3B8]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="input-senha"
                  className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block"
                >
                  Senha:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="input-senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={senhaInput}
                    onChange={(e) => {
                      setSenhaInput(e.target.value);
                      if (erroAuth) limparErro();
                    }}
                    placeholder="••••••••"
                    className="w-full h-10 pl-10 pr-10 text-xs sm:text-sm rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] focus:bg-white focus:border-[#0F172A] focus:outline-hidden transition-all placeholder:text-[#94A3B8]"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] p-1 cursor-pointer transition-colors"
                    title={mostrarSenha ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {mostrarSenha ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                id="btn-submeter-login"
                type="submit"
                disabled={isLoading || !loginInput.trim() || !senhaInput}
                className="w-full h-10 mt-2 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-white" />
                    <span>Acessar Painel</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Rodapé do Card */}
          <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-5 py-2.5 flex items-center justify-between text-[11px] text-[#64748B]">
            <span className="font-medium text-[#0F172A] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0F172A]" />
              <span>Ambiente Seguro & Criptografado</span>
            </span>
            <span className="font-semibold text-[#0F172A]">v2.5</span>
          </div>
        </div>

        {/* Rodapé Institucional */}
        <div className="text-center text-[11px] text-[#64748B] leading-relaxed">
          Plataforma de Gestão Integrada • Controle de Acessos & Módulos
        </div>
      </div>
    </div>
  );
};
