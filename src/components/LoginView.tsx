import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
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

  const campo =
    'w-full h-11 px-3.5 text-sm rounded-md border border-[#E4D3C0] bg-white text-[#2B1A10] placeholder:text-[#9A8672] focus:border-[#B8793A] focus:outline-hidden focus:ring-2 focus:ring-[#B8793A]/25 transition-colors';

  return (
    <div id="tela-login-crm" className="min-h-screen grid lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] bg-[#F6F1EA] text-[#2B1A10]">
      {/* Painel de marca */}
      <aside className="hidden lg:flex flex-col justify-between bg-[#2B1A10] text-[#F6F1EA] px-14 py-12">
        <span className="font-display text-lg tracking-tight text-[#E4D3C0]">CRM da clínica</span>
        <div className="max-w-md space-y-6">
          <p className="font-display text-4xl leading-[1.15] font-medium">
            Cada paciente no ponto certo do caminho, do primeiro contato ao retorno.
          </p>
          <div aria-hidden="true" className="flex items-stretch h-2.5 gap-1 w-full max-w-sm">
            <span className="flex-[10] rounded-full bg-[#B8793A]" />
            <span className="flex-[7] rounded-full bg-[#B8793A]/75" />
            <span className="flex-[5] rounded-full bg-[#B8793A]/55" />
            <span className="flex-[3] rounded-full bg-[#B8793A]/35" />
          </div>
        </div>
        <p className="text-sm text-[#C9B8A3]">Leads, consultas e fechamentos em um só lugar.</p>
      </aside>

      {/* Formulário */}
      <main className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm space-y-8">
          <header className="space-y-2">
            <h1 className="font-display text-3xl font-medium tracking-tight">Entrar no CRM</h1>
            <p className="text-sm text-[#6B5646]">Use o e-mail e a senha do seu acesso.</p>
          </header>

          {erroAuth && (
            <div
              id="alerta-erro-auth"
              role="alert"
              className="flex items-start gap-2.5 rounded-md border border-[#8C2F39]/30 bg-[#8C2F39]/8 px-3.5 py-3 text-sm text-[#6E1F29]"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{erroAuth}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="input-login" className="block text-sm font-medium">
                E-mail
              </label>
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
                placeholder="nome@clinica.com.br"
                className={campo}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="input-senha" className="block text-sm font-medium">
                Senha
              </label>
              <div className="relative">
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
                  className={`${campo} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-[#6B5646] hover:text-[#2B1A10] cursor-pointer"
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="btn-submeter-login"
              type="submit"
              disabled={isLoading || !loginInput.trim() || !senhaInput}
              className="w-full h-11 rounded-md bg-[#5C3A22] hover:bg-[#4A2E1B] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Entrando</span>
                </>
              ) : (
                <span>Entrar</span>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};
