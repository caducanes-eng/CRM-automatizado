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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEmpresa } from '../context/EmpresaContext';

export const LoginView: React.FC = () => {
  const {
    loginComEmailSenha,
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

  return (
    <div
      id="tela-login-crm"
      className="min-h-screen bg-white flex flex-col justify-center items-center p-4 sm:p-6 text-[#1A1A1A] relative"
    >
      {/* Detalhes arquitetônicos sutis da identidade da clínica */}
      <div className="w-full max-w-md relative z-10 space-y-6 animate-in fade-in duration-200">
        {/* Cabeçalho da Marca */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-white border border-[#D9D6D0] text-[#1A1A1A] text-xs font-semibold tracking-wide shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: corPrimaria }} />
            <span className="uppercase text-[11px] tracking-wider font-bold">Acesso Restrito • CRM Clínico</span>
          </div>

          <div className="flex items-center justify-center gap-3.5 pt-1">
            {/* Logo da Clínica (Imagem ou Monograma) - 2x tamanho, sem bordas */}
            {config.tipoLogo === 'imagem' && config.logoUrl ? (
              <div className="flex items-center justify-center max-h-24">
                <img
                  src={config.logoUrl}
                  alt={config.nomeEmpresa}
                  className="max-h-24 max-w-[400px] object-contain border-none rounded-none shadow-none"
                />
              </div>
            ) : (
              <>
                <div
                  className="w-24 h-24 bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-2xl tracking-wider border-none rounded-none shadow-none"
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
                    {config.subtitulo || 'Harmonização Facial'}
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
          <div className="p-6 sm:p-8 space-y-5">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#1A1A1A] uppercase tracking-wide flex items-center gap-2">
                <span style={{ color: corPrimaria }} className="font-semibold">01</span>
                <span>Entrar no Sistema</span>
              </h2>
              <p className="text-xs text-[#6E6E6E] leading-relaxed">
                Digite seu login ou e-mail institucional e sua senha de acesso.
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
                <span className="leading-snug">{erroAuth}</span>
              </div>
            )}

            {/* Formulário de Login */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="input-login"
                  className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center justify-between"
                >
                  <span>Login / E-mail:</span>
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
                    placeholder="ex: gestao@agdarodrigues.med.br ou seu.nome"
                    className="w-full h-11 pl-10 pr-3.5 text-xs sm:text-sm rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/40 text-[#1A1A1A] focus:bg-white focus:outline-hidden transition-all placeholder:text-[#8F887E]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="input-senha"
                  className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center justify-between"
                >
                  <span>Senha:</span>
                </label>
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
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-white" />
                    <span>Entrar no Sistema</span>
                  </>
                )}
              </button>
            </form>

            {/* Bloco de Destaque Oficial */}
            <div className="bloco-destaque-ar p-3.5 rounded-sm flex items-start gap-2.5 text-xs text-[#6E6E6E] leading-relaxed">
              <UserCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: corPrimaria }} />
              <div>
                <strong className="text-[#1A1A1A] font-semibold block">
                  Controle Centralizado de Acessos
                </strong>
                Novos colaboradores e permissões são gerenciados exclusivamente pelo Administrador na aba de Controle de Acessos.
              </div>
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
