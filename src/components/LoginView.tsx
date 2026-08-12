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
} from 'lucide-react';
import { useAuth, PERFIS_RESPONSAVEIS } from '../context/AuthContext';
import { useEmpresa } from '../context/EmpresaContext';

export const LoginView: React.FC = () => {
  const {
    loginComEmailSenha,
    loginComResponsavel,
    usuarios,
    erroAuth,
    isLoading,
    limparErro,
  } = useAuth();
  const { config } = useEmpresa();

  const [loginInput, setLoginInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const corPrimaria = config.estetica?.corPrimaria || '#5C3A22';
  const corSecundaria = config.estetica?.corSecundaria || '#8A6142';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput.trim() || !senhaInput) return;
    limparErro();
    try {
      await loginComEmailSenha(loginInput, senhaInput);
    } catch (err) {
      console.error('Erro ao autenticar:', err);
    }
  };

  const handlePreencherCredencial = (email: string, senha: string = 'Agda@2026') => {
    setLoginInput(email);
    setSenhaInput(senha);
    limparErro();
  };

  // Obter perfis para acesso rápido (dos usuários cadastrados ou do seed)
  const perfisAcessoRapido = (usuarios && usuarios.length > 0 ? usuarios : PERFIS_RESPONSAVEIS).slice(0, 5);

  return (
    <div
      id="tela-login-crm"
      className="min-h-screen bg-[#FAFAF9] flex flex-col justify-center items-center p-4 sm:p-6 text-[#1A1A1A] relative"
    >
      {/* Detalhes arquitetônicos sutis da identidade da clínica */}
      <div className="w-full max-w-lg relative z-10 space-y-5 animate-in fade-in duration-200">
        {/* Cabeçalho da Marca */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-white border border-[#D9D6D0] text-[#1A1A1A] text-xs font-semibold tracking-wide shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: corPrimaria }} />
            <span className="uppercase text-[11px] tracking-wider font-bold">Acesso Seguro • CRM Clínico</span>
          </div>

          <div className="flex items-center justify-center gap-3.5 pt-1">
            {/* Logo da Clínica (Imagem ou Monograma) */}
            {config.tipoLogo === 'imagem' && config.logoUrl ? (
              <div className="flex items-center justify-center max-h-20">
                <img
                  src={config.logoUrl}
                  alt={config.nomeEmpresa}
                  className="max-h-20 max-w-[360px] object-contain border-none rounded-none shadow-none"
                />
              </div>
            ) : (
              <>
                <div
                  className="w-20 h-20 bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-2xl tracking-wider border-none rounded-none shadow-none"
                >
                  {config.monogramaIniciais || 'AR'}
                </div>
                <div className="text-left">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1A1A] uppercase">
                    {config.nomeEmpresa || 'Dra. Agda Rodrigues'}
                  </h1>
                  <p
                    style={{ color: corSecundaria }}
                    className="text-xs font-semibold tracking-wider uppercase"
                  >
                    {config.subtitulo || 'Harmonização Facial & Medicina Estética'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Linha Divisória */}
        <div className="h-[2px] w-16 mx-auto" style={{ backgroundColor: corPrimaria }} />

        {/* Card Principal de Autenticação */}
        <div className="bg-white text-[#1A1A1A] rounded-sm shadow-sm border border-[#D9D6D0] overflow-hidden">
          <div className="p-5 sm:p-7 space-y-5">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#1A1A1A] uppercase tracking-wide flex items-center gap-2">
                <span style={{ color: corPrimaria }} className="font-semibold">01</span>
                <span>Entrar no Sistema</span>
              </h2>
              <p className="text-xs text-[#6E6E6E] leading-relaxed">
                Digite seu login/e-mail e sua senha de acesso ou utilize o acesso rápido abaixo.
              </p>
            </div>

            {/* Mensagem de Erro de Autenticação */}
            {erroAuth && (
              <div
                id="alerta-erro-auth"
                style={{ borderLeftColor: corPrimaria }}
                className="p-3 rounded-sm bg-[#F2EFEA] border-l-4 text-[#1A1A1A] text-xs font-medium flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: corPrimaria }} />
                <div className="space-y-1 leading-snug">
                  <span>{erroAuth}</span>
                  <div className="text-[11px] text-[#6E6E6E] pt-0.5">
                    Dica: Você pode clicar em qualquer perfil abaixo para autenticar instantaneamente.
                  </div>
                </div>
              </div>
            )}

            {/* Formulário de Login */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="input-login"
                  className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center justify-between"
                >
                  <span>Login / E-mail / Usuário:</span>
                  <span className="text-[10px] text-[#8F887E] normal-case font-normal">
                    (ex: cadu, gestao, agda, camila)
                  </span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8F887E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                    placeholder="ex: cadu, gestao, dra.agda ou caducanes@gmail.com"
                    className="w-full h-11 pl-10 pr-3.5 text-xs sm:text-sm rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/40 text-[#1A1A1A] focus:bg-white focus:outline-hidden transition-all placeholder:text-[#8F887E]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="input-senha"
                    className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider"
                  >
                    Senha:
                  </label>
                  <span className="text-[11px] text-[#8A6142] font-semibold">
                    Padrão: <code className="bg-[#F2EFEA] px-1 py-0.5 rounded text-[#1A1A1A]">Agda@2026</code>
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8F887E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                    className="w-full h-11 pl-10 pr-10 text-xs sm:text-sm rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/40 text-[#1A1A1A] focus:bg-white focus:outline-hidden transition-all placeholder:text-[#8F887E]"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F887E] hover:text-[#1A1A1A] p-1 cursor-pointer transition-colors"
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
                className="w-full h-11 mt-3 rounded-sm bg-[#1A1A1A] hover:bg-[#5C3A22] text-white text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-white" />
                    <span>Entrar no Sistema</span>
                  </>
                )}
              </button>
            </form>

            {/* Divisor de Acesso Rápido */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#D9D6D0]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-[11px] font-bold text-[#8F887E] tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-[#8A6142]" />
                  Acesso Rápido de 1 Clique
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
                    className="p-2.5 text-left rounded-sm border border-[#D9D6D0] hover:border-[#5C3A22] bg-[#F2EFEA]/30 hover:bg-[#F2EFEA] transition-all cursor-pointer group flex items-start gap-2.5 disabled:opacity-50"
                  >
                    <div className="w-7 h-7 rounded-sm bg-[#1A1A1A] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 group-hover:bg-[#5C3A22] transition-colors">
                      <Icone className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[#1A1A1A] truncate group-hover:text-[#5C3A22]">
                        {perfil.nome}
                      </div>
                      <div className="text-[10px] text-[#6E6E6E] truncate">
                        {perfil.cargo}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rodapé do Card */}
          <div className="bg-[#F2EFEA] border-t border-[#D9D6D0] px-6 py-2.5 flex items-center justify-between text-[11px] text-[#6E6E6E]">
            <span className="font-medium text-[#1A1A1A]">
              {config.nomeEmpresa || 'Dra. Agda Rodrigues'} • POP-COM-001
            </span>
            <span className="font-semibold" style={{ color: corPrimaria }}>v2.5</span>
          </div>
        </div>

        {/* Rodapé Institucional */}
        <div className="text-center text-[11px] text-[#6E6E6E] leading-relaxed">
          {config.nomeEmpresa || 'Dra. Agda Rodrigues'} – {config.subtitulo || 'Harmonização Facial'} • CRM & Gestão de Pacientes
        </div>
      </div>
    </div>
  );
};
