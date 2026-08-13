import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  CalendarCheck,
  Clock,
  Phone,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Plus,
  Edit3,
  RotateCcw,
  Sparkles,
  User,
  Send,
  MapPin,
  Calendar,
  ChevronRight,
  X,
  FileText,
  Check,
  ArrowUpDown,
  Tag,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useCrm } from '../context/CrmContext';
import { useAuth } from '../context/AuthContext';
import { useEmpresa } from '../context/EmpresaContext';
import {
  Lead,
  StatusConfirmacaoAgendamento,
  TODOS_STATUS_CONFIRMACAO_AGENDAMENTO,
  StatusVenda,
} from '../types';
import { SEED_USUARIOS } from '../data/seedData';
import {
  formatarDataBR,
  obterDataHoje,
  formatarDataHoraAgora,
} from '../utils/formatters';

type FiltroAgendamento =
  | 'todos'
  | 'lembrete_pendente_hoje'
  | 'amanha'
  | 'hoje'
  | 'confirmadas'
  | 'proximos_7_dias'
  | 'remarcadas'
  | 'canceladas'
  | 'realizadas';

export const ConsultasAgendadasView: React.FC = () => {
  const {
    leads,
    obterFichaPorLead,
    abrirFichaLead,
    criarLead,
    atualizarLead,
    atualizarFichaLead,
    excluirLead,
    procedimentos,
    responsaveis,
  } = useCrm();

  const { responsavelNome, usuarios } = useAuth();
  const { config } = useEmpresa();

  const corPrimaria = config.estetica?.corPrimaria || '#5C3A22';
  const corSecundaria = config.estetica?.corSecundaria || '#8A6142';
  const corSidebar = config.estetica?.corSidebar || '#1A1A1A';

  // Estados de busca e filtros
  const [termoBusca, setTermoBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroAgendamento>('todos');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Modal para Agendar / Editar Agendamento
  const [leadEditando, setLeadEditando] = useState<Lead | null>(null);
  const [leadExcluindo, setLeadExcluindo] = useState<Lead | null>(null);
  const [modalNovoAgendamento, setModalNovoAgendamento] = useState(false);

  // Estados do formulário de agendamento no modal
  const [formLeadId, setFormLeadId] = useState('');
  const [formNome, setFormNome] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formDataAgendamento, setFormDataAgendamento] = useState('');
  const [formHorarioAgendamento, setFormHorarioAgendamento] = useState('14:00');
  const [formProfissional, setFormProfissional] = useState('');
  const [formTipoConsulta, setFormTipoConsulta] = useState('Avaliação de Harmonização Facial');
  const [formUnidade, setFormUnidade] = useState('Consultório Principal');
  const [formObservacoes, setFormObservacoes] = useState(
    'Chegar 15 minutos antes. Vir sem maquiagem facial ou protetor solar com cor.'
  );
  const [formStatusConfirmacao, setFormStatusConfirmacao] =
    useState<StatusConfirmacaoAgendamento>('Agendada');
  const [formPossivelValor, setFormPossivelValor] = useState<number | string>(0);
  const [formLembrete24hEnviado, setFormLembrete24hEnviado] = useState(false);

  // Disparo de feedback
  const dispararFeedback = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3200);
  };

  // 1. Filtrar leads com agendamento ativo ou na situação de consulta agendada
  const leadsAgendados = useMemo(() => {
    return leads.filter((lead) => {
      if (lead.deleted_at) return false;
      const temData = Boolean(lead.dataAgendamento);
      const isSituacaoAgendada =
        lead.situacao === 'Consulta agendada' ||
        lead.situacao === 'Procedimento agendado';
      return temData || isSituacaoAgendada;
    });
  }, [leads]);

  // Lista de todos os leads ativos para o select de "Novo Agendamento"
  const leadsDisponiveis = useMemo(() => {
    return leads.filter((l) => !l.deleted_at);
  }, [leads]);

  const hojeStr = obterDataHoje();

  // Calcular data de amanhã
  const amanhaStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Calcular data de daqui a 7 dias
  const daqui7DiasStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, []);

  // Enriquecimento e cálculo de status do agendamento e da janela de 24h
  const leadsProcessados = useMemo(() => {
    return leadsAgendados.map((lead) => {
      const ficha = obterFichaPorLead(lead.id);
      const dataConsulta = lead.dataAgendamento || lead.dataEntrada || hojeStr;
      const horarioConsulta = lead.horarioAgendamento || '14:00';
      const statusConfirmacao = lead.statusConfirmacaoAgendamento || 'Agendada';

      // Janela de 24 horas: consulta agendada para hoje ou para amanhã
      const isAmanha = dataConsulta === amanhaStr;
      const isHoje = dataConsulta === hojeStr;
      const isJanela24h = isAmanha || isHoje;

      // Lembrete pendente de envio: está na janela de 24h e ainda NÃO foi enviado
      const lembretePendenteHoje = isJanela24h && !lead.lembrete24hEnviado;

      // Status descritivo de proximidade
      let proximidadeLabel = formatarDataBR(dataConsulta);
      let proximidadeBadgeColor = 'bg-[#F2EFEA] text-[#1A1A1A] border-[#D9D6D0]';

      if (isHoje) {
        proximidadeLabel = `Hoje às ${horarioConsulta}`;
        proximidadeBadgeColor = 'bg-emerald-100 text-emerald-950 border-emerald-300 font-bold';
      } else if (isAmanha) {
        proximidadeLabel = `Amanhã às ${horarioConsulta}`;
        proximidadeBadgeColor = 'bg-amber-100 text-amber-950 border-amber-300 font-bold';
      } else if (dataConsulta < hojeStr) {
        proximidadeLabel = `Passada (${formatarDataBR(dataConsulta)})`;
        proximidadeBadgeColor = 'bg-stone-100 text-stone-600 border-stone-200';
      } else if (dataConsulta <= daqui7DiasStr) {
        proximidadeLabel = `Em breve (${formatarDataBR(dataConsulta)} às ${horarioConsulta})`;
        proximidadeBadgeColor = 'bg-[#5C3A22]/10 text-[#5C3A22] border-[#5C3A22]/30 font-semibold';
      }

      // Telefone formatado
      const telefone = ficha?.telefone || '';
      const telefoneNumeros = telefone.replace(/\D/g, '');

      return {
        ...lead,
        ficha,
        telefone,
        telefoneNumeros,
        dataConsulta,
        horarioConsulta,
        statusConfirmacao,
        isAmanha,
        isHoje,
        isJanela24h,
        lembretePendenteHoje,
        proximidadeLabel,
        proximidadeBadgeColor,
      };
    });
  }, [leadsAgendados, obterFichaPorLead, hojeStr, amanhaStr, daqui7DiasStr]);

  // Métricas do Topo
  const metricas = useMemo(() => {
    const total = leadsProcessados.length;
    const lembretesPendentesHoje = leadsProcessados.filter((l) => l.lembretePendenteHoje).length;
    const consultasAmanha = leadsProcessados.filter((l) => l.isAmanha).length;
    const consultasHoje = leadsProcessados.filter((l) => l.isHoje).length;
    const confirmadas = leadsProcessados.filter((l) => l.statusConfirmacao === 'Confirmada').length;
    const lembretesEnviados = leadsProcessados.filter((l) => l.lembrete24hEnviado).length;

    const taxaConfirmacao =
      total > 0 ? Math.round((confirmadas / total) * 100) : 0;

    return {
      total,
      lembretesPendentesHoje,
      consultasAmanha,
      consultasHoje,
      confirmadas,
      lembretesEnviados,
      taxaConfirmacao,
    };
  }, [leadsProcessados]);

  // Filtragem da tabela
  const leadsFiltrados = useMemo(() => {
    return leadsProcessados
      .filter((lead) => {
        // Busca textual
        if (termoBusca.trim()) {
          const termo = termoBusca.toLowerCase().trim();
          const matchNome = lead.nome.toLowerCase().includes(termo);
          const matchTel = lead.telefone.toLowerCase().includes(termo);
          const matchProc = (lead.tipoConsulta || lead.interesse || '').toLowerCase().includes(termo);
          const matchProf = (lead.profissionalAgendamento || lead.responsavel || '').toLowerCase().includes(termo);
          const matchUnidade = (lead.unidadeAgendamento || '').toLowerCase().includes(termo);

          if (!matchNome && !matchTel && !matchProc && !matchProf && !matchUnidade) {
            return false;
          }
        }

        // Filtro de aba
        switch (filtro) {
          case 'lembrete_pendente_hoje':
            return lead.lembretePendenteHoje;
          case 'amanha':
            return lead.isAmanha;
          case 'hoje':
            return lead.isHoje;
          case 'confirmadas':
            return lead.statusConfirmacao === 'Confirmada';
          case 'proximos_7_dias':
            return lead.dataConsulta >= hojeStr && lead.dataConsulta <= daqui7DiasStr;
          case 'remarcadas':
            return lead.statusConfirmacao === 'Remarcada';
          case 'canceladas':
            return lead.statusConfirmacao === 'Cancelada';
          case 'realizadas':
            return lead.statusConfirmacao === 'Realizada';
          case 'todos':
          default:
            return true;
        }
      })
      .sort((a, b) => {
        // Priorizar lembretes pendentes para hoje no topo
        if (a.lembretePendenteHoje && !b.lembretePendenteHoje) return -1;
        if (!a.lembretePendenteHoje && b.lembretePendenteHoje) return 1;

        // Ordenar por data da consulta mais próxima
        return a.dataConsulta.localeCompare(b.dataConsulta);
      });
  }, [leadsProcessados, termoBusca, filtro, hojeStr, daqui7DiasStr]);

  // Gerar mensagem oficial de Lembrete 24h para o WhatsApp
  const gerarMensagemWhatsApp24h = (leadItem: typeof leadsProcessados[0]) => {
    const nomePaciente = leadItem.nome.trim();
    const clinicaNome = config.nomeEmpresa || 'Dra. Agda Rodrigues';
    const tipo = leadItem.tipoConsulta || leadItem.interesse || 'sua avaliação de Harmonização Facial';
    const profissional = leadItem.profissionalAgendamento || leadItem.responsavel || 'nossa especialista';
    const dataFmt = formatarDataBR(leadItem.dataConsulta);
    const horario = leadItem.horarioConsulta;
    const unidade = leadItem.unidadeAgendamento || 'nossa clínica';
    const obs = leadItem.observacoesAgendamento
      ? `\n\n📌 *Orientações importantes:* ${leadItem.observacoesAgendamento}`
      : '';

    const diaReferencia = leadItem.isAmanha ? 'amanhã' : leadItem.isHoje ? 'hoje' : `no dia ${dataFmt}`;

    return (
      `Olá, *${nomePaciente}*! Tudo bem?\n\n` +
      `Aqui é da equipe da *${clinicaNome}*.\n\n` +
      `Passando para lembrar e confirmar sua consulta de *${tipo}* com *${profissional}*, agendada para *${diaReferencia} (${dataFmt})* às *${horario}* na unidade *${unidade}*.` +
      obs +
      `\n\nPodemos confirmar sua presença? Por favor, responda com *1 para CONFIRMAR* ou nos avise caso precise de algum ajuste de horário.\n\nAguardamos você com muito carinho! ✨`
    );
  };

  // Disparar WhatsApp 24h e registrar envio
  const handleDispararWhatsApp24h = async (leadItem: typeof leadsProcessados[0]) => {
    const textoMsg = gerarMensagemWhatsApp24h(leadItem);
    const urlWa = `https://wa.me/55${leadItem.telefoneNumeros}?text=${encodeURIComponent(textoMsg)}`;

    // Abre o WhatsApp
    window.open(urlWa, '_blank');

    // Registra o envio no Lead
    const agora = formatarDataHoraAgora();
    await atualizarLead(leadItem.id, {
      lembrete24hEnviado: true,
      dataEnvioLembrete24h: agora,
      mensagemLembrete24hEnviadaPor: responsavelNome || 'Secretária',
    });

    dispararFeedback(`Lembrete 24h enviado e registrado para ${leadItem.nome}!`);
  };

  // Marcar lembrete 24h como enviado manualmente
  const handleMarcarLembreteEnviado = async (leadId: string, leadNome: string) => {
    const agora = formatarDataHoraAgora();
    await atualizarLead(leadId, {
      lembrete24hEnviado: true,
      dataEnvioLembrete24h: agora,
      mensagemLembrete24hEnviadaPor: responsavelNome || 'Secretária',
    });
    dispararFeedback(`Lembrete 24h marcado como enviado para ${leadNome}!`);
  };

  // Alterar status de confirmação diretamente na tabela
  const handleAlterarStatusConfirmacao = async (
    leadId: string,
    novoStatus: StatusConfirmacaoAgendamento,
    leadNome: string
  ) => {
    await atualizarLead(leadId, {
      statusConfirmacaoAgendamento: novoStatus,
    });
    dispararFeedback(`Status do agendamento de ${leadNome} alterado para "${novoStatus}"!`);
  };

  // Abrir modal para editar agendamento
  const handleAbrirEditarAgendamento = (leadItem: Lead) => {
    setLeadEditando(leadItem);
    setFormLeadId(leadItem.id);
    setFormNome(leadItem.nome || '');
    const ficha = obterFichaPorLead(leadItem.id);
    setFormTelefone(ficha?.telefone || '');
    setFormDataAgendamento(leadItem.dataAgendamento || obterDataHoje());
    setFormHorarioAgendamento(leadItem.horarioAgendamento || '14:00');
    setFormProfissional(
      leadItem.profissionalAgendamento || leadItem.responsavel || responsaveis[0] || 'Dra. Agda Rodrigues'
    );
    setFormTipoConsulta(
      leadItem.tipoConsulta || leadItem.interesse || 'Avaliação de Harmonização Facial'
    );
    setFormUnidade(leadItem.unidadeAgendamento || 'Consultório Principal');
    setFormObservacoes(
      leadItem.observacoesAgendamento ||
        'Chegar 15 minutos antes. Vir sem maquiagem facial ou protetor solar com cor.'
    );
    setFormStatusConfirmacao(leadItem.statusConfirmacaoAgendamento || 'Agendada');
    setFormPossivelValor(leadItem.possivelValor || 0);
    setFormLembrete24hEnviado(Boolean(leadItem.lembrete24hEnviado));
  };

  // Abrir modal de novo agendamento
  const handleAbrirNovoAgendamento = () => {
    setLeadEditando(null);
    setFormLeadId('NOVO');
    setFormNome('');
    setFormTelefone('');
    setFormTipoConsulta('Avaliação de Harmonização Facial');
    setFormPossivelValor(0);
    setFormDataAgendamento(amanhaStr);
    setFormHorarioAgendamento('14:00');
    const especialistaPadrao =
      usuarios?.find((u) => u.role === 'MEDICO' && u.ativo && !u.deleted_at)?.nome ||
      usuarios?.find((u) => u.ativo && !u.deleted_at)?.nome ||
      SEED_USUARIOS.find((u) => u.role === 'MEDICO')?.nome ||
      SEED_USUARIOS[0]?.nome ||
      '';
    setFormProfissional(especialistaPadrao);
    setFormUnidade('Consultório Principal');
    setFormObservacoes(
      'Chegar 15 minutos antes. Vir sem maquiagem facial ou protetor solar com cor.'
    );
    setFormStatusConfirmacao('Agendada');
    setFormLembrete24hEnviado(false);
    setModalNovoAgendamento(true);
  };

  const handleSelecionarLeadNovoAgendamento = (idSel: string) => {
    setFormLeadId(idSel);
    if (idSel === 'NOVO') {
      setFormNome('');
      setFormTelefone('');
      setFormTipoConsulta('Avaliação de Harmonização Facial');
      setFormPossivelValor(0);
      return;
    }
    const l = leads.find((x) => x.id === idSel);
    if (l) {
      setFormNome(l.nome || '');
      const ficha = obterFichaPorLead(l.id);
      setFormTelefone(ficha?.telefone || '');
      if (l.interesse) setFormTipoConsulta(l.interesse);
      if (l.possivelValor) setFormPossivelValor(l.possivelValor);
    }
  };

  // Salvar agendamento no modal (Persiste inserção e edições diretamente no Supabase e no estado)
  const handleSalvarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    const isNovo = !leadEditando;

    if (!formNome.trim()) {
      alert('Informe o nome do paciente.');
      return;
    }

    if (isNovo && (formLeadId === 'NOVO' || !formLeadId)) {
      // Criar Novo Paciente e Agendamento no Supabase
      const novoLead = await criarLead({
        nome: formNome.trim(),
        situacao: 'Consulta agendada',
        dataAgendamento: formDataAgendamento,
        horarioAgendamento: formHorarioAgendamento,
        profissionalAgendamento: formProfissional,
        tipoConsulta: formTipoConsulta,
        interesse: formTipoConsulta,
        unidadeAgendamento: formUnidade,
        observacoesAgendamento: formObservacoes,
        statusConfirmacaoAgendamento: formStatusConfirmacao,
        statusVenda: 'Em processo',
        possivelValor: Number(formPossivelValor) || 0,
        responsavel: formProfissional || responsaveis[0] || 'Secretária 1',
        ficha: {
          telefone: formTelefone.trim(),
        },
      });

      if (novoLead && formLembrete24hEnviado) {
        await atualizarLead(novoLead.id, {
          lembrete24hEnviado: true,
          dataEnvioLembrete24h: new Date().toLocaleString('pt-BR'),
          mensagemLembrete24hEnviadaPor: responsavelNome || 'Secretária',
        });
      }

      dispararFeedback(`Novo paciente e agendamento de ${formNome.trim()} criados e salvos no Supabase!`);
    } else {
      // Atualizar Lead e Consulta Existente no Supabase
      const targetLeadId = leadEditando ? leadEditando.id : formLeadId;
      if (!targetLeadId) {
        alert('Selecione ou identifique um paciente para agendar.');
        return;
      }

      const leadAlvo = leads.find((l) => l.id === targetLeadId);
      const novoStatusVenda: StatusVenda = leadAlvo?.statusVenda || 'Em processo';
      const lembreteRecemAtivado = formLembrete24hEnviado && !leadAlvo?.lembrete24hEnviado;

      await atualizarLead(targetLeadId, {
        nome: formNome.trim() || leadAlvo?.nome || 'Paciente',
        dataAgendamento: formDataAgendamento,
        horarioAgendamento: formHorarioAgendamento,
        profissionalAgendamento: formProfissional,
        tipoConsulta: formTipoConsulta,
        interesse: formTipoConsulta,
        unidadeAgendamento: formUnidade,
        observacoesAgendamento: formObservacoes,
        statusConfirmacaoAgendamento: formStatusConfirmacao,
        situacao: 'Consulta agendada',
        statusVenda: novoStatusVenda,
        possivelValor: Number(formPossivelValor) || 0,
        lembrete24hEnviado: formLembrete24hEnviado,
        ...(lembreteRecemAtivado
          ? {
              dataEnvioLembrete24h: new Date().toLocaleString('pt-BR'),
              mensagemLembrete24hEnviadaPor: responsavelNome || 'Secretária',
            }
          : {}),
      });

      if (formTelefone.trim()) {
        await atualizarFichaLead(targetLeadId, {
          telefone: formTelefone.trim(),
        });
      }

      dispararFeedback(
        `Edições e agendamento de ${formNome.trim() || leadAlvo?.nome || 'paciente'} salvos no Supabase!`
      );
    }

    setLeadEditando(null);
    setModalNovoAgendamento(false);
  };

  // Remover apenas o agendamento (manter o paciente)
  const handleRemoverApenasAgendamento = async () => {
    if (!leadExcluindo) return;
    await atualizarLead(leadExcluindo.id, {
      dataAgendamento: '',
      horarioAgendamento: '',
      situacao: 'Em captação',
      statusConfirmacaoAgendamento: undefined,
    });
    dispararFeedback(`Agendamento de ${leadExcluindo.nome} removido. O paciente continua no CRM.`);
    setLeadExcluindo(null);
  };

  // Excluir paciente definitivamente do Supabase
  const handleConfirmarExcluirDefinitivo = async () => {
    if (!leadExcluindo) return;
    await excluirLead(leadExcluindo.id, true);
    dispararFeedback(`Paciente e agendamento de ${leadExcluindo.nome} apagados do Supabase.`);
    setLeadExcluindo(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6"
    >
      {/* =========================================================================
          CABEÇALHO DA SEÇÃO COM AÇÕES PRINCIPAIS
         ========================================================================= */}
      <div className="bg-white p-5 rounded-sm border border-[#D9D6D0] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-sm flex items-center justify-center font-bold text-white shadow-xs"
              style={{ backgroundColor: corPrimaria }}
            >
              <CalendarClock className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-[#1A1A1A] tracking-tight uppercase">
                Consultas Agendadas & Lembretes 24h
              </h1>
              <p className="text-xs text-[#6E6E6E]">
                Gestão dos agendamentos, confirmações de presença e envio do lembrete de 24 horas antes para a secretária.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {feedbackToast && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-sm border border-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              {feedbackToast}
            </span>
          )}

          <button
            id="btn-novo-agendamento-topo"
            type="button"
            onClick={handleAbrirNovoAgendamento}
            style={{ backgroundColor: corPrimaria }}
            className="inline-flex items-center gap-2 px-4 py-2 text-white font-bold text-xs uppercase tracking-wider rounded-sm shadow-xs hover:brightness-110 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-white" />
            <span> Agendar Consulta</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          CARDS DE RESUMO & LEMBRETES 24H URGENTES
         ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: ⚠️ Lembretes 24h Pendentes Hoje (Alerta Vermelho Destaque) */}
        <button
          id="card-filtro-lembretes-pendentes"
          type="button"
          onClick={() =>
            setFiltro(filtro === 'lembrete_pendente_hoje' ? 'todos' : 'lembrete_pendente_hoje')
          }
          className={`p-3.5 rounded-sm border text-left transition-all cursor-pointer ${
            metricas.lembretesPendentesHoje > 0
              ? filtro === 'lembrete_pendente_hoje'
                ? 'bg-rose-100 border-rose-600 ring-2 ring-rose-600 shadow-xs'
                : 'bg-rose-50 border-rose-300 hover:bg-rose-100/80 animate-pulse'
              : filtro === 'lembrete_pendente_hoje'
              ? 'bg-white border-[#5C3A22] ring-1 ring-[#5C3A22]'
              : 'bg-[#F2EFEA]/40 border-[#D9D6D0] hover:bg-[#F2EFEA]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                metricas.lembretesPendentesHoje > 0 ? 'text-rose-900' : 'text-[#6E6E6E]'
              }`}
            >
              Lembretes 24h Hoje
            </span>
            <Send
              className={`w-4 h-4 ${
                metricas.lembretesPendentesHoje > 0 ? 'text-rose-700' : 'text-[#8F887E]'
              }`}
            />
          </div>
          <p
            className={`text-2xl font-black mt-1 ${
              metricas.lembretesPendentesHoje > 0 ? 'text-rose-950 font-mono' : 'text-[#1A1A1A]'
            }`}
          >
            {metricas.lembretesPendentesHoje}
          </p>
          <p className="text-[10px] text-rose-800 font-semibold mt-0.5">
            {metricas.lembretesPendentesHoje > 0 ? '⚠️ Disparo pendente' : 'Todos em dia'}
          </p>
        </button>

        {/* Card 2: Consultas de Amanhã (Janela 24h) */}
        <button
          id="card-filtro-consultas-amanha"
          type="button"
          onClick={() => setFiltro(filtro === 'amanha' ? 'todos' : 'amanha')}
          className={`p-3.5 rounded-sm border text-left transition-all cursor-pointer ${
            filtro === 'amanha'
              ? 'bg-amber-50 border-amber-600 ring-1 ring-amber-600 shadow-xs'
              : 'bg-amber-50/40 border-amber-200 hover:bg-amber-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
              Amanhã (24h)
            </span>
            <CalendarCheck className="w-4 h-4 text-amber-700" />
          </div>
          <p className="text-2xl font-black text-amber-950 mt-1 font-mono">
            {metricas.consultasAmanha}
          </p>
          <p className="text-[10px] text-amber-800 font-semibold mt-0.5">Janela de lembrete</p>
        </button>

        {/* Card 3: Consultas de Hoje */}
        <button
          id="card-filtro-consultas-hoje"
          type="button"
          onClick={() => setFiltro(filtro === 'hoje' ? 'todos' : 'hoje')}
          className={`p-3.5 rounded-sm border text-left transition-all cursor-pointer ${
            filtro === 'hoje'
              ? 'bg-white border-[#5C3A22] ring-1 ring-[#5C3A22] shadow-xs'
              : 'bg-[#F2EFEA]/40 border-[#D9D6D0] hover:bg-[#F2EFEA]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider">
              Consultas Hoje
            </span>
            <Clock className="w-4 h-4 text-[#5C3A22]" />
          </div>
          <p className="text-2xl font-black text-[#1A1A1A] mt-1 font-mono">
            {metricas.consultasHoje}
          </p>
          <p className="text-[10px] text-[#6E6E6E] font-semibold mt-0.5">Atendimentos do dia</p>
        </button>

        {/* Card 4: Confirmadas */}
        <button
          id="card-filtro-consultas-confirmadas"
          type="button"
          onClick={() => setFiltro(filtro === 'confirmadas' ? 'todos' : 'confirmadas')}
          className={`p-3.5 rounded-sm border text-left transition-all cursor-pointer ${
            filtro === 'confirmadas'
              ? 'bg-emerald-50 border-emerald-600 ring-1 ring-emerald-600 shadow-xs'
              : 'bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
              Confirmadas
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-2xl font-black text-emerald-950 mt-1 font-mono">
            {metricas.confirmadas}
          </p>
          <p className="text-[10px] text-emerald-800 font-semibold mt-0.5">
            {metricas.taxaConfirmacao}% de confirmação
          </p>
        </button>

        {/* Card 5: Total Ativos */}
        <button
          id="card-filtro-todos-agendamentos"
          type="button"
          onClick={() => setFiltro('todos')}
          className={`p-3.5 rounded-sm border text-left transition-all cursor-pointer ${
            filtro === 'todos'
              ? 'bg-white border-[#5C3A22] ring-1 ring-[#5C3A22] shadow-xs'
              : 'bg-[#F2EFEA]/40 border-[#D9D6D0] hover:bg-[#F2EFEA]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider">
              Total Agendados
            </span>
            <Calendar className="w-4 h-4 text-[#5C3A22]" />
          </div>
          <p className="text-2xl font-black text-[#1A1A1A] mt-1 font-mono">
            {metricas.total}
          </p>
          <p className="text-[10px] text-[#6E6E6E] font-semibold mt-0.5">Na base do CRM</p>
        </button>
      </div>

      {/* =========================================================================
          BARRA DE PESQUISA & SELETOR DE STATUS
         ========================================================================= */}
      <div className="bg-white rounded-sm p-4 border border-[#D9D6D0] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8F887E]" />
          <input
            id="input-busca-agendamentos"
            type="text"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Buscar por paciente, telefone, médico..."
            className="w-full h-9 pl-9 pr-8 text-xs sm:text-sm rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/30 text-[#1A1A1A] placeholder:text-[#8F887E] focus:bg-white focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden font-medium"
          />
          {termoBusca && (
            <button
              type="button"
              onClick={() => setTermoBusca('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8F887E] hover:text-[#1A1A1A] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <label
            htmlFor="select-filtro-agendamento"
            className="flex items-center gap-1.5 text-xs text-[#1A1A1A] font-bold uppercase tracking-wider shrink-0 cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 text-[#8F887E]" />
            <span>Filtro:</span>
          </label>

          <select
            id="select-filtro-agendamento"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as FiltroAgendamento)}
            className="h-9 px-3 text-xs sm:text-sm font-medium rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden cursor-pointer"
          >
            <option value="todos">Todos os agendamentos ({metricas.total})</option>
            <option value="lembrete_pendente_hoje">
              ⚠️ Lembretes 24h Pendentes ({metricas.lembretesPendentesHoje})
            </option>
            <option value="amanha">Consultas de Amanhã ({metricas.consultasAmanha})</option>
            <option value="hoje">Consultas de Hoje ({metricas.consultasHoje})</option>
            <option value="confirmadas">Confirmadas ({metricas.confirmadas})</option>
            <option value="proximos_7_dias">Próximos 7 dias</option>
            <option value="remarcadas">Remarcadas</option>
            <option value="canceladas">Canceladas</option>
            <option value="realizadas">Realizadas</option>
          </select>
        </div>
      </div>

      {/* =========================================================================
          TABELA PRINCIPAL DE CONSULTAS AGENDADAS
         ========================================================================= */}
      <div className="bg-white rounded-sm border border-[#D9D6D0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table id="tabela-consultas-agendadas" className="w-full text-left text-xs border-collapse">
            <thead className="tabela-ar-thead bg-[#1A1A1A] text-white">
              <tr className="text-white border-b border-black/30">
                <th scope="col" className="py-3 px-4 sm:px-6 font-bold uppercase tracking-wider text-[11px] text-white">
                  Paciente
                </th>
                <th scope="col" className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-white">
                  Data & Horário
                </th>
                <th scope="col" className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-white">
                  Procedimento & Especialista
                </th>
                <th scope="col" className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-white">
                  Unidade / Sala
                </th>
                <th scope="col" className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-white">
                  Lembrete 24h Antes
                </th>
                <th scope="col" className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-white">
                  Status Confirmação
                </th>
                <th scope="col" className="py-3 px-4 text-right font-bold uppercase tracking-wider text-[11px] text-white">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9D6D0]">
              {leadsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center text-[#8F887E]">
                    <div className="w-12 h-12 rounded-sm bg-[#F8F7F4] border border-[#D9D6D0] flex items-center justify-center mx-auto text-[#8F887E] mb-3">
                      <CalendarClock className="w-6 h-6" />
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-[#1A1A1A]">
                      Nenhum agendamento encontrado para os filtros selecionados.
                    </p>
                    <p className="text-[11px] text-[#6E6E6E] mt-1 max-w-sm mx-auto">
                      Use o botão "+ Agendar Consulta" acima ou abra a ficha de um paciente para agendar.
                    </p>
                  </td>
                </tr>
              ) : (
                leadsFiltrados.map((leadItem) => {
                  return (
                    <tr
                      key={leadItem.id}
                      id={`linha-agendamento-${leadItem.id}`}
                      className={`hover:bg-[#F8F7F4] transition-colors ${
                        leadItem.lembretePendenteHoje ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      {/* 1. Paciente */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => abrirFichaLead(leadItem.id)}
                            className="font-bold text-xs sm:text-sm text-[#1A1A1A] hover:text-[#5C3A22] hover:underline text-left cursor-pointer flex items-center gap-1.5"
                          >
                            <span>{leadItem.nome}</span>
                          </button>

                          {leadItem.telefone && (
                            <div className="flex items-center gap-2 text-[11px] text-[#6E6E6E]">
                              <span className="flex items-center gap-1 font-mono">
                                <Phone className="w-3 h-3 text-[#8F887E]" />
                                {leadItem.telefone}
                              </span>
                              {leadItem.telefoneNumeros && (
                                <a
                                  href={`https://wa.me/55${leadItem.telefoneNumeros}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-700 hover:text-emerald-900"
                                  title="Abrir WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 2. Data & Horário */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-sm text-[11px] border ${leadItem.proximidadeBadgeColor}`}
                          >
                            {leadItem.proximidadeLabel}
                          </span>
                          <p className="text-[10px] text-[#6E6E6E]">
                            Consulta em {formatarDataBR(leadItem.dataConsulta)} às {leadItem.horarioConsulta}
                          </p>
                        </div>
                      </td>

                      {/* 3. Procedimento & Especialista */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-xs text-[#1A1A1A]">
                            {leadItem.tipoConsulta || leadItem.interesse || 'Avaliação Geral'}
                          </p>
                          <p className="text-[11px] text-[#6E6E6E]">
                            Profissional: <strong className="text-[#1A1A1A]">{leadItem.profissionalAgendamento || leadItem.responsavel}</strong>
                          </p>
                        </div>
                      </td>

                      {/* 4. Unidade / Sala */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-xs text-[#1A1A1A]">
                          <MapPin className="w-3.5 h-3.5 text-[#8F887E] shrink-0" />
                          <span className="truncate">{leadItem.unidadeAgendamento || 'Consultório 1'}</span>
                        </div>
                      </td>

                      {/* 5. Lembrete 24h Antes (Botão Direto de Envio e Status) */}
                      <td className="py-3.5 px-4">
                        {leadItem.lembrete24hEnviado ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>Enviado</span>
                            </span>
                            {leadItem.dataEnvioLembrete24h && (
                              <p className="text-[10px] text-[#6E6E6E]">
                                {leadItem.dataEnvioLembrete24h}
                                {leadItem.mensagemLembrete24hEnviadaPor && ` por ${leadItem.mensagemLembrete24hEnviadaPor}`}
                              </p>
                            )}
                          </div>
                        ) : leadItem.lembretePendenteHoje ? (
                          <div className="space-y-1.5">
                            <button
                              id={`btn-disparar-wa-24h-${leadItem.id}`}
                              type="button"
                              onClick={() => handleDispararWhatsApp24h(leadItem)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] uppercase tracking-wider shadow-xs transition-all cursor-pointer w-full justify-center animate-pulse"
                              title="Abrir WhatsApp com o lembrete de 24h oficial e registrar envio"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-white" />
                              <span>Disparar WhatsApp 24h</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleMarcarLembreteEnviado(leadItem.id, leadItem.nome)}
                              className="text-[10px] text-[#6E6E6E] hover:text-[#1A1A1A] hover:underline block text-center w-full cursor-pointer"
                            >
                              Marcar como já enviado
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-medium bg-[#F2EFEA] text-[#6E6E6E] border border-[#D9D6D0]">
                              <Clock className="w-3 h-3 text-[#8F887E]" />
                              <span>Programado</span>
                            </span>
                            <p className="text-[10px] text-[#8F887E]">
                              Envio 24h antes da consulta
                            </p>
                          </div>
                        )}
                      </td>

                      {/* 6. Status de Confirmação */}
                      <td className="py-3.5 px-4">
                        <select
                          id={`select-status-confirmacao-${leadItem.id}`}
                          value={leadItem.statusConfirmacao}
                          onChange={(e) =>
                            handleAlterarStatusConfirmacao(
                              leadItem.id,
                              e.target.value as StatusConfirmacaoAgendamento,
                              leadItem.nome
                            )
                          }
                          className={`h-7 px-2 text-[11px] font-bold rounded-sm border cursor-pointer focus:outline-hidden ${
                            leadItem.statusConfirmacao === 'Confirmada'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                              : leadItem.statusConfirmacao === 'Realizada'
                              ? 'bg-[#5C3A22]/10 border-[#5C3A22]/30 text-[#5C3A22]'
                              : leadItem.statusConfirmacao === 'Cancelada'
                              ? 'bg-rose-50 border-rose-300 text-rose-900'
                              : leadItem.statusConfirmacao === 'Remarcada'
                              ? 'bg-amber-50 border-amber-300 text-amber-900'
                              : 'bg-white border-[#D9D6D0] text-[#1A1A1A]'
                          }`}
                        >
                          {TODOS_STATUS_CONFIRMACAO_AGENDAMENTO.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* 7. Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão de Edição Rápida do Agendamento */}
                          <button
                            id={`btn-editar-agendamento-${leadItem.id}`}
                            type="button"
                            onClick={() => handleAbrirEditarAgendamento(leadItem)}
                            className="p-1.5 rounded-sm bg-[#F2EFEA] hover:bg-[#E5E2DC] text-[#1A1A1A] border border-[#D9D6D0] transition-colors cursor-pointer"
                            title="Editar dados da consulta e orientações"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#5C3A22]" />
                          </button>

                          {/* Botão Abrir Ficha Completa */}
                          <button
                            id={`btn-abrir-ficha-lead-${leadItem.id}`}
                            type="button"
                            onClick={() => abrirFichaLead(leadItem.id)}
                            className="p-1.5 rounded-sm bg-[#F2EFEA] hover:bg-[#E5E2DC] text-[#1A1A1A] border border-[#D9D6D0] transition-colors cursor-pointer"
                            title="Abrir ficha completa do paciente"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#1A1A1A]" />
                          </button>

                          {/* Botão Excluir / Apagar Agendamento do Supabase */}
                          <button
                            id={`btn-excluir-agendamento-${leadItem.id}`}
                            type="button"
                            onClick={() => setLeadExcluindo(leadItem)}
                            className="p-1.5 rounded-sm bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                            title="Apagar consulta ou excluir paciente do Supabase"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-700" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODAL DE NOVO AGENDAMENTO OU EDIÇÃO DE AGENDAMENTO
         ========================================================================= */}
      {(modalNovoAgendamento || leadEditando) && (
        <div
          id="modal-agendamento-backdrop"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div
            id="modal-agendamento-card"
            className="bg-white rounded-sm border border-[#D9D6D0] max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 my-auto"
          >
            <div className="flex items-center justify-between border-b border-[#D9D6D0] pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-sm flex items-center justify-center font-bold text-white shadow-xs"
                  style={{ backgroundColor: corPrimaria }}
                >
                  <CalendarCheck className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A1A1A]">
                    {leadEditando ? `Editar Consulta: ${leadEditando.nome}` : 'Novo Agendamento de Consulta'}
                  </h3>
                  <p className="text-[11px] text-[#6E6E6E]">
                    Defina data, horário, especialista e orientações prévias para a mensagem de 24h.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setLeadEditando(null);
                  setModalNovoAgendamento(false);
                }}
                className="p-1 rounded-sm text-[#8F887E] hover:text-[#1A1A1A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarAgendamento} className="space-y-4">
              {/* Seletor de Paciente (quando é novo agendamento) */}
              {!leadEditando && (
                <div className="space-y-1">
                  <label
                    htmlFor="select-novo-agendamento-lead"
                    className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]"
                  >
                    Paciente Cadastrado <span className="text-rose-600">*</span>
                  </label>
                  <select
                    id="select-novo-agendamento-lead"
                    required
                    value={formLeadId}
                    onChange={(e) => handleSelecionarLeadNovoAgendamento(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] font-medium focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden cursor-pointer"
                  >
                    <option value="NOVO">➕ Cadastrar Novo Paciente / Lead</option>
                    <option value="">Ou selecione um paciente existente...</option>
                    {leadsDisponiveis.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome} ({l.situacao}) — {l.interesse || 'Sem procedimento informado'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dados Cadastrais Básicos do Paciente na Consulta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 bg-[#F8F7F4] rounded-sm border border-[#D9D6D0]">
                {/* Nome do Paciente */}
                <div className="space-y-1">
                  <label
                    htmlFor="modal-input-nome-paciente"
                    className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]"
                  >
                    Nome do Paciente <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="modal-input-nome-paciente"
                    type="text"
                    required
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    placeholder="Ex: Maria Clara Silva"
                    className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] font-bold focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                  />
                </div>

                {/* Telefone / WhatsApp */}
                <div className="space-y-1">
                  <label
                    htmlFor="modal-input-telefone-paciente"
                    className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]"
                  >
                    Telefone / WhatsApp
                  </label>
                  <input
                    id="modal-input-telefone-paciente"
                    type="text"
                    value={formTelefone}
                    onChange={(e) => setFormTelefone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] font-medium focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Data do Agendamento */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="modal-input-data-agendamento"
                      className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]"
                    >
                      Data da Consulta <span className="text-rose-600">*</span>
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setFormDataAgendamento(hojeStr)}
                        className="text-[10px] text-[#5C3A22] hover:underline font-bold uppercase cursor-pointer"
                      >
                        Hoje
                      </button>
                      <span className="text-[10px] text-[#D9D6D0]">|</span>
                      <button
                        type="button"
                        onClick={() => setFormDataAgendamento(amanhaStr)}
                        className="text-[10px] text-[#5C3A22] hover:underline font-bold uppercase cursor-pointer"
                      >
                        Amanhã
                      </button>
                    </div>
                  </div>
                  <input
                    id="modal-input-data-agendamento"
                    type="date"
                    required
                    value={formDataAgendamento}
                    onChange={(e) => setFormDataAgendamento(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] font-semibold focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                  />
                </div>

                {/* Horário do Agendamento */}
                <div className="space-y-1">
                  <label
                    htmlFor="modal-input-horario-agendamento"
                    className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]"
                  >
                    Horário da Consulta <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="modal-input-horario-agendamento"
                    type="text"
                    required
                    value={formHorarioAgendamento}
                    onChange={(e) => setFormHorarioAgendamento(e.target.value)}
                    placeholder="Ex: 14:00, 15:30..."
                    className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] font-semibold focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden font-mono"
                  />
                </div>

                {/* Profissional / Especialista */}
                <div className="space-y-1">
                  <label
                    htmlFor="modal-select-profissional"
                    className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]"
                  >
                    Profissional / Especialista
                  </label>
                  <select
                    id="modal-select-profissional"
                    value={formProfissional}
                    onChange={(e) => setFormProfissional(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] font-medium focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden cursor-pointer"
                  >
                    {usuarios && usuarios.length > 0
                      ? usuarios
                          .filter((u) => !u.deleted_at && u.ativo !== false)
                          .map((u) => (
                            <option key={u.id} value={u.nome}>
                              {u.nome} {u.cargo ? `— ${u.cargo}` : ''}
                            </option>
                          ))
                      : SEED_USUARIOS.map((u) => (
                          <option key={u.id} value={u.nome}>
                            {u.nome} {u.cargo ? `— ${u.cargo}` : ''}
                          </option>
                        ))}
                  </select>
                </div>

                {/* Unidade / Consultório */}
                <div className="space-y-1">
                  <label
                    htmlFor="modal-input-unidade"
                    className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]"
                  >
                    Unidade / Consultório
                  </label>
                  <input
                    id="modal-input-unidade"
                    type="text"
                    value={formUnidade}
                    onChange={(e) => setFormUnidade(e.target.value)}
                    placeholder="Ex: Consultório 1, Sala Jardins..."
                    className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] font-medium focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Tipo de Consulta / Procedimento */}
                <div className="space-y-1">
                  <label
                    htmlFor="modal-input-tipo-consulta"
                    className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]"
                  >
                    Tipo de Consulta / Procedimento
                  </label>
                  <input
                    id="modal-input-tipo-consulta"
                    type="text"
                    value={formTipoConsulta}
                    onChange={(e) => setFormTipoConsulta(e.target.value)}
                    placeholder="Ex: Avaliação Facial, Botox, Preenchimento..."
                    className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] font-medium focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                  />
                </div>

                {/* Possível Valor / Valor Estimado */}
                <div className="space-y-1">
                  <label
                    htmlFor="modal-input-possivel-valor"
                    className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]"
                  >
                    Possível Valor da Consulta / Procedimento (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8F887E]">
                      R$
                    </span>
                    <input
                      id="modal-input-possivel-valor"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formPossivelValor}
                      onChange={(e) => setFormPossivelValor(e.target.value)}
                      placeholder="0,00"
                      className="w-full h-9 pl-9 pr-3 text-xs rounded-sm border border-[#D9D6D0] bg-white font-bold text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Status de Confirmação */}
                <div className="space-y-1">
                  <label
                    htmlFor="modal-select-status-confirmacao"
                    className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]"
                  >
                    Status da Confirmação
                  </label>
                  <select
                    id="modal-select-status-confirmacao"
                    value={formStatusConfirmacao}
                    onChange={(e) =>
                      setFormStatusConfirmacao(e.target.value as StatusConfirmacaoAgendamento)
                    }
                    className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white font-bold text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden cursor-pointer"
                  >
                    {TODOS_STATUS_CONFIRMACAO_AGENDAMENTO.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Lembrete 24h Enviado */}
                <div className="space-y-1 flex flex-col justify-end">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A] mb-1">
                    Lembrete de 24h Antes
                  </label>
                  <label
                    id="modal-toggle-lembrete-24h"
                    className="flex items-center justify-between h-9 px-3 rounded-sm border border-[#D9D6D0] bg-white cursor-pointer select-none"
                  >
                    <span className="text-xs font-semibold text-[#1A1A1A]">
                      {formLembrete24hEnviado ? '✓ Mensagem 24h Enviada' : '⏰ Mensagem Pendente'}
                    </span>
                    <input
                      type="checkbox"
                      checked={formLembrete24hEnviado}
                      onChange={(e) => setFormLembrete24hEnviado(e.target.checked)}
                      className="w-4 h-4 rounded-xs text-[#5C3A22] focus:ring-[#5C3A22] cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Orientações Prévias ao Paciente */}
              <div className="space-y-1">
                <label
                  htmlFor="modal-textarea-orientacoes"
                  className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]"
                >
                  Orientações Prévias ao Paciente (serão incluídas no Lembrete de 24h)
                </label>
                <textarea
                  id="modal-textarea-orientacoes"
                  rows={2}
                  value={formObservacoes}
                  onChange={(e) => setFormObservacoes(e.target.value)}
                  placeholder="Ex: Chegar 15 minutos antes, vir sem maquiagem facial ou protetor solar..."
                  className="w-full p-2.5 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                />
              </div>

              {/* Botões do Modal */}
              <div className="flex items-center justify-between pt-3 border-t border-[#D9D6D0]">
                {leadEditando ? (
                  <button
                    type="button"
                    onClick={() => {
                      const l = leadEditando;
                      setLeadEditando(null);
                      setModalNovoAgendamento(false);
                      setLeadExcluindo(l);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-sm hover:bg-rose-100 font-bold text-xs uppercase cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-700" />
                    <span>Excluir Agendamento</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLeadEditando(null);
                      setModalNovoAgendamento(false);
                    }}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#6E6E6E] hover:text-[#1A1A1A] bg-white border border-[#D9D6D0] rounded-sm hover:bg-[#F2EFEA] cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    id="btn-confirmar-salvar-agendamento-modal"
                    type="submit"
                    style={{ backgroundColor: corPrimaria }}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-white font-bold text-xs uppercase tracking-wider rounded-sm shadow-xs hover:brightness-110 cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-white" />
                    <span>Salvar Agendamento</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL DE CONFIRMAÇÃO DE EXCLUSÃO / CANCELAMENTO
         ========================================================================= */}
      {leadExcluindo && (
        <div
          id="modal-excluir-agendamento-backdrop"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-sm border border-[#D9D6D0] max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center gap-3 text-rose-700 border-b border-[#D9D6D0] pb-3">
              <AlertTriangle className="w-6 h-6 shrink-0 text-rose-600" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A1A1A]">
                  Exclusão / Remoção de Agendamento
                </h3>
                <p className="text-[11px] text-[#6E6E6E]">
                  Escolha se deseja apenas desmarcar a consulta ou excluir o cadastro do Supabase.
                </p>
              </div>
            </div>

            <p className="text-xs text-[#525252]">
              Paciente selecionado: <strong className="text-[#1A1A1A] font-bold">{leadExcluindo.nome}</strong>
            </p>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleRemoverApenasAgendamento}
                className="w-full text-left p-3 rounded-sm border border-[#D9D6D0] bg-[#F8F7F4] hover:bg-[#EAE7E1] transition-colors cursor-pointer group"
              >
                <div className="text-xs font-bold text-[#1A1A1A] group-hover:text-[#5C3A22]">
                  1. Apenas Desagendar / Cancelar Consulta
                </div>
                <div className="text-[11px] text-[#6E6E6E]">
                  Remove a data/horário da consulta, mas mantém o paciente ativo no CRM.
                </div>
              </button>

              <button
                type="button"
                onClick={handleConfirmarExcluirDefinitivo}
                className="w-full text-left p-3 rounded-sm border border-rose-300 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer group"
              >
                <div className="text-xs font-bold text-rose-800">
                  2. Excluir Paciente Definitivamente do Banco de Dados
                </div>
                <div className="text-[11px] text-rose-600">
                  Apaga o paciente, fichas e consultas do Supabase (Soft Delete).
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#D9D6D0]">
              <button
                type="button"
                onClick={() => setLeadExcluindo(null)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#6E6E6E] hover:text-[#1A1A1A] bg-white border border-[#D9D6D0] rounded-sm hover:bg-[#F2EFEA] cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
