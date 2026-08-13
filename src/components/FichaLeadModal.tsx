import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  User,
  Phone,
  Calendar,
  CalendarClock,
  MapPin,
  FileText,
  DollarSign,
  ShoppingBag,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Save,
  Tag,
  Trash2,
  Sparkles,
  Edit3,
  Check,
  Clock,
  Send,
  MessageCircle,
  TrendingDown,
  Info,
  ChevronRight,
  Layers,
  Maximize2,
  Minimize2,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { useEmpresa } from '../context/EmpresaContext';
import { useAuth } from '../context/AuthContext';
import { supabaseService } from '../services/supabaseService';
import {
  Lead,
  FichaLead,
  Compra,
  SituacaoLead,
  TODAS_SITUACOES,
  StatusVenda,
  TODOS_STATUS_VENDA,
  OrigemLead,
  TODAS_ORIGENS,
  ProcedimentoClinica,
  StatusConfirmacaoAgendamento,
  TODOS_STATUS_CONFIRMACAO_AGENDAMENTO,
} from '../types';
import { SEED_USUARIOS } from '../data/seedData';
import { formatarMoeda, formatarDataBR, obterDataHoje } from '../utils/formatters';
import {
  obterProximaEtapa,
  avancarProximaEtapa,
  reiniciarCadencia,
  verificarSeTodasEtapasConcluidas,
  ETAPAS_CONCLUIDAS_LABEL,
} from '../utils/cadencia';

interface FichaLeadModalProps {
  leadId?: string | null;
  isOpen?: boolean;
  onClose?: () => void;
}

// Sugestões de motivos de perda para agilizar
const MOTIVOS_PERDA_SUGERIDOS = [
  'Preço alto / sem orçamento',
  'Fechou com concorrente',
  'Desistiu do procedimento',
  'Sem resposta / sumiu',
  'Falta de horários disponíveis',
  'Problemas de saúde / contraindicação',
  'Outro motivo',
];

// Sugestões de procedimentos comuns
const PROCEDIMENTOS_SUGERIDOS = [
  'Toxina Botulínica (Botox)',
  'Preenchimento Labial',
  'Preenchimento Malar / Mandíbula',
  'Bioestimulador de Colágeno (Radiesse/Sculptra)',
  'Fios de Sustentação (PDO)',
  'Harmonização Facial Completa',
  'Limpeza de Pele Profunda',
  'Peeling Químico',
  'Laser Lavieen',
  'Microagulhamento com Drug Delivery',
];

