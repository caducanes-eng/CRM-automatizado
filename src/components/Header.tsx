import React, { useState } from 'react';
import { Menu, Building2, LogOut, Database, ChevronDown, CheckCircle2, Server } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCrm } from '../context/CrmContext';
import { useEmpresa } from '../context/EmpresaContext';
import { isSupabaseConfigured } from '../lib/supabase';

interface HeaderProps {
  activeTitle: string;
  activeDescription: string;
  onOpenMobileSidebar: () => void;
  isQuickRegistration: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTitle,
  activeDescription,
  onOpenMobileSidebar,
  isQuickRegistration,
}) => {
  const { responsavelAtivo, responsavelNome, deslogar } = useAuth();
  const { isFirestoreConnected, isSyncing } = useCrm();
  const { config } = useEmpresa();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isSupabaseActive = isSupabaseConfigured();
  const corPrimaria = config.estetica?.corPrimaria || '#5C3A22';

  return (
    <header
      id="main-app-header"
      className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3.5 bg-white border-b border-[#D9D6D0] shadow-xs"
    >
      <div className="flex items-center gap-4">
        <button
          id="btn-mobile-sidebar-toggle"
          type="button"
          onClick={onOpenMobileSidebar}
          className="p-2 -ml-2 rounded-sm text-[#1A1A1A] hover:bg-[#F2EFEA] lg:hidden focus:outline-hidden cursor-pointer"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2.5">
            <h2 id="header-page-title" className="text-lg sm:text-xl font-bold tracking-tight text-[#1A1A1A] uppercase">
              {activeTitle}
            </h2>
            {isQuickRegistration && (
              <span
                id="header-quick-badge"
                style={{ color: corPrimaria, borderColor: `${corPrimaria}40` }}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-sm text-[11px] font-bold uppercase tracking-wider bg-[#F2EFEA] border"
              >
                Modo Foco
              </span>
            )}
          </div>
          <p id="header-page-description" className="text-xs text-[#6E6E6E] hidden sm:block font-normal">
            {activeDescription}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Status de Sincronização Supabase */}
        <div
          id="header-supabase-status"
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-semibold border border-[#D9D6D0] bg-[#FAF9F5] text-[#1A1A1A]"
          title="Conexão com banco de dados relacional Supabase"
        >
          <Server className="w-3.5 h-3.5" style={{ color: corPrimaria }} />
          <span className="text-[10px] uppercase font-bold tracking-wider">
            {isSupabaseActive ? 'Supabase Conectado' : 'Supabase'}
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${isSupabaseActive ? 'bg-emerald-600' : 'bg-amber-500'}`}
          />
        </div>

        {/* Status de Sincronização Cloud Firestore */}
        <div
          id="header-firestore-status"
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-semibold border border-[#D9D6D0] bg-[#F2EFEA] text-[#1A1A1A]"
          title="Sincronização em tempo real com Firebase Firestore"
        >
          <Database className="w-3.5 h-3.5" style={{ color: corPrimaria }} />
          <span className="text-[10px] uppercase font-bold tracking-wider">
            {isSyncing ? 'Sincronizando...' : isFirestoreConnected ? 'Firestore Conectado' : 'Conectando Firestore'}
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${isFirestoreConnected ? 'bg-emerald-600' : 'bg-[#8F887E] animate-pulse'}`}
          />
        </div>

        {/* Unidade da Clínica */}
        <div
          id="header-clinic-pill"
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-[#F2EFEA] border border-[#D9D6D0] text-xs text-[#1A1A1A]"
        >
          <Building2 className="w-3.5 h-3.5" style={{ color: corPrimaria }} />
          <span className="font-semibold text-[11px] uppercase tracking-wider">
            {config.unidadePadrao || 'Consultório Principal'}
          </span>
        </div>

        {/* Usuário Responsável Autenticado */}
        <div className="relative">
          <button
            id="header-user-badge"
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-sm hover:bg-[#F2EFEA] transition-colors cursor-pointer text-left focus:outline-hidden border border-transparent hover:border-[#D9D6D0]"
          >
            <div
              style={{ borderBottomColor: corPrimaria }}
              className="w-8 h-8 rounded-sm bg-[#1A1A1A] text-white flex items-center justify-center text-xs font-bold border-b-2 shadow-xs shrink-0"
            >
              {responsavelAtivo?.iniciais || config.monogramaIniciais || 'AR'}
            </div>
            <div className="hidden sm:block text-left max-w-[150px]">
              <p className="text-xs font-bold text-[#1A1A1A] leading-tight truncate">
                {responsavelNome}
              </p>
              <p className="text-[10px] text-[#6E6E6E] truncate font-medium">
                {responsavelAtivo?.cargo || 'Colaborador'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#8F887E]" />
          </button>

          {/* Menu Dropdown de Usuário */}
          {showUserMenu && (
            <div
              id="header-user-dropdown"
              className="absolute right-0 mt-2 w-60 bg-white rounded-sm shadow-md border border-[#D9D6D0] py-1.5 z-50 animate-in fade-in duration-150"
            >
              <div className="px-3.5 py-2.5 border-b border-[#D9D6D0]">
                <p className="text-xs font-bold text-[#1A1A1A] truncate">{responsavelNome}</p>
                <p className="text-[11px] text-[#6E6E6E] truncate">{responsavelAtivo?.email || 'Autenticado'}</p>
                <span
                  style={{ color: corPrimaria, borderColor: `${corPrimaria}30` }}
                  className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-[#F2EFEA] px-2 py-0.5 rounded-sm border"
                >
                  {responsavelAtivo?.cargo || 'Equipe'}
                </span>
              </div>

              <div className="p-1">
                <button
                  id="btn-header-logout"
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    deslogar();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-sm transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span>Sair do Sistema</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
