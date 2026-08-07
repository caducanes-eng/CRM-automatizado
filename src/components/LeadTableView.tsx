import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  ExternalLink,
  ChevronRight,
  X,
  CheckCircle2,
  Clock,
  UserX,
  Filter,
  FileSpreadsheet,
  Download,
  Upload,
  UserPlus,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { useEmpresa } from '../context/EmpresaContext';
import { obterCoresSidebarCompletas } from '../utils/estetica';
import {
  Lead,
  SituacaoLead,
  StatusVenda,
  TODAS_SITUACOES,
  TODOS_STATUS_VENDA,
} from '../types';
import { formatarMoeda, formatarDataBR } from '../utils/formatters';
import { ImportExportModal } from './ImportExportModal';

interface LeadTableViewProps {
  onOpenFicha?: (leadId: string) => void;
  onOpenNovoPaciente?: () => void;
}

type SortField =
  | 'nome'
  | 'situacao'
  | 'etapa'
  | 'interesse'
  | 'possivelValor'
  | 'totalComprado'
  | 'statusVenda'
  | 'dataEntrada'
  | 'responsavel';

type SortDirection = 'asc' | 'desc';

interface ColumnConfig {
  key: string;
  label: string;
  defaultWidth: number;
  minWidth: number;
  align?: 'left' | 'right' | 'center';
  sortField?: SortField;
}

export const COLUNAS_TABELA_LEADS: ColumnConfig[] = [
  { key: 'nome', label: 'Paciente', defaultWidth: 220, minWidth: 140, sortField: 'nome' },
  { key: 'situacao', label: 'Situação', defaultWidth: 170, minWidth: 130, sortField: 'situacao' },
  { key: 'etapa', label: 'Etapa Atual', defaultWidth: 150, minWidth: 110, sortField: 'etapa' },
  { key: 'interesse', label: 'Interesse', defaultWidth: 170, minWidth: 110, sortField: 'interesse' },
  { key: 'possivelValor', label: 'Possível Valor', defaultWidth: 130, minWidth: 100, align: 'right', sortField: 'possivelValor' },
  { key: 'totalComprado', label: 'Total Realizado', defaultWidth: 130, minWidth: 100, align: 'right', sortField: 'totalComprado' },
  { key: 'statusVenda', label: 'Status', defaultWidth: 130, minWidth: 105, sortField: 'statusVenda' },
  { key: 'dataEntrada', label: 'Entrada', defaultWidth: 110, minWidth: 90, sortField: 'dataEntrada' },
  { key: 'responsavel', label: 'Responsável', defaultWidth: 140, minWidth: 110, sortField: 'responsavel' },
  { key: 'acoes', label: 'Ficha', defaultWidth: 85, minWidth: 70, align: 'center' },
];

const STORAGE_KEY_COL_WIDTHS = 'crm_leads_col_widths_v2';

// Helper de estilos neutros elegantes com alto contraste para Status da Venda
export function getStatusVendaEstilo(status: StatusVenda | string) {
  switch (status) {
    case 'Venda feita':
      return {
        badge: 'bg-[#EBF3EE] text-[#1E4D30] border-[#BCD6C6]',
        dot: 'bg-[#2E6F47]',
        borderLeft: 'border-l-[#2E6F47]',
        hoverBg: 'hover:bg-[#F2F8F4]',
        label: 'Venda feita',
      };
    case 'Perdido':
      return {
        badge: 'bg-[#F5EEED] text-[#7A322C] border-[#DAC0BD]',
        dot: 'bg-[#9C433B]',
        borderLeft: 'border-l-[#9C433B]',
        hoverBg: 'hover:bg-[#FAF2F1]',
        label: 'Perdido',
      };
    case 'Em processo':
    default:
      return {
        badge: 'bg-[#F5EFEB] text-[#5C3A22] border-[#D9CDBF]',
        dot: 'bg-[#8A6142]',
        borderLeft: 'border-l-[#8A6142]',
        hoverBg: 'hover:bg-[#FAF6F2]',
        label: 'Em processo',
      };
  }
}

