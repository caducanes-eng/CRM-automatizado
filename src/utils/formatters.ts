/**
 * Utilitários de formatação para moeda e datas no padrão brasileiro
 */

export function formatarMoeda(valor: number | undefined | null): string {
  const num = Number(valor) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatarDataBR(dataIso: string | undefined | null): string {
  if (!dataIso) return '-';
  // Aceita YYYY-MM-DD ou ISO string completo
  const apenasData = dataIso.split('T')[0];
  const partes = apenasData.split('-');
  if (partes.length !== 3) return dataIso;
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

export function obterDataHoje(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatarDataHoraAgora(): string {
  return new Date().toLocaleString('pt-BR');
}