export const FichaLeadModal: React.FC<FichaLeadModalProps> = ({
  leadId: propLeadId,
  isOpen: propIsOpen,
  onClose: propOnClose,
}) => {
  const {
    leadFichaAbertoId,
    isFichaLeadOpen,
    fecharFichaLead,
    obterLeadPorId,
    obterFichaPorLead,
    obterComprasPorLead,
    atualizarLead,
    excluirLead,
    atualizarFichaLead,
    definirEtapaPorSituacao,
    lancarCompra,
    removerCompra,
    responsaveis,
    procedimentos,
    obterProcedimentoPorNomeOuInteresse,
  } = useCrm();

  const { config } = useEmpresa();
  const { usuarios } = useAuth();

  // Colaboradores cadastrados ativos pelo Gestor
  const colaboradoresAtivos = useMemo(() => {
    if (usuarios && usuarios.length > 0) {
      return usuarios.filter((u) => !u.deleted_at && u.ativo !== false);
    }
    return [];
  }, [usuarios]);

  const listaNomesResponsaveis = useMemo(() => {
    if (colaboradoresAtivos.length > 0) {
      return colaboradoresAtivos.map((u) => u.nome);
    }
    return SEED_USUARIOS.map((u) => u.nome);
  }, [colaboradoresAtivos]);

  const corPrimaria = config.estetica?.corPrimaria || '#5C3A22';
  const corSecundaria = config.estetica?.corSecundaria || '#8A6142';
  const corSidebar = config.estetica?.corSidebar || '#1A1A1A';
  const corFundoDestaque = config.estetica?.corFundoDestaque || '#F2EFEA';
  const corBorda = config.estetica?.corBorda || '#D9D6D0';

  // Suporte a controle via Props OU via Contexto Global
  const activeLeadId = propLeadId !== undefined ? propLeadId : leadFichaAbertoId;
  const isModalOpen = propIsOpen !== undefined ? propIsOpen : isFichaLeadOpen;
  const handleClose = propOnClose || fecharFichaLead;

  // Aba ativa: 'dados' (Ficha & Dados) ou 'compras' (Histórico de Compras)
  const [activeTab, setActiveTab] = useState<'dados' | 'compras'>('dados');

  // Modo de visualização expandida (tela cheia)
  const [isMaximized, setIsMaximized] = useState(false);

  // Modo de exclusão de lead com confirmação segura
  const [showModalExcluirLead, setShowModalExcluirLead] = useState(false);
  const [isExcluindo, setIsExcluindo] = useState(false);

  // Modo de edição rápida dos dados básicos do lead (leitura vs edição)
  const [isEditingDadosBasicos, setIsEditingDadosBasicos] = useState(false);
  const [isCustomInteresse, setIsCustomInteresse] = useState(false);

  // Feedbacks visuais temporários
  const [feedbackSalvo, setFeedbackSalvo] = useState<string | null>(null);

  // Estados locais dos Dados Básicos do Lead
  const [nome, setNome] = useState('');
  const [situacao, setSituacao] = useState<SituacaoLead>('Em captação');
  const [etapa, setEtapa] = useState('');
  const [interesse, setInteresse] = useState('');
  const [possivelValor, setPossivelValor] = useState<number | string>(0);
  const [statusVenda, setStatusVenda] = useState<StatusVenda>('Em processo');
  const [dataEntrada, setDataEntrada] = useState('');
  const [responsavel, setResponsavel] = useState('');

  // Estados locais do Formulário da FichaLead (dados complementares)
  const [telefone, setTelefone] = useState('');
  const [origemLead, setOrigemLead] = useState<OrigemLead>('WhatsApp');
  const [dataNascimento, setDataNascimento] = useState('');
  const [endereco, setEndereco] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Estados locais para Consulta Agendada e Lembrete 24h
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [horarioAgendamento, setHorarioAgendamento] = useState('14:00');
  const [profissionalAgendamento, setProfissionalAgendamento] = useState('');
  const [tipoConsulta, setTipoConsulta] = useState('Avaliação de Harmonização Facial');
  const [unidadeAgendamento, setUnidadeAgendamento] = useState('Consultório Principal');
  const [observacoesAgendamento, setObservacoesAgendamento] = useState(
    'Chegar 15 minutos antes. Vir sem maquiagem facial ou protetor solar com cor.'
  );
  const [statusConfirmacaoAgendamento, setStatusConfirmacaoAgendamento] =
    useState<StatusConfirmacaoAgendamento>('Agendada');
  const [lembrete24hEnviado, setLembrete24hEnviado] = useState(false);
  const [dataEnvioLembrete24h, setDataEnvioLembrete24h] = useState('');
  const [mensagemLembrete24hEnviadaPor, setMensagemLembrete24hEnviadaPor] = useState('');
  const [showBlocoAgendamento, setShowBlocoAgendamento] = useState(false);

  // Estados locais de Perda (quando statusVenda === 'Perdido')
  const [motivoPerda, setMotivoPerda] = useState('');
  const [dataPerda, setDataPerda] = useState('');

  // Estados do Mini-Formulário de Nova Compra
  const [showFormNovaCompra, setShowFormNovaCompra] = useState(false);
  const [compraProcedimento, setCompraProcedimento] = useState('');
  const [compraValor, setCompraValor] = useState('');
  const [compraData, setCompraData] = useState(obterDataHoje());

  // Procedimentos cadastrados ativos no catálogo da clínica
  const procedimentosAtivos = useMemo(() => {
    return (procedimentos || []).filter((p) => !p.deleted_at && p.ativo);
  }, [procedimentos]);

  // Agrupamento de procedimentos cadastrados por categoria
  const categoriasProcedimentos = useMemo<Record<string, ProcedimentoClinica[]>>(() => {
    const mapa: Record<string, ProcedimentoClinica[]> = {};
    for (const p of procedimentosAtivos) {
      const cat = p.categoria || 'Procedimentos Gerais';
      if (!mapa[cat]) mapa[cat] = [];
      mapa[cat].push(p);
    }
    return mapa;
  }, [procedimentosAtivos]);

  // Dados do lead atual a partir do contexto
  const lead = activeLeadId ? obterLeadPorId(activeLeadId) : undefined;
  const ficha = activeLeadId ? obterFichaPorLead(activeLeadId) : undefined;
  const compras = useMemo(() => {
    return activeLeadId ? obterComprasPorLead(activeLeadId) : [];
  }, [activeLeadId, obterComprasPorLead]);

  // Procedimento associado ao lead (para exibir dados de tabela, pagamento e duração)
  const procAssociado = useMemo(() => {
    const termo = isEditingDadosBasicos ? interesse : (lead?.interesse || '');
    if (!termo) return undefined;
    return obterProcedimentoPorNomeOuInteresse(termo);
  }, [isEditingDadosBasicos, interesse, lead?.interesse, obterProcedimentoPorNomeOuInteresse]);

  // Total somado das compras concluídas
  const totalComprado = useMemo(() => {
    return compras.reduce((acc, curr) => acc + (curr.valor || 0), 0);
  }, [compras]);

  // Sincronizar estado local apenas quando o modal é aberto ou o lead ativo é alternado
  useEffect(() => {
    if (!isModalOpen || !activeLeadId) return;

    const currentLead = obterLeadPorId(activeLeadId);
    const currentFicha = obterFichaPorLead(activeLeadId);

    if (currentLead) {
      setNome(currentLead.nome || '');
      setSituacao(currentLead.situacao || 'Em captação');
      const etapaAtual = currentLead.etapaPorSituacao?.[currentLead.situacao] || '';
      setEtapa(etapaAtual);
      setInteresse(currentLead.interesse || '');
      setPossivelValor(currentLead.possivelValor || 0);
      setStatusVenda(currentLead.statusVenda || 'Em processo');
      setDataEntrada(currentLead.dataEntrada || obterDataHoje());
      const especialistaCadastrado =
        colaboradoresAtivos.find((u) => u.role === 'MEDICO')?.nome ||
        colaboradoresAtivos[0]?.nome ||
        SEED_USUARIOS.find((u) => u.role === 'MEDICO')?.nome ||
        SEED_USUARIOS[0]?.nome ||
        '';

      setResponsavel(
        currentLead.responsavel || (colaboradoresAtivos[0]?.nome || SEED_USUARIOS[0]?.nome || 'Gestão / Coordenação Geral')
      );

      // Sincronizar dados do Agendamento e Lembrete 24h
      setDataAgendamento(currentLead.dataAgendamento || '');
      setHorarioAgendamento(currentLead.horarioAgendamento || '14:00');
      setProfissionalAgendamento(
        currentLead.profissionalAgendamento ||
          (currentLead.responsavel && colaboradoresAtivos.some((c) => c.nome === currentLead.responsavel)
            ? currentLead.responsavel
            : especialistaCadastrado)
      );
      setTipoConsulta(
        currentLead.tipoConsulta || currentLead.interesse || 'Avaliação de Harmonização Facial'
      );
      setUnidadeAgendamento(currentLead.unidadeAgendamento || 'Consultório Principal');
      setObservacoesAgendamento(
        currentLead.observacoesAgendamento ||
          'Chegar 15 minutos antes. Vir sem maquiagem facial ou protetor solar com cor.'
      );
      setStatusConfirmacaoAgendamento(currentLead.statusConfirmacaoAgendamento || 'Agendada');
      setLembrete24hEnviado(Boolean(currentLead.lembrete24hEnviado));
      setDataEnvioLembrete24h(currentLead.dataEnvioLembrete24h || '');
      setMensagemLembrete24hEnviadaPor(currentLead.mensagemLembrete24hEnviadaPor || '');

      const isConsultaAgendada =
        currentLead.situacao === 'Consulta agendada' ||
        currentLead.situacao === 'Procedimento agendado' ||
        Boolean(currentLead.dataAgendamento);
      setShowBlocoAgendamento(isConsultaAgendada);

      setIsEditingDadosBasicos(false);
    }

    if (currentFicha) {
      setTelefone(currentFicha.telefone || '');
      setOrigemLead(currentFicha.origemLead || 'WhatsApp');
      setDataNascimento(currentFicha.dataNascimento || '');
      setEndereco(currentFicha.endereco || '');
      setObservacoes(currentFicha.observacoes || '');
      setMotivoPerda(currentFicha.motivoPerda || '');
      setDataPerda(currentFicha.dataPerda || '');
    } else if (currentLead) {
      setTelefone('');
      setOrigemLead('WhatsApp');
      setDataNascimento('');
      setEndereco('');
      setObservacoes('');
      setMotivoPerda('');
      setDataPerda('');

      // Buscar ficha diretamente do Supabase caso ainda não esteja no estado local
      supabaseService.fetchFichaByLeadId(currentLead).then((f) => {
        if (f) {
          setTelefone(f.telefone || '');
          setOrigemLead(f.origemLead || 'WhatsApp');
          setDataNascimento(f.dataNascimento || '');
          setEndereco(f.endereco || '');
          setObservacoes(f.observacoes || '');
          setMotivoPerda(f.motivoPerda || '');
          setDataPerda(f.dataPerda || '');
        }
      });
    }
  }, [activeLeadId, isModalOpen]);

  // Cálculo da idade se a data de nascimento estiver preenchida
  const idadeCalculada = useMemo(() => {
    if (!dataNascimento) return null;
    const nasc = new Date(dataNascimento);
    if (isNaN(nasc.getTime())) return null;
    const hoje = new Date();
    let anos = hoje.getFullYear() - nasc.getFullYear();
    const mes = hoje.getMonth() - nasc.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nasc.getDate())) {
      anos--;
    }
    return anos >= 0 ? `${anos} anos` : null;
  }, [dataNascimento]);

  // Ao trocar de situação dentro da edição, busca a etapa correspondente à situação
  const handleSituacaoChange = (novaSituacao: SituacaoLead) => {
    setSituacao(novaSituacao);
    if (novaSituacao === 'Consulta agendada' || novaSituacao === 'Procedimento agendado') {
      setShowBlocoAgendamento(true);
      if (!dataAgendamento) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        setDataAgendamento(d.toISOString().split('T')[0]);
      }
    }
    if (lead) {
      const etapaDaNovaSituacao = lead.etapaPorSituacao?.[novaSituacao] || '';
      setEtapa(etapaDaNovaSituacao);
    } else {
      setEtapa('');
    }
  };

  // Disparar feedback visual
  const dispararFeedback = (msg: string) => {
    setFeedbackSalvo(msg);
    setTimeout(() => {
      setFeedbackSalvo(null);
    }, 2800);
  };

  // Salvar apenas os dados básicos do lead
  const handleSalvarDadosBasicos = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeLeadId || !nome.trim()) return;

    await atualizarLead(activeLeadId, {
      nome: nome.trim(),
      situacao,
      interesse: interesse.trim(),
      possivelValor: Number(possivelValor) || 0,
      statusVenda,
      dataEntrada,
      responsavel,
      dataAgendamento: dataAgendamento || undefined,
      horarioAgendamento: horarioAgendamento || undefined,
      profissionalAgendamento: profissionalAgendamento || undefined,
      tipoConsulta: tipoConsulta || undefined,
      unidadeAgendamento: unidadeAgendamento || undefined,
      observacoesAgendamento: observacoesAgendamento || undefined,
      statusConfirmacaoAgendamento,
      lembrete24hEnviado,
      dataEnvioLembrete24h: dataEnvioLembrete24h || undefined,
      mensagemLembrete24hEnviadaPor: mensagemLembrete24hEnviadaPor || undefined,
    });

    const isSemEtapa =
      situacao === 'Consulta agendada' || situacao === 'Procedimento agendado';
    if (!isSemEtapa) {
      definirEtapaPorSituacao(activeLeadId, situacao, etapa.trim());
    }

    // Se mudou para Perdido e já tiver campos preenchidos, sincroniza
    if (statusVenda === 'Perdido') {
      await atualizarFichaLead(activeLeadId, {
        motivoPerda: motivoPerda.trim(),
        dataPerda: dataPerda || obterDataHoje(),
      });
    }

    setIsEditingDadosBasicos(false);
    dispararFeedback('Dados básicos e agendamento atualizados com sucesso!');
  };

  // Salvar a Ficha completa (dados complementares, agendamento e observações)
  const handleSalvarFichaCompleta = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeLeadId || !nome.trim()) return;

    // 1. Atualizar Lead
    await atualizarLead(activeLeadId, {
      nome: nome.trim(),
      situacao,
      interesse: interesse.trim(),
      possivelValor: Number(possivelValor) || 0,
      statusVenda,
      dataEntrada,
      responsavel,
      dataAgendamento: dataAgendamento || undefined,
      horarioAgendamento: horarioAgendamento || undefined,
      profissionalAgendamento: profissionalAgendamento || undefined,
      tipoConsulta: tipoConsulta || undefined,
      unidadeAgendamento: unidadeAgendamento || undefined,
      observacoesAgendamento: observacoesAgendamento || undefined,
      statusConfirmacaoAgendamento,
      lembrete24hEnviado,
      dataEnvioLembrete24h: dataEnvioLembrete24h || undefined,
      mensagemLembrete24hEnviadaPor: mensagemLembrete24hEnviadaPor || undefined,
    });

    // 2. Atualizar Etapa
    const isSemEtapa =
      situacao === 'Consulta agendada' || situacao === 'Procedimento agendado';
    if (!isSemEtapa) {
      definirEtapaPorSituacao(activeLeadId, situacao, etapa.trim());
    }

    // 3. Atualizar FichaLead
    await atualizarFichaLead(activeLeadId, {
      telefone: telefone.trim(),
      origemLead,
      dataNascimento,
      endereco: endereco.trim(),
      observacoes: observacoes.trim(),
      motivoPerda: statusVenda === 'Perdido' ? motivoPerda.trim() : '',
      dataPerda: statusVenda === 'Perdido' ? dataPerda || obterDataHoje() : '',
    });

    setIsEditingDadosBasicos(false);
    dispararFeedback('Ficha completa e agendamento salvos com sucesso!');
  };

  // Helper para gerar mensagem do WhatsApp para o Lembrete 24h
  const gerarTextoLembrete24h = () => {
    const nomePaciente = (nome || lead?.nome || 'Paciente').trim();
    const clinicaNome = config.nomeEmpresa || 'Dra. Agda Rodrigues';
    const tipo = tipoConsulta || interesse || 'sua avaliação de Harmonização Facial';
    const profissional = profissionalAgendamento || responsavel || 'nossa especialista';
    const dataFmt = formatarDataBR(dataAgendamento || obterDataHoje());
    const horario = horarioAgendamento || '14:00';
    const unidade = unidadeAgendamento || 'nossa clínica';
    const obs = observacoesAgendamento
      ? `\n\n📌 *Orientações importantes:* ${observacoesAgendamento}`
      : '';

    return (
      `Olá, *${nomePaciente}*! Tudo bem?\n\n` +
      `Aqui é da equipe da *${clinicaNome}*.\n\n` +
      `Passando para confirmar sua consulta de *${tipo}* com *${profissional}*, agendada para *${dataFmt}* às *${horario}* na unidade *${unidade}*.` +
      obs +
      `\n\nPodemos confirmar sua presença? Por favor, responda com *1 para CONFIRMAR* ou nos avise caso precise remarcar o horário.\n\nAguardamos você! ✨`
    );
  };

  // Disparar WhatsApp 24h diretamente
  const handleDispararWhatsApp24hModal = async () => {
    if (!activeLeadId) return;
    const telNumeros = telefone.replace(/\D/g, '');
    const textoMsg = gerarTextoLembrete24h();

    if (telNumeros) {
      window.open(`https://wa.me/55${telNumeros}?text=${encodeURIComponent(textoMsg)}`, '_blank');
    }

    const agora = new Date().toLocaleString('pt-BR');
    setLembrete24hEnviado(true);
    setDataEnvioLembrete24h(agora);
    setMensagemLembrete24hEnviadaPor(responsavel || 'Secretária');

    await atualizarLead(activeLeadId, {
      lembrete24hEnviado: true,
      dataEnvioLembrete24h: agora,
      mensagemLembrete24hEnviadaPor: responsavel || 'Secretária',
    });

    dispararFeedback('Lembrete 24h enviado via WhatsApp e registrado na ficha!');
  };

  // Marcar Lembrete 24h como enviado manualmente
  const handleMarcarLembrete24hEnviadoModal = async () => {
    if (!activeLeadId) return;
    const agora = new Date().toLocaleString('pt-BR');
    setLembrete24hEnviado(true);
    setDataEnvioLembrete24h(agora);
    setMensagemLembrete24hEnviadaPor(responsavel || 'Secretária');

    await atualizarLead(activeLeadId, {
      lembrete24hEnviado: true,
      dataEnvioLembrete24h: agora,
      mensagemLembrete24hEnviadaPor: responsavel || 'Secretária',
    });

    dispararFeedback('Lembrete de 24h marcado como enviado com sucesso!');
  };

  // Lançar nova compra no mini-formulário
  const handleConfirmarCompra = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLeadId || !compraProcedimento.trim()) return;

    const valorNum = parseFloat(compraValor.toString().replace(',', '.')) || 0;

    lancarCompra({
      leadId: activeLeadId,
      procedimento: compraProcedimento.trim(),
      valor: valorNum,
      data: compraData || obterDataHoje(),
    });

    // Se não estava como Venda Feita, atualiza no formulário
    if (statusVenda !== 'Venda feita') {
      setStatusVenda('Venda feita');
    }

    setCompraProcedimento('');
    setCompraValor('');
    setCompraData(obterDataHoje());
    setShowFormNovaCompra(false);
    dispararFeedback('Compra lançada com sucesso!');
  };

  // Excluir paciente / lead definitivamente com confirmação
  const handleConfirmarExclusaoLead = async () => {
    if (!activeLeadId) return;
    setIsExcluindo(true);
    try {
      await excluirLead(activeLeadId, true);
      setShowModalExcluirLead(false);
      handleClose();
    } catch (err) {
      console.error('Erro ao excluir paciente:', err);
    } finally {
      setIsExcluindo(false);
    }
  };

  if (!isModalOpen || !activeLeadId || !lead) return null;

  const isPerdido = statusVenda === 'Perdido';
  const isVendaFeita = statusVenda === 'Venda feita';
  const isSemEtapa =
    situacao === 'Consulta agendada' || situacao === 'Procedimento agendado';
  const etapaArmazenada = lead.etapaPorSituacao?.[situacao] || etapa;
  const proximaEtapaCalculada = isSemEtapa ? '-' : obterProximaEtapa(situacao, etapaArmazenada);
  const todasConcluidas = isSemEtapa ? false : verificarSeTodasEtapasConcluidas(situacao, etapaArmazenada);

  const handleConcluirProximaEtapa = async () => {
    if (!activeLeadId || isSemEtapa) return;
    const res = avancarProximaEtapa(situacao, etapaArmazenada);
    setEtapa(res.proximaEtapa);
    await definirEtapaPorSituacao(activeLeadId, situacao, res.proximaEtapa);
    if (res.todasConcluidas) {
      dispararFeedback('Todas as etapas da cadência foram concluídas!');
    } else {
      dispararFeedback(`Etapa concluída! Próximo passo: ${res.proximaEtapa}`);
    }
  };

  const handleReiniciarCadencia = async () => {
    if (!activeLeadId || isSemEtapa) return;
    const primeira = reiniciarCadencia(situacao);
    setEtapa(primeira);
    await definirEtapaPorSituacao(activeLeadId, situacao, primeira);
    dispararFeedback('Cadência reiniciada a partir do primeiro contato.');
  };

  // Obter iniciais do paciente para o avatar
  const iniciaisPaciente = (nome || lead.nome || 'P')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  return (
    <div
      id="ficha-lead-modal-backdrop"
      className="fixed inset-0 z-50 bg-[#1A1A1A]/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
    >
      <div
        id="ficha-lead-modal-container"
        className={`bg-white rounded-sm shadow-2xl border border-[#D9D6D0] w-full flex flex-col overflow-hidden transition-all duration-200 animate-in fade-in zoom-in-95 ${
          isMaximized
            ? 'max-w-[98vw] h-[96vh] max-h-[96vh]'
            : 'max-w-4xl max-h-[92vh]'
        }`}
      >
        {/* =========================================================================
            HEADER DA FICHA DO PACIENTE (Design elegante, luxuoso e alinhado com o CRM)
           ========================================================================= */}
        <div
          id="ficha-lead-header"
          className="px-5 sm:px-6 py-4 flex items-center justify-between shrink-0 border-b border-black/20 text-white transition-colors"
          style={{ backgroundColor: isPerdido ? '#2A1418' : corSidebar }}
        >
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div
              className="w-11 h-11 rounded-sm flex items-center justify-center font-bold text-sm tracking-wider shadow-xs text-white shrink-0 border-b-2"
              style={{
                backgroundColor: isPerdido ? '#881337' : corPrimaria,
                borderBottomColor: corSecundaria,
              }}
            >
              {iniciaisPaciente || <User className="w-5 h-5 text-white" />}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="ficha-lead-nome-titulo"
                  className="text-base sm:text-lg font-bold tracking-tight text-white uppercase truncate max-w-xs sm:max-w-md"
                >
                  {nome || lead.nome || 'Ficha do Paciente'}
                </h2>

                {/* Tag de Status da Venda */}
                <span
                  id="badge-status-venda-header"
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-sm uppercase tracking-wider border ${
                    isVendaFeita
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                      : isPerdido
                      ? 'bg-rose-950/80 text-rose-300 border-rose-500/40 flex items-center gap-1'
                      : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {isPerdido && <AlertTriangle className="w-3 h-3 text-rose-300" />}
                  {statusVenda}
                </span>

                {/* Situação no Funil */}
                <span
                  id="badge-situacao-header"
                  className="hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-sm bg-white/10 text-[#F2EFEA] border border-white/15 uppercase tracking-wider"
                >
                  {situacao}
                </span>
              </div>

              <p className="text-xs text-[#D9D6D0] truncate mt-0.5">
                Responsável: <strong className="text-white">{responsavel}</strong> • Entrada:{' '}
                {formatarDataBR(dataEntrada)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {feedbackSalvo && (
              <span
                id="feedback-toast-ficha"
                className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/90 px-3 py-1 rounded-sm border border-emerald-500/40 animate-in fade-in"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {feedbackSalvo}
              </span>
            )}

            {/* Botão Excluir Paciente */}
            <button
              id="btn-excluir-lead-header"
              type="button"
              onClick={() => setShowModalExcluirLead(true)}
              className="p-1.5 rounded-sm text-rose-300/80 hover:text-white hover:bg-rose-900/60 transition-colors focus:outline-hidden cursor-pointer"
              aria-label="Excluir paciente"
              title="Excluir paciente definitivamente"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Botão de Maximizar / Restaurar Ficha */}
            <button
              id="btn-toggle-maximizar-ficha"
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 rounded-sm text-[#8F887E] hover:text-white hover:bg-white/10 transition-colors focus:outline-hidden cursor-pointer"
              aria-label={isMaximized ? 'Restaurar tamanho padrão' : 'Expandir ficha'}
              title={isMaximized ? 'Restaurar tamanho padrão' : 'Expandir ficha (tela cheia)'}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              id="btn-fechar-ficha-modal"
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-sm text-[#8F887E] hover:text-white hover:bg-white/10 transition-colors focus:outline-hidden cursor-pointer"
              aria-label="Fechar ficha"
              title="Fechar ficha do paciente"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            ABAS DE NAVEGAÇÃO INTERNA
           ========================================================================= */}
        <div className="px-5 sm:px-6 border-b border-[#D9D6D0] bg-[#F8F7F4] flex items-center justify-between shrink-0">
          <div className="flex gap-2 sm:gap-6">
            <button
              id="tab-ficha-dados"
              type="button"
              onClick={() => setActiveTab('dados')}
              style={activeTab === 'dados' ? { borderBottomColor: corPrimaria, color: corPrimaria } : {}}
              className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 uppercase tracking-wider ${
                activeTab === 'dados'
                  ? 'text-[#1A1A1A]'
                  : 'border-transparent text-[#6E6E6E] hover:text-[#1A1A1A]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Ficha & Dados do Paciente</span>
              {isPerdido && (
                <span className="w-2 h-2 rounded-full bg-rose-500" title="Paciente Perdido" />
              )}
            </button>

            <button
              id="tab-ficha-compras"
              type="button"
              onClick={() => setActiveTab('compras')}
              style={activeTab === 'compras' ? { borderBottomColor: corPrimaria, color: corPrimaria } : {}}
              className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 uppercase tracking-wider ${
                activeTab === 'compras'
                  ? 'text-[#1A1A1A]'
                  : 'border-transparent text-[#6E6E6E] hover:text-[#1A1A1A]'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Histórico de Compras</span>
              <span className="px-2 py-0.5 rounded-sm text-[10px] sm:text-[11px] bg-[#E5E2DC] text-[#1A1A1A] font-bold">
                {compras.length}
              </span>
              {totalComprado > 0 && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-sm text-[10px] sm:text-[11px] bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                  {formatarMoeda(totalComprado)}
                </span>
              )}
            </button>
          </div>

          <div className="text-[10px] font-mono text-[#6E6E6E] hidden sm:flex items-center gap-1.5">
            <span className="font-bold uppercase tracking-wider">ID:</span>
            <span className="bg-[#E5E2DC] text-[#1A1A1A] px-2 py-0.5 rounded-sm">
              {lead.id.substring(0, 14)}...
            </span>
          </div>
        </div>

        {/* =========================================================================
            CONTEÚDO SCROLLÁVEL
           ========================================================================= */}
        <div id="ficha-lead-conteudo-scroll" className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-white">
          {activeTab === 'dados' ? (
            <div className="space-y-6">
              {/* -------------------------------------------------------------------
                  AVISO VISUAL DE LEAD PERDIDO (EM DESTAQUE SE statusVenda === 'Perdido')
                 ------------------------------------------------------------------- */}
              {isPerdido && (
                <div
                  id="bloco-aviso-lead-perdido"
                  className="p-4 sm:p-5 rounded-sm bg-rose-50 border-2 border-rose-300 shadow-xs space-y-3 animate-in fade-in duration-200"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-rose-200 pb-3">
                    <div className="flex items-center gap-2 text-rose-950 font-bold text-xs uppercase tracking-wider">
                      <div className="w-7 h-7 rounded-sm bg-rose-700 text-white flex items-center justify-center shadow-xs shrink-0">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="uppercase tracking-wider text-[10px] text-rose-700 font-black block">
                          Atenção • Registro de Perda
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-rose-950">
                          Este paciente está marcado como PERDIDO
                        </h4>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 bg-rose-100 px-2.5 py-1 rounded-sm border border-rose-300">
                      Oportunidade Não Convertida
                    </span>
                  </div>

                  <p className="text-xs text-rose-900 leading-relaxed">
                    Registre o motivo detalhado e a data para alimentar as métricas de conversão e
                    possibilitar futuras campanhas de resgate.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {/* Motivo da Perda */}
                    <div className="sm:col-span-2 space-y-1">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-rose-950">
                        Motivo da Perda <span className="text-rose-600">*</span>
                      </label>
                      <input
                        id="input-motivo-perda"
                        type="text"
                        value={motivoPerda}
                        onChange={(e) => setMotivoPerda(e.target.value)}
                        placeholder="Ex: Preço elevado, fechou com concorrente, sem resposta..."
                        className="w-full h-9 px-3 text-xs rounded-sm border border-rose-300 bg-white text-[#1A1A1A] placeholder:text-rose-300 focus:border-rose-700 focus:ring-1 focus:ring-rose-700 focus:outline-hidden font-medium"
                      />

                      {/* Chips de Motivos Sugeridos */}
                      <div className="flex flex-wrap gap-1 pt-1.5">
                        {MOTIVOS_PERDA_SUGERIDOS.slice(0, 4).map((sugestao) => (
                          <button
                            key={sugestao}
                            type="button"
                            onClick={() => setMotivoPerda(sugestao)}
                            className={`text-[11px] px-2 py-0.5 rounded-sm transition-all cursor-pointer font-medium border ${
                              motivoPerda === sugestao
                                ? 'bg-rose-800 text-white font-bold border-rose-800'
                                : 'bg-white text-rose-900 hover:bg-rose-100 border-rose-200'
                            }`}
                          >
                            {sugestao}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Data da Perda */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-rose-950">
                          Data da Perda
                        </label>
                        <button
                          type="button"
                          onClick={() => setDataPerda(obterDataHoje())}
                          className="text-[10px] text-rose-800 hover:underline font-bold uppercase tracking-wider"
                        >
                          Hoje
                        </button>
                      </div>
                      <input
                        id="input-data-perda"
                        type="date"
                        value={dataPerda || obterDataHoje()}
                        onChange={(e) => setDataPerda(e.target.value)}
                        className="w-full h-9 px-3 text-xs rounded-sm border border-rose-300 bg-white text-[#1A1A1A] focus:border-rose-700 focus:ring-1 focus:ring-rose-700 focus:outline-hidden font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------------
                  SEÇÃO 1: DADOS PRINCIPAIS DO LEAD (MODO LEITURA vs MODO EDIÇÃO RÁPIDA)
                 ------------------------------------------------------------------- */}
              <div
                id="secao-dados-basicos-lead"
                className="bg-white p-4 sm:p-5 rounded-sm border border-[#D9D6D0] shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-[#D9D6D0] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-sm flex items-center justify-center font-bold text-white shadow-xs"
                      style={{ backgroundColor: corPrimaria }}
                    >
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                        Dados Principais do Paciente
                      </h3>
                      <p className="text-[11px] text-[#6E6E6E]">
                        {isEditingDadosBasicos
                          ? 'Edite as informações cadastrais e comerciais abaixo'
                          : 'Visualização rápida do paciente no funil de vendas'}
                      </p>
                    </div>
                  </div>

                  {/* Botão para alternar Modo Leitura <-> Modo Edição Rápida */}
                  {!isEditingDadosBasicos ? (
                    <button
                      id="btn-editar-dados-basicos"
                      type="button"
                      onClick={() => setIsEditingDadosBasicos(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#F2EFEA] hover:bg-[#E5E2DC] text-[#1A1A1A] font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer border border-[#D9D6D0]"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#5C3A22]" />
                      <span>Editar Dados Básicos</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          // Reverte para os dados atuais do lead
                          setNome(lead.nome);
                          setSituacao(lead.situacao);
                          setEtapa(lead.etapaPorSituacao?.[lead.situacao] || '');
                          setInteresse(lead.interesse || '');
                          setPossivelValor(lead.possivelValor || 0);
                          setStatusVenda(lead.statusVenda);
                          setDataEntrada(lead.dataEntrada);
                          setResponsavel(lead.responsavel);
                          setIsEditingDadosBasicos(false);
                          setIsCustomInteresse(false);
                        }}
                        className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#6E6E6E] hover:text-[#1A1A1A] cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        id="btn-salvar-dados-basicos-inline"
                        type="button"
                        onClick={() => handleSalvarDadosBasicos()}
                        style={{ backgroundColor: corPrimaria }}
                        className="inline-flex items-center gap-1 px-3 py-1 text-white font-bold text-xs uppercase tracking-wider rounded-sm shadow-xs transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Salvar</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* MODO LEITURA (Visual Clean e Refinado) */}
                {!isEditingDadosBasicos ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* Nome com destaque oficial da marca */}
                    <div className="col-span-2 sm:col-span-3 lg:col-span-4 p-3.5 rounded-sm bloco-destaque-ar border border-[#D9D6D0] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-[#6E6E6E] uppercase tracking-wider block">
                          Nome do Paciente
                        </span>
                        <span className="text-sm sm:text-base font-bold text-[#1A1A1A]">
                          {lead.nome}
                        </span>
                      </div>
                      <span className="text-xs text-[#6E6E6E] font-medium">
                        Cadastrado em {formatarDataBR(lead.dataEntrada)}
                      </span>
                    </div>

                    {/* Situação */}
                    <div className="p-3 rounded-sm bg-[#F8F7F4] border border-[#D9D6D0] space-y-1">
                      <span className="text-[10px] font-bold text-[#6E6E6E] uppercase tracking-wider block">
                        Situação
                      </span>
                      <span className="inline-block px-2 py-0.5 rounded-sm bg-white text-[#1A1A1A] border border-[#D9D6D0] text-xs font-bold">
                        {lead.situacao}
                      </span>
                    </div>

                    {/* Próxima Etapa */}
                    <div className="p-3 rounded-sm bg-[#F8F7F4] border border-[#D9D6D0] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#6E6E6E] uppercase tracking-wider block">
                          Próxima Etapa
                        </span>
                        {todasConcluidas && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-xs bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                            Concluída
                          </span>
                        )}
                      </div>
                      {isSemEtapa ? (
                        <span className="text-xs text-[#8F887E] block">-</span>
                      ) : (
                        <div className="space-y-1.5">
                          <span
                            className={`text-xs font-semibold block truncate ${
                              todasConcluidas ? 'text-emerald-800' : 'text-[#1A1A1A]'
                            }`}
                          >
                            {proximaEtapaCalculada}
                          </span>
                          {!todasConcluidas ? (
                            <button
                              id="btn-concluir-etapa-leitura"
                              type="button"
                              onClick={handleConcluirProximaEtapa}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer shadow-2xs w-full justify-center"
                              title="Marcar etapa como realizada e calcular automaticamente a próxima etapa"
                            >
                              <Check className="w-3.5 h-3.5 text-white" />
                              <span>Concluído</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleReiniciarCadencia}
                              className="text-[10px] text-[#5C3A22] hover:underline font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1"
                              title="Reiniciar a sequência de etapas desde o primeiro contato"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reiniciar cadência</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Interesse / Procedimento */}
                    <div className="p-3 rounded-sm bg-[#F8F7F4] border border-[#D9D6D0] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#6E6E6E] uppercase tracking-wider block">
                          Interesse / Procedimento
                        </span>
                        {procAssociado && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-xs bg-[#5C3A22]/10 text-[#5C3A22] uppercase tracking-wider">
                            {procAssociado.categoria}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-[#1A1A1A] block">
                        {lead.interesse || <span className="text-[#8F887E] font-normal">-</span>}
                      </span>
                      {procAssociado && (
                        <div className="pt-1.5 border-t border-[#D9D6D0]/60 space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-[#6E6E6E]">
                            <span>Tabela: <strong className="text-[#1A1A1A]">{formatarMoeda(procAssociado.valor)}</strong></span>
                            <span>Efeito: <strong className="text-[#1A1A1A]">{procAssociado.duracaoDias} dias</strong></span>
                          </div>
                          {procAssociado.formatosPagamento && (
                            <div className="text-[10px] text-[#5C3A22] font-medium truncate" title={procAssociado.formatosPagamento}>
                              💳 {procAssociado.formatosPagamento}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Possível Valor */}
                    <div className="p-3 rounded-sm bg-[#F8F7F4] border border-[#D9D6D0] space-y-1">
                      <span className="text-[10px] font-bold text-[#6E6E6E] uppercase tracking-wider block">
                        Possível Valor
                      </span>
                      <span className="text-xs font-bold text-[#1A1A1A] font-mono block">
                        {lead.possivelValor > 0 ? (
                          formatarMoeda(lead.possivelValor)
                        ) : (
                          <span className="text-[#8F887E] font-normal font-sans">R$ 0,00</span>
                        )}
                      </span>
                    </div>

                    {/* Status da Venda */}
                    <div className="p-3 rounded-sm bg-[#F8F7F4] border border-[#D9D6D0] space-y-1">
                      <span className="text-[10px] font-bold text-[#6E6E6E] uppercase tracking-wider block">
                        Status da Venda
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-sm text-xs font-bold ${
                          isVendaFeita
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : isPerdido
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-amber-50 text-amber-900 border border-amber-200'
                        }`}
                      >
                        {lead.statusVenda}
                      </span>
                    </div>

                    {/* Responsável */}
                    <div className="p-3 rounded-sm bg-[#F8F7F4] border border-[#D9D6D0] space-y-1">
                      <span className="text-[10px] font-bold text-[#6E6E6E] uppercase tracking-wider block">
                        Responsável
                      </span>
                      <span className="text-xs font-semibold text-[#1A1A1A] block truncate">
                        {lead.responsavel}
                      </span>
                    </div>

                    {/* Total em Compras Realizadas */}
                    <div className="col-span-2 p-3 rounded-sm bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                          Total Já Comprado
                        </span>
                        <span className="text-sm font-bold text-emerald-950 font-mono">
                          {formatarMoeda(totalComprado)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('compras')}
                        className="text-xs text-emerald-800 hover:text-emerald-950 font-bold uppercase tracking-wider underline cursor-pointer flex items-center gap-1"
                      >
                        <span>Ver compras ({compras.length})</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* MODO EDIÇÃO RÁPIDA (Formulário Inline) */
                  <div className="space-y-4 bg-[#F8F7F4] p-4 rounded-sm border border-[#D9D6D0] animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {/* Nome */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]">
                          Nome Completo <span className="text-rose-600">*</span>
                        </label>
                        <input
                          id="edit-lead-nome"
                          type="text"
                          required
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] font-medium focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                        />
                      </div>

                      {/* Situação */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]">
                          Situação no Funil
                        </label>
                        <select
                          id="edit-lead-situacao"
                          value={situacao}
                          onChange={(e) => handleSituacaoChange(e.target.value as SituacaoLead)}
                          className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white font-semibold text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                        >
                          {TODAS_SITUACOES.map((sit) => (
                            <option key={sit} value={sit}>
                              {sit}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Próxima Etapa da Situação (Calculada Automaticamente com Botão Concluído) */}
                      <div className="space-y-1">
                        <label
                          className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]"
                        >
                          Próxima Etapa ({situacao})
                        </label>
                        {isSemEtapa ? (
                          <div className="w-full h-9 px-3 text-xs flex items-center text-[#8F887E] bg-[#E5E2DC] rounded-sm border border-[#D9D6D0]">
                            Sem acompanhamento
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-9 px-3 text-xs flex items-center justify-between bg-white text-[#1A1A1A] font-semibold rounded-sm border border-[#D9D6D0] shadow-2xs overflow-hidden">
                                <span className="truncate">{proximaEtapaCalculada}</span>
                                {todasConcluidas && (
                                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-xs shrink-0 uppercase">
                                    Finalizada
                                  </span>
                                )}
                              </div>
                              {!todasConcluidas ? (
                                <button
                                  id="btn-concluir-etapa-edicao"
                                  type="button"
                                  onClick={handleConcluirProximaEtapa}
                                  className="h-9 px-3 rounded-sm bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5 shrink-0"
                                  title="Marcar etapa como realizada e avançar automaticamente para a próxima etapa"
                                >
                                  <Check className="w-3.5 h-3.5 text-white" />
                                  <span>Concluído</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleReiniciarCadencia}
                                  className="h-9 px-2.5 rounded-sm bg-[#F2EFEA] hover:bg-[#E5E2DC] text-[#1A1A1A] font-bold text-[11px] uppercase tracking-wider transition-colors cursor-pointer border border-[#D9D6D0] flex items-center gap-1 shrink-0"
                                  title="Reiniciar cadência desde o primeiro contato"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Reiniciar</span>
                                </button>
                              )}
                            </div>
                            <p className="text-[10px] text-[#6E6E6E]">
                              Calculada automaticamente com base na última etapa executada.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-2 border-t border-[#D9D6D0]">
                      {/* Interesse / Procedimento com Menu Suspenso dos Procedimentos Cadastrados */}
                      <div className="space-y-1.5 lg:col-span-2">
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor="edit-lead-interesse"
                            className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]"
                          >
                            Interesse / Procedimento
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsCustomInteresse(!isCustomInteresse)}
                            className="text-[10px] font-bold text-[#5C3A22] hover:underline cursor-pointer flex items-center gap-1"
                          >
                            {isCustomInteresse ? '📋 Escolher da Tabela' : '✏️ Digitar Outro'}
                          </button>
                        </div>

                        {isCustomInteresse ? (
                          <input
                            id="edit-lead-interesse-custom"
                            type="text"
                            value={interesse}
                            onChange={(e) => setInteresse(e.target.value)}
                            placeholder="Digite o procedimento personalizado..."
                            className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                          />
                        ) : (
                          <select
                            id="edit-lead-interesse"
                            value={interesse}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '__custom__') {
                                setIsCustomInteresse(true);
                                return;
                              }
                              setInteresse(val);
                              const proc = procedimentosAtivos.find((p) => p.nome === val);
                              if (proc) {
                                // Sugere automaticamente o valor de tabela se o valor atual estiver zerado ou vazio
                                if (!possivelValor || Number(possivelValor) === 0) {
                                  setPossivelValor(proc.valor);
                                }
                              }
                            }}
                            className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] font-medium focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden cursor-pointer"
                          >
                            <option value="">Selecione um procedimento cadastrado...</option>
                            {/* Preserva valor personalizado existente se houver */}
                            {interesse && !procedimentosAtivos.some((p) => p.nome === interesse) && (
                              <option value={interesse}>{interesse} (Personalizado)</option>
                            )}
                            {Object.keys(categoriasProcedimentos).map((categoria) => {
                              const lista = categoriasProcedimentos[categoria] || [];
                              return (
                                <optgroup key={categoria} label={categoria}>
                                  {lista.map((proc) => (
                                    <option key={proc.id} value={proc.nome}>
                                      {proc.nome} — R$ {proc.valor.toLocaleString('pt-BR')} ({proc.duracaoDias}d)
                                    </option>
                                  ))}
                                </optgroup>
                              );
                            })}
                            <option value="__custom__">➕ Outro procedimento (digitar manualmente)...</option>
                          </select>
                        )}

                        {/* Card com informações do procedimento selecionado */}
                        {procAssociado && (
                          <div className="p-2 rounded-sm bg-[#F2EFEA]/80 border border-[#D9D6D0] text-[11px] text-[#1A1A1A] space-y-1 mt-1">
                            <div className="flex items-center justify-between font-semibold">
                              <span className="flex items-center gap-1 text-[#5C3A22]">
                                <Tag className="w-3 h-3 text-[#5C3A22]" />
                                <span>{procAssociado.nome}</span>
                              </span>
                              <span className="font-mono font-bold text-emerald-800">
                                Tabela: R$ {procAssociado.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-[#6E6E6E] pt-1 border-t border-[#D9D6D0]/60">
                              <div>
                                <span className="font-bold text-[#1A1A1A]">💳 Pagamento: </span>
                                <span>{procAssociado.formatosPagamento || 'A combinar'}</span>
                              </div>
                              <div>
                                <span className="font-bold text-[#1A1A1A]">⏳ Efeito: </span>
                                <span>{procAssociado.duracaoDias} dias</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Possível Valor */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]">
                          Possível Valor (R$)
                        </label>
                        <input
                          id="edit-lead-possivel-valor"
                          type="number"
                          step="0.01"
                          min="0"
                          value={possivelValor}
                          onChange={(e) => setPossivelValor(e.target.value)}
                          className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] font-semibold focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                        />
                      </div>

                      {/* Status da Venda */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]">
                          Status da Venda
                        </label>
                        <select
                          id="edit-lead-status-venda"
                          value={statusVenda}
                          onChange={(e) => setStatusVenda(e.target.value as StatusVenda)}
                          className={`w-full h-9 px-3 text-xs rounded-sm border font-bold focus:outline-hidden ${
                            statusVenda === 'Venda feita'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                              : statusVenda === 'Perdido'
                              ? 'border-rose-300 bg-rose-50 text-rose-800'
                              : 'border-amber-300 bg-amber-50 text-amber-900'
                          }`}
                        >
                          {TODOS_STATUS_VENDA.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Responsável */}
                      <div className="space-y-1">
                        <label
                          htmlFor="edit-lead-responsavel"
                          className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]"
                        >
                          Responsável
                        </label>
                        <select
                          id="edit-lead-responsavel"
                          value={responsavel}
                          onChange={(e) => setResponsavel(e.target.value)}
                          className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] font-medium focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden cursor-pointer"
                        >
                          {responsavel && !listaNomesResponsaveis.includes(responsavel) && (
                            <option value={responsavel}>{responsavel} (Atual)</option>
                          )}
                          {colaboradoresAtivos.length > 0 ? (
                            colaboradoresAtivos.map((colab) => (
                              <option key={colab.id} value={colab.nome}>
                                {colab.nome} {colab.cargo ? `— ${colab.cargo}` : ''}
                              </option>
                            ))
                          ) : (
                            listaNomesResponsaveis.map((resp) => (
                              <option key={resp} value={resp}>
                                {resp}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      {/* Data de Entrada */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]">
                          Data de Entrada
                        </label>
                        <input
                          id="edit-lead-data-entrada"
                          type="date"
                          value={dataEntrada}
                          onChange={(e) => setDataEntrada(e.target.value)}
                          className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* -------------------------------------------------------------------
                  BLOCO DE AGENDAMENTO DA CONSULTA & LEMBRETE 24H
                  (Aberto quando a situação for Consulta agendada ou solicitado)
                 ------------------------------------------------------------------- */}
              <div
                id="bloco-agendamento-consulta"
                className={`p-4 sm:p-5 rounded-sm border shadow-xs space-y-4 transition-all duration-200 ${
                  situacao === 'Consulta agendada' || Boolean(dataAgendamento) || showBlocoAgendamento
                    ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-300'
                    : 'bg-white border-[#D9D6D0]'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#D9D6D0] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-sm flex items-center justify-center font-bold text-white shadow-xs"
                      style={{ backgroundColor: corPrimaria }}
                    >
                      <CalendarClock className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                          Agendamento da Consulta & Lembrete 24h
                        </h3>
                        {dataAgendamento && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border ${
                              statusConfirmacaoAgendamento === 'Confirmada'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : statusConfirmacaoAgendamento === 'Realizada'
                                ? 'bg-[#5C3A22]/10 text-[#5C3A22] border-[#5C3A22]/30'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}
                          >
                            {statusConfirmacaoAgendamento}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#6E6E6E]">
                        Data, horário, especialista, orientações e envio da confirmação de 24h antes
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {dataAgendamento ? (
                      <span className="text-[11px] font-bold text-[#1A1A1A] bg-white px-2.5 py-1 rounded-sm border border-[#D9D6D0] font-mono">
                        📅 {formatarDataBR(dataAgendamento)} às {horarioAgendamento}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + 1);
                          setDataAgendamento(d.toISOString().split('T')[0]);
                          setSituacao('Consulta agendada');
                          setStatusVenda('Agendado');
                          setShowBlocoAgendamento(true);
                        }}
                        className="text-[11px] font-bold text-[#5C3A22] hover:underline uppercase tracking-wider cursor-pointer"
                      >
                        + Definir data de agendamento
                      </button>
                    )}
                  </div>
                </div>

                {/* Campos do Agendamento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {/* Data da Consulta com Atalhos Rápidos */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="input-agendamento-data"
                        className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]"
                      >
                        Data da Consulta <span className="text-rose-600">*</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDataAgendamento(obterDataHoje())}
                          className="text-[10px] text-[#5C3A22] hover:underline font-bold uppercase cursor-pointer"
                        >
                          Hoje
                        </button>
                        <span className="text-[10px] text-[#D9D6D0]">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 1);
                            setDataAgendamento(d.toISOString().split('T')[0]);
                          }}
                          className="text-[10px] text-[#5C3A22] hover:underline font-bold uppercase cursor-pointer"
                        >
                          Amanhã
                        </button>
                        <span className="text-[10px] text-[#D9D6D0]">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 7);
                            setDataAgendamento(d.toISOString().split('T')[0]);
                          }}
                          className="text-[10px] text-[#5C3A22] hover:underline font-bold uppercase cursor-pointer"
                        >
                          +7d
                        </button>
                      </div>
                    </div>
                    <input
                      id="input-agendamento-data"
                      type="date"
                      value={dataAgendamento}
                      onChange={(e) => {
                        setDataAgendamento(e.target.value);
                        if (situacao !== 'Consulta agendada') {
                          setSituacao('Consulta agendada');
                        }
                      }}
                      className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] font-semibold focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                    />
                  </div>

                  {/* Horário da Consulta */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="input-agendamento-horario"
                        className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]"
                      >
                        Horário da Consulta <span className="text-rose-600">*</span>
                      </label>
                      <div className="flex items-center gap-1">
                        {['09:00', '14:00', '16:00'].map((hr) => (
                          <button
                            key={hr}
                            type="button"
                            onClick={() => setHorarioAgendamento(hr)}
                            className="text-[9px] text-[#5C3A22] hover:underline font-bold uppercase cursor-pointer"
                          >
                            {hr}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      id="input-agendamento-horario"
                      type="text"
                      value={horarioAgendamento}
                      onChange={(e) => setHorarioAgendamento(e.target.value)}
                      placeholder="Ex: 14:00, 15:30..."
                      className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] font-semibold font-mono focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                    />
                  </div>

                  {/* Profissional / Especialista */}
                  <div className="space-y-1">
                    <label
                      htmlFor="select-agendamento-profissional"
                      className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]"
                    >
                      Especialista / Médico
                    </label>
                    <select
                      id="select-agendamento-profissional"
                      value={profissionalAgendamento}
                      onChange={(e) => setProfissionalAgendamento(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] font-medium focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden cursor-pointer"
                    >
                      {colaboradoresAtivos.length > 0 ? (
                        colaboradoresAtivos.map((colab) => (
                          <option key={colab.id} value={colab.nome}>
                            {colab.nome} {colab.cargo ? `— ${colab.cargo}` : ''}
                          </option>
                        ))
                      ) : (
                        listaNomesResponsaveis.map((resp) => (
                          <option key={resp} value={resp}>
                            {resp}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Status da Confirmação */}
                  <div className="space-y-1">
                    <label
                      htmlFor="select-agendamento-status-confirmacao"
                      className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]"
                    >
                      Status da Confirmação
                    </label>
                    <select
                      id="select-agendamento-status-confirmacao"
                      value={statusConfirmacaoAgendamento}
                      onChange={(e) =>
                        setStatusConfirmacaoAgendamento(
                          e.target.value as StatusConfirmacaoAgendamento
                        )
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
                  {/* Procedimento / Tipo de Consulta */}
                  <div className="space-y-1">
                    <label
                      htmlFor="input-agendamento-tipo-consulta"
                      className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]"
                    >
                      Procedimento / Tipo de Consulta
                    </label>
                    <input
                      id="input-agendamento-tipo-consulta"
                      type="text"
                      value={tipoConsulta}
                      onChange={(e) => setTipoConsulta(e.target.value)}
                      placeholder="Ex: Avaliação Facial, Botox, Preenchimento..."
                      className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] font-medium focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                    />
                  </div>

                  {/* Unidade / Consultório */}
                  <div className="space-y-1">
                    <label
                      htmlFor="input-agendamento-unidade"
                      className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]"
                    >
                      Unidade / Sala de Atendimento
                    </label>
                    <input
                      id="input-agendamento-unidade"
                      type="text"
                      value={unidadeAgendamento}
                      onChange={(e) => setUnidadeAgendamento(e.target.value)}
                      placeholder="Ex: Consultório Principal, Sala Jardins..."
                      className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] font-medium focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Orientações Prévias ao Paciente */}
                <div className="space-y-1">
                  <label
                    htmlFor="textarea-agendamento-orientacoes"
                    className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]"
                  >
                    Orientações Prévias ao Paciente (serão enviadas no lembrete de 24h)
                  </label>
                  <input
                    id="textarea-agendamento-orientacoes"
                    type="text"
                    value={observacoesAgendamento}
                    onChange={(e) => setObservacoesAgendamento(e.target.value)}
                    placeholder="Ex: Chegar 15 minutos antes. Vir sem maquiagem facial ou protetor solar com cor."
                    className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden placeholder:text-[#8F887E]"
                  />
                </div>

                {/* -------------------------------------------------------------------
                    SUB-BLOCO: ETAPA DO LEMBRETE DE 24 HORAS ANTES (SECRETÁRIA)
                   ------------------------------------------------------------------- */}
                <div
                  id="subbloco-lembrete-24h"
                  className="p-3.5 sm:p-4 rounded-sm bg-white border border-[#D9D6D0] space-y-3"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#D9D6D0] pb-2.5">
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-emerald-700" />
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A] flex items-center gap-2">
                          <span>Etapa: Mensagem de Lembrete 24h Antes</span>
                          {lembrete24hEnviado ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-emerald-100 text-emerald-900 border border-emerald-300">
                              ✓ Enviado
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-amber-100 text-amber-900 border border-amber-300">
                              ⏰ Pendente de Envio
                            </span>
                          )}
                        </h4>
                        <p className="text-[10px] text-[#6E6E6E]">
                          {lembrete24hEnviado && dataEnvioLembrete24h
                            ? `Disparado em ${dataEnvioLembrete24h} por ${mensagemLembrete24hEnviadaPor || 'Secretária'}`
                            : 'A secretária deve enviar a confirmação para a paciente 24 horas antes do horário marcado.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        id="btn-disparar-whatsapp-24h-ficha"
                        type="button"
                        onClick={handleDispararWhatsApp24hModal}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider shadow-xs transition-all cursor-pointer"
                        title="Abrir WhatsApp com o texto pronto do lembrete e marcar como enviado"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-white" />
                        <span>Disparar WhatsApp 24h</span>
                      </button>

                      {!lembrete24hEnviado ? (
                        <button
                          type="button"
                          onClick={handleMarcarLembrete24hEnviadoModal}
                          className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A] bg-[#F2EFEA] hover:bg-[#E5E2DC] border border-[#D9D6D0] rounded-sm transition-colors cursor-pointer"
                        >
                          Marcar como Enviado
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setLembrete24hEnviado(false);
                            setDataEnvioLembrete24h('');
                            if (activeLeadId) {
                              atualizarLead(activeLeadId, {
                                lembrete24hEnviado: false,
                                dataEnvioLembrete24h: '',
                              });
                            }
                            dispararFeedback('Lembrete 24h resetado para pendente.');
                          }}
                          className="text-[10px] text-[#8F887E] hover:text-[#1A1A1A] underline cursor-pointer"
                        >
                          Reenviar / Resetar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pré-visualização da Mensagem Formatada */}
                  <div className="p-3 rounded-sm bg-[#F8F7F4] border border-[#D9D6D0] space-y-1.5">
                    <span className="text-[10px] font-bold text-[#6E6E6E] uppercase tracking-wider block">
                      💬 Modelo da Mensagem Oficial do WhatsApp:
                    </span>
                    <p className="text-xs text-[#1A1A1A] font-mono leading-relaxed whitespace-pre-line bg-white p-2.5 rounded-sm border border-[#D9D6D0]">
                      {gerarTextoLembrete24h()}
                    </p>
                  </div>

                  {/* Ações de Resposta Rápida da Paciente */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] font-bold text-[#6E6E6E] uppercase tracking-wider">
                      Resposta da Paciente:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setStatusConfirmacaoAgendamento('Confirmada');
                          if (activeLeadId) {
                            atualizarLead(activeLeadId, {
                              statusConfirmacaoAgendamento: 'Confirmada',
                            });
                          }
                          dispararFeedback('Presença confirmada pela paciente!');
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-sm bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 transition-colors cursor-pointer"
                      >
                        ✓ Paciente Confirmou
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setStatusConfirmacaoAgendamento('Remarcada');
                          if (activeLeadId) {
                            atualizarLead(activeLeadId, {
                              statusConfirmacaoAgendamento: 'Remarcada',
                            });
                          }
                          dispararFeedback('Status atualizado para Remarcada.');
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-sm bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors cursor-pointer"
                      >
                        🔄 Pediu para Remarcar
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setStatusConfirmacaoAgendamento('Cancelada');
                          if (activeLeadId) {
                            atualizarLead(activeLeadId, {
                              statusConfirmacaoAgendamento: 'Cancelada',
                            });
                          }
                          dispararFeedback('Consulta marcada como cancelada.');
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-sm bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 transition-colors cursor-pointer"
                      >
                        ✕ Cancelou
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* -------------------------------------------------------------------
                  SEÇÃO 2: FORMULÁRIO COM OS CAMPOS DA FICHALEAD (DADOS COMPLEMENTARES)
                 ------------------------------------------------------------------- */}
              <div
                id="secao-formulario-fichalead"
                className="bg-white p-4 sm:p-5 rounded-sm border border-[#D9D6D0] shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-[#D9D6D0] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-sm flex items-center justify-center font-bold text-white shadow-xs"
                      style={{ backgroundColor: corPrimaria }}
                    >
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                        Ficha Complementar do Paciente
                      </h3>
                      <p className="text-[11px] text-[#6E6E6E]">
                        Telefone, origem, data de nascimento, endereço e observações
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {/* Telefone / WhatsApp */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]">
                      Telefone / WhatsApp
                    </label>
                    <div className="relative flex items-center">
                      <Phone className="w-4 h-4 absolute left-3 text-[#8F887E]" />
                      <input
                        id="input-ficha-telefone"
                        type="text"
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                        placeholder="(11) 98765-4321"
                        className="w-full h-9 pl-9 pr-8 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] font-medium focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                      />
                      {telefone.trim() && (
                        <a
                          href={`https://wa.me/55${telefone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute right-2 text-emerald-700 hover:text-emerald-800 p-1"
                          title="Abrir no WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Origem do Lead */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]">
                      Origem do Lead
                    </label>
                    <select
                      id="select-ficha-origem"
                      value={origemLead}
                      onChange={(e) => setOrigemLead(e.target.value as OrigemLead)}
                      className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white font-semibold text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                    >
                      {TODAS_ORIGENS.map((orig) => (
                        <option key={orig} value={orig}>
                          {orig}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Data de Nascimento */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]">
                        Data de Nascimento
                      </label>
                      {idadeCalculada && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F2EFEA] text-[#1A1A1A] px-2 py-0.5 rounded-sm border border-[#D9D6D0]">
                          {idadeCalculada}
                        </span>
                      )}
                    </div>
                    <input
                      id="input-ficha-data-nascimento"
                      type="date"
                      value={dataNascimento}
                      onChange={(e) => setDataNascimento(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden font-medium"
                    />
                  </div>
                </div>

                {/* Endereço */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]">
                      Endereço Completo
                    </label>
                    {endereco && (
                      <button
                        type="button"
                        onClick={() => setEndereco('')}
                        className="text-[10px] font-semibold text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1 cursor-pointer"
                        title="Apagar endereço"
                      >
                        <X className="w-3 h-3" />
                        <span>Apagar</span>
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8F887E]" />
                    <input
                      id="input-ficha-endereco"
                      type="text"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      placeholder="Ex: Av. Paulista, 1000, Apto 52, Bela Vista - São Paulo / SP"
                      className="w-full h-9 pl-9 pr-8 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden font-medium"
                    />
                    {endereco && (
                      <button
                        type="button"
                        onClick={() => setEndereco('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8F887E] hover:text-rose-600 p-0.5 rounded-full cursor-pointer"
                        title="Limpar campo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]">
                      Observações e Histórico Clínico / Comercial
                    </label>
                    {observacoes && (
                      <button
                        type="button"
                        onClick={() => setObservacoes('')}
                        className="text-[10px] font-semibold text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1 cursor-pointer"
                        title="Apagar observações"
                      >
                        <X className="w-3 h-3" />
                        <span>Apagar</span>
                      </button>
                    )}
                  </div>
                  <textarea
                    id="textarea-ficha-observacoes"
                    rows={4}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Histórico de conversas, preferências de horários, contraindicações médicas, queixas estéticas, objetivos do tratamento..."
                    className="w-full p-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden leading-relaxed placeholder:text-[#8F887E]"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* =====================================================================
                SEÇÃO 4: HISTÓRICO DE COMPRAS (TOTAL SOMADO NO TOPO + LANÇAR COMPRA)
               ===================================================================== */
            <div id="secao-historico-compras" className="space-y-5">
              {/* Card Destaque: Total Somado no Topo */}
              <div
                id="card-total-somado-compras"
                className="p-5 rounded-sm text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-black/30"
                style={{ backgroundColor: corSidebar }}
              >
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 text-[#D9D6D0]">
                    <ShoppingBag className="w-4 h-4" style={{ color: corSecundaria }} />
                    Total Somado de Compras Realizadas
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
                    {formatarMoeda(totalComprado)}
                  </h3>
                  <p className="text-xs text-[#D9D6D0]">
                    Soma de {compras.length} procedimento(s) e pacote(s) faturado(s) para este paciente
                  </p>
                </div>

                {!showFormNovaCompra && (
                  <button
                    id="btn-abrir-form-nova-compra"
                    type="button"
                    onClick={() => setShowFormNovaCompra(true)}
                    style={{ backgroundColor: corPrimaria }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-white font-bold text-xs uppercase tracking-wider rounded-sm transition-all shadow-xs hover:brightness-110 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4 text-white" />
                    <span>+ Lançar compra</span>
                  </button>
                )}
              </div>

              {/* Mini-Formulário para Lançar Compra */}
              {showFormNovaCompra && (
                <form
                  id="mini-form-lancar-compra"
                  onSubmit={handleConfirmarCompra}
                  className="p-4 sm:p-5 rounded-sm bg-[#F8F7F4] border border-[#D9D6D0] shadow-xs space-y-4 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between border-b border-[#D9D6D0] pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#5C3A22]" />
                      Lançar Nova Compra / Procedimento
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowFormNovaCompra(false)}
                      className="text-xs font-bold uppercase tracking-wider text-[#6E6E6E] hover:text-[#1A1A1A] cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Data */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]">
                        Data da Compra <span className="text-rose-600">*</span>
                      </label>
                      <input
                        id="compra-input-data"
                        type="date"
                        required
                        value={compraData}
                        onChange={(e) => setCompraData(e.target.value)}
                        className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden font-medium"
                      />
                    </div>

                    {/* Procedimento */}
                    <div className="sm:col-span-2 space-y-1">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]">
                        Procedimento / Tratamento <span className="text-rose-600">*</span>
                      </label>
                      <select
                        id="compra-input-procedimento"
                        required
                        value={compraProcedimento}
                        onChange={(e) => {
                          const nomeSel = e.target.value;
                          setCompraProcedimento(nomeSel);
                          const proc = procedimentosAtivos.find((p) => p.nome === nomeSel);
                          if (proc) {
                            setCompraValor(proc.valor.toString());
                          }
                        }}
                        className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] font-medium focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                      >
                        <option value="">Selecione o procedimento cadastrado...</option>
                        {compraProcedimento && !procedimentosAtivos.some((p) => p.nome === compraProcedimento) && (
                          <option value={compraProcedimento}>{compraProcedimento} (Personalizado)</option>
                        )}
                        {Object.keys(categoriasProcedimentos).map((categoria) => {
                          const lista = categoriasProcedimentos[categoria] || [];
                          return (
                            <optgroup key={categoria} label={categoria}>
                              {lista.map((proc) => (
                                <option key={proc.id} value={proc.nome}>
                                  {proc.nome} — R$ {proc.valor.toLocaleString('pt-BR')}
                                </option>
                              ))}
                            </optgroup>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Sugestões de procedimentos rápidos do catálogo */}
                  {procedimentosAtivos.length > 0 && (
                    <div>
                      <span className="text-[11px] font-semibold text-[#6E6E6E] block mb-1">
                        Procedimentos cadastrados (clique para preencher valor):
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {procedimentosAtivos.slice(0, 8).map((proc) => (
                          <button
                            key={proc.id}
                            type="button"
                            onClick={() => {
                              setCompraProcedimento(proc.nome);
                              setCompraValor(proc.valor.toString());
                            }}
                            style={compraProcedimento === proc.nome ? { backgroundColor: corPrimaria } : {}}
                            className={`text-[11px] px-2 py-0.5 rounded-sm transition-all cursor-pointer flex items-center gap-1 ${
                              compraProcedimento === proc.nome
                                ? 'text-white font-bold'
                                : 'bg-white text-[#1A1A1A] hover:bg-[#F2EFEA] border border-[#D9D6D0]'
                            }`}
                          >
                            <span>{proc.nome}</span>
                            <span className="text-[10px] opacity-75 font-mono">
                              R$ {proc.valor.toLocaleString('pt-BR')}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#D9D6D0]">
                    {/* Valor */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]">
                        Valor Pago (R$) <span className="text-rose-600">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8F887E]">
                          R$
                        </span>
                        <input
                          id="compra-input-valor"
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={compraValor}
                          onChange={(e) => setCompraValor(e.target.value)}
                          placeholder="0,00"
                          className="w-full h-9 pl-9 pr-3 text-xs rounded-sm border border-[#D9D6D0] bg-white font-bold text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                        />
                      </div>
                    </div>

                    {/* Botões de Ação do Mini-Form */}
                    <div className="flex items-end justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowFormNovaCompra(false)}
                        className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#6E6E6E] hover:text-[#1A1A1A] bg-white border border-[#D9D6D0] rounded-sm hover:bg-[#F2EFEA] transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        id="btn-confirmar-lancamento-compra"
                        type="submit"
                        style={{ backgroundColor: corPrimaria }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-white font-bold text-xs uppercase tracking-wider rounded-sm shadow-xs transition-colors cursor-pointer"
                      >
                        <Check className="w-4 h-4 text-white" />
                        Confirmar Lançamento
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Lista das Compras Lançadas */}
              <div
                id="tabela-lista-compras-lead"
                className="border border-[#D9D6D0] rounded-sm overflow-hidden bg-white shadow-xs"
              >
                <div
                  className="px-4 py-2.5 text-white flex items-center justify-between font-bold uppercase tracking-wider text-[11px]"
                  style={{ backgroundColor: corSidebar }}
                >
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="w-3.5 h-3.5" style={{ color: corSecundaria }} />
                    Lista de Compras e Procedimentos Realizados
                  </span>
                  <span className="text-[10px] text-[#D9D6D0]">
                    {compras.length} registro(s)
                  </span>
                </div>

                {compras.length === 0 ? (
                  <div className="text-center py-12 px-4 text-[#8F887E] space-y-3">
                    <div className="w-12 h-12 rounded-sm bg-[#F8F7F4] border border-[#D9D6D0] flex items-center justify-center mx-auto text-[#8F887E]">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    <div className="max-w-xs mx-auto space-y-1">
                      <p className="text-xs font-bold text-[#1A1A1A]">
                        Nenhuma compra registrada para este paciente ainda.
                      </p>
                      <p className="text-[11px] text-[#6E6E6E]">
                        Clique no botão "+ Lançar compra" acima para registrar um procedimento e
                        atualizar o histórico financeiro.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-[#D9D6D0]">
                    {compras.map((c) => (
                      <div
                        key={c.id}
                        id={`item-compra-${c.id}`}
                        className="p-4 flex items-center justify-between hover:bg-[#F8F7F4] transition-colors gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-[#1A1A1A] truncate">
                            {c.procedimento}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-[#6E6E6E]">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#8F887E]" />
                              Data: {formatarDataBR(c.data)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs sm:text-sm font-bold text-[#1A1A1A] font-mono bg-[#F2EFEA] px-3 py-1 rounded-sm border border-[#D9D6D0]">
                            {formatarMoeda(c.valor)}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Deseja remover o registro de "${c.procedimento}"?`)) {
                                removerCompra(c.id);
                                dispararFeedback('Registro de compra removido.');
                              }
                            }}
                            className="p-1.5 rounded-sm text-[#8F887E] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remover este registro de compra"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            FOOTER DA FICHA (AÇÕES PRINCIPAIS)
           ========================================================================= */}
        <div
          id="ficha-lead-footer"
          className="px-5 sm:px-6 py-4 bg-[#F8F7F4] border-t border-[#D9D6D0] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0"
        >
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="btn-fechar-ficha-footer"
              type="button"
              onClick={handleClose}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#1A1A1A] bg-white border border-[#D9D6D0] rounded-sm hover:bg-[#E5E2DC] transition-colors cursor-pointer"
            >
              Fechar Ficha
            </button>

            <button
              id="btn-excluir-ficha-footer"
              type="button"
              onClick={() => setShowModalExcluirLead(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-700 border border-rose-200 hover:border-rose-700 rounded-sm transition-all cursor-pointer shadow-2xs"
              title="Excluir este paciente definitivamente"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Paciente</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              id="btn-salvar-toda-ficha"
              type="button"
              onClick={() => handleSalvarFichaCompleta()}
              style={{ backgroundColor: corPrimaria }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-white font-bold text-xs sm:text-sm uppercase tracking-wider rounded-sm shadow-xs hover:brightness-110 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4 text-white" />
              <span>Salvar Toda a Ficha</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DO PACIENTE (Design Refinado e Seguro)
         ========================================================================= */}
      {showModalExcluirLead && (
        <div
          id="modal-confirmar-exclusao-backdrop"
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            id="modal-confirmar-exclusao-card"
            className="bg-white rounded-sm border border-rose-300 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center gap-3 text-rose-900 border-b border-rose-100 pb-3">
              <div className="w-10 h-10 rounded-sm bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-rose-900">
                  Confirmar Exclusão de Paciente
                </h3>
                <p className="text-xs text-rose-700 font-medium">Esta ação é irreversível</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-[#1A1A1A] leading-relaxed bg-[#F8F7F4] p-3.5 rounded-sm border border-[#D9D6D0]">
              <p className="text-[#6E6E6E]">
                Você tem certeza que deseja excluir o cadastro de:
              </p>
              <p className="text-sm font-bold text-[#1A1A1A] bg-white px-3 py-2 rounded-sm border border-[#D9D6D0]">
                {nome || lead.nome}
              </p>
              <p className="text-[11px] text-[#6E6E6E] leading-normal pt-1">
                Ao confirmar, o paciente será removido permanentemente de todas as etapas do funil, assim como sua ficha cadastral, anotações e histórico de compras.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isExcluindo}
                onClick={() => setShowModalExcluirLead(false)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#6E6E6E] hover:bg-[#F2EFEA] rounded-sm transition-colors cursor-pointer"
              >
                Cancelar / Manter
              </button>

              <button
                type="button"
                disabled={isExcluindo}
                onClick={handleConfirmarExclusaoLead}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-rose-700 hover:bg-rose-800 rounded-sm transition-colors cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isExcluindo ? 'Excluindo...' : 'Sim, Excluir Paciente'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
