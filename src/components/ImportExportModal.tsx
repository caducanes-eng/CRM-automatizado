import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
  Copy,
  Check,
  RefreshCw,
  HelpCircle,
  ChevronRight,
  Database,
  Users,
  Sparkles,
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { useEmpresa } from '../context/EmpresaContext';
import {
  Lead,
  FichaLead,
  SituacaoLead,
  StatusVenda,
  OrigemLead,
  TODAS_SITUACOES,
  TODOS_STATUS_VENDA,
  TODAS_ORIGENS,
  ImportarLeadItem,
  ResultadoImportacao,
} from '../types';
import { formatarMoeda, formatarDataBR, obterDataHoje } from '../utils/formatters';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadsFiltrados?: Lead[];
}

type TabMode = 'exportar' | 'importar' | 'modelo';

// Cabeçalhos padrão e modelo
const CABECALHOS_MODELO = [
  'Nome',
  'Telefone',
  'Interesse / Procedimento',
  'Possivel Valor (R$)',
  'Situacao',
  'Status da Venda',
  'Responsavel',
  'Origem',
  'Data de Entrada',
  'Observacoes',
];

const EXEMPLOS_MODELO: Array<Record<string, string>> = [
  {
    Nome: 'Mariana Souza Alves',
    Telefone: '(11) 98765-4321',
    'Interesse / Procedimento': 'Toxina Botulínica',
    'Possivel Valor (R$)': '1200',
    Situacao: 'Consulta agendada',
    'Status da Venda': 'Em processo',
    Responsavel: 'Secretária 1',
    Origem: 'Instagram',
    'Data de Entrada': obterDataHoje(),
    Observacoes: 'Tem interesse em aplicação na testa e pés de galinha. Prefere atendimento à tarde.',
  },
  {
    Nome: 'Camila Rodrigues Mendes',
    Telefone: '(11) 97123-8899',
    'Interesse / Procedimento': 'Preenchimento Labial',
    'Possivel Valor (R$)': '1600',
    Situacao: 'Pós procedimento',
    'Status da Venda': 'Venda feita',
    Responsavel: 'Secretária 2',
    Origem: 'WhatsApp',
    'Data de Entrada': obterDataHoje(),
    Observacoes: 'Procedimento realizado com sucesso. Agendar revisão de 15 dias.',
  },
  {
    Nome: 'Beatriz Castro Silva',
    Telefone: '(11) 99876-1122',
    'Interesse / Procedimento': 'Bioestimulador de Colágeno',
    'Possivel Valor (R$)': '2800',
    Situacao: 'Em captação',
    'Status da Venda': 'Em processo',
    Responsavel: 'Secretária 1',
    Origem: 'Indicação',
    'Data de Entrada': obterDataHoje(),
    Observacoes: 'Indicada pela paciente Mariana Souza. Quer melhorar firmeza do rosto.',
  },
  {
    Nome: 'Juliana Ferreira Pinto',
    Telefone: '(11) 96543-2211',
    'Interesse / Procedimento': 'Harmonização Facial',
    'Possivel Valor (R$)': '4500',
    Situacao: 'Nutrição',
    'Status da Venda': 'Em processo',
    Responsavel: 'Secretária 2',
    Origem: 'Google Ads',
    'Data de Entrada': obterDataHoje(),
    Observacoes: 'Recebendo conteúdos educativos sobre pós e resultados graduais.',
  },
];

// --------------------------------------------------------------------------
// PARSER DE CSV / TEXTO COLADO (Top-level Helpers)
// --------------------------------------------------------------------------
const normalizarCabecalho = (col: string): string => {
  return col
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

const normalizarDataInput = (dataStr: string): string => {
  if (!dataStr) return obterDataHoje();
  const limpo = dataStr.trim();
  // Se já está no formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(limpo)) return limpo;
  // Se está no formato DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(limpo)) {
    const [dia, mes, ano] = limpo.split('/');
    return `${ano}-${mes}-${dia}`;
  }
  return obterDataHoje();
};

const normalizarValorInput = (valStr: string | number): number => {
  if (typeof valStr === 'number') return valStr;
  if (!valStr) return 0;
  // Remove R$, espaços e converte formato BR (1.500,00 -> 1500.00)
  const limpo = valStr
    .toString()
    .replace(/R\$/gi, '')
    .replace(/\s+/g, '')
    .trim();

  if (limpo.includes(',') && limpo.includes('.')) {
    // 1.200,50 -> 1200.50
    const semPonto = limpo.replace(/\./g, '');
    return parseFloat(semPonto.replace(',', '.')) || 0;
  } else if (limpo.includes(',')) {
    // 1200,50 -> 1200.50
    return parseFloat(limpo.replace(',', '.')) || 0;
  }
  return parseFloat(limpo) || 0;
};