// Helper de estilos neutros distintos com alto contraste para Situações do Lead
export function getSituacaoEstilo(situacao: SituacaoLead | string) {
  switch (situacao) {
    case 'Em captação':
      return 'bg-[#FAF2EB] text-[#6B3E1F] border-[#E4D0BF]';
    case 'Consulta agendada':
      return 'bg-[#EEF4F7] text-[#1E4A5C] border-[#C4D8E2]';
    case 'Pós consulta':
      return 'bg-[#FAF5EA] text-[#5E461A] border-[#E4D6BD]';
    case 'Procedimento agendado':
      return 'bg-[#F3EEF7] text-[#492F66] border-[#D5C7E2]';
    case 'Pós procedimento':
      return 'bg-[#EDF6F1] text-[#1D4D36] border-[#C0DFCC]';
    case 'Reativação':
      return 'bg-[#F6F2EB] text-[#523F27] border-[#DACDC0]';
    case 'Nutrição':
      return 'bg-[#F2F6ED] text-[#344D1E] border-[#CFDEC0]';
    default:
      return 'bg-white text-[#1A1A1A] border-[#D9D6D0]';
  }
}

export const LeadTableView: React.FC<LeadTableViewProps> = ({ onOpenFicha, onOpenNovoPaciente }) => {
  const { leads, compras, atualizarLead, abrirFichaLead } = useCrm();
  const { config } = useEmpresa();

  // Cores dinâmicas selecionadas para a barra lateral / navegação
  const cores = useMemo(() => obterCoresSidebarCompletas(config.estetica), [config.estetica]);

  const handleOpenFichaClick = (leadId: string) => {
    if (onOpenFicha) {
      onOpenFicha(leadId);
    } else {
      abrirFichaLead(leadId);
    }
  };

  // Estados de Filtro
  const [busca, setBusca] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState<string>('todos');
  const [filtroStatusVenda, setFiltroStatusVenda] = useState<string>('todos');
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

  // Larguras das colunas estilo planilha com persistência no LocalStorage
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const defaults = COLUNAS_TABELA_LEADS.reduce(
      (acc, col) => ({ ...acc, [col.key]: col.defaultWidth }),
      {} as Record<string, number>
    );
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COL_WIDTHS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...defaults, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Erro ao ler larguras das colunas:', e);
    }
    return defaults;
  });

  // Estado de redimensionamento ativo
  const [resizingCol, setResizingCol] = useState<string | null>(null);
  const dragInfoRef = useRef<{
    colKey: string;
    startX: number;
    startWidth: number;
    minWidth: number;
  } | null>(null);

  // Manipulador de início de redimensionamento (arrastar borda da coluna)
  const handleMouseDownResize = useCallback(
    (colKey: string, minWidth: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const currentWidth = columnWidths[colKey] || minWidth || 100;
      dragInfoRef.current = {
        colKey,
        startX: e.clientX,
        startWidth: currentWidth,
        minWidth,
      };
      setResizingCol(colKey);

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!dragInfoRef.current) return;
        const { colKey: key, startX, startWidth: sWidth, minWidth: mWidth } = dragInfoRef.current;
        const deltaX = moveEvent.clientX - startX;
        const newWidth = Math.max(mWidth, Math.round(sWidth + deltaX));

        setColumnWidths((prev) => ({
          ...prev,
          [key]: newWidth,
        }));
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        setResizingCol(null);
        dragInfoRef.current = null;

        // Persiste as larguras finais no localStorage
        setColumnWidths((prev) => {
          try {
            localStorage.setItem(STORAGE_KEY_COL_WIDTHS, JSON.stringify(prev));
          } catch (err) {
            console.warn(err);
          }
          return prev;
        });
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [columnWidths]
  );

  // Redefinir largura de uma coluna específica com duplo clique
  const handleDoubleClickReset = useCallback((colKey: string, defaultWidth: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setColumnWidths((prev) => {
      const next = { ...prev, [colKey]: defaultWidth };
      try {
        localStorage.setItem(STORAGE_KEY_COL_WIDTHS, JSON.stringify(next));
      } catch (err) {
        console.warn(err);
      }
      return next;
    });
  }, []);

  // Redefinir todas as larguras para o padrão
  const handleResetarTodasLarguras = useCallback(() => {
    const defaults = COLUNAS_TABELA_LEADS.reduce(
      (acc, col) => ({ ...acc, [col.key]: col.defaultWidth }),
      {} as Record<string, number>
    );
    setColumnWidths(defaults);
    try {
      localStorage.removeItem(STORAGE_KEY_COL_WIDTHS);
    } catch (e) {
      console.warn(e);
    }
  }, []);

  // Largura total calculada da tabela
  const totalTableWidth = useMemo(() => {
    return COLUNAS_TABELA_LEADS.reduce(
      (acc, col) => acc + (columnWidths[col.key] || col.defaultWidth),
      0
    );
  }, [columnWidths]);

  // Contagens rápidas de status para os botões de filtro
  const contagensStatus = useMemo(() => {
    const total = leads.filter((l) => !l.deleted_at).length;
    const emProcesso = leads.filter((l) => !l.deleted_at && l.statusVenda === 'Em processo').length;
    const vendaFeita = leads.filter((l) => !l.deleted_at && l.statusVenda === 'Venda feita').length;
    const perdido = leads.filter((l) => !l.deleted_at && l.statusVenda === 'Perdido').length;
    return { total, emProcesso, vendaFeita, perdido };
  }, [leads]);

  // Estados de Ordenação
  const [sortField, setSortField] = useState<SortField>('dataEntrada');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Mapear total comprado por LeadId para performance
  const totaisCompradosMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const compra of compras) {
      if (!compra.deleted_at) {
        const atual = map.get(compra.leadId) || 0;
        map.set(compra.leadId, atual + (compra.valor || 0));
      }
    }
    return map;
  }, [compras]);

  // Função para obter a etapa exibida para um lead
  const obterEtapaExibida = (lead: Lead): string => {
    if (lead.situacao === 'Consulta agendada' || lead.situacao === 'Procedimento agendado') {
      return '-';
    }
    const etapa = lead.etapaPorSituacao?.[lead.situacao];
    return etapa && etapa.trim() ? etapa : '-';
  };

  // Alternar ordenação
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Mudança rápida de situação na própria tabela
  const handleTrocaSituacao = (leadId: string, novaSituacao: SituacaoLead) => {
    atualizarLead(leadId, { situacao: novaSituacao });
  };

  // Filtragem e Ordenação
  const leadsFiltradosEOrdenados = useMemo(() => {
    return leads
      .filter((lead) => {
        // Filtro por busca de texto
        if (busca.trim()) {
          const termo = busca.toLowerCase();
          const matchNome = lead.nome.toLowerCase().includes(termo);
          const matchInteresse = lead.interesse?.toLowerCase().includes(termo);
          const matchResponsavel = lead.responsavel?.toLowerCase().includes(termo);
          if (!matchNome && !matchInteresse && !matchResponsavel) return false;
        }

        // Filtro por Situação
        if (filtroSituacao !== 'todos' && lead.situacao !== filtroSituacao) {
          return false;
        }

        // Filtro por Status da Venda
        if (filtroStatusVenda !== 'todos' && lead.statusVenda !== filtroStatusVenda) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        switch (sortField) {
          case 'nome':
            valA = a.nome.toLowerCase();
            valB = b.nome.toLowerCase();
            break;
          case 'situacao':
            valA = a.situacao.toLowerCase();
            valB = b.situacao.toLowerCase();
            break;
          case 'etapa':
            valA = obterEtapaExibida(a).toLowerCase();
            valB = obterEtapaExibida(b).toLowerCase();
            break;
          case 'interesse':
            valA = (a.interesse || '').toLowerCase();
            valB = (b.interesse || '').toLowerCase();
            break;
          case 'possivelValor':
            valA = a.possivelValor || 0;
            valB = b.possivelValor || 0;
            break;
          case 'totalComprado':
            valA = totaisCompradosMap.get(a.id) || 0;
            valB = totaisCompradosMap.get(b.id) || 0;
            break;
          case 'statusVenda':
            valA = a.statusVenda;
            valB = b.statusVenda;
            break;
          case 'dataEntrada':
            valA = a.dataEntrada;
            valB = b.dataEntrada;
            break;
          case 'responsavel':
            valA = a.responsavel.toLowerCase();
            valB = b.responsavel.toLowerCase();
            break;
          default:
            return 0;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [leads, busca, filtroSituacao, filtroStatusVenda, sortField, sortDirection, totaisCompradosMap]);

  // Render do indicador de ordenação de alto contraste
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <ArrowUpDown
          className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity shrink-0 text-white/70"
        />
      );
    }
    return sortDirection === 'asc' ? (
      <ArrowUp
        className="w-3 h-3 shrink-0 font-bold text-white"
      />
    ) : (
      <ArrowDown
        className="w-3 h-3 shrink-0 font-bold text-white"
      />
    );
  };

  return (
    <div id="bloco-tabela-leads" className="bg-white rounded-sm border border-[#D9D6D0] shadow-xs overflow-hidden">
      {/* Header com Filtros */}
      <div className="p-4 sm:p-5 border-b border-[#D9D6D0] space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold tracking-wide text-[#1A1A1A] uppercase">
              Pacientes
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-[#F2EFEA] text-[#1A1A1A] border border-[#D9D6D0]">
              {leadsFiltradosEOrdenados.length} de {leads.length}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(filtroSituacao !== 'todos' || filtroStatusVenda !== 'todos' || busca) && (
              <button
                type="button"
                onClick={() => {
                  setBusca('');
                  setFiltroSituacao('todos');
                  setFiltroStatusVenda('todos');
                }}
                className="inline-flex items-center gap-1.5 text-xs text-[#5C3A22] hover:text-[#1A1A1A] font-bold uppercase tracking-wider transition-colors cursor-pointer mr-1"
              >
                <X className="w-3.5 h-3.5" />
                Limpar filtros
              </button>
            )}

            <button
              id="btn-reset-col-widths"
              type="button"
              onClick={handleResetarTodasLarguras}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider bg-white border border-[#D9D6D0] hover:border-[#5C3A22] hover:bg-[#FAF8F5] text-[#1A1A1A] shadow-2xs transition-all cursor-pointer"
              title="Restaurar a largura padrão de todas as colunas da planilha"
            >
              <RotateCcw className="w-3 h-3 text-[#5C3A22]" />
              <span>Ajuste Padrão de Colunas</span>
            </button>

            <button
              id="btn-import-export-leads"
              type="button"
              onClick={() => setIsImportExportOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider bg-white border border-[#D9D6D0] hover:border-[#5C3A22] hover:bg-[#FAF8F5] text-[#1A1A1A] shadow-2xs transition-all cursor-pointer"
              title="Exportar clientes, importar planilha ou baixar modelo oficial"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#5C3A22]" />
              <span>Importar / Exportar Clientes</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros e Busca com Menus Suspensos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-1">
          {/* Busca por texto */}
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8F887E]" />
            <input
              id="filtro-busca-input"
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por paciente, procedimento ou responsável..."
              className="w-full h-9 pl-9 pr-8 text-xs rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/30 text-[#1A1A1A] focus:bg-white focus:outline-hidden focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] transition-all placeholder:text-[#8F887E]"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8F887E] hover:text-[#1A1A1A] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro por Situação (Menu Suspenso) */}
          <div className="lg:col-span-4 flex items-center gap-2">
            <label htmlFor="filtro-situacao-select" className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider shrink-0">
              Situação:
            </label>
            <select
              id="filtro-situacao-select"
              value={filtroSituacao}
              onChange={(e) => setFiltroSituacao(e.target.value)}
              className="w-full h-9 px-2.5 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:outline-hidden focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] transition-all cursor-pointer font-medium"
            >
              <option value="todos">Todas as Situações</option>
              {TODAS_SITUACOES.map((sit) => (
                <option key={sit} value={sit}>
                  {sit}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Status da Venda (Menu Suspenso com contagens) */}
          <div className="lg:col-span-3 flex items-center gap-2">
            <label htmlFor="filtro-status-venda-select" className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider shrink-0">
              Status:
            </label>
            <select
              id="filtro-status-venda-select"
              value={filtroStatusVenda}
              onChange={(e) => setFiltroStatusVenda(e.target.value)}
              className="w-full h-9 px-2.5 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:outline-hidden focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] transition-all cursor-pointer font-medium"
            >
              <option value="todos">Todos ({contagensStatus.total})</option>
              <option value="Em processo">Em processo ({contagensStatus.emProcesso})</option>
              <option value="Venda feita">Venda feita ({contagensStatus.vendaFeita})</option>
              <option value="Perdido">Perdido ({contagensStatus.perdido})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Leads: Cabeçalho com cores configuradas da barra de navegação + Colunas Redimensionáveis estilo Planilha */}
      <div className="overflow-x-auto">
        <table
          id="tabela-leads"
          style={{
            tableLayout: 'fixed',
            width: '100%',
            minWidth: `${totalTableWidth}px`,
          }}
          className="text-left border-collapse text-xs"
        >
          <colgroup>
            {COLUNAS_TABELA_LEADS.map((col) => (
              <col
                key={col.key}
                style={{ width: `${columnWidths[col.key] || col.defaultWidth}px` }}
              />
            ))}
          </colgroup>

          <thead className="tabela-ar-thead bg-[#1A1A1A] text-white select-none border-b border-black/30">
            <tr>
              {COLUNAS_TABELA_LEADS.map((col, idx) => {
                const isSorted = col.sortField && sortField === col.sortField;
                const colWidth = columnWidths[col.key] || col.defaultWidth;

                return (
                  <th
                    key={col.key}
                    style={{
                      width: `${colWidth}px`,
                      backgroundColor: '#1A1A1A',
                      color: '#FFFFFF',
                    }}
                    onClick={() => {
                      if (col.sortField) {
                        handleSort(col.sortField);
                      }
                    }}
                    className={`relative py-3 px-3 transition-colors group select-none font-bold uppercase tracking-wider text-[11px] text-white border-r border-white/10 ${
                      col.sortField ? 'cursor-pointer hover:bg-[#2A2A2A]' : ''
                    } ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-1.5 min-w-0 text-white ${
                        col.align === 'right'
                          ? 'justify-end'
                          : col.align === 'center'
                          ? 'justify-center'
                          : 'justify-start'
                      }`}
                    >
                      <span className="truncate text-white font-bold">{col.label}</span>
                      {col.sortField && renderSortIcon(col.sortField)}
                    </div>

                    {/* Divisor de redimensionamento estilo planilha (Arraste para redimensionar / Duplo clique para restaurar) */}
                    <div
                      onMouseDown={(e) => handleMouseDownResize(col.key, col.minWidth, e)}
                      onDoubleClick={(e) => handleDoubleClickReset(col.key, col.defaultWidth, e)}
                      onClick={(e) => e.stopPropagation()}
                      title="Arraste para ajustar a largura da coluna (duplo clique para restaurar)"
                      className={`absolute top-0 bottom-0 -right-1 w-3 cursor-col-resize z-20 flex items-center justify-center group/resizer transition-all ${
                        resizingCol === col.key ? 'opacity-100' : 'opacity-30 hover:opacity-100'
                      }`}
                    >
                      <div
                        className={`w-[2px] h-full transition-all group-hover/resizer:w-[3px] bg-white/40 ${
                          resizingCol === col.key ? 'w-[3px] shadow-sm bg-white' : 'group-hover/resizer:bg-white'
                        }`}
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#D9D6D0]">
            {leadsFiltradosEOrdenados.length === 0 ? (
              <tr>
                <td colSpan={COLUNAS_TABELA_LEADS.length} className="py-12 text-center text-[#8F887E]">
                  <div className="max-w-xs mx-auto space-y-2">
                    <User className="w-8 h-8 mx-auto text-[#8F887E]" />
                    <p className="text-xs font-semibold text-[#1A1A1A]">Nenhum paciente encontrado.</p>
                    <p className="text-[11px] text-[#6E6E6E]">Cadastre um novo paciente acima ou ajuste os filtros.</p>
                  </div>
                </td>
              </tr>
            ) : (
              leadsFiltradosEOrdenados.map((lead, idx) => {
                const totalComprado = totaisCompradosMap.get(lead.id) || 0;
                const etapaExibida = obterEtapaExibida(lead);
                const statusEstilo = getStatusVendaEstilo(lead.statusVenda);
                const situacaoClass = getSituacaoEstilo(lead.situacao);

                // Linhas alternadas branco e #F2EFEA com borda esquerda colorida discreta
                const isEven = idx % 2 === 1;
                const baseBgClass = isEven ? 'bg-[#F2EFEA]/40' : 'bg-white';

                return (
                  <tr
                    key={lead.id}
                    id={`lead-row-${lead.id}`}
                    className={`${baseBgClass} ${statusEstilo.hoverBg} ${statusEstilo.borderLeft} border-l-[3px] transition-colors border-b border-[#D9D6D0]/60`}
                  >
                    {/* Nome (Clicável para abrir ficha) */}
                    <td className="py-3 px-3 font-bold truncate">
                      <button
                        type="button"
                        onClick={() => handleOpenFichaClick(lead.id)}
                        className="text-left font-bold text-[#1A1A1A] hover:text-[#5C3A22] flex items-center gap-1.5 group cursor-pointer max-w-full truncate"
                      >
                        <span className="truncate">{lead.nome}</span>
                        <ExternalLink className="w-3 h-3 text-[#8F887E] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    </td>

                    {/* Situação (Com dropdown rápido estilizado) */}
                    <td className="py-3 px-3">
                      <select
                        value={lead.situacao}
                        onChange={(e) =>
                          handleTrocaSituacao(lead.id, e.target.value as SituacaoLead)
                        }
                        className={`w-full py-1 px-2 rounded-sm border text-xs font-semibold focus:border-[#5C3A22] focus:outline-hidden cursor-pointer shadow-2xs truncate ${situacaoClass}`}
                      >
                        {TODAS_SITUACOES.map((sit) => (
                          <option key={sit} value={sit} className="bg-white text-[#1A1A1A]">
                            {sit}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Etapa atual */}
                    <td className="py-3 px-3">
                      {etapaExibida === '-' ? (
                        <span className="text-[#8F887E] font-mono text-center block w-6">-</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-sm bg-white text-[#1A1A1A] border border-[#D9D6D0] text-[11px] max-w-full truncate shadow-2xs">
                          {etapaExibida}
                        </span>
                      )}
                    </td>

                    {/* Interesse */}
                    <td className="py-3 px-3 text-[#1A1A1A] truncate">
                      <span className="truncate block">
                        {lead.interesse || <span className="text-[#8F887E]">-</span>}
                      </span>
                    </td>

                    {/* Possível Valor */}
                    <td className="py-3 px-3 text-right font-medium text-[#1A1A1A] font-mono whitespace-nowrap">
                      {lead.possivelValor > 0 ? (
                        formatarMoeda(lead.possivelValor)
                      ) : (
                        <span className="text-[#8F887E]">-</span>
                      )}
                    </td>

                    {/* Total já comprado */}
                    <td className="py-3 px-3 text-right font-bold font-mono whitespace-nowrap">
                      {totalComprado > 0 ? (
                        <span className="text-[#5C3A22] bg-[#F2EFEA] px-2 py-0.5 rounded-sm border border-[#5C3A22]/20 font-bold">
                          {formatarMoeda(totalComprado)}
                        </span>
                      ) : (
                        <span className="text-[#8F887E] font-normal">-</span>
                      )}
                    </td>

                    {/* Status da venda com badge neutro e de alto contraste */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider border shadow-2xs whitespace-nowrap ${statusEstilo.badge}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusEstilo.dot}`} />
                        <span>{lead.statusVenda}</span>
                      </span>
                    </td>

                    {/* Data de Entrada */}
                    <td className="py-3 px-3 text-[#6E6E6E] whitespace-nowrap">
                      {formatarDataBR(lead.dataEntrada)}
                    </td>

                    {/* Responsável */}
                    <td className="py-3 px-3 text-[#1A1A1A] font-medium truncate">
                      <span className="truncate block">{lead.responsavel}</span>
                    </td>

                    {/* Botão Ação / Ficha */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenFichaClick(lead.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm bg-[#1A1A1A] hover:bg-[#5C3A22] text-white font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-2xs"
                      >
                        <span>Ficha</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer da Tabela com Resumo */}
      <div className="p-4 bg-[#F2EFEA] border-t border-[#D9D6D0] flex flex-col sm:flex-row items-center justify-between text-xs text-[#6E6E6E] gap-2">
        <div className="flex items-center gap-4">
          <span>
            Total em Procedimentos:{' '}
            <strong className="text-[#5C3A22] font-bold">
              {formatarMoeda(
                compras.reduce((acc, curr) => acc + (curr.deleted_at ? 0 : curr.valor || 0), 0)
              )}
            </strong>
          </span>
          <span className="hidden sm:inline text-[#D9D6D0]">|</span>
          <span>
            Potencial em Processo:{' '}
            <strong className="text-[#1A1A1A] font-bold">
              {formatarMoeda(
                leads
                  .filter((l) => l.statusVenda === 'Em processo')
                  .reduce((acc, curr) => acc + (curr.possivelValor || 0), 0)
              )}
            </strong>
          </span>
        </div>

        <div className="text-[11px] text-[#6E6E6E]">
          Exibindo {leadsFiltradosEOrdenados.length} de {leads.length} paciente(s)
        </div>
      </div>

      {/* Modal Central de Importação, Exportação e Tabela Modelo */}
      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        leadsFiltrados={leadsFiltradosEOrdenados}
      />
    </div>
  );
};
