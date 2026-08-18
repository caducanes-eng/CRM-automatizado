import { SituacaoLead } from '../types';

/**
 * Definições das Cadências Oficiais por Situação
 */

// Cadência de 5 contatos para: Em captação, Pós consulta e Reativação
export const CADENCIA_PADRAO_5_CONTATOS = [
  'Contato 1 (dia 1)',
  'Contato 2 (dia 3)',
  'Contato 3 (dia 5)',
  'Contato 4 (dia 9)',
  'Contato 5 (dia 17)',
] as const;

// Cadência de 4 contatos para: Pós procedimento
export const CADENCIA_POS_PROCEDIMENTO_4_CONTATOS = [
  'Contato 1 (dia 1)',
  'Contato 2 (dia 7)',
  'Contato 3 (dia 15)',
  'Contato 4 - Confirmação do retorno (dia 29)',
] as const;

// Cadência de 3 contatos para: Nutrição
export const CADENCIA_NUTRICAO_3_CONTATOS = [
  'Fluxo de conteúdo 1 (Cuidados)',
  'Fluxo de conteúdo 2 (Novidades)',
  'Convite para evento / Botox Day',
] as const;

export const ETAPAS_CONCLUIDAS_LABEL = 'Todas as etapas concluídas';

export type StatusCadencia = 'Atrasado' | 'Em dia' | 'Adiantado' | 'Sem etapa selecionada';

export interface ItemCadenciaConfig {
  etapa: string;
  minDias: number;
}

export const REGRAS_CADENCIA_PADRAO: ItemCadenciaConfig[] = [
  { etapa: 'Contato 1 (dia 1)', minDias: 1 },
  { etapa: 'Contato 2 (dia 3)', minDias: 3 },
  { etapa: 'Contato 3 (dia 5)', minDias: 5 },
  { etapa: 'Contato 4 (dia 9)', minDias: 9 },
  { etapa: 'Contato 5 (dia 17)', minDias: 17 },
];

export const REGRAS_CADENCIA_POS_PROCEDIMENTO: ItemCadenciaConfig[] = [
  { etapa: 'Contato 1 (dia 1)', minDias: 1 },
  { etapa: 'Contato 2 (dia 7)', minDias: 7 },
  { etapa: 'Contato 3 (dia 15)', minDias: 15 },
  { etapa: 'Contato 4 - Confirmação do retorno (dia 29)', minDias: 29 },
];

/**
 * Retorna a lista de etapas de cadência para a situação fornecida
 */
export function obterOpcoesCadenciaPorSituacao(situacao: SituacaoLead): string[] {
  if (situacao === 'Pós procedimento') {
    return [...CADENCIA_POS_PROCEDIMENTO_4_CONTATOS];
  }
  if (
    situacao === 'Em captação' ||
    situacao === 'Pós consulta' ||
    situacao === 'Reativação'
  ) {
    return [...CADENCIA_PADRAO_5_CONTATOS];
  }
  if (situacao === 'Nutrição') {
    return [...CADENCIA_NUTRICAO_3_CONTATOS];
  }
  return [];
}

/**
 * Normaliza o nome da etapa para casamento flexível caso o lead possua valores legados
 */
export function normalizarEtapa(etapa: string): string {
  return etapa.trim().toLowerCase();
}

/**
 * Verifica se todas as etapas foram concluídas para o lead
 */
export function verificarSeTodasEtapasConcluidas(
  situacao: SituacaoLead,
  etapaArmazenada?: string | null
): boolean {
  if (!etapaArmazenada) return false;
  const etapaTrim = etapaArmazenada.trim();
  if (etapaTrim === ETAPAS_CONCLUIDAS_LABEL || etapaTrim.toLowerCase().includes('concluída')) {
    return true;
  }
  return false;
}

/**
 * Retorna a "Próxima Etapa" a ser executada pelo usuário com base na última executada
 * Se nada foi executado ainda, a próxima é o primeiro contato da cadência.
 */
export function obterProximaEtapa(
  situacao: SituacaoLead,
  etapaArmazenada?: string | null
): string {
  const opcoes = obterOpcoesCadenciaPorSituacao(situacao);
  if (opcoes.length === 0) {
    return '-';
  }

  if (!etapaArmazenada || etapaArmazenada.trim() === '') {
    return opcoes[0];
  }

  const etapaTrim = etapaArmazenada.trim();
  if (etapaTrim === ETAPAS_CONCLUIDAS_LABEL || etapaTrim.toLowerCase().includes('concluída')) {
    return ETAPAS_CONCLUIDAS_LABEL;
  }

  // Se a etapa armazenada já é uma das etapas oficiais, ela é a próxima etapa a ser cumprida
  const index = opcoes.indexOf(etapaTrim);
  if (index !== -1) {
    return opcoes[index];
  }

  // Fallback com normalização
  const norm = normalizarEtapa(etapaTrim);
  const match = opcoes.find((op) => normalizarEtapa(op) === norm);
  if (match) return match;

  return etapaTrim;
}

