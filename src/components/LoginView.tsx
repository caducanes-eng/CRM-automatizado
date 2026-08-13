import React, { useState } from 'react';
import {
  Lock,
  Mail,
  LogIn,
  AlertCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  UserCheck,
  Sparkles,
  Crown,
  Stethoscope,
  PhoneCall,
  HeartHandshake,
  Building2,
} from 'lucide-react';
import { useAuth, PERFIS_RESPONSAVEIS } from '../context/AuthContext';

export const LoginView: React.FC = () => {
  const {
    login,
    loginComEmailSenha,
    loginComResponsavel,
    usuarios,
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
      // Tenta efetuar o login com Supabase Auth / credenciais
      const fnLogin = login || loginComEmailSenha;
      await fnLogin(loginInput, senhaInput);
    } catch (err: any) {
      console.error('Falha de autenticação no login:', err);
      // O erro foi capturado, registrado em erroAuth e a navegação foi impedida
    }
  };

  // Perfis de acesso rápido (dos usuários cadastrados ou do seed)
  const perfisAcessoRapido = (usuarios && usuarios.length > 0 ? usuarios : PERFIS_RESPONSAVEIS).slice(0, 5);

  return (
    <div
      id="tela-login-crm"
      className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center items-center p-4 sm:p-6 text-[#1A1A1A] relative font-sans"
    >
      <div className="w-full max-w-lg relative z-10 space-y-5 animate-in fade-in duration-200">
        {/* Cabeçalho Neutro do Sistema */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E2E8F0] text-[#0F172A] text-xs font-semibold tracking-wide shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-[#0F172A]" />
            <span className="uppercase text-[11px] tracking-wider font-bold">Acesso ao Sistema • CRM</span>
          </div>

          <div className="flex flex-col items-center justify-center gap-2 pt-1">
            <div className="w-14 h-14 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shadow-md">
              <Building2 className="w-7 h-7 text-white" />
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

        {/* Linha Divisória Neutra */}
        <div className="h-[2px] w-12 mx-auto bg-[#0F172A]/20 rounded-full" />

        {/* Card Principal de Autenticação */}
        <div className="bg-white text-[#0F172A] rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden">
          <div className="p-5 sm:p-7 space-y-5">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0F172A]" />
                <span>Identificação de Usuário</span>
              </h2>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Informe seu e-mail e senha cadastrados para acessar seu painel personalizado.
              </p>
            </div>

            {/* Mensagem de Erro de Autenticação */}
            {erroAuth && (
              <div
                id="alerta-erro-auth"
                className="p-3.5 rounded-lg bg-rose-50 border-l-4 border-rose-600 text-rose-900 text-xs font-medium flex items-start gap-2.5 shadow-2xs animate-in fade-in"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1 leading-snug">
                  <span className="font-semibold text-rose-950">{erroAuth}</span>
                  <div className="text-[11px] text-rose-700 pt-0.5">
                    Verifique os dados informados ou selecione um dos perfis abaixo para login rápido.
                  </div>
                </div>
              </div>
            )}

            {/* Formulário de Login */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="input-login"
                  className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center justify-between"
                >
                  <span>E-mail / Usuário:</span>
                  <span className="text-[10px] text-[#64748B] normal-case font-normal">
                    (ex: gestao@agdarodrigues.med.br)
                  </span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="input-login"
                    type="text"
                    required
                    autoComplete="username"
                    value={loginInput}
                    onChange={(e) => {
                      setLoginInput(e.target.value);
                      if (erroAuth) limparErro();
                    }}
                    placeholder="Digite seu e-mail ou login..."
                    className="w-full h-11 pl-10 pr-3.5 text-xs sm:text-sm rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] focus:bg-white focus:border-[#0F172A] focus:outline-hidden transition-all placeholder:text-[#94A3B8]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="input-senha"
                    className="text-xs font-bold text-[#0F172A] uppercase tracking-wider"
                  >
                    Senha:
                  </label>
                  <span className="text-[11px] text-[#64748B] font-medium">
                    Padrão do Sistema: <code className="bg-[#F1F5F9] px-1.5 py-0.5 rounded text-[#0F172A] font-mono text-[11px]">Agda@2026</code>
                  </span>
                </div>
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
                    className="w-full h-11 pl-10 pr-10 text-xs sm:text-sm rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] focus:bg-white focus:border-[#0F172A] focus:outline-hidden transition-all placeholder:text-[#94A3B8]"
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
                className="w-full h-11 mt-3 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
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

            {/* Divisor de Acesso Rápido */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E2E8F0]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-[11px] font-bold text-[#64748B] tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#0F172A]" />
                  Acesso Rápido de Responsável
                </span>
              </div>
            </div>

            {/* Botões de Acesso Rápido */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {perfisAcessoRapido.map((perfil) => {
                const isSuperAdmin = perfil.email === 'caducanes@gmail.com' || perfil.id === 'user-cadu';
                const isGestao = perfil.role === 'GESTOR' || perfil.email.includes('gestao');
                const isMedico = perfil.role === 'MEDICO' || perfil.cargo.toLowerCase().includes('médic');
                const isSec1 = perfil.id === 'user-sec1' || perfil.email.includes('secretaria1');

                let Icone = UserCheck;
                if (isSuperAdmin || isGestao) Icone = Crown;
                else if (isMedico) Icone = Stethoscope;
                else if (isSec1) Icone = PhoneCall;
                else Icone = HeartHandshake;

                return (
                  <button
                    key={perfil.id}
                    type="button"
                    onClick={() => loginComResponsavel(perfil)}
                    disabled={isLoading}
                    className="p-2.5 text-left rounded-lg border border-[#E2E8F0] hover:border-[#0F172A] bg-[#F8FAFC] hover:bg-white transition-all cursor-pointer group flex items-start gap-2.5 disabled:opacity-50 shadow-2xs"
                  >
                    <div className="w-7 h-7 rounded-md bg-[#0F172A] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-colors">
                      <Icone className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[#0F172A] truncate group-hover:text-[#1E293B]">
                        {perfil.nome}
                      </div>
                      <div className="text-[10px] text-[#64748B] truncate">
                        {perfil.cargo}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rodapé do Card */}
          <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-6 py-2.5 flex items-center justify-between text-[11px] text-[#64748B]">
            <span className="font-medium text-[#0F172A]">
              Sistema de Gestão & CRM Integrado
            </span>
            <span className="font-semibold text-[#0F172A]">v2.5</span>
          </div>
        </div>

        {/* Rodapé Institucional */}
        <div className="text-center text-[11px] text-[#64748B] leading-relaxed">
          Plataforma de Gestão de Pacientes • Controle de Acessos & Módulos
        </div>
      </div>
    </div>
  );
};
