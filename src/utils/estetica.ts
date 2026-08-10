import { EsteticaPlataforma, ESTETICAS_PRESET } from '../types';

/**
 * Retorna uma estrutura completa de cores da barra lateral com fallbacks seguros
 * e garantia de contraste em todas as propriedades.
 */
export function obterCoresSidebarCompletas(estetica?: Partial<EsteticaPlataforma>): Required<
  Pick<
    EsteticaPlataforma,
    | 'corSidebar'
    | 'corSidebarTexto'
    | 'corNavCategoriaTexto'
    | 'corNavTextoInativo'
    | 'corNavTextoHover'
    | 'corNavHoverBg'
    | 'corNavAtivoBg'
    | 'corNavAtivoTexto'
    | 'corNavAtivoBorda'
    | 'corNavBadgeBg'
    | 'corNavBadgeTexto'
    | 'corNavFooterBg'
    | 'corNavFooterTextoPrincipal'
    | 'corNavFooterTextoSecundario'
    | 'corNavFooterIcone'
    | 'corPrimaria'
    | 'corSecundaria'
    | 'corFundoDestaque'
    | 'corBorda'
    | 'corTexto'
  >
> {
  const padrao = ESTETICAS_PRESET[0];

  const corSidebar = estetica?.corSidebar || padrao.corSidebar || '#1A1A1A';
  const corPrimaria = estetica?.corPrimaria || padrao.corPrimaria || '#5C3A22';
  const corSecundaria = estetica?.corSecundaria || padrao.corSecundaria || '#8A6142';

  return {
    corSidebar,
    corSidebarTexto: estetica?.corSidebarTexto || padrao.corSidebarTexto || '#F2EFEA',
    corNavCategoriaTexto: estetica?.corNavCategoriaTexto || padrao.corNavCategoriaTexto || '#A8A196',
    corNavTextoInativo: estetica?.corNavTextoInativo || padrao.corNavTextoInativo || '#8F887E',
    corNavTextoHover: estetica?.corNavTextoHover || padrao.corNavTextoHover || '#FFFFFF',
    corNavHoverBg: estetica?.corNavHoverBg || padrao.corNavHoverBg || 'rgba(255, 255, 255, 0.08)',
    corNavAtivoBg: estetica?.corNavAtivoBg || corPrimaria,
    corNavAtivoTexto: estetica?.corNavAtivoTexto || '#FFFFFF',
    corNavAtivoBorda: estetica?.corNavAtivoBorda || corSecundaria,
    corNavBadgeBg: estetica?.corNavBadgeBg || padrao.corNavBadgeBg || '#2A2A2A',
    corNavBadgeTexto: estetica?.corNavBadgeTexto || padrao.corNavBadgeTexto || '#D9D6D0',
    corNavFooterBg: estetica?.corNavFooterBg || padrao.corNavFooterBg || '#111111',
    corNavFooterTextoPrincipal:
      estetica?.corNavFooterTextoPrincipal || padrao.corNavFooterTextoPrincipal || '#FFFFFF',
    corNavFooterTextoSecundario:
      estetica?.corNavFooterTextoSecundario || padrao.corNavFooterTextoSecundario || '#C8C3BC',
    corNavFooterIcone: estetica?.corNavFooterIcone || padrao.corNavFooterIcone || '#D9D6D0',
    corPrimaria,
    corSecundaria,
    corFundoDestaque: estetica?.corFundoDestaque || padrao.corFundoDestaque || '#F2EFEA',
    corBorda: estetica?.corBorda || padrao.corBorda || '#D9D6D0',
    corTexto: estetica?.corTexto || padrao.corTexto || '#1A1A1A',
  };
}

/**
 * Aplica as variáveis CSS dinâmicas globalmente no elemento root (:root)
 */
export function aplicarVariaveisCss(estetica?: Partial<EsteticaPlataforma>): void {
  if (typeof document === 'undefined') return;
  try {
    const root = document.documentElement;
    const c = obterCoresSidebarCompletas(estetica);

    root.style.setProperty('--cor-primaria', c.corPrimaria);
    root.style.setProperty('--cor-secundaria', c.corSecundaria);
    root.style.setProperty('--cor-sidebar', c.corSidebar);
    root.style.setProperty('--cor-sidebar-texto', c.corSidebarTexto);
    root.style.setProperty('--cor-nav-categoria-texto', c.corNavCategoriaTexto);
    root.style.setProperty('--cor-nav-texto-inativo', c.corNavTextoInativo);
    root.style.setProperty('--cor-nav-texto-hover', c.corNavTextoHover);
    root.style.setProperty('--cor-nav-hover-bg', c.corNavHoverBg);
    root.style.setProperty('--cor-nav-ativo-bg', c.corNavAtivoBg);
    root.style.setProperty('--cor-nav-ativo-texto', c.corNavAtivoTexto);
    root.style.setProperty('--cor-nav-ativo-borda', c.corNavAtivoBorda);
    root.style.setProperty('--cor-nav-badge-bg', c.corNavBadgeBg);
    root.style.setProperty('--cor-nav-badge-texto', c.corNavBadgeTexto);
    root.style.setProperty('--cor-nav-footer-bg', c.corNavFooterBg);
    root.style.setProperty('--cor-nav-footer-texto-principal', c.corNavFooterTextoPrincipal);
    root.style.setProperty('--cor-nav-footer-texto-secundario', c.corNavFooterTextoSecundario);
    root.style.setProperty('--cor-nav-footer-icone', c.corNavFooterIcone);
    root.style.setProperty('--cor-fundo-destaque', c.corFundoDestaque);
    root.style.setProperty('--cor-borda', c.corBorda);
    root.style.setProperty('--cor-texto', c.corTexto);
  } catch (e) {
    console.warn('Erro ao aplicar variáveis CSS:', e);
  }
}

/**
 * Calcula luminância relativa para garantir alto contraste automático no bloco inferior da barra de navegação
 */
export function isFundoEscuro(hex: string): boolean {
  if (!hex || typeof hex !== 'string') return true;
  const cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length !== 6 && cleanHex.length !== 3) return true;

  let r = 0,
    g = 0,
    b = 0;
  if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  } else if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  }

  // Luminância aparente padrão ITU-R BT.709
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 140;
}

/**
 * Gera automaticamente sugestão de contraste harmônico e nítido para o bloco inferior
 * baseado na cor de fundo da barra lateral selecionada pelo usuário
 */
export function sugerirContrasteBlocoInferior(corSidebar: string): {
  corNavFooterBg: string;
  corNavFooterTextoPrincipal: string;
  corNavFooterTextoSecundario: string;
  corNavFooterIcone: string;
} {
  const escuro = isFundoEscuro(corSidebar);

  if (escuro) {
    return {
      corNavFooterBg: 'rgba(0, 0, 0, 0.45)',
      corNavFooterTextoPrincipal: '#FFFFFF',
      corNavFooterTextoSecundario: '#CBD5E1',
      corNavFooterIcone: '#E2E8F0',
    };
  } else {
    return {
      corNavFooterBg: 'rgba(0, 0, 0, 0.07)',
      corNavFooterTextoPrincipal: '#0F172A',
      corNavFooterTextoSecundario: '#475569',
      corNavFooterIcone: '#334155',
    };
  }
}
