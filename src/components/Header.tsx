import React from 'react';
import { Menu } from 'lucide-react';
import { useEmpresa } from '../context/EmpresaContext';

interface HeaderProps {
  activeTitle: string;
  activeDescription?: string;
  onOpenMobileSidebar: () => void;
  isQuickRegistration?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTitle,
  onOpenMobileSidebar,
}) => {
  const { config, empresaAtiva } = useEmpresa();

  const corPrimaria = config.estetica?.corPrimaria || '#5C3A22';

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

      {/* Lado Direito: Identificação da Clínica */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm border border-[#D9D6D0] bg-[#F8F7F4]">
          <div
            className="w-5 h-5 rounded-xs flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow-2xs"
            style={{ backgroundColor: corPrimaria }}
          >
            {empresaAtiva?.monogramaIniciais || config.monogramaIniciais || 'AR'}
          </div>
          <div className="hidden sm:block min-w-0 max-w-[180px]">
            <p className="text-[11px] font-bold text-[#1A1A1A] truncate leading-tight">
              {empresaAtiva?.nome || config.nomeEmpresa || 'Dra. Agda Rodrigues'}
            </p>
            <p className="text-[9px] text-[#6E6E6E] truncate leading-none mt-0.5">
              Clínica Estética
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

