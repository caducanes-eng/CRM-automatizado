import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Users,
  DollarSign,
  Edit2,
  PowerOff,
  Power,
  Crown,
  Phone,
  Mail,
  Trash2,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink,
  Shield,
  Layers,
} from 'lucide-react';
import { useEmpresa } from '../context/EmpresaContext';
import { useAuth } from '../context/AuthContext';
import { useCrm } from '../context/CrmContext';
import { Empresa, CriarEmpresaPayload, AtualizarEmpresaPayload, PapelEmpresa } from '../types';

export const PainelPlataformaView: React.FC = () => {
  const {
    empresas,
    empresaAtivaId,
    definirEmpresaAtivaId,
    criarEmpresa,
    atualizarEmpresa,
    suspenderEmpresa,
    reativarEmpresa,
    excluirEmpresa,
    plataformaAdmins,
    promoverParaAdminPlataforma,
    removerAdminPlataforma,
    empresaMembros,
    vincularUsuarioEmpresa,
    removerAcessoUsuario,
    isPlataformaAdmin,
  } = useEmpresa();

  const { usuarios } = useAuth();
  const { todosLeads, todasCompras } = useCrm();

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativa' | 'suspensa'>('todos');
  const [modalNovaEmpresa, setModalNovaEmpresa] = useState(false);
  const [empresaEditando, setEmpresaEditando] = useState<Empresa | null>(null);
  const [modalNovoAdmin, setModalNovoAdmin] = useState(false);
  const [novoAdminEmail, setNovoAdminEmail] = useState('');
  const [novoAdminNome, setNovoAdminNome] = useState('');
  const [abaAtiva, setAbaAtiva] = useState<'empresas' | 'admins' | 'visao_geral'>('empresas');

  // Form states para criação/edição
  const [formNome, setFormNome] = useState('');
  const [formSubtitulo, setFormSubtitulo] = useState('');
  const [formCnpj, setFormCnpj] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formEndereco, setFormEndereco] = useState('');
  const [formUnidadePadrao, setFormUnidadePadrao] = useState('');
  const [formAdminNome, setFormAdminNome] = useState('');
  const [formAdminEmail, setFormAdminEmail] = useState('');
  const [formAdminCargo, setFormAdminCargo] = useState('Gestor Master');
  const [formMonograma, setFormMonograma] = useState('');
  const [isSalvando, setIsSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  const resetForm = () => {
    setFormNome('');
    setFormSubtitulo('');
    setFormCnpj('');
    setFormTelefone('');
    setFormEmail('');
    setFormEndereco('');
    setFormUnidadePadrao('');
    setFormAdminNome('');
    setFormAdminEmail('');
    setFormAdminCargo('Gestor Master');
    setFormMonograma('');
    setEmpresaEditando(null);
    setErroForm(null);
  };

  const abrirModalNova = () => {
    resetForm();
    setModalNovaEmpresa(true);
  };

  const abrirModalEditar = (emp: Empresa) => {
    setEmpresaEditando(emp);
    setFormNome(emp.nome);
    setFormSubtitulo(emp.subtitulo || '');
    setFormCnpj(emp.cnpj || '');
    setFormTelefone(emp.telefone || '');
    setFormEmail(emp.email || '');
    setFormEndereco(emp.endereco || '');
    setFormUnidadePadrao(emp.unidadePadrao || '');
    setFormAdminNome(emp.adminPrincipalNome || '');
    setFormAdminEmail(emp.adminPrincipalEmail || '');
    setFormMonograma(emp.monogramaIniciais || '');
    setErroForm(null);
    setModalNovaEmpresa(true);
  };

  const handleSalvarEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      setErroForm('O nome da clínica é obrigatório.');
      return;
    }

    setIsSalvando(true);
    setErroForm(null);
    try {
      if (empresaEditando) {
        const payload: AtualizarEmpresaPayload = {
          nome: formNome.trim(),
          subtitulo: formSubtitulo.trim() || undefined,
          cnpj: formCnpj.trim() || undefined,
          telefone: formTelefone.trim() || undefined,
          email: formEmail.trim() || undefined,
          endereco: formEndereco.trim() || undefined,
          unidadePadrao: formUnidadePadrao.trim() || undefined,
          monogramaIniciais: formMonograma.trim().toUpperCase() || undefined,
        };
        await atualizarEmpresa(empresaEditando.id, payload);
      } else {
        const payload: CriarEmpresaPayload = {
          nome: formNome.trim(),
          subtitulo: formSubtitulo.trim() || undefined,
          cnpj: formCnpj.trim() || undefined,
          telefone: formTelefone.trim() || undefined,
          email: formEmail.trim() || undefined,
          endereco: formEndereco.trim() || undefined,
          unidadePadrao: formUnidadePadrao.trim() || undefined,
          adminNome: formAdminNome.trim() || undefined,
          adminEmail: formAdminEmail.trim() || undefined,
          adminCargo: formAdminCargo.trim() || 'Gestor Master',
          monogramaIniciais: formMonograma.trim().toUpperCase() || formNome.trim().substring(0, 2).toUpperCase(),
        };
        await criarEmpresa(payload);
      }
      setModalNovaEmpresa(false);
      resetForm();
    } catch (err: any) {
      console.error('Erro ao salvar empresa:', err);
      setErroForm('Erro ao salvar os dados da clínica. Verifique os campos.');
    } finally {
      setIsSalvando(false);
    }
  };

  const handleAdicionarAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoAdminEmail.trim()) return;
    try {
      await promoverParaAdminPlataforma(
        `user-plat-${Date.now()}`,
        novoAdminEmail.trim(),
        novoAdminNome.trim() || 'Gestor Geral da Plataforma'
      );
      setNovoAdminEmail('');
      setNovoAdminNome('');
      setModalNovoAdmin(false);
    } catch (err) {
      console.error('Erro ao adicionar admin:', err);
    }
  };

  // Filtragem
  const empresasFiltradas = useMemo(() => {
    return empresas.filter((emp) => {
      const matchBusca =
        emp.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (emp.email && emp.email.toLowerCase().includes(busca.toLowerCase())) ||
        (emp.adminPrincipalEmail && emp.adminPrincipalEmail.toLowerCase().includes(busca.toLowerCase())) ||
        (emp.cnpj && emp.cnpj.includes(busca));

      if (!matchBusca) return false;

      if (filtroStatus === 'todos') return true;
      return emp.status === filtroStatus;
    });
  }, [empresas, busca, filtroStatus]);

  // Estatísticas Globais
  const statsGlobais = useMemo(() => {
    const ativas = empresas.filter((e) => e.status === 'ativa').length;
    const suspensas = empresas.filter((e) => e.status === 'suspensa').length;
    const totalLeads = todosLeads.length;
    const totalFaturamento = todasCompras.reduce((sum, c) => sum + (Number(c.valor) || 0), 0);
    const totalUsuarios = usuarios.filter((u) => !u.deleted_at).length;

    return {
      totalEmpresas: empresas.length,
      ativas,
      suspensas,
      totalLeads,
      totalFaturamento,
      totalUsuarios,
    };
  }, [empresas, todosLeads, todasCompras, usuarios]);

  return (
    <div id="painel-plataforma-view" className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho do Painel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#D9D6D0]">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#1A1A1A] text-white tracking-wide uppercase">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              Super Gestor
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1A1A] uppercase">
              Gestão Geral da Plataforma
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#6E6E6E] mt-1">
            Controle centralizado de todas as clínicas e consultórios, isolamento de dados e administradores gerais.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-novo-admin-plataforma"
            type="button"
            onClick={() => setModalNovoAdmin(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-sm border border-[#D9D6D0] text-xs font-bold text-[#1A1A1A] bg-white hover:bg-[#F2EFEA] transition-colors cursor-pointer shadow-2xs"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            Adicionar Super Admin
          </button>
          <button
            id="btn-cadastrar-nova-clinica"
            type="button"
            onClick={abrirModalNova}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-bold text-white bg-[#1A1A1A] hover:bg-[#333333] transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Nova Clínica
          </button>
        </div>
      </div>

      {/* Cartões de Métricas Globais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="p-4 bg-white rounded-sm border border-[#D9D6D0] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#6E6E6E]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total de Clínicas</span>
            <Building2 className="w-4 h-4 text-[#1A1A1A]" />
          </div>
          <p className="text-2xl font-black text-[#1A1A1A]">{statsGlobais.totalEmpresas}</p>
          <div className="flex items-center gap-2 text-[10px] text-[#6E6E6E]">
            <span className="text-emerald-700 font-bold">{statsGlobais.ativas} ativas</span>
            {statsGlobais.suspensas > 0 && (
              <>
                <span>•</span>
                <span className="text-rose-700 font-bold">{statsGlobais.suspensas} suspensas</span>
              </>
            )}
          </div>
        </div>

        <div className="p-4 bg-white rounded-sm border border-[#D9D6D0] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#6E6E6E]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pacientes Registrados</span>
            <Users className="w-4 h-4 text-[#1A1A1A]" />
          </div>
          <p className="text-2xl font-black text-[#1A1A1A]">{statsGlobais.totalLeads.toLocaleString('pt-BR')}</p>
          <p className="text-[10px] text-[#6E6E6E]">Total consolidado em todas as empresas</p>
        </div>

        <div className="p-4 bg-white rounded-sm border border-[#D9D6D0] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#6E6E6E]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Volume Transacionado</span>
            <DollarSign className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-2xl font-black text-emerald-800">
            {statsGlobais.totalFaturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="text-[10px] text-[#6E6E6E]">Procedimentos e vendas na plataforma</p>
        </div>

        <div className="p-4 bg-white rounded-sm border border-[#D9D6D0] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#6E6E6E]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Super Admins</span>
            <Shield className="w-4 h-4 text-indigo-700" />
          </div>
          <p className="text-2xl font-black text-[#1A1A1A]">{plataformaAdmins.length + 2}</p>
          <p className="text-[10px] text-[#6E6E6E]">Gestores com controle master irrestrito</p>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex items-center gap-2 border-b border-[#D9D6D0]">
        <button
          type="button"
          onClick={() => setAbaAtiva('empresas')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-b-2 -mb-[1px] ${
            abaAtiva === 'empresas'
              ? 'border-[#1A1A1A] text-[#1A1A1A]'
              : 'border-transparent text-[#6E6E6E] hover:text-[#1A1A1A]'
          }`}
        >
          Clínicas Cadastradas ({empresas.length})
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva('admins')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-b-2 -mb-[1px] ${
            abaAtiva === 'admins'
              ? 'border-[#1A1A1A] text-[#1A1A1A]'
              : 'border-transparent text-[#6E6E6E] hover:text-[#1A1A1A]'
          }`}
        >
          Super Administradores ({plataformaAdmins.length + 2})
        </button>
      </div>

      {/* ABA: LISTA DE EMPRESAS / CLÍNICAS */}
      {abaAtiva === 'empresas' && (
        <div className="space-y-4">
          {/* Filtros e Busca */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6E6E]" />
              <input
                type="text"
                placeholder="Buscar por nome da clínica, e-mail ou CNPJ..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:outline-hidden focus:border-[#1A1A1A]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setFiltroStatus('todos')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${
                  filtroStatus === 'todos'
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-white border border-[#D9D6D0] text-[#1A1A1A] hover:bg-[#F2EFEA]'
                }`}
              >
                Todas ({empresas.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatus('ativa')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${
                  filtroStatus === 'ativa'
                    ? 'bg-emerald-800 text-white'
                    : 'bg-white border border-[#D9D6D0] text-[#1A1A1A] hover:bg-[#F2EFEA]'
                }`}
              >
                Ativas ({statsGlobais.ativas})
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatus('suspensa')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${
                  filtroStatus === 'suspensa'
                    ? 'bg-rose-800 text-white'
                    : 'bg-white border border-[#D9D6D0] text-[#1A1A1A] hover:bg-[#F2EFEA]'
                }`}
              >
                Suspensas ({statsGlobais.suspensas})
              </button>
            </div>
          </div>

          {/* Tabela de Empresas */}
          <div className="bg-white border border-[#D9D6D0] rounded-sm overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#1A1A1A]">
                <thead className="bg-[#F8F7F4] border-b border-[#D9D6D0] text-[10.5px] uppercase font-bold tracking-wider text-[#6E6E6E]">
                  <tr>
                    <th className="py-3 px-4">Clínica / Empresa</th>
                    <th className="py-3 px-4">Responsável & Contato</th>
                    <th className="py-3 px-4">Endereço & Unidade</th>
                    <th className="py-3 px-4">Volume CRM</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9D6D0]/60">
                  {empresasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#6E6E6E]">
                        Nenhuma clínica encontrada para os filtros informados.
                      </td>
                    </tr>
                  ) : (
                    empresasFiltradas.map((emp) => {
                      const isAtivaAtual = emp.id === empresaAtivaId;
                      const leadsCount = todosLeads.filter((l) => l.empresaId === emp.id).length;
                      const comprasSum = todasCompras
                        .filter((c) => c.empresaId === emp.id)
                        .reduce((sum, c) => sum + (Number(c.valor) || 0), 0);

                      return (
                        <tr
                          key={emp.id}
                          className={`hover:bg-[#F8F7F4]/60 transition-colors ${
                            isAtivaAtual ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-sm bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                {emp.monogramaIniciais || emp.nome.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-[#1A1A1A]">{emp.nome}</span>
                                  {isAtivaAtual && (
                                    <span className="px-1.5 py-0.5 rounded-2xs text-[9px] font-bold bg-amber-200 text-amber-900">
                                      Espaço Ativo
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-[#6E6E6E] flex items-center gap-2">
                                  {emp.subtitulo && <span>{emp.subtitulo}</span>}
                                  {emp.cnpj && <span>• CNPJ: {emp.cnpj}</span>}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-[#1A1A1A]">
                                {emp.adminPrincipalNome || 'Administrador Principal'}
                              </p>
                              {emp.email && (
                                <p className="text-[10.5px] text-[#6E6E6E] flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {emp.email}
                                </p>
                              )}
                              {emp.telefone && (
                                <p className="text-[10.5px] text-[#6E6E6E] flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {emp.telefone}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-[11px] text-[#6E6E6E]">
                            <div className="flex items-center gap-1 text-[#1A1A1A] font-medium">
                              <MapPin className="w-3 h-3 text-[#6E6E6E]" />
                              <span className="truncate max-w-[200px]">{emp.endereco || 'Endereço não cadastrado'}</span>
                            </div>
                            {emp.unidadePadrao && (
                              <div className="text-[10px] text-[#6E6E6E] mt-0.5">
                                Unidade: {emp.unidadePadrao}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-[11px]">
                            <div className="font-bold text-[#1A1A1A]">
                              {leadsCount} <span className="font-normal text-[#6E6E6E]">pacientes</span>
                            </div>
                            <div className="text-[10px] text-emerald-800 font-semibold">
                              {comprasSum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {emp.status === 'ativa' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3" />
                                Ativa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                <AlertTriangle className="w-3 h-3" />
                                Suspensa
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {/* Botão Entrar / Alternar Espaço */}
                              <button
                                type="button"
                                onClick={() => definirEmpresaAtivaId(emp.id)}
                                title="Abrir e gerenciar esta clínica"
                                className={`px-2.5 py-1 rounded-sm text-[11px] font-bold transition-colors cursor-pointer ${
                                  isAtivaAtual
                                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                                    : 'bg-[#1A1A1A] text-white hover:bg-[#333333]'
                                }`}
                              >
                                {isAtivaAtual ? 'Ativa' : 'Acessar'}
                              </button>

                              {/* Editar */}
                              <button
                                type="button"
                                onClick={() => abrirModalEditar(emp)}
                                title="Editar dados da clínica"
                                className="p-1.5 rounded-sm border border-[#D9D6D0] hover:bg-[#F2EFEA] text-[#1A1A1A] transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Suspender / Reativar */}
                              {emp.status === 'suspensa' ? (
                                <button
                                  type="button"
                                  onClick={() => reativarEmpresa(emp.id)}
                                  title="Reativar acesso da clínica"
                                  className="p-1.5 rounded-sm bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 transition-colors cursor-pointer"
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => suspenderEmpresa(emp.id)}
                                  title="Suspender acesso desta clínica"
                                  className="p-1.5 rounded-sm border border-rose-200 hover:bg-rose-50 text-rose-700 transition-colors cursor-pointer"
                                >
                                  <PowerOff className="w-3.5 h-3.5" />
                                </button>
                              )}
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
        </div>
      )}

      {/* ABA: SUPER ADMINS DA PLATAFORMA */}
      {abaAtiva === 'admins' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-sm text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Crown className="w-4 h-4 text-amber-700" />
              Privilégios de Gestor Geral da Plataforma
            </div>
            <p>
              Estes usuários têm autoridade irrestrita para visualizar, criar, editar e suspender qualquer clínica,
              definir configurações corporativas e auditar todas as bases de dados sem restrições.
            </p>
          </div>

          <div className="bg-white border border-[#D9D6D0] rounded-sm overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs text-[#1A1A1A]">
              <thead className="bg-[#F8F7F4] border-b border-[#D9D6D0] text-[10.5px] uppercase font-bold tracking-wider text-[#6E6E6E]">
                <tr>
                  <th className="py-3 px-4">Nome do Administrador</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4">Origem</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9D6D0]/60">
                {/* Master principal */}
                <tr className="bg-[#F8F7F4]/30">
                  <td className="py-3 px-4 font-bold text-[#1A1A1A] flex items-center gap-2">
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                    Cadu Canes
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-[#6E6E6E]">caducanes@gmail.com</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-100 text-amber-900">
                      Master Plataforma
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-[10px] text-[#6E6E6E] font-medium italic">
                    Protegido
                  </td>
                </tr>

                <tr className="bg-[#F8F7F4]/30">
                  <td className="py-3 px-4 font-bold text-[#1A1A1A] flex items-center gap-2">
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                    Dra. Agda Rodrigues
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-[#6E6E6E]">gestao@agdarodrigues.med.br</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-100 text-amber-900">
                      Master Plataforma
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-[10px] text-[#6E6E6E] font-medium italic">
                    Protegido
                  </td>
                </tr>

                {plataformaAdmins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-[#F8F7F4]/50">
                    <td className="py-3 px-4 font-bold text-[#1A1A1A] flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      {adm.nome || 'Administrador'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#6E6E6E]">{adm.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-100 text-emerald-900">
                        Admin Adicionado
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => removerAdminPlataforma(adm.userId)}
                        className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-sm transition-colors cursor-pointer"
                        title="Remover privilégios de Super Admin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NOVA / EDITAR EMPRESA */}
      {modalNovaEmpresa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-sm border border-[#D9D6D0] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-4 sm:p-6 border-b border-[#D9D6D0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#1A1A1A]" />
                <h2 className="text-base sm:text-lg font-bold uppercase text-[#1A1A1A]">
                  {empresaEditando ? 'Editar Clínica' : 'Cadastrar Nova Clínica'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalNovaEmpresa(false);
                  resetForm();
                }}
                className="text-[#6E6E6E] hover:text-[#1A1A1A] text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarEmpresa} className="p-4 sm:p-6 space-y-4 text-xs">
              {erroForm && (
                <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-sm">
                  {erroForm}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#1A1A1A] mb-1">
                    Nome da Clínica / Razão Social *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Clínica Bem Estar Harmonização"
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D9D6D0] rounded-sm bg-white text-[#1A1A1A] focus:outline-hidden focus:border-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#6E6E6E] mb-1">Subtítulo / Especialidade</label>
                  <input
                    type="text"
                    placeholder="Ex: Medicina Estética & Harmonização"
                    value={formSubtitulo}
                    onChange={(e) => setFormSubtitulo(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D9D6D0] rounded-sm bg-white text-[#1A1A1A] focus:outline-hidden focus:border-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#6E6E6E] mb-1">Monograma / Iniciais (Ex: BE)</label>
                  <input
                    type="text"
                    maxLength={3}
                    placeholder="Ex: BE"
                    value={formMonograma}
                    onChange={(e) => setFormMonograma(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-[#D9D6D0] rounded-sm bg-white text-[#1A1A1A] focus:outline-hidden focus:border-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#6E6E6E] mb-1">CNPJ / CPF</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={formCnpj}
                    onChange={(e) => setFormCnpj(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D9D6D0] rounded-sm bg-white text-[#1A1A1A] focus:outline-hidden focus:border-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#6E6E6E] mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={formTelefone}
                    onChange={(e) => setFormTelefone(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D9D6D0] rounded-sm bg-white text-[#1A1A1A] focus:outline-hidden focus:border-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#6E6E6E] mb-1">E-mail Principal</label>
                  <input
                    type="email"
                    placeholder="contato@clinicabemestar.com.br"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D9D6D0] rounded-sm bg-white text-[#1A1A1A] focus:outline-hidden focus:border-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#6E6E6E] mb-1">Unidade Padrão</label>
                  <input
                    type="text"
                    placeholder="Ex: Consultório Principal - Sala 101"
                    value={formUnidadePadrao}
                    onChange={(e) => setFormUnidadePadrao(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D9D6D0] rounded-sm bg-white text-[#1A1A1A] focus:outline-hidden focus:border-[#1A1A1A]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#6E6E6E] mb-1">Endereço Completo</label>
                  <input
                    type="text"
                    placeholder="Av. Paulista, 1000 - Bela Vista, São Paulo/SP"
                    value={formEndereco}
                    onChange={(e) => setFormEndereco(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D9D6D0] rounded-sm bg-white text-[#1A1A1A] focus:outline-hidden focus:border-[#1A1A1A]"
                  />
                </div>

                {!empresaEditando && (
                  <>
                    <div className="sm:col-span-2 pt-2 border-t border-[#D9D6D0]">
                      <h3 className="font-bold text-[#1A1A1A] uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                        Responsável Inicial da Clínica
                      </h3>
                    </div>

                    <div>
                      <label className="block font-semibold text-[#6E6E6E] mb-1">Nome do Responsável</label>
                      <input
                        type="text"
                        placeholder="Ex: Dra. Juliana Santos"
                        value={formAdminNome}
                        onChange={(e) => setFormAdminNome(e.target.value)}
                        className="w-full px-3 py-2 border border-[#D9D6D0] rounded-sm bg-white text-[#1A1A1A] focus:outline-hidden focus:border-[#1A1A1A]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#6E6E6E] mb-1">E-mail do Responsável</label>
                      <input
                        type="email"
                        placeholder="juliana@clinica.com.br"
                        value={formAdminEmail}
                        onChange={(e) => setFormAdminEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-[#D9D6D0] rounded-sm bg-white text-[#1A1A1A] focus:outline-hidden focus:border-[#1A1A1A]"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#D9D6D0]">
                <button
                  type="button"
                  onClick={() => {
                    setModalNovaEmpresa(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-[#D9D6D0] text-xs font-bold text-[#1A1A1A] hover:bg-[#F2EFEA] rounded-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSalvando}
                  className="px-5 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-white text-xs font-bold rounded-sm cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSalvando ? 'Salvando...' : empresaEditando ? 'Salvar Alterações' : 'Criar Clínica'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR SUPER ADMIN */}
      {modalNovoAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-sm border border-[#D9D6D0] w-full max-w-md shadow-2xl">
            <div className="p-4 sm:p-5 border-b border-[#D9D6D0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-600" />
                <h2 className="text-sm sm:text-base font-bold uppercase text-[#1A1A1A]">
                  Adicionar Gestor da Plataforma
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalNovoAdmin(false)}
                className="text-[#6E6E6E] hover:text-[#1A1A1A] text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdicionarAdmin} className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#1A1A1A] mb-1">Nome do Gestor</label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Oliveira"
                  value={novoAdminNome}
                  onChange={(e) => setNovoAdminNome(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D9D6D0] rounded-sm bg-white text-[#1A1A1A] focus:outline-hidden focus:border-[#1A1A1A]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1A1A1A] mb-1">E-mail do Gestor *</label>
                <input
                  type="email"
                  required
                  placeholder="admin@dominio.com"
                  value={novoAdminEmail}
                  onChange={(e) => setNovoAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D9D6D0] rounded-sm bg-white text-[#1A1A1A] focus:outline-hidden focus:border-[#1A1A1A]"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-sm text-[11px] text-amber-900 border border-amber-200">
                Atenção: Ao conceder este acesso, o usuário poderá visualizar e manipular todos os dados de todas as
                clínicas registradas no sistema.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D9D6D0]">
                <button
                  type="button"
                  onClick={() => setModalNovoAdmin(false)}
                  className="px-3.5 py-1.5 border border-[#D9D6D0] text-xs font-bold text-[#1A1A1A] hover:bg-[#F2EFEA] rounded-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-white text-xs font-bold rounded-sm cursor-pointer shadow-xs"
                >
                  Confirmar Acesso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
