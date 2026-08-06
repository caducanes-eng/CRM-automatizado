import React, { useState, useMemo } from 'react';
import {
  Sprout,
  Users,
  UserCheck,
  UserX,
  Search,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Info,
  Copy,
  Check,
  Filter,
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { useEmpresa } from '../context/EmpresaContext';
import { Lead, StatusGrupoNutricao } from '../types';

export const NutricaoView: React.FC = () => {
  const { leads, obterFichaPorLead, abrirFichaLead, definirStatusGrupoNutricao } = useCrm();
  const { config } = useEmpresa();

  const corPrimaria = config.estetica?.corPrimaria || '#5C3A22';
  const corSecundaria = config.estetica?.corSecundaria || '#8A6142';
  const corSidebar = config.estetica?.corSidebar || '#1A1A1A';
  const corFundoDestaque = config.estetica?.corFundoDestaque || '#F2EFEA';
  const corBorda = config.estetica?.corBorda || '#D9D6D0';

  // Estados de filtro e busca
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'Todos' | StatusGrupoNutricao>('Todos');
  const [copiadoFeedback, setCopiadoFeedback] = useState(false);

  // Filtra apenas leads cuja situação atual é 'Nutrição'
  const leadsNutricao = useMemo(() => {
    return leads.filter((l) => l.situacao === 'Nutrição' && !l.deleted_at);
  }, [leads]);

  // Estatísticas do grupo
  const totalLeads = leadsNutricao.length;
  const totalAtivos = useMemo(() => {
    return leadsNutricao.filter(
      (l) => (l.statusGrupoNutricao || l.etapaPorSituacao?.['Nutrição'] || 'Ativo') === 'Ativo'
    ).length;
  }, [leadsNutricao]);

  const totalRemovidos = totalLeads - totalAtivos;

  // Filtragem por busca e por status no grupo
  const leadsFiltrados = useMemo(() => {
    return leadsNutricao.filter((lead) => {
      // 1. Filtro de status no grupo
      const statusAtual: StatusGrupoNutricao =
        (lead.statusGrupoNutricao as StatusGrupoNutricao) ||
        (lead.etapaPorSituacao?.['Nutrição'] as StatusGrupoNutricao) ||
        'Ativo';

      if (filtroStatus !== 'Todos' && statusAtual !== filtroStatus) {
        return false;
      }

      // 2. Filtro de texto (Nome ou Telefone)
      if (termoBusca.trim()) {
        const termo = termoBusca.toLowerCase().trim();
        const nomeMatch = lead.nome.toLowerCase().includes(termo);
        const ficha = obterFichaPorLead(lead.id);
        const telMatch = ficha?.telefone ? ficha.telefone.toLowerCase().includes(termo) : false;
        const interesseMatch = lead.interesse ? lead.interesse.toLowerCase().includes(termo) : false;
        return nomeMatch || telMatch || interesseMatch;
      }

      return true;
    });
  }, [leadsNutricao, filtroStatus, termoBusca, obterFichaPorLead]);

  // Formatar data no padrão brasileiro DD/MM/AAAA
  const formatarDataBR = (dataIso?: string): string => {
    if (!dataIso) return '-';
    const partes = dataIso.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataIso;
  };

  // Calcular dias corridos desde a data de entrada
  const calcularDiasDesdeEntrada = (dataIso?: string): number => {
    if (!dataIso) return 0;
    const data = new Date(dataIso + 'T00:00:00');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diffTime = hoje.getTime() - data.getTime();
    const diffDias = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDias < 0 ? 0 : diffDias;
  };

  // Alteração imediata do status no grupo
  const handleStatusChange = (leadId: string, novoStatus: StatusGrupoNutricao) => {
    definirStatusGrupoNutricao(leadId, novoStatus);
  };

  // Copiar telefones de contatos ativos para lista de transmissão
  const handleCopiarTelefonesAtivos = () => {
    const telefones: string[] = [];
    leadsNutricao.forEach((l) => {
      const status = l.statusGrupoNutricao || l.etapaPorSituacao?.['Nutrição'] || 'Ativo';
      if (status === 'Ativo') {
        const f = obterFichaPorLead(l.id);
        if (f?.telefone) {
          telefones.push(`${l.nome}: ${f.telefone}`);
        }
      }
    });

    if (telefones.length > 0) {
      navigator.clipboard.writeText(telefones.join('\n'));
      setCopiadoFeedback(true);
      setTimeout(() => setCopiadoFeedback(false), 2500);
    }
  };

  return (
    <div
      id="tela-nutricao"
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in duration-200"
    >
      {/* =========================================================================
          CABEÇALHO DA TELA
         ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#D9D6D0] pb-5">
        <div className="flex items-start gap-3.5">
          <div
            className="w-11 h-11 rounded-sm flex items-center justify-center text-white shadow-xs shrink-0"
            style={{ backgroundColor: corSidebar }}
          >
            <Sprout className="w-6 h-6" style={{ color: corSecundaria }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1A1A] uppercase">
                Nutrição
              </h2>
              <span className="px-2.5 py-0.5 rounded-sm text-[10px] font-bold bg-[#F2EFEA] text-[#1A1A1A] border border-[#D9D6D0] uppercase tracking-wider">
                Grupo de Conteúdo
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#6E6E6E] mt-0.5">
              Gestão de pacientes em listas de transmissão e canais de relacionamento
            </p>
          </div>
        </div>

        {/* Ação rápida: Copiar contatos para transmissão */}
        <div className="flex items-center gap-2">
          <button
            id="btn-copiar-telefones-nutricao"
            type="button"
            onClick={handleCopiarTelefonesAtivos}
            title="Copiar lista de telefones de membros ativos"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm bg-white border border-[#D9D6D0] hover:bg-[#F8F7F4] text-xs font-bold uppercase tracking-wider text-[#1A1A1A] shadow-xs transition-colors cursor-pointer"
          >
            {copiadoFeedback ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Contatos Copiados!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#5C3A22]" />
                <span>Copiar Contatos Ativos</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* =========================================================================
          BANNER INFORMATIVO ESPECÍFICO DE NUTRIÇÃO
         ========================================================================= */}
      <div
        id="banner-informativo-nutricao"
        className="p-4 rounded-sm bloco-destaque-ar border border-[#D9D6D0] shadow-xs flex items-start gap-3"
      >
        <div
          className="w-6 h-6 rounded-sm text-white flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: corSidebar }}
        >
          <Info className="w-3.5 h-3.5" style={{ color: corSecundaria }} />
        </div>
        <div className="text-xs text-[#1A1A1A] leading-relaxed">
          <span className="font-bold text-[#5C3A22] uppercase tracking-wider text-[11px] block sm:inline mr-1">
            Dinâmica desta etapa:
          </span>
          Diferente das outras etapas do CRM, na <strong>Nutrição</strong>{' '}
          <strong>NÃO existe acompanhamento individual de contato</strong>. Trata-se de um grupo de
          conteúdo e aquecimento da base (ex.: lista de transmissão do WhatsApp, comunidade VIP ou
          newsletter). O controle é feito unicamente pelo status do lead no grupo.
        </div>
      </div>

      {/* =========================================================================
          CARDS DE RESUMO / MÉTRICAS DO GRUPO
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Total de Leads no Grupo */}
        <div
          id="card-metrica-total-nutricao"
          className="p-4 rounded-sm bg-white border border-[#D9D6D0] shadow-xs flex items-center justify-between"
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E6E6E] block">
              Total no Grupo
            </span>
            <span className="text-2xl font-black text-[#1A1A1A] tracking-tight">
              {totalLeads}
            </span>
            <span className="text-[11px] text-[#8F887E] block mt-0.5">
              Leads na situação Nutrição
            </span>
          </div>
          <div
            className="w-10 h-10 rounded-sm flex items-center justify-center font-bold text-white"
            style={{ backgroundColor: corSidebar }}
          >
            <Users className="w-5 h-5" style={{ color: corSecundaria }} />
          </div>
        </div>

        {/* Membros Ativos */}
        <div
          id="card-metrica-ativos-nutricao"
          className="p-4 rounded-sm bg-white border border-emerald-200 shadow-xs flex items-center justify-between"
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
              Membros Ativos
            </span>
            <span className="text-2xl font-black text-emerald-700 tracking-tight">
              {totalAtivos}
            </span>
            <span className="text-[11px] text-emerald-600 block mt-0.5">
              Recebendo transmissões
            </span>
          </div>
          <div className="w-10 h-10 rounded-sm bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold border border-emerald-200">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Membros Removidos */}
        <div
          id="card-metrica-removidos-nutricao"
          className="p-4 rounded-sm bg-white border border-[#D9D6D0] shadow-xs flex items-center justify-between"
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E6E6E] block">
              Removidos / Inativos
            </span>
            <span className="text-2xl font-black text-[#1A1A1A] tracking-tight">
              {totalRemovidos}
            </span>
            <span className="text-[11px] text-[#8F887E] block mt-0.5">
              Optaram por sair ou removidos
            </span>
          </div>
          <div className="w-10 h-10 rounded-sm bg-[#F8F7F4] text-[#8F887E] flex items-center justify-center font-bold border border-[#D9D6D0]">
            <UserX className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          BARRA DE FILTROS E BUSCA
         ========================================================================= */}
      <div className="bg-white p-4 rounded-sm border border-[#D9D6D0] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Campo de Busca */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#8F887E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-busca-nutricao"
            type="text"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Buscar por nome ou procedimento..."
            className="w-full h-9 pl-9 pr-3 text-xs sm:text-sm rounded-sm border border-[#D9D6D0] bg-[#F8F7F4] placeholder:text-[#8F887E] text-[#1A1A1A] focus:bg-white focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
          />
        </div>

        {/* Filtro por Status no Grupo */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mr-1 hidden md:inline flex items-center gap-1">
            <Filter className="w-3 h-3 text-[#5C3A22]" />
            Status:
          </span>
          {(['Todos', 'Ativo', 'Removido'] as const).map((status) => {
            const isSelected = filtroStatus === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setFiltroStatus(status)}
                style={isSelected ? { backgroundColor: corSidebar } : {}}
                className={`px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  isSelected
                    ? 'text-white shadow-xs'
                    : 'bg-[#F2EFEA] hover:bg-[#E5E2DC] text-[#1A1A1A] border border-[#D9D6D0]'
                }`}
              >
                {status === 'Todos' ? `Todos (${totalLeads})` : status === 'Ativo' ? `Ativos (${totalAtivos})` : `Removidos (${totalRemovidos})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          TABELA OFICIAL DE NUTRIÇÃO
          Colunas: Nome | Data em que entrou na situação Nutrição | Status no grupo
         ========================================================================= */}
      <div className="bg-white rounded-sm border border-[#D9D6D0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table id="tabela-leads-nutricao" className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="tabela-ar-thead">
              <tr style={{ backgroundColor: corSidebar }} className="text-white border-b border-black/20 text-[11px] uppercase tracking-wider font-bold">
                <th scope="col" className="py-3 px-4 sm:px-6">
                  Nome
                </th>
                <th scope="col" className="py-3 px-4 sm:px-6">
                  Data em que entrou na Nutrição
                </th>
                <th scope="col" className="py-3 px-4 sm:px-6">
                  Status no grupo
                </th>
                <th scope="col" className="py-3 px-4 sm:px-6 text-right">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9D6D0] text-[#1A1A1A]">
              {leadsFiltrados.length > 0 ? (
                leadsFiltrados.map((lead) => {
                  const statusNoGrupo: StatusGrupoNutricao =
                    (lead.statusGrupoNutricao as StatusGrupoNutricao) ||
                    (lead.etapaPorSituacao?.['Nutrição'] as StatusGrupoNutricao) ||
                    'Ativo';

                  const isAtivo = statusNoGrupo === 'Ativo';
                  const dataEntradaExibida = lead.dataEntradaNutricao || lead.dataEntrada;
                  const diasDesdeEntrada = calcularDiasDesdeEntrada(dataEntradaExibida);
                  const ficha = obterFichaPorLead(lead.id);

                  return (
                    <tr
                      key={lead.id}
                      id={`linha-lead-nutricao-${lead.id}`}
                      className="hover:bg-[#F8F7F4] transition-colors group"
                    >
                      {/* Coluna 1: Nome (Clicável para abrir Ficha do Lead) */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex flex-col">
                          <button
                            id={`btn-abrir-ficha-${lead.id}`}
                            type="button"
                            onClick={() => abrirFichaLead(lead.id)}
                            className="text-left font-bold text-[#1A1A1A] hover:text-[#5C3A22] hover:underline transition-colors cursor-pointer flex items-center gap-1.5 group-hover:translate-x-0.5 transition-transform"
                          >
                            <span>{lead.nome}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 text-[#5C3A22] transition-opacity" />
                          </button>
                          {lead.interesse && (
                            <span className="text-[11px] text-[#6E6E6E] mt-0.5 truncate max-w-xs">
                              {lead.interesse}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Coluna 2: Data em que entrou na situação Nutrição */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-2 text-[#1A1A1A]">
                          <Calendar className="w-3.5 h-3.5 text-[#5C3A22] shrink-0" />
                          <div>
                            <span className="font-semibold text-[#1A1A1A]">
                              {formatarDataBR(dataEntradaExibida)}
                            </span>
                            <span className="text-[11px] text-[#6E6E6E] ml-1.5 font-normal">
                              ({diasDesdeEntrada === 0 ? 'Hoje' : `há ${diasDesdeEntrada} dia${diasDesdeEntrada > 1 ? 's' : ''}`})
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Coluna 3: Status no grupo (Select: "Ativo" | "Removido") */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="inline-flex items-center">
                          <select
                            id={`select-status-grupo-${lead.id}`}
                            value={statusNoGrupo}
                            onChange={(e) =>
                              handleStatusChange(lead.id, e.target.value as StatusGrupoNutricao)
                            }
                            className={`h-8 px-2.5 text-xs font-bold rounded-sm border transition-all cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-[#5C3A22] ${
                              isAtivo
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:border-emerald-400'
                                : 'bg-[#F2EFEA] text-[#6E6E6E] border-[#D9D6D0] hover:border-[#8F887E]'
                            }`}
                          >
                            <option value="Ativo" className="font-semibold text-emerald-900 bg-white">
                              ● Ativo
                            </option>
                            <option value="Removido" className="font-semibold text-[#6E6E6E] bg-white">
                              ○ Removido
                            </option>
                          </select>
                        </div>
                      </td>

                      {/* Coluna 4: Ação rápida para ver Ficha Completa */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <button
                          type="button"
                          onClick={() => abrirFichaLead(lead.id)}
                          className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-sm text-white bg-[#1A1A1A] hover:bg-[#5C3A22] border border-black/20 transition-colors cursor-pointer"
                        >
                          Ver Ficha
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center justify-center text-[#8F887E] space-y-2">
                      <div className="w-12 h-12 rounded-sm bg-[#F8F7F4] border border-[#D9D6D0] flex items-center justify-center text-[#8F887E]">
                        <Sprout className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-[#1A1A1A] text-sm">
                        Nenhum paciente encontrado em Nutrição
                      </p>
                      <p className="text-xs text-[#6E6E6E] text-center">
                        {termoBusca || filtroStatus !== 'Todos'
                          ? 'Tente ajustar os filtros de busca ou status no grupo.'
                          : 'Para incluir um paciente nesta lista, selecione a situação "Nutrição" no cadastro rápido ou na Ficha do paciente.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da tabela */}
        <div className="px-4 py-3 bg-[#F8F7F4] border-t border-[#D9D6D0] flex flex-col sm:flex-row items-center justify-between text-xs text-[#6E6E6E] gap-2">
          <span>
            Exibindo <strong>{leadsFiltrados.length}</strong> de <strong>{leadsNutricao.length}</strong> paciente(s) em Nutrição
          </span>
          <span className="text-[11px] text-[#8F887E]">
            Dica: Altere o status no menu dropdown para atualizar a lista instantaneamente
          </span>
        </div>
      </div>
    </div>
  );
};