/**
 * Avança para a próxima etapa na cadência quando o usuário clica em "Concluído"
 */
export function avancarProximaEtapa(
  situacao: SituacaoLead,
  etapaArmazenada?: string | null
): {
  proximaEtapa: string;
  todasConcluidas: boolean;
  etapaConcluida: string;
} {
  const opcoes = obterOpcoesCadenciaPorSituacao(situacao);
  if (opcoes.length === 0) {
    return {
      proximaEtapa: '',
      todasConcluidas: true,
      etapaConcluida: '-',
    };
  }

  // Se já estava com todas concluídas
  if (verificarSeTodasEtapasConcluidas(situacao, etapaArmazenada)) {
    return {
      proximaEtapa: ETAPAS_CONCLUIDAS_LABEL,
      todasConcluidas: true,
      etapaConcluida: ETAPAS_CONCLUIDAS_LABEL,
    };
  }

  const etapaAtual = etapaArmazenada?.trim() || opcoes[0];
  let indexAtual = opcoes.indexOf(etapaAtual);

  if (indexAtual === -1) {
    const norm = normalizarEtapa(etapaAtual);
    indexAtual = opcoes.findIndex((op) => normalizarEtapa(op) === norm);
  }

  if (indexAtual === -1) {
    indexAtual = 0;
  }

  const etapaConcluida = opcoes[indexAtual] || etapaAtual;
  const proximoIndex = indexAtual + 1;

  if (proximoIndex < opcoes.length) {
    return {
      proximaEtapa: opcoes[proximoIndex],
      todasConcluidas: false,
      etapaConcluida,
    };
  } else {
    return {
      proximaEtapa: ETAPAS_CONCLUIDAS_LABEL,
      todasConcluidas: true,
      etapaConcluida,
    };
  }
}

/**
 * Reinicia a sequência de cadência para o primeiro contato
 */
export function reiniciarCadencia(situacao: SituacaoLead): string {
  const opcoes = obterOpcoesCadenciaPorSituacao(situacao);
  return opcoes[0] || '';
}

/**
 * Calcula os dias corridos entre uma data de entrada (YYYY-MM-DD) e a data de hoje.
 * Fórmula: hoje - data de entrada
 */
export function calcularDiasCorridos(dataEntradaIso: string | undefined | null): number {
  if (!dataEntradaIso) return 0;

  try {
    const partesEntrada = dataEntradaIso.split('T')[0].split('-');
    if (partesEntrada.length !== 3) return 0;

    const ano = parseInt(partesEntrada[0], 10);
    const mes = parseInt(partesEntrada[1], 10) - 1;
    const dia = parseInt(partesEntrada[2], 10);

    const dataEntradaUTC = Date.UTC(ano, mes, dia);

    const hoje = new Date();
    const hojeUTC = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

    const diffMs = hojeUTC - dataEntradaUTC;
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDias);
  } catch {
    return 0;
  }
}

/**
 * Calcula a "Etapa esperada" com base na situação do lead e nos dias corridos.
 * A etapa esperada é sempre a mais avançada cujo número de dias já foi atingido.
 */
export function calcularEtapaEsperada(situacao: SituacaoLead, diasCorridos: number): string {
  if (situacao === 'Pós procedimento') {
    if (diasCorridos >= 29) return 'Contato 4 - Confirmação do retorno (dia 29)';
    if (diasCorridos >= 15) return 'Contato 3 (dia 15)';
    if (diasCorridos >= 7) return 'Contato 2 (dia 7)';
    return 'Contato 1 (dia 1)';
  }

  if (situacao === 'Nutrição') {
    if (diasCorridos >= 30) return 'Convite para evento / Botox Day';
    if (diasCorridos >= 15) return 'Fluxo de conteúdo 2 (Novidades)';
    return 'Fluxo de conteúdo 1 (Cuidados)';
  }

  // "Em captação", "Pós consulta", "Reativação" (e padrão)
  if (diasCorridos >= 17) return 'Contato 5 (dia 17)';
  if (diasCorridos >= 9) return 'Contato 4 (dia 9)';
  if (diasCorridos >= 5) return 'Contato 3 (dia 5)';
  if (diasCorridos >= 3) return 'Contato 2 (dia 3)';
  return 'Contato 1 (dia 1)';
}