const parseLinhasCsv = (textoBruto: string, fallbackResponsavel: string = 'Secretária 1'): ImportarLeadItem[] => {
  if (!textoBruto || !textoBruto.trim()) return [];

  const linhas = textoBruto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (linhas.length < 2) return [];

  // Detecção automática do delimitador: ponto e vírgula, vírgula ou tab
  const primeiraLinha = linhas[0];
  let delimitador = ',';
  const countPontoEVirgula = (primeiraLinha.match(/;/g) || []).length;
  const countVirgula = (primeiraLinha.match(/,/g) || []).length;
  const countTab = (primeiraLinha.match(/\t/g) || []).length;

  if (countPontoEVirgula >= countVirgula && countPontoEVirgula >= countTab) {
    delimitador = ';';
  } else if (countTab > countVirgula) {
    delimitador = '\t';
  }

  // Separa colunas respeitando aspas simples ou duplas
  const dividirColunas = (linha: string): string[] => {
    if (delimitador === '\t') {
      return linha.split('\t').map((c) => c.replace(/^"|"$/g, '').trim());
    }
    const regex = new RegExp(
      `(?:^|${delimitador})(?:"([^"]*)"|([^"${delimitador}]*))`,
      'g'
    );
    const colunas: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(linha)) !== null) {
      const valor = match[1] !== undefined ? match[1] : match[2];
      colunas.push((valor || '').trim());
    }
    return colunas;
  };

  const cabecalhosBrutos = dividirColunas(linhas[0]);
  const cabecalhosNormalizados = cabecalhosBrutos.map(normalizarCabecalho);

  // Mapeamento de índices das colunas
  const mapIndex: Record<string, number> = {
    nome: -1,
    telefone: -1,
    interesse: -1,
    possivelValor: -1,
    situacao: -1,
    statusVenda: -1,
    responsavel: -1,
    origem: -1,
    dataEntrada: -1,
    observacoes: -1,
    etapa: -1,
    endereco: -1,
    dataNascimento: -1,
  };

  cabecalhosNormalizados.forEach((col, idx) => {
    if (col.includes('nome') || col.includes('paciente') || col.includes('cliente')) {
      if (mapIndex.nome === -1) mapIndex.nome = idx;
    } else if (
      col.includes('telefone') ||
      col.includes('whatsapp') ||
      col.includes('celular') ||
      col.includes('fone') ||
      col.includes('contato')
    ) {
      if (mapIndex.telefone === -1) mapIndex.telefone = idx;
    } else if (
      col.includes('interesse') ||
      col.includes('procedimento') ||
      col.includes('tratamento') ||
      col.includes('servico')
    ) {
      if (mapIndex.interesse === -1) mapIndex.interesse = idx;
    } else if (
      col.includes('possivelvalor') ||
      col.includes('valor') ||
      col.includes('preco') ||
      col.includes('orcamento')
    ) {
      if (mapIndex.possivelValor === -1) mapIndex.possivelValor = idx;
    } else if (
      col.includes('situacao') ||
      col.includes('statusclinico') ||
      col.includes('etapafunil')
    ) {
      if (mapIndex.situacao === -1) mapIndex.situacao = idx;
    } else if (
      col.includes('statusvenda') ||
      col.includes('venda') ||
      col.includes('statuscomercial') ||
      col.includes('fechamento')
    ) {
      if (mapIndex.statusVenda === -1) mapIndex.statusVenda = idx;
    } else if (
      col.includes('responsavel') ||
      col.includes('vendedora') ||
      col.includes('consultora') ||
      col.includes('atendente') ||
      col.includes('doutora') ||
      col.includes('medica')
    ) {
      if (mapIndex.responsavel === -1) mapIndex.responsavel = idx;
    } else if (
      col.includes('origem') ||
      col.includes('canal') ||
      col.includes('fonte') ||
      col.includes('campanha')
    ) {
      if (mapIndex.origem === -1) mapIndex.origem = idx;
    } else if (
      col.includes('dataentrada') ||
      col.includes('data') ||
      col.includes('cadastro') ||
      col.includes('criacao')
    ) {
      if (mapIndex.dataEntrada === -1) mapIndex.dataEntrada = idx;
    } else if (
      col.includes('observ') ||
      col.includes('obs') ||
      col.includes('anotacao') ||
      col.includes('historico') ||
      col.includes('detalhes')
    ) {
      if (mapIndex.observacoes === -1) mapIndex.observacoes = idx;
    } else if (col.includes('etapa') || col.includes('fase')) {
      if (mapIndex.etapa === -1) mapIndex.etapa = idx;
    } else if (col.includes('endereco') || col.includes('cidade') || col.includes('bairro')) {
      if (mapIndex.endereco === -1) mapIndex.endereco = idx;
    } else if (col.includes('nascimento') || col.includes('aniversario')) {
      if (mapIndex.dataNascimento === -1) mapIndex.dataNascimento = idx;
    }
  });

  // Se nenhuma coluna "nome" foi identificada pelo cabeçalho, assume a coluna 0
  if (mapIndex.nome === -1) {
    mapIndex.nome = 0;
  }

  const items: ImportarLeadItem[] = [];

  for (let i = 1; i < linhas.length; i++) {
    const colunas = dividirColunas(linhas[i]);
    const nome = mapIndex.nome >= 0 ? colunas[mapIndex.nome] || '' : '';
    if (!nome || !nome.trim()) continue;

    const telefone = mapIndex.telefone >= 0 ? colunas[mapIndex.telefone] || '' : '';
    const interesse = mapIndex.interesse >= 0 ? colunas[mapIndex.interesse] || '' : '';
    const possivelValorStr = mapIndex.possivelValor >= 0 ? colunas[mapIndex.possivelValor] || '' : '';
    const situacaoStr = mapIndex.situacao >= 0 ? colunas[mapIndex.situacao] || '' : '';
    const statusVendaStr = mapIndex.statusVenda >= 0 ? colunas[mapIndex.statusVenda] || '' : '';
    const responsavel = mapIndex.responsavel >= 0 ? colunas[mapIndex.responsavel] || '' : '';
    const origem = mapIndex.origem >= 0 ? colunas[mapIndex.origem] || '' : '';
    const dataEntradaStr = mapIndex.dataEntrada >= 0 ? colunas[mapIndex.dataEntrada] || '' : '';
    const observacoes = mapIndex.observacoes >= 0 ? colunas[mapIndex.observacoes] || '' : '';
    const etapa = mapIndex.etapa >= 0 ? colunas[mapIndex.etapa] || '' : '';
    const endereco = mapIndex.endereco >= 0 ? colunas[mapIndex.endereco] || '' : '';
    const dataNascimento = mapIndex.dataNascimento >= 0 ? colunas[mapIndex.dataNascimento] || '' : '';

    // Casa a situação com as situações válidas do sistema
    let situacaoValida: SituacaoLead = 'Em captação';
    if (situacaoStr) {
      const sitNorm = normalizarCabecalho(situacaoStr);
      const match = TODAS_SITUACOES.find((s) => normalizarCabecalho(s) === sitNorm);
      if (match) situacaoValida = match;
    }

    // Casa o status da venda
    let statusVendaValido: StatusVenda = 'Em processo';
    if (statusVendaStr) {
      const stNorm = normalizarCabecalho(statusVendaStr);
      const match = TODOS_STATUS_VENDA.find((s) => normalizarCabecalho(s) === stNorm);
      if (match) statusVendaValido = match;
    }

    // Casa a origem
    let origemValida: OrigemLead = 'WhatsApp';
    if (origem) {
      const origNorm = normalizarCabecalho(origem);
      const match = TODAS_ORIGENS.find((o) => normalizarCabecalho(o) === origNorm);
      if (match) origemValida = match;
    }

    items.push({
      nome: nome.trim(),
      telefone: telefone.trim(),
      interesse: interesse.trim(),
      possivelValor: normalizarValorInput(possivelValorStr),
      situacao: situacaoValida,
      statusVenda: statusVendaValido,
      responsavel: responsavel.trim() || fallbackResponsavel,
      origemLead: origemValida,
      dataEntrada: normalizarDataInput(dataEntradaStr),
      observacoes: observacoes.trim(),
      etapaInicial: etapa.trim() || undefined,
      endereco: endereco.trim() || undefined,
      dataNascimento: dataNascimento.trim() || undefined,
    });
  }

  return items;
};

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  leadsFiltrados,
}) => {
  const { leads, fichas, compras, responsaveis, procedimentos, importarLeadsEmLote } = useCrm();
  const { config } = useEmpresa();
  const corPrimaria = config.estetica?.corPrimaria || '#5C3A22';

  const [activeTab, setActiveTab] = useState<TabMode>('exportar');

  // Estado Exportação
  const [exportarEscopo, setExportarEscopo] = useState<'todos' | 'filtrados'>('todos');
  const [exportarFormato, setExportarFormato] = useState<'csv_excel' | 'csv_padrao' | 'json'>('csv_excel');
  const [exportando, setExportando] = useState(false);
  const [feedbackExportado, setFeedbackExportado] = useState<string | null>(null);

  // Estado Importação
  const [importarModoInput, setImportarModoInput] = useState<'arquivo' | 'texto'>('arquivo');
  const [textoColado, setTextoColado] = useState('');
  const [arquivoNome, setArquivoNome] = useState<string | null>(null);
  const [conteudoCsvLido, setConteudoCsvLido] = useState<string>('');
  const [modoDuplicados, setModoDuplicados] = useState<'ignorar_duplicados' | 'atualizar_duplicados' | 'criar_todos'>('ignorar_duplicados');
  const [importando, setImportando] = useState(false);
  const [resultadoImportacao, setResultadoImportacao] = useState<ResultadoImportacao | null>(null);
  const [erroAnalise, setErroAnalise] = useState<string | null>(null);

  // Estado Tabela Modelo
  const [copiadoModelo, setCopiadoModelo] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Leads que serão considerados na exportação
  const leadsParaExportar = useMemo(() => {
    if (exportarEscopo === 'filtrados' && leadsFiltrados && leadsFiltrados.length > 0) {
      return leadsFiltrados;
    }
    return leads;
  }, [exportarEscopo, leadsFiltrados, leads]);

  // Total de compras por lead
  const mapaTotalCompras = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const c of compras) {
      if (!c.deleted_at) {
        mapa.set(c.leadId, (mapa.get(c.leadId) || 0) + (c.valor || 0));
      }
    }
    return mapa;
  }, [compras]);

  // Mapa de fichas por leadId
  const mapaFichas = useMemo(() => {
    const mapa = new Map<string, FichaLead>();
    for (const f of fichas) {
      if (!f.deleted_at) {
        mapa.set(f.leadId, f);
      }
    }
    return mapa;
  }, [fichas]);

  // Texto bruto sendo processado no momento
  const textoParaProcessar = importarModoInput === 'arquivo' ? conteudoCsvLido : textoColado;
  const leadsPreVisualizacao = useMemo(() => {
    if (!textoParaProcessar || !textoParaProcessar.trim()) return [];
    try {
      return parseLinhasCsv(textoParaProcessar, responsaveis[0] || 'Secretária 1');
    } catch (e: any) {
      return [];
    }
  }, [textoParaProcessar, responsaveis]);

  // --------------------------------------------------------------------------
  // AÇÕES: IMPORTAR
  // --------------------------------------------------------------------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArquivoNome(file.name);
    setResultadoImportacao(null);
    setErroAnalise(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setConteudoCsvLido(content || '');
    };
    reader.onerror = () => {
      setErroAnalise('Não foi possível ler o arquivo selecionado.');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleExecutarImportacao = async () => {
    if (leadsPreVisualizacao.length === 0) return;

    setImportando(true);
    setErroAnalise(null);

    try {
      const resultado = await importarLeadsEmLote(leadsPreVisualizacao, modoDuplicados);
      setResultadoImportacao(resultado);
      // Limpa dados após importação
      if (resultado.totalCriados > 0 || resultado.totalAtualizados > 0) {
        setTextoColado('');
        setConteudoCsvLido('');
        setArquivoNome(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setErroAnalise(err?.message || 'Ocorreu um erro ao importar os clientes.');
    } finally {
      setImportando(false);
    }
  };

  // --------------------------------------------------------------------------
  // AÇÕES: EXPORTAR
  // --------------------------------------------------------------------------
  const handleExecutarExportacao = () => {
    setExportando(true);

    try {
      const hoje = obterDataHoje();

      if (exportarFormato === 'json') {
        const dadosExport = leadsParaExportar.map((l) => {
          const ficha = mapaFichas.get(l.id);
          const totalCompras = mapaTotalCompras.get(l.id) || 0;
          return {
            id: l.id,
            nome: l.nome,
            telefone: ficha?.telefone || '',
            interesse: l.interesse || '',
            possivelValor: l.possivelValor || 0,
            totalComprado: totalCompras,
            situacao: l.situacao,
            etapaAtual: l.etapaPorSituacao[l.situacao] || '',
            statusVenda: l.statusVenda,
            responsavel: l.responsavel,
            origemLead: ficha?.origemLead || 'WhatsApp',
            dataEntrada: l.dataEntrada,
            observacoes: ficha?.observacoes || '',
            dataNascimento: ficha?.dataNascimento || '',
            endereco: ficha?.endereco || '',
            motivoPerda: l.motivoPerda || ficha?.motivoPerda || '',
            dataPerda: l.dataPerda || ficha?.dataPerda || '',
          };
        });

        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify(dadosExport, null, 2)
        )}`;
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', jsonString);
        downloadAnchor.setAttribute('download', `clientes_crm_clinica_${hoje}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      } else {
        // CSV para Excel com UTF-8 BOM
        const separador = exportarFormato === 'csv_excel' ? ';' : ',';
        const colunas = [
          'Nome do Paciente',
          'Telefone / WhatsApp',
          'Interesse / Procedimento',
          'Possível Valor (R$)',
          'Total Comprado (R$)',
          'Situação Clínica',
          'Etapa Atual',
          'Status da Venda',
          'Responsável',
          'Origem',
          'Data de Entrada',
          'Data de Nascimento',
          'Endereço',
          'Observações',
          'Motivo de Perda',
        ];

        const linhasCsv = [colunas.join(separador)];

        for (const l of leadsParaExportar) {
          const ficha = mapaFichas.get(l.id);
          const totalCompras = mapaTotalCompras.get(l.id) || 0;

          const escapar = (val: any) => {
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
          };

          const linha = [
            escapar(l.nome),
            escapar(ficha?.telefone || ''),
            escapar(l.interesse || ''),
            escapar(l.possivelValor || 0),
            escapar(totalCompras),
            escapar(l.situacao),
            escapar(l.etapaPorSituacao[l.situacao] || ''),
            escapar(l.statusVenda),
            escapar(l.responsavel),
            escapar(ficha?.origemLead || 'WhatsApp'),
            escapar(l.dataEntrada),
            escapar(ficha?.dataNascimento || ''),
            escapar(ficha?.endereco || ''),
            escapar(ficha?.observacoes || ''),
            escapar(l.motivoPerda || ficha?.motivoPerda || ''),
          ];

          linhasCsv.push(linha.join(separador));
        }

        const conteudoCsv = linhasCsv.join('\r\n');
        // Adiciona UTF-8 BOM (\uFEFF) para garantir acentuação correta no Excel brasileiro
        const blob = new Blob(['\uFEFF' + conteudoCsv], {
          type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `clientes_crm_clinica_${hoje}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setFeedbackExportado(`Sucesso! ${leadsParaExportar.length} pacientes exportados.`);
      setTimeout(() => setFeedbackExportado(null), 4000);
    } catch (e) {
      console.error('Erro ao exportar:', e);
    } finally {
      setExportando(false);
    }
  };

  // --------------------------------------------------------------------------
  // AÇÕES: TABELA MODELO
  // --------------------------------------------------------------------------
  const handleBaixarTabelaModelo = () => {
    const separador = ';';
    const linhas = [CABECALHOS_MODELO.join(separador)];

    for (const ex of EXEMPLOS_MODELO) {
      const linha = CABECALHOS_MODELO.map((col) => {
        const val = ex[col] || '';
        return `"${val.replace(/"/g, '""')}"`;
      });
      linhas.push(linha.join(separador));
    }

    const conteudoCsv = linhas.join('\r\n');
    const blob = new Blob(['\uFEFF' + conteudoCsv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `modelo_importacao_clientes_clinica.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopiarModeloTexto = () => {
    const separador = '\t';
    const linhas = [CABECALHOS_MODELO.join(separador)];
    for (const ex of EXEMPLOS_MODELO) {
      const linha = CABECALHOS_MODELO.map((col) => ex[col] || '');
      linhas.push(linha.join(separador));
    }
    const texto = linhas.join('\n');
    navigator.clipboard.writeText(texto).then(() => {
      setCopiadoModelo(true);
      setTimeout(() => setCopiadoModelo(false), 2500);
    });
  };

  if (!isOpen) return null;

  return (
    <div
      id="modal-import-export-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1A1A1A]/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        id="modal-import-export-container"
        className="bg-white border border-[#D9D6D0] rounded-sm shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 text-[#1A1A1A]"
      >
        {/* Header do Modal com Identidade da Clínica */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#D9D6D0] bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: `${corPrimaria}15`, color: corPrimaria }}
              className="p-2.5 rounded-sm border border-[#D9D6D0]"
            >
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold uppercase tracking-wide text-[#1A1A1A]">
                  Central de Dados & Importação de Clientes
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-xs bg-[#5C3A22]/10 text-[#5C3A22] uppercase tracking-wider">
                  Base de Pacientes
                </span>
              </div>
              <p className="text-xs text-[#6E6E6E] mt-0.5">
                Exporte relatórios, importe planilhas de pacientes ou baixe a planilha modelo oficial formatada.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-sm text-[#6E6E6E] hover:text-[#1A1A1A] hover:bg-[#F2EFEA] transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas de Navegação */}
        <div className="flex border-b border-[#D9D6D0] bg-[#F2EFEA]/40 px-4 sm:px-6 gap-2">
          {/* Aba 1: Exportar */}
          <button
            type="button"
            onClick={() => setActiveTab('exportar')}
            className={`py-3 px-3.5 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'exportar'
                ? 'border-[#5C3A22] text-[#5C3A22] bg-white font-extrabold'
                : 'border-transparent text-[#6E6E6E] hover:text-[#1A1A1A]'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>1. Exportar Clientes</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-xs bg-[#EAE6DF] text-[#1A1A1A] font-mono">
              {leads.length}
            </span>
          </button>

          {/* Aba 2: Importar */}
          <button
            type="button"
            onClick={() => setActiveTab('importar')}
            className={`py-3 px-3.5 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'importar'
                ? 'border-[#5C3A22] text-[#5C3A22] bg-white font-extrabold'
                : 'border-transparent text-[#6E6E6E] hover:text-[#1A1A1A]'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>2. Importar Clientes</span>
          </button>

          {/* Aba 3: Tabela Modelo */}
          <button
            type="button"
            onClick={() => setActiveTab('modelo')}
            className={`py-3 px-3.5 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'modelo'
                ? 'border-[#5C3A22] text-[#5C3A22] bg-white font-extrabold'
                : 'border-transparent text-[#6E6E6E] hover:text-[#1A1A1A]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>3. Tabela Modelo (.csv)</span>
          </button>
        </div>

        {/* Conteúdo Dinâmico da Aba */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 bg-white">
          {/* ================================================================= */}
          {/* ABA 1: EXPORTAR */}
          {/* ================================================================= */}
          {activeTab === 'exportar' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Feedback de sucesso */}
              {feedbackExportado && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-sm text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{feedbackExportado}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Escopo de Pacientes */}
                <div className="p-4 rounded-sm border border-[#D9D6D0] bg-[#FAF8F5] space-y-3">
                  <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider block">
                    1. Selecione quais pacientes exportar:
                  </label>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 text-xs text-[#1A1A1A] cursor-pointer p-2 rounded-sm hover:bg-[#F2EFEA]">
                      <input
                        type="radio"
                        name="exportarEscopo"
                        value="todos"
                        checked={exportarEscopo === 'todos'}
                        onChange={() => setExportarEscopo('todos')}
                        className="accent-[#5C3A22] cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="font-bold block">Todos os pacientes cadastrados</span>
                        <span className="text-[11px] text-[#6E6E6E]">
                          Total completo de <strong>{leads.length}</strong> pacientes na base
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-[#1A1A1A] cursor-pointer p-2 rounded-sm hover:bg-[#F2EFEA]">
                      <input
                        type="radio"
                        name="exportarEscopo"
                        value="filtrados"
                        checked={exportarEscopo === 'filtrados'}
                        onChange={() => setExportarEscopo('filtrados')}
                        className="accent-[#5C3A22] cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="font-bold block">Apenas pacientes filtrados na tabela</span>
                        <span className="text-[11px] text-[#6E6E6E]">
                          Total atual de <strong>{leadsFiltrados?.length || leads.length}</strong> pacientes filtrados
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Formato do Arquivo */}
                <div className="p-4 rounded-sm border border-[#D9D6D0] bg-[#FAF8F5] space-y-3">
                  <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider block">
                    2. Formato do Arquivo:
                  </label>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 text-xs text-[#1A1A1A] cursor-pointer p-2 rounded-sm hover:bg-[#F2EFEA]">
                      <input
                        type="radio"
                        name="exportarFormato"
                        value="csv_excel"
                        checked={exportarFormato === 'csv_excel'}
                        onChange={() => setExportarFormato('csv_excel')}
                        className="accent-[#5C3A22] cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="font-bold block">CSV para Excel Brasil (Recomendado)</span>
                        <span className="text-[11px] text-[#6E6E6E]">
                          Separador ponto e vírgula (;) com acentos e formatação pronta para Excel
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-[#1A1A1A] cursor-pointer p-2 rounded-sm hover:bg-[#F2EFEA]">
                      <input
                        type="radio"
                        name="exportarFormato"
                        value="csv_padrao"
                        checked={exportarFormato === 'csv_padrao'}
                        onChange={() => setExportarFormato('csv_padrao')}
                        className="accent-[#5C3A22] cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="font-bold block">CSV Padrão Internacional</span>
                        <span className="text-[11px] text-[#6E6E6E]">
                          Separador vírgula (,) para Google Planilhas ou outros sistemas
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-[#1A1A1A] cursor-pointer p-2 rounded-sm hover:bg-[#F2EFEA]">
                      <input
                        type="radio"
                        name="exportarFormato"
                        value="json"
                        checked={exportarFormato === 'json'}
                        onChange={() => setExportarFormato('json')}
                        className="accent-[#5C3A22] cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="font-bold block">JSON Estruturado</span>
                        <span className="text-[11px] text-[#6E6E6E]">
                          Para integrações técnicas de banco de dados ou backups
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Prévia das Colunas Inclusas */}
              <div className="p-3.5 rounded-sm border border-[#D9D6D0] bg-white text-xs space-y-2">
                <span className="font-bold text-[#1A1A1A] uppercase tracking-wider block text-[11px]">
                  📋 Colunas incluídas na exportação ({leadsParaExportar.length} registros):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Nome do Paciente',
                    'Telefone / WhatsApp',
                    'Interesse / Procedimento',
                    'Possível Valor (R$)',
                    'Total Comprado (R$)',
                    'Situação Clínica',
                    'Etapa Atual',
                    'Status da Venda',
                    'Responsável',
                    'Origem',
                    'Data de Entrada',
                    'Observações Clínicas',
                  ].map((col) => (
                    <span
                      key={col}
                      className="px-2 py-0.5 rounded-xs bg-[#F2EFEA] text-[#5C3A22] border border-[#D9D6D0] text-[10px] font-semibold"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              {/* Botão de Exportar */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D9D6D0]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#6E6E6E] hover:text-[#1A1A1A] cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleExecutarExportacao}
                  disabled={exportando || leadsParaExportar.length === 0}
                  style={{ backgroundColor: corPrimaria }}
                  className="px-5 py-2.5 rounded-sm text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:opacity-90 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Planilha de {leadsParaExportar.length} Pacientes</span>
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* ABA 2: IMPORTAR */}
          {/* ================================================================= */}
          {activeTab === 'importar' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Alerta / Erro */}
              {erroAnalise && (
                <div className="p-3 bg-rose-50 border border-rose-300 text-rose-900 rounded-sm text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{erroAnalise}</span>
                </div>
              )}

              {/* Resultado pós-importação */}
              {resultadoImportacao && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-sm text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Importação concluída com sucesso!</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/80 font-mono text-[11px]">
                    <div className="p-2 bg-white rounded-xs border border-emerald-200">
                      <span className="text-[#6E6E6E] block text-[10px]">CRIADOS:</span>
                      <strong className="text-emerald-800 text-base">{resultadoImportacao.totalCriados}</strong>
                    </div>
                    <div className="p-2 bg-white rounded-xs border border-emerald-200">
                      <span className="text-[#6E6E6E] block text-[10px]">ATUALIZADOS:</span>
                      <strong className="text-amber-800 text-base">{resultadoImportacao.totalAtualizados}</strong>
                    </div>
                    <div className="p-2 bg-white rounded-xs border border-emerald-200">
                      <span className="text-[#6E6E6E] block text-[10px]">IGNORADOS:</span>
                      <strong className="text-[#6E6E6E] text-base">{resultadoImportacao.totalIgnorados}</strong>
                    </div>
                    <div className="p-2 bg-white rounded-xs border border-emerald-200">
                      <span className="text-[#6E6E6E] block text-[10px]">ERROS:</span>
                      <strong className="text-rose-700 text-base">{resultadoImportacao.totalErros}</strong>
                    </div>
                  </div>
                  {resultadoImportacao.errosDetalhes && resultadoImportacao.errosDetalhes.length > 0 && (
                    <div className="pt-2 text-[10px] text-rose-700 space-y-1">
                      <strong className="block">Avisos de processamento:</strong>
                      {resultadoImportacao.errosDetalhes.slice(0, 3).map((err, idx) => (
                        <div key={idx}>• {err}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Alternador de Método de Importação */}
              <div className="flex items-center justify-between border-b border-[#D9D6D0] pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                  Escolha como deseja importar:
                </span>
                <div className="flex items-center gap-1 bg-[#F2EFEA] p-0.5 rounded-sm border border-[#D9D6D0]">
                  <button
                    type="button"
                    onClick={() => setImportarModoInput('arquivo')}
                    className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-xs transition-all cursor-pointer ${
                      importarModoInput === 'arquivo'
                        ? 'bg-white text-[#1A1A1A] shadow-xs'
                        : 'text-[#6E6E6E] hover:text-[#1A1A1A]'
                    }`}
                  >
                    📁 Arquivo .CSV / Excel
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportarModoInput('texto')}
                    className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-xs transition-all cursor-pointer ${
                      importarModoInput === 'texto'
                        ? 'bg-white text-[#1A1A1A] shadow-xs'
                        : 'text-[#6E6E6E] hover:text-[#1A1A1A]'
                    }`}
                  >
                    📝 Colar Linhas de Texto
                  </button>
                </div>
              </div>

              {/* Área de Entrada: Arquivo ou Texto */}
              {importarModoInput === 'arquivo' ? (
                <div className="space-y-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#D9D6D0] hover:border-[#5C3A22] bg-[#FAF8F5] p-6 sm:p-8 rounded-sm text-center cursor-pointer transition-all space-y-2 group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv, .txt, .tsv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Upload className="w-8 h-8 mx-auto text-[#8F887E] group-hover:text-[#5C3A22] transition-colors" />
                    <div className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                      {arquivoNome ? (
                        <span className="text-[#5C3A22] font-mono">Arquivo carregado: {arquivoNome}</span>
                      ) : (
                        <span>Clique para selecionar ou arraste sua planilha CSV</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#6E6E6E]">
                      Suporta arquivos .CSV exportados do Excel, Google Sheets, outros CRMs ou a Tabela Modelo.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center justify-between">
                    <span>Cole as linhas copiadas do seu Excel ou arquivo:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const exemplo = `${CABECALHOS_MODELO.join(';')}\n${EXEMPLOS_MODELO.map((ex) =>
                          CABECALHOS_MODELO.map((c) => ex[c] || '').join(';')
                        ).join('\n')}`;
                        setTextoColado(exemplo);
                      }}
                      className="text-[10px] font-bold text-[#5C3A22] hover:underline cursor-pointer"
                    >
                      Inserir dados de teste
                    </button>
                  </label>
                  <textarea
                    rows={6}
                    value={textoColado}
                    onChange={(e) => {
                      setTextoColado(e.target.value);
                      setResultadoImportacao(null);
                    }}
                    placeholder="Nome;Telefone;Interesse / Procedimento;Possivel Valor;Situacao;Status da Venda;Responsavel;Origem;Data de Entrada;Observacoes&#10;Mariana Souza;(11) 98765-4321;Toxina Botulínica;1200;Consulta agendada;Em processo;Secretária 1;Instagram;2026-08-06;Prefere tarde"
                    className="w-full p-3 font-mono text-xs rounded-sm border border-[#D9D6D0] bg-[#FAF8F5] focus:bg-white focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                  />
                </div>
              )}

              {/* Tratamento de Duplicados */}
              <div className="p-3 rounded-sm border border-[#D9D6D0] bg-[#FAF8F5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <span className="font-bold text-[#1A1A1A] uppercase tracking-wider text-[11px] shrink-0">
                  Regra para clientes já cadastrados (por nome ou telefone):
                </span>
                <select
                  value={modoDuplicados}
                  onChange={(e: any) => setModoDuplicados(e.target.value)}
                  className="h-8 px-2.5 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] font-medium focus:border-[#5C3A22] focus:outline-hidden"
                >
                  <option value="ignorar_duplicados">Ignorar duplicados (manter cadastro atual)</option>
                  <option value="atualizar_duplicados">Atualizar dados do cliente existente</option>
                  <option value="criar_todos">Importar todos (permitir repetidos)</option>
                </select>
              </div>

              {/* Pré-visualização dos Dados Identificados */}
              {leadsPreVisualizacao.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#D9D6D0]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#5C3A22]" />
                      <span>Pré-visualização ({leadsPreVisualizacao.length} pacientes identificados)</span>
                    </span>
                    <span className="text-[10px] text-[#6E6E6E]">
                      Exibindo primeiras {Math.min(4, leadsPreVisualizacao.length)} linhas
                    </span>
                  </div>

                  <div className="border border-[#D9D6D0] rounded-sm overflow-x-auto max-h-48 text-[11px]">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[#1A1A1A] text-white uppercase text-[10px] font-bold">
                        <tr>
                          <th className="p-2 border-r border-[#333]">Nome</th>
                          <th className="p-2 border-r border-[#333]">Telefone</th>
                          <th className="p-2 border-r border-[#333]">Procedimento</th>
                          <th className="p-2 border-r border-[#333]">Valor (R$)</th>
                          <th className="p-2 border-r border-[#333]">Situação</th>
                          <th className="p-2">Responsável</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D9D6D0] bg-white font-medium">
                        {leadsPreVisualizacao.slice(0, 4).map((item, idx) => (
                          <tr key={idx} className="hover:bg-[#FAF8F5]">
                            <td className="p-2 font-bold text-[#1A1A1A]">{item.nome}</td>
                            <td className="p-2 text-[#6E6E6E]">{item.telefone || '-'}</td>
                            <td className="p-2 text-[#5C3A22] font-semibold">{item.interesse || '-'}</td>
                            <td className="p-2 font-mono">{formatarMoeda(item.possivelValor || 0)}</td>
                            <td className="p-2 text-[#1A1A1A]">{item.situacao || 'Em captação'}</td>
                            <td className="p-2 text-[#6E6E6E]">{item.responsavel || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Botões de Ação Importar */}
              <div className="flex items-center justify-between pt-3 border-t border-[#D9D6D0]">
                <button
                  type="button"
                  onClick={() => setActiveTab('modelo')}
                  className="text-xs font-bold text-[#5C3A22] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Ver colunas e baixar planilha modelo</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#6E6E6E] hover:text-[#1A1A1A] cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={handleExecutarImportacao}
                    disabled={importando || leadsPreVisualizacao.length === 0}
                    style={{ backgroundColor: corPrimaria }}
                    className="px-5 py-2.5 rounded-sm text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:opacity-90 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {importando ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Importando {leadsPreVisualizacao.length} Pacientes...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Confirmar Importação de {leadsPreVisualizacao.length} Pacientes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* ABA 3: TABELA MODELO */}
          {/* ================================================================= */}
          {activeTab === 'modelo' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-sm bg-[#FAF8F5] border border-[#D9D6D0]">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#1A1A1A]">
                    Planilha Modelo Oficial de Importação
                  </h4>
                  <p className="text-xs text-[#6E6E6E] mt-0.5">
                    Utilize este arquivo pré-formatado com cabeçalhos exatos e exemplos para preencher e importar com 100% de precisão.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCopiarModeloTexto}
                    className="flex-1 sm:flex-none px-3.5 py-2 rounded-sm border border-[#D9D6D0] bg-white hover:bg-[#F2EFEA] text-xs font-bold uppercase tracking-wider text-[#1A1A1A] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {copiadoModelo ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-[#6E6E6E]" />
                        <span>Copiar Exemplo</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleBaixarTabelaModelo}
                    style={{ backgroundColor: corPrimaria }}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Modelo (.csv)</span>
                  </button>
                </div>
              </div>

              {/* Guia de Colunas Aceitas */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider block">
                  📖 Especificação das Colunas Suportadas:
                </span>

                <div className="border border-[#D9D6D0] rounded-sm overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#1A1A1A] text-white uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-2.5 border-r border-[#333]">Coluna</th>
                        <th className="p-2.5 border-r border-[#333]">Obrigatório?</th>
                        <th className="p-2.5 border-r border-[#333]">Valores Aceitos</th>
                        <th className="p-2.5">Exemplo Prático</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9D6D0] bg-white text-[11px]">
                      <tr className="hover:bg-[#FAF8F5]">
                        <td className="p-2.5 font-bold text-[#1A1A1A]">Nome</td>
                        <td className="p-2.5 text-rose-700 font-bold">Sim</td>
                        <td className="p-2.5 text-[#6E6E6E]">Nome completo do paciente</td>
                        <td className="p-2.5 font-mono text-[#5C3A22]">Mariana Souza Alves</td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5]">
                        <td className="p-2.5 font-bold text-[#1A1A1A]">Telefone</td>
                        <td className="p-2.5 text-[#8F887E]">Opcional</td>
                        <td className="p-2.5 text-[#6E6E6E]">Com DDD (11) 99999-9999 ou só dígitos</td>
                        <td className="p-2.5 font-mono text-[#5C3A22]">(11) 98765-4321</td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5]">
                        <td className="p-2.5 font-bold text-[#1A1A1A]">Interesse / Procedimento</td>
                        <td className="p-2.5 text-[#8F887E]">Opcional</td>
                        <td className="p-2.5 text-[#6E6E6E]">Procedimentos cadastrados ou texto livre</td>
                        <td className="p-2.5 font-mono text-[#5C3A22]">Toxina Botulínica</td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5]">
                        <td className="p-2.5 font-bold text-[#1A1A1A]">Possível Valor (R$)</td>
                        <td className="p-2.5 text-[#8F887E]">Opcional</td>
                        <td className="p-2.5 text-[#6E6E6E]">Número inteiro ou com decimais (ex: 1200 ou 1.200,00)</td>
                        <td className="p-2.5 font-mono text-[#5C3A22]">1200.00</td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5]">
                        <td className="p-2.5 font-bold text-[#1A1A1A]">Situação</td>
                        <td className="p-2.5 text-[#8F887E]">Opcional</td>
                        <td className="p-2.5 text-[#6E6E6E]">
                          Em captação, Consulta agendada, Pós consulta, Procedimento agendado, Pós procedimento, Reativação, Nutrição
                        </td>
                        <td className="p-2.5 font-mono text-[#5C3A22]">Consulta agendada</td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5]">
                        <td className="p-2.5 font-bold text-[#1A1A1A]">Status da Venda</td>
                        <td className="p-2.5 text-[#8F887E]">Opcional</td>
                        <td className="p-2.5 text-[#6E6E6E]">Em processo, Venda feita, Perdido</td>
                        <td className="p-2.5 font-mono text-[#5C3A22]">Em processo</td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5]">
                        <td className="p-2.5 font-bold text-[#1A1A1A]">Responsável</td>
                        <td className="p-2.5 text-[#8F887E]">Opcional</td>
                        <td className="p-2.5 text-[#6E6E6E]">Nome da secretária, vendedora ou profissional</td>
                        <td className="p-2.5 font-mono text-[#5C3A22]">Secretária 1</td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5]">
                        <td className="p-2.5 font-bold text-[#1A1A1A]">Origem</td>
                        <td className="p-2.5 text-[#8F887E]">Opcional</td>
                        <td className="p-2.5 text-[#6E6E6E]">WhatsApp, Instagram, Indicação, Google Ads, Tráfego Pago, etc.</td>
                        <td className="p-2.5 font-mono text-[#5C3A22]">Instagram</td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5]">
                        <td className="p-2.5 font-bold text-[#1A1A1A]">Data de Entrada</td>
                        <td className="p-2.5 text-[#8F887E]">Opcional</td>
                        <td className="p-2.5 text-[#6E6E6E]">Formato YYYY-MM-DD ou DD/MM/YYYY</td>
                        <td className="p-2.5 font-mono text-[#5C3A22]">{obterDataHoje()}</td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5]">
                        <td className="p-2.5 font-bold text-[#1A1A1A]">Observações</td>
                        <td className="p-2.5 text-[#8F887E]">Opcional</td>
                        <td className="p-2.5 text-[#6E6E6E]">Histórico clínico e preferências de atendimento</td>
                        <td className="p-2.5 font-mono text-[#5C3A22]">Tem interesse em aplicação facial.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Botão de Prosseguir para Importar */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D9D6D0]">
                <button
                  type="button"
                  onClick={() => setActiveTab('importar')}
                  style={{ backgroundColor: corPrimaria }}
                  className="px-5 py-2.5 rounded-sm text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:opacity-90 transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Ir para o Importador de Pacientes</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
