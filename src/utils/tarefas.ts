import { StatusTarefa, PrioridadeTarefa } from '../types';

/**
 * Vocabulário único de tarefa: o mesmo do banco (public.tarefas): status PENDENTE/CONCLUIDA/CANCELADA
 * e prioridade BAIXA/MEDIA/ALTA/URGENTE, sempre em maiúsculas.
 * Valores antigos vindos do Firestore ou do cache local ('pendente', 'normal', 'media'...) são
 * convertidos nestas funções, que ficam nas bordas (leitura de banco, espelho e cache).
 */
export function normalizarStatusTarefa(valor: unknown): StatusTarefa {
  const v = String(valor ?? '').trim().toUpperCase();
  if (v === 'CONCLUIDA' || v === 'CONCLUÍDA') return 'CONCLUIDA';
  if (v === 'CANCELADA') return 'CANCELADA';
  return 'PENDENTE';
}

export function normalizarPrioridadeTarefa(valor: unknown): PrioridadeTarefa {
  const v = String(valor ?? '').trim().toUpperCase();
  if (v === 'BAIXA') return 'BAIXA';
  if (v === 'ALTA') return 'ALTA';
  if (v === 'URGENTE') return 'URGENTE';
  return 'MEDIA'; // inclui 'NORMAL', 'MEDIA', 'MÉDIA' e vazio
}