/**
 * Compara a posição da Próxima Etapa do lead com a Etapa Esperada (calculada pelos dias corridos).
 * - se todas as etapas foram concluídas → Status = "Em dia"
 * - se a próxima etapa está ATRÁS da etapa esperada (índice menor) → Status = "Atrasado" (Em atraso)
 * - se a próxima etapa é IGUAL à etapa esperada → Status = "Em dia"
 * - se a próxima etapa está À FRENTE da etapa esperada (índice maior) → Status = "Adiantado"
 */
export function calcularStatusCadencia(
  situacao: SituacaoLead,
  etapaOuProximaEtapa: string | undefined | null,
  etapaEsperada: string
): StatusCadencia {
  if (verificarSeTodasEtapasConcluidas(situacao, etapaOuProximaEtapa)) {
    return 'Em dia';
  }

  const opcoes = obterOpcoesCadenciaPorSituacao(situacao);
  if (opcoes.length === 0) {
    return 'Em dia';
  }

  // Obter a etapa efetiva/próxima etapa a ser realizada pelo lead
  const proximaEtapa = obterProximaEtapa(situacao, etapaOuProximaEtapa);
  if (proximaEtapa === ETAPAS_CONCLUIDAS_LABEL || proximaEtapa.toLowerCase().includes('concluída')) {
    return 'Em dia';
  }

  // Busca pelo índice da próxima etapa na régua da cadência
  let indexAtual = opcoes.indexOf(proximaEtapa);
  if (indexAtual === -1) {
    const norm = normalizarEtapa(proximaEtapa);
    indexAtual = opcoes.findIndex((op) => {
      const opNorm = normalizarEtapa(op);
      return (
        norm === opNorm ||
        (norm.includes('contato 1') && opNorm.includes('contato 1')) ||
        (norm.includes('contato 2') && opNorm.includes('contato 2')) ||
        (norm.includes('contato 3') && opNorm.includes('contato 3')) ||
        (norm.includes('contato 4') && opNorm.includes('contato 4')) ||
        (norm.includes('contato 5') && opNorm.includes('contato 5'))
      );
    });
  }

  if (indexAtual === -1) {
    indexAtual = 0; // Padrão se não encontrado: primeiro contato
  }

  // Busca pelo índice da etapa esperada de acordo com os dias corridos
  let indexEsperado = opcoes.indexOf(etapaEsperada);
  if (indexEsperado === -1) {
    const normEsp = normalizarEtapa(etapaEsperada);
    indexEsperado = opcoes.findIndex((op) => {
      const opNorm = normalizarEtapa(op);
      return (
        normEsp === opNorm ||
        (normEsp.includes('contato 1') && opNorm.includes('contato 1')) ||
        (normEsp.includes('contato 2') && opNorm.includes('contato 2')) ||
        (normEsp.includes('contato 3') && opNorm.includes('contato 3')) ||
        (normEsp.includes('contato 4') && opNorm.includes('contato 4')) ||
        (normEsp.includes('contato 5') && opNorm.includes('contato 5'))
      );
    });
  }

  if (indexEsperado === -1) {
    indexEsperado = 0;
  }

  // Comparação estrita entre Próxima Etapa e Etapa Esperada
  if (indexAtual < indexEsperado) {
    return 'Atrasado';
  }

  if (indexAtual === indexEsperado) {
    return 'Em dia';
  }

  return 'Adiantado';
}

/**
 * Verifica se a paciente deve ser contatada no dia de hoje.
 * - Leads atrasados ou sem etapa selecionada
 * - Leads em dia que atingiram exatamente a data prevista de um marco de contato da cadência
 */
export function verificarSeDeveContatarHoje(
  situacao: SituacaoLead,
  diasCorridos: number,
  statusCadencia: StatusCadencia,
  etapaAtual?: string | null
): boolean {
  if (verificarSeTodasEtapasConcluidas(situacao, etapaAtual)) {
    return false;
  }

  // 1. Se o lead está atrasado, precisa de contato urgente hoje
  if (statusCadencia === 'Atrasado') {
    return true;
  }

  // 2. Se o lead está adiantado (já avançou contatos à frente), não exige novo contato hoje
  if (statusCadencia === 'Adiantado') {
    return false;
  }

  // 3. Se o lead está em dia, verifica se a data de hoje coincide com um dos marcos oficiais da cadência
  if (situacao === 'Pós procedimento') {
    const diasContato = [0, 1, 7, 15, 29];
    return diasContato.includes(diasCorridos);
  }

  if (
    situacao === 'Em captação' ||
    situacao === 'Pós consulta' ||
    situacao === 'Reativação'
  ) {
    const diasContatoPadrao = [0, 1, 3, 5, 9, 17];
    return diasContatoPadrao.includes(diasCorridos);
  }

  // Demais situações gerais (ex: acabou de entrar)
  return diasCorridos === 0 || diasCorridos === 1;
}
