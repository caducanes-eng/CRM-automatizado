import React from 'react';
import {
  UserPlus,
  Flame,
  CalendarCheck,
  Sparkles,
  RotateCcw,
  Sprout,
  UserX,
  ShoppingBag,
  Filter,
  ChevronRight,
  ShieldCheck,
  LogOut,
  SlidersHorizontal,
} from 'lucide-react';
import { SectionId, NavigationItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCrm } from '../context/CrmContext';
import { useEmpresa } from '../context/EmpresaContext';

interface SidebarProps {
  activeSection: SectionId;
  onSelectSection: (id: SectionId) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const navigationItems: {
  category?: string;
  items: (NavigationItem & { icon: React.ElementType })[];
}[] = [
  {
    items: [
      {
        id: 'cadastro_rapido',
        label: 'Cadastro rápido',
        description: 'Entrada ultra rápida de novos pacientes',
        icon: UserPlus,
        isPrimary: true,
      },
    ],
  },
  {
    category: 'Etapas do Funil',
    items: [
      {
        id: 'em_captacao',
        label: 'Em captação',
        description: 'Novos contatos e primeiros retornos',
        icon: Flame,
      },
      {
        id: 'pos_consulta',
        label: 'Pós consulta',
        description: 'Avaliações e planos de tratamento',
        icon: CalendarCheck,
      },
      {
        id: 'pos_procedimento',
        label: 'Pós procedimento',
        description: 'Acompanhamento e retornos',
        icon: Sparkles,
      },
      {
        id: 'reativacao',
        label: 'Reativação',
        description: 'Pacientes inativos e novas sessões',
        icon: RotateCcw,
      },
      {
        id: 'nutricao',
        label: 'Nutrição',
        description: 'Fluxos de orientação e aquecimento',
        icon: Sprout,
      },
    ],
  },
  {
    category: 'Gestão & Análise',
    items: [
      {
        id: 'leads_perdidos',
        label: 'Leads perdidos',
        description: 'Motivos de descarte e perdas',
        icon: UserX,
      },
      {
        id: 'historico_compras',
        label: 'Histórico de compras',
        description: 'Procedimentos e tratamentos realizados',
        icon: ShoppingBag,
      },
      {
        id: 'funil_conversao',
        label: 'Funil de conversão',
        description: 'Métricas e taxas de conversão',
        icon: Filter,
      },
      {
        id: 'controle_acessos',
        label: 'Controle de acessos',
        description: 'Gestão exclusiva de usuários e credenciais',
        icon: ShieldCheck,
        restritoGestor: true,
        badge: 'Gestor',
      },
      {
        id: 'configuracoes',
        label: 'Configurações da clínica',
        description: 'Logotipo, dados da clínica e cores da plataforma',
        icon: SlidersHorizontal,
        restritoGestor: true,
        badge: 'Gestor',
      },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { responsavelAtivo, responsavelNome, isGestor, podeAcessarSecao, deslogar } = useAuth();
  const { isFirestoreConnected } = useCrm();
  const { config } = useEmpresa();

  const corSidebar = config.estetica?.corSidebar || '#1A1A1A';
  const corPrimaria = config.estetica?.corPrimaria || '#5C3A22';
  const corSecundaria = config.estetica?.corSecundaria || '#8A6142';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          id="mobile-sidebar-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* BARRA LATERAL FIXA SEM SCROLLING */}
      <aside
        id="main-sidebar"
        style={{
          backgroundColor: corSidebar,
          color: config.estetica?.corSidebarTexto || '#F2EFEA',
        }}
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col justify-between w-72 h-screen overflow-hidden border-r border-black/20 shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* TOPO: LOGO / IDENTIDADE DA CLÍNICA (AJUSTADO LATERALMENTE À LARGURA DA BARRA) */}
        <div
          id="sidebar-brand"
          className={`w-full border-b border-white/10 shrink-0 transition-all duration-200 ${
            config.tipoLogo === 'imagem' && config.logoUrl
              ? config.logoAjusteLateral === 'sangrado'
                ? 'p-0'
                : config.logoAjusteLateral === 'total'
                ? 'px-2 py-2.5'
                : config.logoAjusteLateral === 'respirado'
                ? 'px-5 py-3.5'
                : 'px-3.5 py-3'
              : 'px-4 py-3.5'
          } ${
            config.logoFundoHeader === 'escuro_suave'
              ? 'bg-black/40'
              : 'bg-black/25'
          }`}
        >
          {config.tipoLogo === 'imagem' && config.logoUrl ? (
            <div
              className={`w-full flex items-center justify-center ${
                config.logoFundoHeader === 'fundo_claro'
                  ? 'bg-white/95 rounded-xs p-2 shadow-xs border border-white/20'
                  : ''
              }`}
            >
              <img
                src={config.logoUrl}
                alt={config.nomeEmpresa || 'Logo da Clínica'}
                className={`w-full max-w-full h-auto object-contain transition-all duration-200 ${
                  config.logoAltura === 'compacta'
                    ? 'max-h-12'
                    : config.logoAltura === 'ampla'
                    ? 'max-h-20'
                    : config.logoAltura === 'destaque'
                    ? 'max-h-24'
                    : config.logoAltura === 'maxima'
                    ? 'max-h-32'
                    : 'max-h-16'
                }`}
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-sm bg-white text-[#1A1A1A] flex items-center justify-center font-bold text-sm tracking-wider border-b-2 shadow-xs shrink-0"
                style={{ borderBottomColor: corPrimaria }}
              >
                {config.monogramaIniciais || 'AR'}
              </div>
              <div className="min-w-0">
                <h1 className="text-xs font-bold tracking-wider text-white uppercase truncate">
                  {config.nomeEmpresa || 'Dra. Agda Rodrigues'}
                </h1>
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider truncate"
                  style={{ color: corSecundaria }}
                >
                  {config.subtitulo || 'Harmonização Facial'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* NAVEGAÇÃO PRINCIPAL (COMPACTA, SEM SCROLL) */}
        <div
          id="sidebar-nav-container"
          className="flex-1 flex flex-col justify-start overflow-hidden px-2.5 py-2.5 space-y-2.5"
        >
          {navigationItems.map((group, groupIdx) => {
            const itensVisiveis = group.items.filter((item) => {
              if (item.restritoGestor && !isGestor) {
                return false;
              }
              return podeAcessarSecao(item.id);
            });

            if (itensVisiveis.length === 0) return null;

            return (
              <div key={groupIdx} id={`nav-group-${groupIdx}`} className="space-y-0.5">
                {group.category && (
                  <div className="px-2.5 pb-0.5 text-[9px] font-bold uppercase tracking-wider text-[#8F887E]/90">
                    {group.category}
                  </div>
                )}
                <div className="space-y-0.5">
                  {itensVisiveis.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    const isPrimaryQuick = item.isPrimary;
                    const isGestorExclusivo = item.restritoGestor;

                    return (
                      <button
                        key={item.id}
                        id={`nav-item-${item.id}`}
                        onClick={() => {
                          onSelectSection(item.id);
                          onCloseMobile();
                        }}
                        style={
                          isActive
                            ? isPrimaryQuick
                              ? { backgroundColor: corPrimaria, color: '#FFFFFF' }
                              : {
                                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                                  color: '#FFFFFF',
                                  borderLeftColor: corPrimaria,
                                }
                            : undefined
                        }
                        className={`group w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm text-xs font-medium transition-all duration-150 text-left cursor-pointer ${
                          isActive
                            ? isPrimaryQuick
                              ? 'font-semibold shadow-xs'
                              : 'font-semibold border-l-2 pl-2'
                            : isPrimaryQuick
                            ? 'bg-white/10 text-white hover:bg-white/15'
                            : 'text-[#8F887E] hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon
                            className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                              isActive
                                ? 'text-white'
                                : isPrimaryQuick
                                ? 'text-[#D9D6D0]'
                                : isGestorExclusivo
                                ? 'text-[#8F887E]'
                                : 'text-[#8F887E] group-hover:text-white'
                            }`}
                          />
                          <span className="truncate text-[11.5px]">{item.label}</span>
                        </div>

                        {isPrimaryQuick ? (
                          <span
                            className={`text-[8.5px] uppercase font-bold tracking-wider px-1 py-0.5 rounded-sm ${
                              isActive ? 'bg-white text-[#1A1A1A]' : 'bg-white/20 text-white'
                            }`}
                          >
                            Padrão
                          </span>
                        ) : isGestorExclusivo ? (
                          <span
                            className="text-[8.5px] font-bold tracking-wider uppercase px-1 py-0.5 rounded-sm bg-black/40 text-[#D9D6D0] border border-white/10"
                            style={isActive ? { borderColor: corPrimaria } : undefined}
                          >
                            Gestor
                          </span>
                        ) : (
                          <ChevronRight
                            className={`w-3 h-3 transition-transform opacity-0 group-hover:opacity-100 ${
                              isActive ? 'opacity-100 text-white' : 'text-[#8F887E]'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* RODAPÉ DA SIDEBAR: RESPONSÁVEL & STATUS */}
        <div
          id="sidebar-footer"
          className="p-2.5 border-t border-white/10 bg-black/30 shrink-0 space-y-1.5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                style={{ backgroundColor: corPrimaria }}
                className="w-6 h-6 rounded-sm flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow-xs"
              >
                {responsavelAtivo?.iniciais || config.monogramaIniciais || 'AR'}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-white truncate">
                  {responsavelNome}
                </p>
                <p className="text-[9.5px] text-[#8F887E] font-medium truncate">
                  {responsavelAtivo?.cargo || (isGestor ? 'Gestor Master' : 'Colaborador')}
                </p>
              </div>
            </div>
            <button
              id="btn-sidebar-logout"
              type="button"
              onClick={deslogar}
              title="Trocar de responsável ou sair"
              className="p-1 rounded-sm text-[#8F887E] hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-white/5 text-[9px] text-[#8F887E]">
            <span className="flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: isFirestoreConnected ? '#10B981' : corSecundaria }}
              />
              {isFirestoreConnected ? 'Nuvem Conectada' : 'Sincronizando...'}
            </span>
            <span className="text-[8.5px] uppercase font-mono tracking-wider text-[#8F887E]/70">
              {config.monogramaIniciais || 'AR'} CRM
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
