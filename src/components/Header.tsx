import React from 'react';
import { Menu } from 'lucide-react';

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
  return (
    <header
      id="main-app-header"
      className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3.5 bg-white border-b border-[#D9D6D0] shadow-xs"
    >
      <div className="flex items-center gap-3">
        <button
          id="btn-mobile-sidebar-toggle"
          type="button"
          onClick={onOpenMobileSidebar}
          className="p-1.5 -ml-1.5 rounded-sm text-[#1A1A1A] hover:bg-[#F2EFEA] lg:hidden focus:outline-hidden cursor-pointer"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 id="header-page-title" className="text-lg sm:text-xl font-bold tracking-tight text-[#1A1A1A] uppercase">
          {activeTitle}
        </h1>
      </div>
    </header>
  );
};

