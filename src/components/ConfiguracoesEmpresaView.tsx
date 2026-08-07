import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Image as ImageIcon,
  Palette,
  Upload,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  ShieldCheck,
  Save,
  CheckCircle2,
  Download,
  AlertTriangle,
  Sliders,
  Eye,
  FileText,
  Phone,
  Mail,
  MapPin,
  Clock,
  Briefcase,
  Layers,
  Trash2,
  Plus,
  Database,
  MousePointer,
  Contrast,
  SlidersHorizontal,
  ChevronRight,
  UserPlus,
  Flame,
  LogOut,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEmpresa, CONFIGURACOES_PADRAO } from '../context/EmpresaContext';
import { useAuth } from '../context/AuthContext';
import { useCrm } from '../context/CrmContext';
import {
  ConfiguracoesEmpresa,
  EsteticaPlataforma,
  ESTETICAS_PRESET,
} from '../types';
import { obterCoresSidebarCompletas, sugerirContrasteBlocoInferior } from '../utils/estetica';
import { ControleProcedimentosView } from './ControleProcedimentosView';
import { SupabaseConfigView } from './SupabaseConfigView';

type AbaAtiva = 'identidade' | 'dados' | 'estetica' | 'procedimentos' | 'supabase' | 'backup';

export const ConfiguracoesEmpresaView: React.FC = () => {
  const {
    config,
    atualizarConfig,
    aplicarEstetica,
    salvarNovaEstetica,
    removerEsteticaSalva,
    resetarConfiguracoes,
    uploadLogoArquivo,
    isCarregandoConfig,
  } = useEmpresa();
  const { isGestor } = useAuth();
  const { limparTodosLeads, leads } = useCrm();

  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('identidade');
  const [modalLimparLeadsAberto, setModalLimparLeadsAberto] = useState(false);
  const [isLimpandoLeads, setIsLimpandoLeads] = useState(false);
  const [mensagemStatus, setMensagemStatus] = useState<{
    tipo: 'sucesso' | 'erro' | 'info';
    texto: string;
  } | null>(null);

  // Estados locais para formulário de dados da clínica
  const [formDados, setFormDados] = useState({
    nomeEmpresa: config.nomeEmpresa || '',
    subtitulo: config.subtitulo || '',
    cnpj: config.cnpj || '',
    registroProfissional: config.registroProfissional || '',
    telefone: config.telefone || '',
    email: config.email || '',
    endereco: config.endereco || '',
    horarioFuncionamento: config.horarioFuncionamento || '',
    unidadePadrao: config.unidadePadrao || '',
    monogramaIniciais: config.monogramaIniciais || 'AR',
    tipoLogo: config.tipoLogo || 'monograma',
    logoUrl: config.logoUrl || '',
    logoAltura: config.logoAltura || 'padrao',
    logoAjusteLateral: config.logoAjusteLateral || 'total',
    logoFundoHeader: config.logoFundoHeader || 'integrado',
  });

  // Atualiza estados locais quando a config do Firestore/storage mudar
  useEffect(() => {
    setFormDados((prev) => ({
      ...prev,
      nomeEmpresa: config.nomeEmpresa || '',
      subtitulo: config.subtitulo || '',
      cnpj: config.cnpj || '',
      registroProfissional: config.registroProfissional || '',
      telefone: config.telefone || '',
      email: config.email || '',
      endereco: config.endereco || '',
      horarioFuncionamento: config.horarioFuncionamento || '',
      unidadePadrao: config.unidadePadrao || '',
      monogramaIniciais: config.monogramaIniciais || 'AR',
      tipoLogo: config.tipoLogo || 'monograma',
      logoUrl: config.logoUrl || '',
      logoAltura: config.logoAltura || 'padrao',
      logoAjusteLateral: config.logoAjusteLateral || 'total',
      logoFundoHeader: config.logoFundoHeader || 'integrado',
    }));
    setCoresCustomizadas({ ...config.estetica });
  }, [config]);

  // Estado local para personalização de cores
  const [coresCustomizadas, setCoresCustomizadas] = useState<EsteticaPlataforma>({
    ...config.estetica,
  });
  const [nomeNovaEstetica, setNomeNovaEstetica] = useState('');
  const [modalSalvarEsteticaAberto, setModalSalvarEsteticaAberto] = useState(false);

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mostrarMensagem = (tipo: 'sucesso' | 'erro' | 'info', texto: string) => {
    setMensagemStatus({ tipo, texto });
    setTimeout(() => {
      setMensagemStatus(null);
    }, 4000);
  };

  // Manipulador de upload de imagem
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const res = await uploadLogoArquivo(files[0]);
      if (res.sucesso) {
        mostrarMensagem('sucesso', res.mensagem || 'Logo atualizada com sucesso!');
        setFormDados((prev) => ({
          ...prev,
          tipoLogo: 'imagem',
          logoUrl: config.logoUrl || '',
        }));
      } else {
        mostrarMensagem('erro', res.mensagem || 'Erro ao enviar imagem.');
      }
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const res = await uploadLogoArquivo(e.dataTransfer.files[0]);
      if (res.sucesso) {
        mostrarMensagem('sucesso', res.mensagem || 'Logo atualizada com sucesso!');
        setFormDados((prev) => ({
          ...prev,
          tipoLogo: 'imagem',
        }));
      } else {
        mostrarMensagem('erro', res.mensagem || 'Erro ao enviar imagem.');
      }
    }
  };

  // Salvar formulário de dados da clínica
  const handleSalvarDados = async (e: React.FormEvent) => {
    e.preventDefault();
    const sucesso = await atualizarConfig({
      nomeEmpresa: formDados.nomeEmpresa,
      subtitulo: formDados.subtitulo,
      cnpj: formDados.cnpj,
      registroProfissional: formDados.registroProfissional,
      telefone: formDados.telefone,
      email: formDados.email,
      endereco: formDados.endereco,
      horarioFuncionamento: formDados.horarioFuncionamento,
      unidadePadrao: formDados.unidadePadrao,
      monogramaIniciais: formDados.monogramaIniciais.toUpperCase().slice(0, 3),
      tipoLogo: formDados.tipoLogo,
      logoUrl: formDados.logoUrl,
      logoAltura: formDados.logoAltura,
      logoAjusteLateral: formDados.logoAjusteLateral,
      logoFundoHeader: formDados.logoFundoHeader,
    });

    if (sucesso) {
      mostrarMensagem('sucesso', 'Informações da clínica salvas com sucesso!');
    } else {
      mostrarMensagem('erro', 'Ocorreu um erro ao salvar as informações.');
    }
  };

  // Aplicar Preset de Estética
  const handleSelecionarPreset = async (preset: EsteticaPlataforma) => {
    setCoresCustomizadas({ ...preset });
    const ok = await aplicarEstetica(preset);
    if (ok) {
      mostrarMensagem('sucesso', `Estética "${preset.nomePreset}" aplicada à plataforma!`);
    }
  };

  // Salvar Estética Personalizada
  const handleSalvarEsteticaPersonalizada = async () => {
    if (!nomeNovaEstetica.trim()) {
      mostrarMensagem('erro', 'Informe um nome para a sua nova estética.');
      return;
    }

    const novaEstetica: EsteticaPlataforma = {
      ...coresCustomizadas,
      idPreset: `custom_${Date.now()}`,
      nomePreset: nomeNovaEstetica.trim(),
      descricao: 'Estética customizada criada pelo gestor da clínica.',
      isPersonalizado: true,
    };

    const ok = await salvarNovaEstetica(novaEstetica);
    if (ok) {
      setModalSalvarEsteticaAberto(false);
      setNomeNovaEstetica('');
      mostrarMensagem('sucesso', `Estética "${novaEstetica.nomePreset}" salva e ativada!`);
    } else {
      mostrarMensagem('erro', 'Erro ao salvar a estética personalizada.');
    }
  };

  // Estado de simulação interativa da sidebar na aba de estética
  const [simuladorHoverItemId, setSimuladorHoverItemId] = useState<string | null>(null);

  // Aplicar alterações manuais de cor instantaneamente
  const handleAtualizarCorManual = (campo: keyof EsteticaPlataforma, valor: string) => {
    const nova = { ...coresCustomizadas, [campo]: valor, isPersonalizado: true };
    setCoresCustomizadas(nova);
    aplicarEstetica(nova);
  };

  // Ajustar contraste inteligente e harmônico para o bloco inferior
  const handleAjustarContrasteAutomatico = () => {
    const corSidebarAtual = coresCustomizadas.corSidebar || config.estetica.corSidebar;
    const sugestao = sugerirContrasteBlocoInferior(corSidebarAtual);
    const nova = {
      ...coresCustomizadas,
      ...sugestao,
      isPersonalizado: true,
    };
    setCoresCustomizadas(nova);
    aplicarEstetica(nova);
    mostrarMensagem('sucesso', 'Contraste inteligente e harmonizado aplicado ao bloco inferior!');
  };

  // Exportar configurações em JSON
  const handleExportarConfig = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `configuracoes_clinica_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    mostrarMensagem('sucesso', 'Configurações exportadas em arquivo JSON!');
  };

  // Resetar tudo
  const handleResetarGeral = async () => {
    if (
      window.confirm(
        'Tem certeza que deseja restaurar as configurações oficiais padrão da Dra. Agda Rodrigues? As customizações de cores e logo serão redefinidas.'
      )
    ) {
      const ok = await resetarConfiguracoes();
      if (ok) {
        setFormDados({
          nomeEmpresa: CONFIGURACOES_PADRAO.nomeEmpresa,
          subtitulo: CONFIGURACOES_PADRAO.subtitulo,
          cnpj: CONFIGURACOES_PADRAO.cnpj || '',
          registroProfissional: CONFIGURACOES_PADRAO.registroProfissional || '',
          telefone: CONFIGURACOES_PADRAO.telefone || '',
          email: CONFIGURACOES_PADRAO.email || '',
          endereco: CONFIGURACOES_PADRAO.endereco || '',
          horarioFuncionamento: CONFIGURACOES_PADRAO.horarioFuncionamento || '',
          unidadePadrao: CONFIGURACOES_PADRAO.unidadePadrao || '',
          monogramaIniciais: CONFIGURACOES_PADRAO.monogramaIniciais,
          tipoLogo: CONFIGURACOES_PADRAO.tipoLogo,
          logoUrl: '',
        });
        setCoresCustomizadas(CONFIGURACOES_PADRAO.estetica);
        mostrarMensagem('sucesso', 'Configurações restauradas para o padrão oficial!');
      }
    }
  };

  // Limpar todos os leads e dados simulados com confirmação
  const handleConfirmarLimpezaLeads = async () => {
    setIsLimpandoLeads(true);
    try {
      const res = await limparTodosLeads();
      setModalLimparLeadsAberto(false);
      mostrarMensagem(
        'sucesso',
        `Banco de leads limpo com sucesso! ${res.totalRemovidos} registro(s) foram apagados.`
      );
    } catch (e) {
      console.error(e);
      mostrarMensagem('erro', 'Ocorreu um erro ao limpar a base de dados.');
    } finally {
      setIsLimpandoLeads(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6"
    >
      {/* Status Toast */}
      {mensagemStatus && (
        <div
          className={`px-3 py-2 rounded-sm text-xs font-semibold flex items-center gap-2 border shadow-xs animate-fade-in ${
            mensagemStatus.tipo === 'sucesso'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : mensagemStatus.tipo === 'erro'
              ? 'bg-rose-50 border-rose-300 text-rose-800'
              : 'bg-[#F2EFEA] border-[#D9D6D0] text-[#1A1A1A]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#5C3A22]" />
          <span>{mensagemStatus.texto}</span>
        </div>
      )}

      {/* ABAS DE NAVEGAÇÃO */}
      <div className="flex border-b border-[#D9D6D0] bg-white rounded-t-sm px-2 sm:px-4 pt-2 gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setAbaAtiva('identidade')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            abaAtiva === 'identidade'
              ? 'border-[#5C3A22] text-[#5C3A22] bg-[#F2EFEA]/40'
              : 'border-transparent text-[#6E6E6E] hover:text-[#1A1A1A] hover:bg-[#F2EFEA]/20'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Logo & Identidade</span>
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('dados')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            abaAtiva === 'dados'
              ? 'border-[#5C3A22] text-[#5C3A22] bg-[#F2EFEA]/40'
              : 'border-transparent text-[#6E6E6E] hover:text-[#1A1A1A] hover:bg-[#F2EFEA]/20'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Dados da Clínica</span>
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('estetica')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            abaAtiva === 'estetica'
              ? 'border-[#5C3A22] text-[#5C3A22] bg-[#F2EFEA]/40'
              : 'border-transparent text-[#6E6E6E] hover:text-[#1A1A1A] hover:bg-[#F2EFEA]/20'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Cores & Estética da Plataforma</span>
        </button>

        <button
          type="button"
          id="tab-btn-procedimentos-valores"
          onClick={() => setAbaAtiva('procedimentos')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            abaAtiva === 'procedimentos'
              ? 'border-[#5C3A22] text-[#5C3A22] bg-[#F2EFEA]/40'
              : 'border-transparent text-[#6E6E6E] hover:text-[#1A1A1A] hover:bg-[#F2EFEA]/20'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Procedimentos & Valores</span>
        </button>

        <button
          type="button"
          id="tab-btn-supabase-integracao"
          onClick={() => setAbaAtiva('supabase')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            abaAtiva === 'supabase'
              ? 'border-[#5C3A22] text-[#5C3A22] bg-[#F2EFEA]/40'
              : 'border-transparent text-[#6E6E6E] hover:text-[#1A1A1A] hover:bg-[#F2EFEA]/20'
          }`}
        >
          <Database className="w-4 h-4 text-[#5C3A22]" />
          <span>Banco de Dados Supabase</span>
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('backup')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            abaAtiva === 'backup'
              ? 'border-[#5C3A22] text-[#5C3A22] bg-[#F2EFEA]/40'
              : 'border-transparent text-[#6E6E6E] hover:text-[#1A1A1A] hover:bg-[#F2EFEA]/20'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Avançado & Backup</span>
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div className="space-y-6">
        {/* ABA 5: INTEGRAÇÃO & BANCO DE DADOS SUPABASE */}
        {abaAtiva === 'supabase' && <SupabaseConfigView />}
        {/* ABA 1: LOGO & IDENTIDADE */}
        {abaAtiva === 'identidade' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Coluna Esquerda: Edição & Upload */}
            <div className="lg:col-span-7 bg-white rounded-sm p-5 sm:p-6 border border-[#D9D6D0] shadow-xs space-y-6">
              <div>
                <h2 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#5C3A22]" />
                  <span>Logotipo da Barra de Navegação e Cabeçalhos</span>
                </h2>
                <p className="text-xs text-[#6E6E6E] mt-1">
                  Defina a imagem oficial ou o monograma que será exibido no topo da barra de navegação lateral.
                </p>
              </div>

              {/* CARD DE ORIENTAÇÕES DE PROPORÇÕES (DESTAQUE OBRIGATÓRIO) */}
              <div className="bloco-destaque-ar p-4 rounded-sm space-y-2.5 border border-[#D9D6D0]">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                  <Info className="w-4 h-4 text-[#5C3A22]" />
                  <span>Dimensões Exatas em Pixels & Proporções no Cabeçalho</span>
                </div>
                <div className="text-xs text-[#1A1A1A] space-y-2 leading-relaxed">
                  <p>
                    A barra lateral possui uma largura fixa de <strong>288 px</strong> (<code className="px-1 py-0.5 bg-black/5 rounded text-[11px] font-mono">w-72</code>). Para ocupar perfeitamente todo o topo da barra, utilize as seguintes especificações:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#4A4A4A] bg-white/80 p-3 rounded-sm border border-[#D9D6D0]">
                    <div className="space-y-1">
                      <span className="font-bold text-[#1A1A1A] block">📐 Proporção Horizontal Recomendada:</span>
                      <div>• <strong>288 × 80 px</strong> até <strong>288 × 96 px</strong> (preenchimento total 1x)</div>
                      <div>• <strong>576 × 160 px</strong> ou <strong>576 × 192 px</strong> (HD / Retina 2x para máxima nitidez)</div>
                      <div>• Proporção ideal: <strong>3:1 a 4:1</strong></div>
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-[#1A1A1A] block">💎 Logo Quadrada / Brasão:</span>
                      <div>• <strong>200 × 200 px</strong> ou <strong>400 × 400 px</strong> (@2x)</div>
                      <div>• Formatos: <strong>PNG transparente</strong>, <strong>SVG</strong> ou <strong>WEBP</strong></div>
                      <div>• Ajuste de preenchimento configurável abaixo</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seletor de Tipo de Logo */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider block">
                  Modo de Exibição do Topo
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormDados((prev) => ({ ...prev, tipoLogo: 'monograma' }));
                      atualizarConfig({ tipoLogo: 'monograma' });
                    }}
                    className={`p-3.5 rounded-sm border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      config.tipoLogo === 'monograma'
                        ? 'border-[#5C3A22] bg-[#F2EFEA]/50 ring-1 ring-[#5C3A22]'
                        : 'border-[#D9D6D0] hover:bg-[#F2EFEA]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#1A1A1A]">Monograma Tipográfico</span>
                      {config.tipoLogo === 'monograma' && <Check className="w-4 h-4 text-[#5C3A22]" />}
                    </div>
                    <p className="text-[11px] text-[#6E6E6E]">
                      Box minimalista com iniciais ({config.monogramaIniciais || 'AR'}) e tipografia oficial.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormDados((prev) => ({ ...prev, tipoLogo: 'imagem' }));
                      atualizarConfig({ tipoLogo: 'imagem' });
                    }}
                    className={`p-3.5 rounded-sm border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      config.tipoLogo === 'imagem'
                        ? 'border-[#5C3A22] bg-[#F2EFEA]/50 ring-1 ring-[#5C3A22]'
                        : 'border-[#D9D6D0] hover:bg-[#F2EFEA]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#1A1A1A]">Logotipo em Imagem</span>
                      {config.tipoLogo === 'imagem' && <Check className="w-4 h-4 text-[#5C3A22]" />}
                    </div>
                    <p className="text-[11px] text-[#6E6E6E]">
                      Ajustado lateralmente ocupando o cabeçalho da barra.
                    </p>
                  </button>
                </div>
              </div>

              {/* Área de Upload / Dropzone */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider block">
                  Upload do Arquivo de Logo
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-sm p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-[#5C3A22] bg-[#5C3A22]/5'
                      : 'border-[#D9D6D0] hover:border-[#5C3A22] bg-[#F2EFEA]/20'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[#F2EFEA] border border-[#D9D6D0] flex items-center justify-center text-[#5C3A22]">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1A1A1A]">
                        Clique para selecionar ou arraste sua logo aqui
                      </p>
                      <p className="text-[11px] text-[#6E6E6E] mt-0.5">
                        Ajusta-se automaticamente à largura da barra lateral (PNG, SVG, WEBP até 2MB)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inserção por URL Direta */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider block">
                  Ou URL direta da imagem:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formDados.logoUrl}
                    onChange={(e) => setFormDados((prev) => ({ ...prev, logoUrl: e.target.value }))}
                    placeholder="https://sua-clinica.com.br/logo.png"
                    className="flex-1 h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (formDados.logoUrl) {
                        await atualizarConfig({
                          logoUrl: formDados.logoUrl,
                          tipoLogo: 'imagem',
                        });
                        mostrarMensagem('sucesso', 'URL da imagem aplicada com sucesso!');
                      }
                    }}
                    className="h-9 px-4 rounded-sm bg-[#1A1A1A] hover:bg-[#5C3A22] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Aplicar URL
                  </button>
                </div>
              </div>

              {/* AJUSTES AVANÇADOS DA LOGO NO CABEÇALHO */}
              {config.tipoLogo === 'imagem' && (
                <div className="space-y-4 pt-4 border-t border-[#D9D6D0] bg-[#F2EFEA]/30 p-4 rounded-sm border">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#5C3A22]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                      Personalização do Encaixe no Cabeçalho
                    </h3>
                  </div>

                  {/* 1. Ajuste Lateral / Largura */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A] block">
                      Ajuste Lateral na Barra:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'sangrado', label: '100% Sangrado', desc: 'Preenche 288px (sem bordas)' },
                        { id: 'total', label: 'Total', desc: 'Preenche com margem mínima' },
                        { id: 'padrao', label: 'Equilibrado', desc: 'Margens padrão refinadas' },
                        { id: 'respirado', label: 'Respirado', desc: 'Com mais espaçamento' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setFormDados((prev) => ({ ...prev, logoAjusteLateral: item.id as any }));
                            atualizarConfig({ logoAjusteLateral: item.id as any });
                          }}
                          className={`p-2.5 rounded-sm border text-left cursor-pointer transition-all ${
                            (config.logoAjusteLateral || 'total') === item.id
                              ? 'border-[#5C3A22] bg-white ring-1 ring-[#5C3A22]'
                              : 'border-[#D9D6D0] bg-white/60 hover:bg-white'
                          }`}
                        >
                          <div className="text-xs font-bold text-[#1A1A1A]">{item.label}</div>
                          <div className="text-[10px] text-[#6E6E6E]">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Altura Máxima */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A] block">
                      Altura Máxima da Imagem no Topo:
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { id: 'compacta', label: 'Compacta', h: '48px' },
                        { id: 'padrao', label: 'Padrão', h: '64px' },
                        { id: 'ampla', label: 'Ampla', h: '80px' },
                        { id: 'destaque', label: 'Destaque', h: '96px' },
                        { id: 'maxima', label: 'Máxima', h: '128px' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setFormDados((prev) => ({ ...prev, logoAltura: item.id as any }));
                            atualizarConfig({ logoAltura: item.id as any });
                          }}
                          className={`p-2 rounded-sm border text-center cursor-pointer transition-all ${
                            (config.logoAltura || 'padrao') === item.id
                              ? 'border-[#5C3A22] bg-white ring-1 ring-[#5C3A22]'
                              : 'border-[#D9D6D0] bg-white/60 hover:bg-white'
                          }`}
                        >
                          <div className="text-xs font-bold text-[#1A1A1A]">{item.label}</div>
                          <div className="text-[10px] text-[#6E6E6E]">{item.h}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Fundo e Contraste */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A] block">
                      Fundo do Cabeçalho da Barra:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'integrado', label: 'Integrado', desc: 'Fundo padrão da barra' },
                        { id: 'escuro_suave', label: 'Escuro Suave', desc: 'Contraste sutil' },
                        { id: 'fundo_claro', label: 'Base Clara', desc: 'Para logos escuras' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setFormDados((prev) => ({ ...prev, logoFundoHeader: item.id as any }));
                            atualizarConfig({ logoFundoHeader: item.id as any });
                          }}
                          className={`p-2.5 rounded-sm border text-left cursor-pointer transition-all ${
                            (config.logoFundoHeader || 'integrado') === item.id
                              ? 'border-[#5C3A22] bg-white ring-1 ring-[#5C3A22]'
                              : 'border-[#D9D6D0] bg-white/60 hover:bg-white'
                          }`}
                        >
                          <div className="text-xs font-bold text-[#1A1A1A]">{item.label}</div>
                          <div className="text-[10px] text-[#6E6E6E]">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Configuração do Monograma */}
              <div className="space-y-1.5 pt-2 border-t border-[#D9D6D0]">
                <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider block">
                  Iniciais do Monograma (1 a 3 letras)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    maxLength={3}
                    value={formDados.monogramaIniciais}
                    onChange={(e) =>
                      setFormDados((prev) => ({
                        ...prev,
                        monogramaIniciais: e.target.value.toUpperCase(),
                      }))
                    }
                    className="w-24 h-9 px-3 text-xs font-bold text-center uppercase tracking-widest rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      await atualizarConfig({
                        monogramaIniciais: formDados.monogramaIniciais.toUpperCase().slice(0, 3),
                      });
                      mostrarMensagem('sucesso', 'Iniciais do monograma atualizadas!');
                    }}
                    className="h-9 px-3 rounded-sm bg-[#F2EFEA] hover:bg-[#D9D6D0] text-[#1A1A1A] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border border-[#D9D6D0]"
                  >
                    Salvar Iniciais
                  </button>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Preview em Tempo Real da Barra Lateral */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-sm p-4 border border-[#D9D6D0] shadow-xs">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#D9D6D0]">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                    <Eye className="w-4 h-4 text-[#5C3A22]" />
                    <span>Prévia da Barra Lateral</span>
                  </div>
                  <span className="text-[10px] text-[#5C3A22] font-semibold uppercase tracking-wider">
                    {config.tipoLogo === 'imagem' ? 'Ajustado Lateralmente' : 'Monograma'}
                  </span>
                </div>

                {/* Simulador da barra lateral */}
                <div
                  className="rounded-sm text-white shadow-md border border-black/30 overflow-hidden"
                  style={{ backgroundColor: config.estetica.corSidebar }}
                >
                  <div className="text-[10px] uppercase font-bold tracking-wider text-[#8F887E] px-4 pt-3 pb-1">
                    Cabeçalho da Barra de Navegação:
                  </div>

                  {/* Header visual simulado - Ajustado lateralmente */}
                  <div
                    className={`w-full border-b border-white/10 transition-all ${
                      config.tipoLogo === 'imagem' && config.logoUrl
                        ? config.logoAjusteLateral === 'sangrado'
                          ? 'p-0'
                          : config.logoAjusteLateral === 'total'
                          ? 'px-2 py-2.5'
                          : config.logoAjusteLateral === 'respirado'
                          ? 'px-5 py-3.5'
                          : 'px-3.5 py-3'
                        : 'px-4 py-3.5'
                    } ${
                      config.logoFundoHeader === 'escuro_suave'
                        ? 'bg-black/40'
                        : 'bg-black/25'
                    }`}
                  >
                    {config.tipoLogo === 'imagem' && config.logoUrl ? (
                      <div
                        className={`w-full flex items-center justify-center ${
                          config.logoFundoHeader === 'fundo_claro'
                            ? 'bg-white/95 rounded-xs p-2 shadow-xs border border-white/20'
                            : ''
                        }`}
                      >
                        <img
                          src={config.logoUrl}
                          alt={config.nomeEmpresa || 'Logo da Clínica'}
                          className={`w-full max-w-full h-auto object-contain transition-all duration-200 ${
                            config.logoAltura === 'compacta'
                              ? 'max-h-12'
                              : config.logoAltura === 'ampla'
                              ? 'max-h-20'
                              : config.logoAltura === 'destaque'
                              ? 'max-h-24'
                              : config.logoAltura === 'maxima'
                              ? 'max-h-32'
                              : 'max-h-16'
                          }`}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-sm flex items-center justify-center font-bold text-base tracking-wider border-b-2 shadow-xs bg-white text-[#1A1A1A] shrink-0"
                          style={{ borderBottomColor: config.estetica.corPrimaria }}
                        >
                          {config.monogramaIniciais || 'AR'}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold tracking-wider text-white uppercase truncate">
                            {config.nomeEmpresa || 'Dra. Agda Rodrigues'}
                          </h3>
                          <p
                            className="text-[10px] font-semibold uppercase tracking-wider truncate"
                            style={{ color: config.estetica.corSecundaria }}
                          >
                            {config.subtitulo || 'Harmonização Facial'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Exemplo de item ativo na prévia */}
                  <div className="p-3 space-y-1.5 text-xs">
                    <div
                      className="p-2 rounded-sm font-semibold flex items-center justify-between text-white shadow-xs"
                      style={{ backgroundColor: config.estetica.corPrimaria }}
                    >
                      <span>Cadastro rápido</span>
                      <span className="text-[9px] bg-white text-[#1A1A1A] font-bold px-1.5 py-0.5 rounded-sm">
                        Ativo
                      </span>
                    </div>

                    <div className="p-2 rounded-sm text-[#8F887E] hover:text-white flex items-center justify-between">
                      <span>Em captação</span>
                      <span className="text-[10px] text-[#8F887E]">Cadência</span>
                    </div>
                  </div>
                </div>

                {config.logoUrl && (
                  <button
                    type="button"
                    onClick={async () => {
                      await atualizarConfig({ logoUrl: '', tipoLogo: 'monograma' });
                      setFormDados((prev) => ({ ...prev, logoUrl: '', tipoLogo: 'monograma' }));
                      mostrarMensagem('info', 'Logo removida. Restaurado para monograma tipográfico.');
                    }}
                    className="mt-3 w-full py-2 rounded-sm text-xs font-bold uppercase tracking-wider text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover Imagem e Usar Monograma</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: DADOS DA CLÍNICA */}
        {abaAtiva === 'dados' && (
          <form
            onSubmit={handleSalvarDados}
            className="bg-white rounded-sm p-5 sm:p-6 border border-[#D9D6D0] shadow-xs space-y-6"
          >
            <div>
              <h2 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#5C3A22]" />
                <span>Dados Oficiais da Empresa & Responsável Técnico</span>
              </h2>
              <p className="text-xs text-[#6E6E6E] mt-1">
                Essas informações alimentam os cabeçalhos, relatórios emitidos, contratos e comunicações do CRM.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome da Empresa / Clínica */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#8F887E]" />
                  <span>Nome da Clínica / Profissional Titular *</span>
                </label>
                <input
                  type="text"
                  required
                  value={formDados.nomeEmpresa}
                  onChange={(e) => setFormDados((prev) => ({ ...prev, nomeEmpresa: e.target.value }))}
                  placeholder="Ex: Dra. Agda Rodrigues"
                  className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden font-semibold"
                />
              </div>

              {/* Subtítulo / Especialidade */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-[#8F887E]" />
                  <span>Especialidade / Subtítulo *</span>
                </label>
                <input
                  type="text"
                  required
                  value={formDados.subtitulo}
                  onChange={(e) => setFormDados((prev) => ({ ...prev, subtitulo: e.target.value }))}
                  placeholder="Ex: Harmonização Facial"
                  className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                />
              </div>

              {/* CRM / Registro Profissional */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#8F887E]" />
                  <span>Registro Profissional / CRM / RQE</span>
                </label>
                <input
                  type="text"
                  value={formDados.registroProfissional}
                  onChange={(e) =>
                    setFormDados((prev) => ({ ...prev, registroProfissional: e.target.value }))
                  }
                  placeholder="Ex: CRM-SP 184.920 / RQE 92.410"
                  className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                />
              </div>

              {/* CNPJ */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#8F887E]" />
                  <span>CNPJ da Clínica</span>
                </label>
                <input
                  type="text"
                  value={formDados.cnpj}
                  onChange={(e) => setFormDados((prev) => ({ ...prev, cnpj: e.target.value }))}
                  placeholder="Ex: 45.123.890/0001-34"
                  className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                />
              </div>

              {/* WhatsApp / Telefone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#8F887E]" />
                  <span>Telefone Principal / WhatsApp Comercial</span>
                </label>
                <input
                  type="text"
                  value={formDados.telefone}
                  onChange={(e) => setFormDados((prev) => ({ ...prev, telefone: e.target.value }))}
                  placeholder="Ex: (11) 98452-1920"
                  className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                />
              </div>

              {/* E-mail Institucional */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#8F887E]" />
                  <span>E-mail Institucional / Contato</span>
                </label>
                <input
                  type="email"
                  value={formDados.email}
                  onChange={(e) => setFormDados((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Ex: contato@agdarodrigues.med.br"
                  className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                />
              </div>

              {/* Endereço Completo */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#8F887E]" />
                  <span>Endereço Completo da Clínica</span>
                </label>
                <input
                  type="text"
                  value={formDados.endereco}
                  onChange={(e) => setFormDados((prev) => ({ ...prev, endereco: e.target.value }))}
                  placeholder="Ex: Av. Brigadeiro Faria Lima, 3477 - 12º andar - Itaim Bibi, São Paulo - SP, CEP 04538-133"
                  className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                />
              </div>

              {/* Horário de Funcionamento */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#8F887E]" />
                  <span>Horário de Funcionamento</span>
                </label>
                <input
                  type="text"
                  value={formDados.horarioFuncionamento}
                  onChange={(e) =>
                    setFormDados((prev) => ({ ...prev, horarioFuncionamento: e.target.value }))
                  }
                  placeholder="Ex: Segunda a Sexta: 08h às 19h | Sábados: 08h às 13h"
                  className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                />
              </div>

              {/* Unidade Padrão */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#8F887E]" />
                  <span>Nome da Unidade Principal</span>
                </label>
                <input
                  type="text"
                  value={formDados.unidadePadrao}
                  onChange={(e) =>
                    setFormDados((prev) => ({ ...prev, unidadePadrao: e.target.value }))
                  }
                  placeholder="Ex: Consultório Principal - Itaim Bibi"
                  className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#D9D6D0] flex justify-end">
              <button
                type="submit"
                disabled={isCarregandoConfig}
                className="h-10 px-6 rounded-sm bg-[#1A1A1A] hover:bg-[#5C3A22] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Informações da Clínica</span>
              </button>
            </div>
          </form>
        )}

        {/* ABA 3: CORES & ESTÉTICA DA PLATAFORMA */}
        {abaAtiva === 'estetica' && (
          <div className="space-y-6">
            {/* Galeria de Presets */}
            <div className="bg-white rounded-sm p-5 sm:p-6 border border-[#D9D6D0] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[#5C3A22]" />
                    <span>Estéticas & Temas Oficiais da Plataforma</span>
                  </h2>
                  <p className="text-xs text-[#6E6E6E] mt-0.5">
                    Escolha uma estética curada pronta ou personalize as cores da sua marca para salvar uma estética única.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setModalSalvarEsteticaAberto(true)}
                  className="h-9 px-4 rounded-sm bg-[#5C3A22] hover:bg-[#8A6142] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Salvar Estética Atual</span>
                </button>
              </div>

              {/* Grid de Presets */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {(config.esteticasSalvas || ESTETICAS_PRESET).map((preset) => {
                  const isAtiva = config.estetica.idPreset === preset.idPreset;
                  const cPreset = obterCoresSidebarCompletas(preset);

                  return (
                    <div
                      key={preset.idPreset}
                      className={`p-4 rounded-sm border transition-all flex flex-col justify-between ${
                        isAtiva
                          ? 'border-[#5C3A22] bg-[#F2EFEA]/40 ring-2 ring-[#5C3A22] shadow-xs'
                          : 'border-[#D9D6D0] bg-white hover:border-[#8F887E]'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                            {preset.nomePreset}
                          </h3>
                          {isAtiva && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm bg-[#5C3A22] text-white">
                              Ativa
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-[#6E6E6E] leading-snug">
                          {preset.descricao || 'Paleta de cores customizada.'}
                        </p>

                        {/* Amostras completas das cores incluindo menu lateral e rodapé */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              title="Cor Primária"
                              className="w-5 h-5 rounded-sm border border-black/10 shadow-2xs"
                              style={{ backgroundColor: cPreset.corPrimaria }}
                            />
                            <span
                              title="Cor Secundária"
                              className="w-5 h-5 rounded-sm border border-black/10 shadow-2xs"
                              style={{ backgroundColor: cPreset.corSecundaria }}
                            />
                            <span
                              title="Fundo da Barra Lateral"
                              className="w-5 h-5 rounded-sm border border-black/10 shadow-2xs"
                              style={{ backgroundColor: cPreset.corSidebar }}
                            />
                            <span
                              title="Item Ativo / Clicado"
                              className="w-5 h-5 rounded-sm border border-black/10 shadow-2xs"
                              style={{ backgroundColor: cPreset.corNavAtivoBg }}
                            />
                            <span
                              title="Bloco Inferior da Barra"
                              className="w-5 h-5 rounded-sm border border-black/10 shadow-2xs"
                              style={{ backgroundColor: cPreset.corNavFooterBg }}
                            />
                          </div>
                          <span className="text-[10px] text-[#8F887E] font-medium block">
                            Paleta harmônica com alto contraste na barra e rodapé.
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#D9D6D0]/60 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelecionarPreset(preset)}
                          className={`flex-1 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                            isAtiva
                              ? 'bg-[#1A1A1A] text-white'
                              : 'bg-[#F2EFEA] text-[#1A1A1A] hover:bg-[#D9D6D0]'
                          }`}
                        >
                          {isAtiva ? 'Em Uso' : 'Aplicar Estética'}
                        </button>

                        {preset.isPersonalizado && (
                          <button
                            type="button"
                            onClick={() => removerEsteticaSalva(preset.idPreset)}
                            title="Excluir estética salva"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-sm transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SELETOR DE CORES GERAIS DA PLATAFORMA */}
            <div className="bg-white rounded-sm p-5 sm:p-6 border border-[#D9D6D0] shadow-xs space-y-6">
              <div>
                <h2 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#5C3A22]" />
                  <span>Cores Gerais da Plataforma & Conteúdo</span>
                </h2>
                <p className="text-xs text-[#6E6E6E] mt-0.5">
                  Acentos de botões, destaques de relatórios, divisórias e tipografia do conteúdo principal.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Cor Primária */}
                <div className="p-3.5 rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                      Cor Primária (Acentos)
                    </label>
                    <span className="text-[11px] font-mono text-[#6E6E6E]">
                      {coresCustomizadas.corPrimaria}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={coresCustomizadas.corPrimaria}
                      onChange={(e) => handleAtualizarCorManual('corPrimaria', e.target.value)}
                      className="w-10 h-9 rounded-sm border border-[#D9D6D0] cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={coresCustomizadas.corPrimaria}
                      onChange={(e) => handleAtualizarCorManual('corPrimaria', e.target.value)}
                      className="flex-1 h-9 px-3 text-xs font-mono rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] uppercase"
                    />
                  </div>
                  <p className="text-[10px] text-[#6E6E6E]">
                    Botões principais de ação, badges de destaque e barras laterais de POP.
                  </p>
                </div>

                {/* 2. Cor Secundária */}
                <div className="p-3.5 rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                      Cor Secundária (Apoio)
                    </label>
                    <span className="text-[11px] font-mono text-[#6E6E6E]">
                      {coresCustomizadas.corSecundaria}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={coresCustomizadas.corSecundaria}
                      onChange={(e) => handleAtualizarCorManual('corSecundaria', e.target.value)}
                      className="w-10 h-9 rounded-sm border border-[#D9D6D0] cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={coresCustomizadas.corSecundaria}
                      onChange={(e) => handleAtualizarCorManual('corSecundaria', e.target.value)}
                      className="flex-1 h-9 px-3 text-xs font-mono rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] uppercase"
                    />
                  </div>
                  <p className="text-[10px] text-[#6E6E6E]">
                    Subtítulos, destaques de números de POP e ícones complementares.
                  </p>
                </div>

                {/* 3. Fundo de Destaques */}
                <div className="p-3.5 rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                      Fundo de Destaques
                    </label>
                    <span className="text-[11px] font-mono text-[#6E6E6E]">
                      {coresCustomizadas.corFundoDestaque}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={coresCustomizadas.corFundoDestaque}
                      onChange={(e) => handleAtualizarCorManual('corFundoDestaque', e.target.value)}
                      className="w-10 h-9 rounded-sm border border-[#D9D6D0] cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={coresCustomizadas.corFundoDestaque}
                      onChange={(e) => handleAtualizarCorManual('corFundoDestaque', e.target.value)}
                      className="flex-1 h-9 px-3 text-xs font-mono rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] uppercase"
                    />
                  </div>
                  <p className="text-[10px] text-[#6E6E6E]">
                    Fundo de blocos de orientação POP e cards de métricas.
                  </p>
                </div>

                {/* 4. Bordas Neutras */}
                <div className="p-3.5 rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                      Cor de Bordas Neutras
                    </label>
                    <span className="text-[11px] font-mono text-[#6E6E6E]">
                      {coresCustomizadas.corBorda}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={coresCustomizadas.corBorda}
                      onChange={(e) => handleAtualizarCorManual('corBorda', e.target.value)}
                      className="w-10 h-9 rounded-sm border border-[#D9D6D0] cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={coresCustomizadas.corBorda}
                      onChange={(e) => handleAtualizarCorManual('corBorda', e.target.value)}
                      className="flex-1 h-9 px-3 text-xs font-mono rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] uppercase"
                    />
                  </div>
                  <p className="text-[10px] text-[#6E6E6E]">
                    Linhas divisórias de tabelas, cartões e inputs.
                  </p>
                </div>

                {/* 5. Texto Principal */}
                <div className="p-3.5 rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/20 space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                      Texto Principal da Aplicação
                    </label>
                    <span className="text-[11px] font-mono text-[#6E6E6E]">
                      {coresCustomizadas.corTexto}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={coresCustomizadas.corTexto}
                      onChange={(e) => handleAtualizarCorManual('corTexto', e.target.value)}
                      className="w-10 h-9 rounded-sm border border-[#D9D6D0] cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={coresCustomizadas.corTexto}
                      onChange={(e) => handleAtualizarCorManual('corTexto', e.target.value)}
                      className="flex-1 h-9 px-3 text-xs font-mono rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] uppercase"
                    />
                  </div>
                  <p className="text-[10px] text-[#6E6E6E]">
                    Tipografia de títulos de páginas, parágrafos e dados das tabelas clínicas.
                  </p>
                </div>
              </div>
            </div>

            {/* NOVO PAINEL COMPLETO: CONFIGURAÇÃO DE CORES DA BARRA DE NAVEGAÇÃO */}
            <div className="bg-white rounded-sm p-5 sm:p-6 border border-[#D9D6D0] shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D9D6D0]">
                <div>
                  <h2 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-[#5C3A22]" />
                    <span>Configurações de Cores da Barra de Navegação</span>
                  </h2>
                  <p className="text-xs text-[#6E6E6E] mt-0.5">
                    Controle granular da letra antes e depois do cursor (hover), quando clicada e não clicada, e contraste harmônico do bloco inferior.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAjustarContrasteAutomatico}
                  className="h-9 px-3.5 rounded-sm bg-[#1A1A1A] hover:bg-[#5C3A22] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 shadow-xs shrink-0 self-start sm:self-auto"
                >
                  <Contrast className="w-4 h-4 text-[#C8C3BC]" />
                  <span>Ajustar Contraste Inteligente</span>
                </button>
              </div>

              {/* Layout em 2 Colunas: Controles de Cor à Esquerda + Simulador Interativo à Direita */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Coluna de Controles (7 Colunas) */}
                <div className="lg:col-span-7 space-y-6">
                  {/* SEÇÃO 1: ESTRUTURA DA BARRA */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-2 text-[#5C3A22]">
                      <Layers className="w-3.5 h-3.5" />
                      <span>1. Estrutura da Barra Lateral & Títulos de Grupos</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Cor da Sidebar */}
                      <div className="p-3 rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider">
                            Fundo da Barra Lateral
                          </label>
                          <span className="text-[10.5px] font-mono text-[#6E6E6E]">
                            {coresCustomizadas.corSidebar}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={coresCustomizadas.corSidebar}
                            onChange={(e) => handleAtualizarCorManual('corSidebar', e.target.value)}
                            className="w-9 h-8 rounded-sm border border-[#D9D6D0] cursor-pointer p-0.5 bg-white"
                          />
                          <input
                            type="text"
                            value={coresCustomizadas.corSidebar}
                            onChange={(e) => handleAtualizarCorManual('corSidebar', e.target.value)}
                            className="flex-1 h-8 px-2.5 text-xs font-mono rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] uppercase"
                          />
                        </div>
                        <p className="text-[9.5px] text-[#6E6E6E]">
                          Fundo estrutural da barra de navegação lateral fixa.
                        </p>
                      </div>

                      {/* Títulos de Categorias */}
                      <div className="p-3 rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider">
                            Títulos de Categoria
                          </label>
                          <span className="text-[10.5px] font-mono text-[#6E6E6E]">
                            {coresCustomizadas.corNavCategoriaTexto || '#A8A196'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={coresCustomizadas.corNavCategoriaTexto || '#A8A196'}
                            onChange={(e) => handleAtualizarCorManual('corNavCategoriaTexto', e.target.value)}
                            className="w-9 h-8 rounded-sm border border-[#D9D6D0] cursor-pointer p-0.5 bg-white"
                          />
                          <input
                            type="text"
                            value={coresCustomizadas.corNavCategoriaTexto || '#A8A196'}
                            onChange={(e) => handleAtualizarCorManual('corNavCategoriaTexto', e.target.value)}
                            className="flex-1 h-8 px-2.5 text-xs font-mono rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] uppercase"
                          />
                        </div>
                        <p className="text-[9.5px] text-[#6E6E6E]">
                          Ex: "ETAPAS DO FUNIL", "GESTÃO & ANÁLISE".
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* SEÇÃO 2: ESTADOS DOS ITENS (ANTES/DEPOIS DO CURSOR, CLICADO/NÃO CLICADO) */}
                  <div className="space-y-3 pt-2 border-t border-[#D9D6D0]">
                    <h3 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-2 text-[#5C3A22]">
                      <MousePointer className="w-3.5 h-3.5" />
                      <span>2. Estados dos Itens (Antes e Depois do Cursor, Clicado e Não Clicado)</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Cor da Letra Antes do Cursor (Inativo / Não Clicado) */}
                      <div className="p-3 rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider">
                            Letra Antes do Cursor
                          </label>
                          <span className="text-[10.5px] font-mono text-[#6E6E6E]">
                            {coresCustomizadas.corNavTextoInativo || '#8F887E'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={coresCustomizadas.corNavTextoInativo || '#8F887E'}
                            onChange={(e) => handleAtualizarCorManual('corNavTextoInativo', e.target.value)}
                            className="w-9 h-8 rounded-sm border border-[#D9D6D0] cursor-pointer p-0.5 bg-white"
                          />
                          <input
                            type="text"
                            value={coresCustomizadas.corNavTextoInativo || '#8F887E'}
                            onChange={(e) => handleAtualizarCorManual('corNavTextoInativo', e.target.value)}
                            className="flex-1 h-8 px-2.5 text-xs font-mono rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] uppercase"
                          />
                        </div>
                        <p className="text-[9.5px] text-[#6E6E6E]">
                          Cor da letra e ícone em repouso (quando não clicada e sem o cursor).
                        </p>
                      </div>

                      {/* Cor da Letra Depois do Cursor (Hover) */}
                      <div className="p-3 rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider">
                            Letra Depois do Cursor (Hover)
                          </label>
                          <span className="text-[10.5px] font-mono text-[#6E6E6E]">
                            {coresCustomizadas.corNavTextoHover || '#FFFFFF'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={coresCustomizadas.corNavTextoHover || '#FFFFFF'}
                            onChange={(e) => handleAtualizarCorManual('corNavTextoHover', e.target.value)}
                            className="w-9 h-8 rounded-sm border border-[#D9D6D0] cursor-pointer p-0.5 bg-white"
                          />
                          <input
                            type="text"
                            value={coresCustomizadas.corNavTextoHover || '#FFFFFF'}
                            onChange={(e) => handleAtualizarCorManual('corNavTextoHover', e.target.value)}
                            className="flex-1 h-8 px-2.5 text-xs font-mono rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] uppercase"
                          />
                        </div>
                        <p className="text-[9.5px] text-[#6E6E6E]">
                          Cor da letra e ícone ao passar o cursor do mouse (hover).
                        </p>
                      </div>

                      {/* Fundo do Item no Hover */}
                      <div className="p-3 rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider">
                            Fundo no Hover
                          </label>
                          <span className="text-[10.5px] font-mono text-[#6E6E6E]">
                            {coresCustomizadas.corNavHoverBg || 'rgba(255,255,255,0.08)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={coresCustomizadas.corNavHoverBg || 'rgba(255,255,255,0.08)'}
                            onChange={(e) => handleAtualizarCorManual('corNavHoverBg', e.target.value)}
                            className="w-full h-8 px-2.5 text-xs font-mono rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A]"
                            placeholder="rgba(255,255,255,0.08) ou #262626"
                          />
                        </div>
                        <p className="text-[9.5px] text-[#6E6E6E]">
                          Realce de fundo suave exibido após o cursor passar sobre o item.
                        </p>
                      </div>

                      {/* Fundo do Item Clicado / Ativo */}
                      <div className="p-3 rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider">
                            Fundo Quando Clicada (Ativo)
                          </label>
                          <span className="text-[10.5px] font-mono text-[#6E6E6E]">
                            {coresCustomizadas.corNavAtivoBg || coresCustomizadas.corPrimaria}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={coresCustomizadas.corNavAtivoBg || coresCustomizadas.corPrimaria}
                            onChange={(e) => handleAtualizarCorManual('corNavAtivoBg', e.target.value)}
                            className="w-9 h-8 rounded-sm border border-[#D9D6D0] cursor-pointer p-0.5 bg-white"
                          />
                          <input
                            type="text"
                            value={coresCustomizadas.corNavAtivoBg || coresCustomizadas.corPrimaria}
                            onChange={(e) => handleAtualizarCorManual('corNavAtivoBg', e.target.value)}
                            className="flex-1 h-8 px-2.5 text-xs font-mono rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] uppercase"
                          />
                        </div>
                        <p className="text-[9.5px] text-[#6E6E6E]">
                          Fundo da seção atualmente ativa/selecionada na barra.
                        </p>
                      </div>

                      {/* Letra do Item Clicado / Ativo */}
                      <div className="p-3 rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider">
                            Letra Quando Clicada (Ativo)
                          </label>
                          <span className="text-[10.5px] font-mono text-[#6E6E6E]">
                            {coresCustomizadas.corNavAtivoTexto || '#FFFFFF'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={coresCustomizadas.corNavAtivoTexto || '#FFFFFF'}
                            onChange={(e) => handleAtualizarCorManual('corNavAtivoTexto', e.target.value)}
                            className="w-9 h-8 rounded-sm border border-[#D9D6D0] cursor-pointer p-0.5 bg-white"
                          />
                          <input
                            type="text"
                            value={coresCustomizadas.corNavAtivoTexto || '#FFFFFF'}
                            onChange={(e) => handleAtualizarCorManual('corNavAtivoTexto', e.target.value)}
                            className="flex-1 h-8 px-2.5 text-xs font-mono rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] uppercase"
                          />
                        </div>
                        <p className="text-[9.5px] text-[#6E6E6E]">
                          Cor da letra e ícone da seção ativa em alto contraste.
                        </p>
                      </div>

                      {/* Indicador / Borda Lateral do Item Clicado */}
                      <div className="p-3 rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider">
                            Indicador / Borda Clicada
                          </label>
                          <span className="text-[10.5px] font-mono text-[#6E6E6E]">
                            {coresCustomizadas.corNavAtivoBorda || coresCustomizadas.corSecundaria}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={coresCustomizadas.corNavAtivoBorda || coresCustomizadas.corSecundaria}
                            onChange={(e) => handleAtualizarCorManual('corNavAtivoBorda', e.target.value)}
                            className="w-9 h-8 rounded-sm border border-[#D9D6D0] cursor-pointer p-0.5 bg-white"
                          />
                          <input
                            type="text"
                            value={coresCustomizadas.corNavAtivoBorda || coresCustomizadas.corSecundaria}
                            onChange={(e) => handleAtualizarCorManual('corNavAtivoBorda', e.target.value)}
                            className="flex-1 h-8 px-2.5 text-xs font-mono rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] uppercase"
                          />
                        </div>
                        <p className="text-[9.5px] text-[#6E6E6E]">
                          Borda lateral esquerda indicativa de seleção.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* SEÇÃO 3: BLOCO INFERIOR DA BARRA (RODAPÉ / RESPONSÁVEL & NUVEM) */}
                  <div className="space-y-3 pt-2 border-t border-[#D9D6D0]">
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-2 text-[#5C3A22]">
                        <Contrast className="w-3.5 h-3.5" />
                        <span>3. Bloco Inferior da Barra (Responsável, Nuvem & Informações)</span>
                      </h3>
                      <p className="text-[11px] text-[#6E6E6E]">
                        O bloco inferior possui cores sempre contrastadas e harmonizadas na paleta do fundo para garantir que nome, cargo, status da nuvem e versão estejam 100% visíveis e legíveis.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Fundo do Bloco Inferior */}
                      <div className="p-3 rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider">
                            Fundo do Bloco Inferior
                          </label>
                          <span className="text-[10.5px] font-mono text-[#6E6E6E]">
                            {coresCustomizadas.corNavFooterBg || '#111111'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={coresCustomizadas.corNavFooterBg?.startsWith('#') ? coresCustomizadas.corNavFooterBg : '#111111'}
                            onChange={(e) => handleAtualizarCorManual('corNavFooterBg', e.target.value)}
                            className="w-9 h-8 rounded-sm border border-[#D9D6D0] cursor-pointer p-0.5 bg-white"
                          />
                          <input
                            type="text"
                            value={coresCustomizadas.corNavFooterBg || '#111111'}
                            onChange={(e) => handleAtualizarCorManual('corNavFooterBg', e.target.value)}
                            className="flex-1 h-8 px-2.5 text-xs font-mono rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] uppercase"
                          />
                        </div>
                        <p className="text-[9.5px] text-[#6E6E6E]">
                          Fundo do rodapé da barra lateral.
                        </p>
                      </div>

                      {/* Texto Principal do Rodapé (Nome do Responsável) */}
                      <div className="p-3 rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider">
                            Nome do Responsável
                          </label>
                          <span className="text-[10.5px] font-mono text-[#6E6E6E]">
                            {coresCustomizadas.corNavFooterTextoPrincipal || '#FFFFFF'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={coresCustomizadas.corNavFooterTextoPrincipal || '#FFFFFF'}
                            onChange={(e) => handleAtualizarCorManual('corNavFooterTextoPrincipal', e.target.value)}
                            className="w-9 h-8 rounded-sm border border-[#D9D6D0] cursor-pointer p-0.5 bg-white"
                          />
                          <input
                            type="text"
                            value={coresCustomizadas.corNavFooterTextoPrincipal || '#FFFFFF'}
                            onChange={(e) => handleAtualizarCorManual('corNavFooterTextoPrincipal', e.target.value)}
                            className="flex-1 h-8 px-2.5 text-xs font-mono rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] uppercase"
                          />
                        </div>
                        <p className="text-[9.5px] text-[#6E6E6E]">
                          Texto de alto contraste para leitura imediata do nome do usuário.
                        </p>
                      </div>

                      {/* Texto Secundário do Rodapé (Cargo, Nuvem & CRM) */}
                      <div className="p-3 rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider">
                            Cargo & Status da Nuvem
                          </label>
                          <span className="text-[10.5px] font-mono text-[#6E6E6E]">
                            {coresCustomizadas.corNavFooterTextoSecundario || '#C8C3BC'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={coresCustomizadas.corNavFooterTextoSecundario || '#C8C3BC'}
                            onChange={(e) => handleAtualizarCorManual('corNavFooterTextoSecundario', e.target.value)}
                            className="w-9 h-8 rounded-sm border border-[#D9D6D0] cursor-pointer p-0.5 bg-white"
                          />
                          <input
                            type="text"
                            value={coresCustomizadas.corNavFooterTextoSecundario || '#C8C3BC'}
                            onChange={(e) => handleAtualizarCorManual('corNavFooterTextoSecundario', e.target.value)}
                            className="flex-1 h-8 px-2.5 text-xs font-mono rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] uppercase"
                          />
                        </div>
                        <p className="text-[9.5px] text-[#6E6E6E]">
                          Cargo do colaborador, indicador de nuvem conectada e versão do CRM.
                        </p>
                      </div>

                      {/* Ícone do Rodapé */}
                      <div className="p-3 rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider">
                            Ícone de Logout & Ações
                          </label>
                          <span className="text-[10.5px] font-mono text-[#6E6E6E]">
                            {coresCustomizadas.corNavFooterIcone || '#D9D6D0'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={coresCustomizadas.corNavFooterIcone || '#D9D6D0'}
                            onChange={(e) => handleAtualizarCorManual('corNavFooterIcone', e.target.value)}
                            className="w-9 h-8 rounded-sm border border-[#D9D6D0] cursor-pointer p-0.5 bg-white"
                          />
                          <input
                            type="text"
                            value={coresCustomizadas.corNavFooterIcone || '#D9D6D0'}
                            onChange={(e) => handleAtualizarCorManual('corNavFooterIcone', e.target.value)}
                            className="flex-1 h-8 px-2.5 text-xs font-mono rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] uppercase"
                          />
                        </div>
                        <p className="text-[9.5px] text-[#6E6E6E]">
                          Botão de deslogar/trocar responsável no rodapé da barra.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Coluna Direita: SIMULADOR INTERATIVO EM TEMPO REAL (5 Colunas) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-[#F2EFEA]/40 rounded-sm p-4 border border-[#D9D6D0] space-y-3 sticky top-4">
                    <div className="flex items-center justify-between pb-2 border-b border-[#D9D6D0]">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                        <Eye className="w-4 h-4 text-[#5C3A22]" />
                        <span>Simulador Interativo da Barra</span>
                      </div>
                      <span className="text-[10px] text-[#5C3A22] font-bold uppercase tracking-wider">
                        Tempo Real
                      </span>
                    </div>

                    <p className="text-[11px] text-[#6E6E6E] leading-snug">
                      Passe o cursor sobre os itens abaixo para testar a cor <strong>antes</strong> e <strong>depois</strong> do cursor, o estado clicado e a legibilidade do bloco inferior:
                    </p>

                    {/* Barra Lateral Simulada */}
                    {(() => {
                      const cSim = obterCoresSidebarCompletas(coresCustomizadas);

                      return (
                        <div
                          className="rounded-sm text-white shadow-lg border border-black/30 overflow-hidden flex flex-col justify-between"
                          style={{ backgroundColor: cSim.corSidebar }}
                        >
                          {/* Topo / Marca Simulado */}
                          <div className="p-3 border-b border-white/10 bg-black/25 flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-sm bg-white text-[#1A1A1A] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs border-b-2"
                              style={{ borderBottomColor: cSim.corPrimaria }}
                            >
                              {config.monogramaIniciais || 'AR'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold tracking-wider text-white uppercase truncate">
                                {config.nomeEmpresa || 'Dra. Agda Rodrigues'}
                              </p>
                              <p
                                className="text-[9px] font-semibold uppercase tracking-wider truncate"
                                style={{ color: cSim.corSecundaria }}
                              >
                                {config.subtitulo || 'Harmonização Facial'}
                              </p>
                            </div>
                          </div>

                          {/* Itens Simulados com Interação de Hover */}
                          <div className="p-2.5 space-y-2">
                            {/* Categoria */}
                            <div
                              style={{ color: cSim.corNavCategoriaTexto }}
                              className="px-2 text-[9px] font-bold uppercase tracking-wider opacity-90"
                            >
                              Etapas do Funil
                            </div>

                            {/* Item 1: Estado Quando Clicada (Ativo) */}
                            <div
                              style={{
                                backgroundColor: cSim.corNavAtivoBg,
                                color: cSim.corNavAtivoTexto,
                                borderLeftColor: cSim.corNavAtivoBorda,
                              }}
                              className="p-2 rounded-sm font-semibold border-l-2 flex items-center justify-between text-xs shadow-xs cursor-default"
                            >
                              <div className="flex items-center gap-2">
                                <Flame className="w-3.5 h-3.5" style={{ color: cSim.corNavAtivoTexto }} />
                                <span className="text-[11.5px]">Em captação</span>
                              </div>
                              <span className="text-[8.5px] uppercase font-bold tracking-wider px-1 py-0.5 rounded-sm bg-white/20 text-white">
                                Clicada
                              </span>
                            </div>

                            {/* Item 2: Interativo - Antes e Depois do Cursor (Hover) */}
                            <div
                              onMouseEnter={() => setSimuladorHoverItemId('pos_consulta')}
                              onMouseLeave={() => setSimuladorHoverItemId(null)}
                              style={{
                                color:
                                  simuladorHoverItemId === 'pos_consulta'
                                    ? cSim.corNavTextoHover
                                    : cSim.corNavTextoInativo,
                                backgroundColor:
                                  simuladorHoverItemId === 'pos_consulta'
                                    ? cSim.corNavHoverBg
                                    : 'transparent',
                              }}
                              className="p-2 rounded-sm flex items-center justify-between text-xs transition-all duration-150 cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 transition-colors" />
                                <span className="text-[11.5px]">Pós consulta</span>
                              </div>
                              <span className="text-[9px] opacity-75 font-mono">
                                {simuladorHoverItemId === 'pos_consulta' ? 'Depois do Cursor' : 'Antes do Cursor'}
                              </span>
                            </div>

                            {/* Item 3: Cadastro Rápido / Padrão */}
                            <div
                              onMouseEnter={() => setSimuladorHoverItemId('cadastro_rapido')}
                              onMouseLeave={() => setSimuladorHoverItemId(null)}
                              style={{
                                color:
                                  simuladorHoverItemId === 'cadastro_rapido'
                                    ? cSim.corNavTextoHover
                                    : cSim.corNavTextoInativo,
                                backgroundColor:
                                  simuladorHoverItemId === 'cadastro_rapido'
                                    ? cSim.corNavHoverBg
                                    : 'transparent',
                              }}
                              className="p-2 rounded-sm flex items-center justify-between text-xs transition-all duration-150 cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <UserPlus className="w-3.5 h-3.5 transition-colors" />
                                <span className="text-[11.5px]">Cadastro rápido</span>
                              </div>
                              <ChevronRight className="w-3 h-3 opacity-60" />
                            </div>
                          </div>

                          {/* Bloco Inferior Simulado com Contraste */}
                          <div
                            style={{
                              backgroundColor: cSim.corNavFooterBg,
                            }}
                            className="p-2.5 border-t border-white/10 shrink-0 space-y-1.5 backdrop-blur-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  style={{ backgroundColor: cSim.corPrimaria, color: '#FFFFFF' }}
                                  className="w-6 h-6 rounded-sm flex items-center justify-center font-bold text-[10px] shrink-0 shadow-xs ring-1 ring-white/15"
                                >
                                  {config.monogramaIniciais || 'AR'}
                                </div>
                                <div className="min-w-0">
                                  <p
                                    style={{ color: cSim.corNavFooterTextoPrincipal }}
                                    className="text-[11px] font-bold truncate leading-tight tracking-wide"
                                  >
                                    Dra. Agda Rodrigues
                                  </p>
                                  <p
                                    style={{ color: cSim.corNavFooterTextoSecundario }}
                                    className="text-[9.5px] font-medium truncate opacity-95"
                                  >
                                    Gestora Master
                                  </p>
                                </div>
                              </div>
                              <div
                                style={{ color: cSim.corNavFooterIcone }}
                                className="p-1 rounded-sm text-xs"
                              >
                                <LogOut className="w-3.5 h-3.5" />
                              </div>
                            </div>

                            <div
                              style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                              className="flex items-center justify-between pt-1.5 border-t text-[9px]"
                            >
                              <span
                                style={{ color: cSim.corNavFooterTextoSecundario }}
                                className="flex items-center gap-1 font-medium"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-2xs" />
                                Nuvem Conectada
                              </span>
                              <span
                                style={{ color: cSim.corNavFooterTextoSecundario }}
                                className="text-[8.5px] uppercase font-mono tracking-wider opacity-85 font-semibold"
                              >
                                {config.monogramaIniciais || 'AR'} CRM
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleAjustarContrasteAutomatico}
                        className="w-full py-2 rounded-sm border border-[#D9D6D0] bg-white hover:bg-[#F2EFEA] text-[#1A1A1A] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Contrast className="w-3.5 h-3.5 text-[#5C3A22]" />
                        <span>Otimizar Contraste da Paleta</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 4: BACKUP & RESTAURAÇÃO */}
        {abaAtiva === 'backup' && (
          <div className="bg-white rounded-sm p-5 sm:p-6 border border-[#D9D6D0] shadow-xs space-y-6">
            <div>
              <h2 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#5C3A22]" />
                <span>Backup, Exportação & Restauração</span>
              </h2>
              <p className="text-xs text-[#6E6E6E] mt-0.5">
                Faça o download das configurações ou restaure o sistema para a identidade oficial original.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Exportar JSON */}
              <div className="p-4 rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/30 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                    <Download className="w-4 h-4 text-[#5C3A22]" />
                    <span>Exportar Configurações</span>
                  </div>
                  <p className="text-xs text-[#6E6E6E] leading-relaxed">
                    Baixe um arquivo de backup em JSON contendo todos os dados cadastrais, logotipo e paletas de cores salvas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportarConfig}
                  className="w-full py-2.5 rounded-sm bg-[#1A1A1A] hover:bg-[#5C3A22] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Arquivo JSON</span>
                </button>
              </div>

              {/* Limpar Leads Simulados / Zerar Base */}
              <div className="p-4 rounded-sm border border-amber-300 bg-amber-50/40 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-950 uppercase tracking-wider">
                    <Trash2 className="w-4 h-4 text-amber-700" />
                    <span>Limpar Banco de Pacientes ({leads.length})</span>
                  </div>
                  <p className="text-xs text-amber-900/80 leading-relaxed">
                    Apaga todos os leads de teste, fichas clínicas e histórico de compras simuladas para iniciar o uso real do CRM.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalLimparLeadsAberto(true)}
                  className="w-full py-2.5 rounded-sm bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Zerar Banco de Leads</span>
                </button>
              </div>

              {/* Restaurar Padrão Oficial */}
              <div className="p-4 rounded-sm border border-rose-200 bg-rose-50/40 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-900 uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Restaurar Padrão Oficial</span>
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    Restaura o nome oficial, o monograma clássico "AR" e a paleta nobre Nogueira & Concreto.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetarGeral}
                  className="w-full py-2.5 rounded-sm bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restaurar Identidade</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ABA 4: CONTROLE DE PROCEDIMENTOS & ESTATÍSTICAS */}
        {abaAtiva === 'procedimentos' && <ControleProcedimentosView />}
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE LIMPEZA DE LEADS */}
      {modalLimparLeadsAberto && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-sm border border-amber-400 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 border-b border-amber-200 pb-3 text-amber-900">
              <div className="w-10 h-10 rounded-sm bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-950">
                  Zerar Banco de Pacientes / Leads
                </h3>
                <p className="text-xs text-amber-800 font-medium">Limpeza de dados de teste</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-[#1A1A1A] leading-relaxed bg-[#F8F7F4] p-3.5 rounded-sm border border-[#D9D6D0]">
              <p className="text-[#6E6E6E]">
                Esta ação apagará permanentemente todos os <strong>{leads.length}</strong> pacientes/leads atualmente cadastrados no CRM, assim como todas as suas anotações e históricos de compras.
              </p>
              <p className="text-[11px] text-amber-900 font-semibold pt-1">
                Utilize esta opção para deixar o banco completamente limpo e pronto para receber leads reais da clínica ou importações via planilha.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isLimpandoLeads}
                onClick={() => setModalLimparLeadsAberto(false)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#6E6E6E] hover:bg-[#F2EFEA] rounded-sm transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isLimpandoLeads}
                onClick={handleConfirmarLimpezaLeads}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-amber-700 hover:bg-amber-800 rounded-sm transition-colors cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isLimpandoLeads ? 'Limpando Base...' : 'Sim, Limpar Todos os Leads'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SALVAR NOVA ESTÉTICA */}
      {modalSalvarEsteticaAberto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-sm border border-[#D9D6D0] p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9D6D0]">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1A1A1A] uppercase tracking-wider">
                <Palette className="w-4 h-4 text-[#5C3A22]" />
                <span>Salvar Nova Estética</span>
              </div>
              <button
                type="button"
                onClick={() => setModalSalvarEsteticaAberto(false)}
                className="text-[#6E6E6E] hover:text-[#1A1A1A] font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider block">
                Nome da Estética
              </label>
              <input
                type="text"
                value={nomeNovaEstetica}
                onChange={(e) => setNomeNovaEstetica(e.target.value)}
                placeholder="Ex: Minha Clínica Ouro & Grafite"
                className="w-full h-9 px-3 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] focus:outline-hidden"
              />
              <p className="text-[11px] text-[#6E6E6E]">
                As 6 cores ajustadas no painel serão vinculadas a este nome e ficarão disponíveis na galeria.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D9D6D0]">
              <button
                type="button"
                onClick={() => setModalSalvarEsteticaAberto(false)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#6E6E6E] hover:bg-[#F2EFEA] rounded-sm transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarEsteticaPersonalizada}
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-[#5C3A22] hover:bg-[#8A6142] text-white rounded-sm transition-colors cursor-pointer shadow-xs"
              >
                Salvar & Ativar
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
