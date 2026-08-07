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
  return [];
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

  // "Em captação", "Pós consulta", "Reativação" (e padrão)
  if (diasCorridos >= 17) return 'Contato 5 (dia 17)';
  if (diasCorridos >= 9) return 'Contato 4 (dia 9)';
  if (diasCorridos >= 5) return 'Contato 3 (dia 5)';
  if (diasCorridos >= 3) return 'Contato 2 (dia 3)';
  return 'Contato 1 (dia 1)';
}

/**
 * Normaliza o nome da etapa para casamento flexível caso o lead possua valores legados
 */
function normalizarEtapa(etapa: string): string {
  return etapa.trim().toLowerCase();
}

/**
 * Compara a posição da Etapa atual com a Etapa esperada na sequência da cadência
 * - se a etapa atual ainda não foi selecionada → Status = "Sem etapa selecionada" (destaque amarelo)
 * - se a atual está ATRÁS da esperada → Status = "Atrasado" (destaque vermelho)
 * - se está igual → Status = "Em dia" (destaque verde)
 * - se está à frente → Status = "Adiantado" (destaque azul/celeste)
 */
export function calcularStatusCadencia(
  situacao: SituacaoLead,
  etapaAtual: string | undefined | null,
  etapaEsperada: string
): StatusCadencia {
  if (!etapaAtual || etapaAtual.trim() === '') {
    return 'Sem etapa selecionada';
  }

  const opcoes = obterOpcoesCadenciaPorSituacao(situacao);
  if (opcoes.length === 0) {
    return 'Sem etapa selecionada';
  }

  const etapaAtualTrim = etapaAtual.trim();

  // Busca exata pelo índice
  let indexAtual = opcoes.indexOf(etapaAtualTrim);

  // Fallback caso venha com pequenas variações de texto (ex: "Contato 1" antigo)
  if (indexAtual === -1) {
    const norm = normalizarEtapa(etapaAtualTrim);
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
    return 'Sem etapa selecionada';
  }

  const indexEsperado = opcoes.indexOf(etapaEsperada);
  if (indexEsperado === -1) {
    return 'Em dia';
  }

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
  // 1. Se o lead está atrasado ou sem nenhuma etapa selecionada, precisa de contato urgente hoje
  if (statusCadencia === 'Atrasado' || statusCadencia === 'Sem etapa selecionada') {
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
