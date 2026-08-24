import React, { useState, useRef, useEffect } from 'react';
import { Menu, Building2, ChevronDown, Check, Plus, ExternalLink } from 'lucide-react';
import { useEmpresa } from '../context/EmpresaContext';
import { useAuth } from '../context/AuthContext';
import { SectionId } from '../types';

interface HeaderProps {
  activeTitle: string;
  activeDescription?: string;
  onOpenMobileSidebar: () => void;
  isQuickRegistration?: boolean;
  onNavigateToSection?: (id: SectionId) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTitle,
  onOpenMobileSidebar,
  onNavigateToSection,
}) => {
  const { config, empresaAtiva, empresas, empresaAtivaId, definirEmpresaAtivaId, isPlataformaAdmin } = useEmpresa();
  const { isGestor } = useAuth();
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const corPrimaria = config.estetica?.corPrimaria || '#5C3A22';

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  // Apenas o Gestor Master (isPlataformaAdmin) tem o poder de entrar e alternar entre todas as empresas
  const podeGerenciarPlataforma = isPlataformaAdmin;

  return (
    <header
      id="main-app-header"
      className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-[#D9D6D0] shadow-xs"
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          id="btn-mobile-sidebar-toggle"
          type="button"
          onClick={onOpenMobileSidebar}
          className="p-1.5 -ml-1.5 rounded-sm text-[#1A1A1A] hover:bg-[#F2EFEA] lg:hidden focus:outline-hidden cursor-pointer shrink-0"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1
          id="header-page-title"
          className="text-base sm:text-lg font-bold tracking-tight text-[#1A1A1A] uppercase truncate"
        >
          {activeTitle}
        </h1>
      </div>

      {/* Lado Direito: Identificação da Clínica & Seletor Rápido */}
      <div className="flex items-center gap-2 sm:gap-3" ref={dropdownRef}>
        {podeGerenciarPlataforma && onNavigateToSection && (
          <button
            id="btn-header-painel-plataforma"
            type="button"
            onClick={() => onNavigateToSection('painel_plataforma')}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-sm border border-amber-300/80 bg-amber-50 text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer"
            title="Abrir Painel da Plataforma Multi-Clínicas"
          >
            <Building2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>Painel da Plataforma</span>
          </button>
        )}

        <div className="relative">
          <button
            id="btn-header-empresa-dropdown"
            type="button"
            onClick={() => {
              if (podeGerenciarPlataforma && empresas.length > 1) {
                setDropdownAberto(!dropdownAberto);
              } else if (podeGerenciarPlataforma && onNavigateToSection) {
                onNavigateToSection('painel_plataforma');
              }
            }}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-sm border border-[#D9D6D0] bg-[#F8F7F4] transition-colors text-left ${
              podeGerenciarPlataforma ? 'hover:bg-[#EFECE6] cursor-pointer' : ''
            }`}
          >
            <div
              className="w-5 h-5 rounded-xs flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow-2xs"
              style={{ backgroundColor: corPrimaria }}
            >
              {empresaAtiva?.monogramaIniciais || config.monogramaIniciais || 'AR'}
            </div>
            <div className="hidden sm:block min-w-0 max-w-[170px]">
              <p className="text-[11px] font-bold text-[#1A1A1A] truncate leading-tight">
                {empresaAtiva?.nome || config.nomeEmpresa || 'Dra. Agda Rodrigues'}
              </p>
              <p className="text-[9px] text-[#6E6E6E] truncate leading-none mt-0.5">
                {empresaAtiva?.subtitulo || 'Clínica Estética'}
              </p>
            </div>
            {podeGerenciarPlataforma && (
              <ChevronDown className="w-3.5 h-3.5 text-[#6E6E6E] shrink-0" />
            )}
          </button>

          {/* Dropdown de Clínicas */}
          {dropdownAberto && podeGerenciarPlataforma && (
            <div
              id="dropdown-header-empresas-menu"
              className="absolute right-0 mt-1.5 w-64 bg-white rounded-md shadow-xl border border-[#D9D6D0] py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
            >
              <div className="px-3 py-1.5 border-b border-[#F0ECE1] flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6E6E]">
                  Alternar Clínica / Unidade
                </span>
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-xs bg-[#EFECE6] text-[#1A1A1A]">
                  {empresas.length} {empresas.length === 1 ? 'clínica' : 'clínicas'}
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto py-1">
                {empresas.map((emp) => {
                  const isAtiva = emp.id === empresaAtivaId;
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => {
                        definirEmpresaAtivaId(emp.id);
                        setDropdownAberto(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                        isAtiva ? 'bg-[#F8F7F4] font-bold text-[#1A1A1A]' : 'hover:bg-[#FAFAF9] text-[#4A4A4A]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-5 h-5 rounded-xs flex items-center justify-center font-bold text-[9px] text-white shrink-0"
                          style={{ backgroundColor: isAtiva ? corPrimaria : '#8F887E' }}
                        >
                          {emp.monogramaIniciais || emp.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs truncate">{emp.nome}</p>
                          {emp.subtitulo && (
                            <p className="text-[10px] text-[#8F887E] truncate font-normal">{emp.subtitulo}</p>
                          )}
                        </div>
                      </div>
                      {isAtiva && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>

              {onNavigateToSection && (
                <div className="pt-1.5 mt-1 border-t border-[#F0ECE1] px-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownAberto(false);
                      onNavigateToSection('painel_plataforma');
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-sm transition-colors cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5 text-amber-700" />
                    <span>Gerenciar Todas as Clínicas</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};


