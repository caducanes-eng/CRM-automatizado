import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  UserPlus,
  KeyRound,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  Edit3,
  Trash2,
  RotateCcw,
  Sparkles,
  Users,
  Search,
  Filter,
  AlertTriangle,
  Stethoscope,
  PhoneCall,
  RefreshCw,
  Sliders,
  DollarSign,
  FileText,
  HelpCircle,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  UsuarioColaborador,
  NivelAcesso,
  PermissoesUsuario,
  CriarUsuarioPayload,
  AtualizarUsuarioPayload,
  PERMISSOES_PRESET_GESTOR,
  PERMISSOES_PRESET_MEDICO,
  PERMISSOES_PRESET_RECEPCAO,
  PERMISSOES_PRESET_POS_VENDA,
} from '../types';

export const ControleAcessosView: React.FC = () => {
  const {
    usuarios,
    usuarioLogado,
    responsavelAtivo,
    isGestor,
    criarColaborador,
    atualizarColaborador,
    alternarStatusColaborador,
    excluirColaborador,
    redefinirSenhaColaborador,
    resetarUsuariosPadrao,
    loginComResponsavel,
  } = useAuth();

  // Estados de Filtro & Busca
  const [busca, setBusca] = useState('');
  const [filtroRole, setFiltroRole] = useState<string>('TODOS');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');

  // Estados de Modais
  const [modalNovoUsuarioAberto, setModalNovoUsuarioAberto] = useState(false);
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState<UsuarioColaborador | null>(null);
  const [usuarioRedefinirSenha, setUsuarioRedefinirSenha] = useState<UsuarioColaborador | null>(null);
  const [usuarioExcluir, setUsuarioExcluir] = useState<UsuarioColaborador | null>(null);

  // Estados de Feedback
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [senhaVisivelId, setSenhaVisivelId] = useState<string | null>(null);
  const [feedbackSucesso, setFeedbackSucesso] = useState<string | null>(null);

  // Formulário de Criação / Edição
  const [formData, setFormData] = useState<{
    nome: string;
    email: string;
    login: string;
    senhaPadrao: string;
    cargo: string;
    role: NivelAcesso;
    telefone: string;
    observacoes: string;
    permissoes: PermissoesUsuario;
  }>({
    nome: '',
    email: '',
    login: '',
    senhaPadrao: 'Agda@2026',
    cargo: '',
    role: 'RECEPCAO_COMERCIAL',
    telefone: '',
    observacoes: '',
    permissoes: { ...PERMISSOES_PRESET_RECEPCAO },
  });

  const [formErro, setFormErro] = useState<string | null>(null);
  const [formSalvando, setFormSalvando] = useState(false);

  // Nova senha temporária para modal de redefinição
  const [novaSenhaTemp, setNovaSenhaTemp] = useState('Agda@2026');

  // Helper para copiar texto
  const copiarTexto = (texto: string, id: string) => {
    navigator.clipboard.writeText(texto);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2500);
  };

  // Helper para exibir feedback temporário
  const dispararFeedback = (msg: string) => {
    setFeedbackSucesso(msg);
    setTimeout(() => setFeedbackSucesso(null), 3500);
  };

  // Abrir Modal de Criação
  const handleAbrirCriar = () => {
    setFormData({
      nome: '',
      email: '',
      login: '',
      senhaPadrao: 'Agda@2026',
      cargo: '',
      role: 'RECEPCAO_COMERCIAL',
      telefone: '',
      observacoes: '',
      permissoes: { ...PERMISSOES_PRESET_RECEPCAO },
    });
    setFormErro(null);
    setUsuarioEmEdicao(null);
    setModalNovoUsuarioAberto(true);
  };

  // Abrir Modal de Edição
  const handleAbrirEditar = (user: UsuarioColaborador) => {
    setFormData({
      nome: user.nome,
      email: user.email,
      login: user.login || user.email.split('@')[0],
      senhaPadrao: user.senhaPadrao,
      cargo: user.cargo,
      role: user.role,
      telefone: user.telefone || '',
      observacoes: user.observacoes || '',
      permissoes: { ...user.permissoes },
    });
    setFormErro(null);
    setUsuarioEmEdicao(user);
    setModalNovoUsuarioAberto(true);
  };

  // Mudar Preset ao selecionar Cargo / Role
  const handleSelecionarRole = (role: NivelAcesso) => {
    let permissoesPreset = formData.permissoes;
    if (role === 'GESTOR') permissoesPreset = { ...PERMISSOES_PRESET_GESTOR };
    else if (role === 'MEDICO') permissoesPreset = { ...PERMISSOES_PRESET_MEDICO };
    else if (role === 'RECEPCAO_COMERCIAL') permissoesPreset = { ...PERMISSOES_PRESET_RECEPCAO };
    else if (role === 'POS_VENDA') permissoesPreset = { ...PERMISSOES_PRESET_POS_VENDA };

    setFormData((prev) => ({
      ...prev,
      role,
      permissoes: permissoesPreset,
    }));
  };

  // Toggle de permissão individual
  const handleTogglePermissao = (chave: keyof PermissoesUsuario) => {
    setFormData((prev) => {
      const updated = {
        ...prev.permissoes,
        [chave]: !prev.permissoes[chave],
      };
      return {
        ...prev,
        role: 'PERSONALIZADO', // Marca como personalizado se o gestor alterar granularmente
        permissoes: updated,
      };
    });
  };

  // Salvar Criação ou Edição
  const handleSalvarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErro(null);

    if (!formData.nome.trim()) {
      setFormErro('Informe o nome completo do colaborador.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setFormErro('Informe um e-mail válido para login no sistema.');
      return;
    }
    if (!formData.cargo.trim()) {
      setFormErro('Informe o cargo ou função do colaborador na clínica.');
      return;
    }
    if (!formData.senhaPadrao.trim() || formData.senhaPadrao.length < 6) {
      setFormErro('A senha de acesso deve conter pelo menos 6 caracteres.');
      return;
    }

    setFormSalvando(true);
    try {
      const loginFinal = formData.login.trim() || formData.email.trim().split('@')[0];

      if (usuarioEmEdicao) {
        // Atualização
        await atualizarColaborador(usuarioEmEdicao.id, {
          nome: formData.nome,
          email: formData.email,
          login: loginFinal,
          senhaPadrao: formData.senhaPadrao,
          cargo: formData.cargo,
          role: formData.role,
          telefone: formData.telefone,
          observacoes: formData.observacoes,
          permissoes: formData.permissoes,
        });
        dispararFeedback(`Colaborador "${formData.nome}" atualizado com sucesso!`);
      } else {
        // Criação
        await criarColaborador({
          nome: formData.nome,
          email: formData.email,
          login: loginFinal,
          senhaPadrao: formData.senhaPadrao,
          cargo: formData.cargo,
          role: formData.role,
          telefone: formData.telefone,
          observacoes: formData.observacoes,
          permissoes: formData.permissoes,
        });
        dispararFeedback(`Credencial de acesso criada para "${formData.nome}"!`);
      }
      setModalNovoUsuarioAberto(false);
      setUsuarioEmEdicao(null);
    } catch (err: any) {
      console.error('Erro ao salvar usuário:', err);
      setFormErro('Ocorreu um erro ao salvar o colaborador. Tente novamente.');
    } finally {
      setFormSalvando(false);
    }
  };

  // Confirmar Exclusão
  const handleConfirmarExclusao = async () => {
    if (!usuarioExcluir) return;
    try {
      await excluirColaborador(usuarioExcluir.id);
      dispararFeedback(`Colaborador "${usuarioExcluir.nome}" removido do sistema.`);
      setUsuarioExcluir(null);
    } catch (e) {
      console.error('Erro ao excluir usuário:', e);
    }
  };

  // Confirmar Redefinição de Senha
  const handleConfirmarRedefinirSenha = async () => {
    if (!usuarioRedefinirSenha || !novaSenhaTemp.trim()) return;
    try {
      await redefinirSenhaColaborador(usuarioRedefinirSenha.id, novaSenhaTemp.trim());
      dispararFeedback(`Nova senha configurada para "${usuarioRedefinirSenha.nome}".`);
      setUsuarioRedefinirSenha(null);
    } catch (e) {
      console.error('Erro ao redefinir senha:', e);
    }
  };

  // Filtragem de Usuários
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      // Busca
      const termo = busca.toLowerCase().trim();
      const matchBusca =
        !termo ||
        u.nome.toLowerCase().includes(termo) ||
        u.email.toLowerCase().includes(termo) ||
        u.cargo.toLowerCase().includes(termo) ||
        (u.telefone && u.telefone.includes(termo));

      // Filtro Role
      const matchRole = filtroRole === 'TODOS' || u.role === filtroRole;

      // Filtro Status
      const matchStatus =
        filtroStatus === 'TODOS' ||
        (filtroStatus === 'ATIVO' && u.ativo) ||
        (filtroStatus === 'INATIVO' && !u.ativo);

      return matchBusca && matchRole && matchStatus;
    });
  }, [usuarios, busca, filtroRole, filtroStatus]);

  // Estatísticas Rápidas
  const totalAtivos = usuarios.filter((u) => u.ativo).length;
  const totalGestores = usuarios.filter((u) => u.role === 'GESTOR' && u.ativo).length;
  const totalMedicos = usuarios.filter((u) => u.role === 'MEDICO' && u.ativo).length;
  const totalRecepcao = usuarios.filter((u) => (u.role === 'RECEPCAO_COMERCIAL' || u.role === 'POS_VENDA') && u.ativo).length;

  // ----------------------------------------------------
  // TELA DE RESTRIÇÃO SE NÃO FOR GESTOR
  // ----------------------------------------------------
  if (!isGestor) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto ring-8 ring-amber-50">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#0B1F3A]">Acesso Restrito à Gestão Geral</h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Esta aba é exclusiva da coordenação e gerência da clínica para controle de credenciais e níveis de acesso de colaboradores.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="text-xs text-slate-500">
              Você está logado como: <strong className="text-slate-800">{usuarioLogado?.nome || responsavelAtivo?.nome}</strong> ({usuarioLogado?.cargo || responsavelAtivo?.cargo})
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="controle-acessos-page" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast de Feedback */}
      {feedbackSucesso && (
        <div
          id="toast-feedback-acessos"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-emerald-900 text-emerald-100 rounded-xl shadow-2xl border border-emerald-700 animate-in fade-in slide-in-from-bottom-3 duration-200 text-sm font-medium"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{feedbackSucesso}</span>
        </div>
      )}

      {/* Header Principal do Módulo do Gestor */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-end">
          <button
            id="btn-criar-colaborador"
            type="button"
            onClick={handleAbrirCriar}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0B1F3A] hover:bg-[#152e52] text-white font-semibold text-sm rounded-xl shadow-md transition-colors cursor-pointer border border-[#B8960C]/30"
          >
            <UserPlus className="w-4 h-4 text-[#B8960C]" />
            <span>Novo Colaborador</span>
          </button>
        </div>

        {/* Métricas e Resumo Rápido */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Colaboradores Ativos</p>
            <p className="text-xl font-bold text-[#0B1F3A] mt-0.5">{totalAtivos}</p>
          </div>

          <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-100/80">
            <p className="text-xs font-medium text-amber-800">Médicas & Injetoras</p>
            <p className="text-xl font-bold text-amber-900 mt-0.5">{totalMedicos}</p>
          </div>

          <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100/80">
            <p className="text-xs font-medium text-blue-800">Recepção & Pós-Venda</p>
            <p className="text-xl font-bold text-blue-900 mt-0.5">{totalRecepcao}</p>
          </div>

          <div className="p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800">
            <p className="text-xs font-medium text-slate-400">Gestores com Acesso Total</p>
            <p className="text-xl font-bold text-[#B8960C] mt-0.5">{totalGestores}</p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-busca-colaborador"
            type="text"
            placeholder="Buscar por nome, email, cargo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0B1F3A] focus:outline-hidden transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">Cargo:</span>
          </div>
          <select
            id="select-filtro-role"
            value={filtroRole}
            onChange={(e) => setFiltroRole(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-hidden focus:border-[#0B1F3A] cursor-pointer"
          >
            <option value="TODOS">Todos os Cargos</option>
            <option value="GESTOR">Gestão Geral</option>
            <option value="MEDICO">Médicas / Injetoras</option>
            <option value="RECEPCAO_COMERCIAL">Recepção & Comercial</option>
            <option value="POS_VENDA">Pós-Venda</option>
            <option value="PERSONALIZADO">Personalizado</option>
          </select>

          <select
            id="select-filtro-status"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-hidden focus:border-[#0B1F3A] cursor-pointer"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="ATIVO">Apenas Ativos</option>
            <option value="INATIVO">Apenas Inativos</option>
          </select>

          <button
            id="btn-restaurar-padroes"
            type="button"
            onClick={() => {
              if (window.confirm('Deseja recarregar a lista padrão de colaboradores da Lumina Estética?')) {
                resetarUsuariosPadrao();
                dispararFeedback('Colaboradores padrão restaurados!');
              }
            }}
            title="Restaurar equipe de exemplo"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0 ml-auto md:ml-0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lista de Colaboradores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {usuariosFiltrados.map((user) => {
          const isEu = usuarioLogado?.id === user.id || responsavelAtivo?.id === user.id;
          const isUserGestor = user.role === 'GESTOR';

          return (
            <div
              key={user.id}
              id={`card-usuario-${user.id}`}
              className={`bg-white rounded-2xl border transition-all p-5 space-y-4 ${
                user.ativo
                  ? 'border-slate-200 shadow-xs hover:border-slate-300'
                  : 'border-slate-200/60 bg-slate-50/60 opacity-75'
              }`}
            >
              {/* Header do Card */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                      user.corBadge || 'bg-slate-700 text-white'
                    }`}
                  >
                    {user.iniciais}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#0B1F3A] truncate">{user.nome}</h3>
                      {isEu && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                          Você
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-600 truncate">{user.cargo}</p>
                  </div>
                </div>

                {/* Status Toggle Switch */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    id={`btn-toggle-status-${user.id}`}
                    type="button"
                    onClick={() => alternarStatusColaborador(user.id, !user.ativo)}
                    disabled={isEu} // Não desativa a si próprio
                    title={isEu ? 'Você não pode desativar seu próprio usuário' : user.ativo ? 'Clique para desativar' : 'Clique para ativar'}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-40 disabled:cursor-not-allowed ${
                      user.ativo ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        user.ativo ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Credenciais de Acesso */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-slate-500 truncate">
                    <span className="font-semibold text-slate-700">Login:</span>
                    <span className="truncate text-slate-600 font-mono">
                      {user.login ? `${user.login} (${user.email})` : user.email}
                    </span>
                  </div>
                  <button
                    id={`btn-copiar-email-${user.id}`}
                    type="button"
                    onClick={() => copiarTexto(user.login || user.email, `email-${user.id}`)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                    title="Copiar login"
                  >
                    {copiadoId === `email-${user.id}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span className="font-semibold text-slate-700">Senha:</span>
                    <span className="font-mono text-slate-800 font-medium">
                      {senhaVisivelId === user.id ? user.senhaPadrao : '••••••••'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      id={`btn-ver-senha-${user.id}`}
                      type="button"
                      onClick={() => setSenhaVisivelId(senhaVisivelId === user.id ? null : user.id)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                      title={senhaVisivelId === user.id ? 'Ocultar senha' : 'Ver senha'}
                    >
                      {senhaVisivelId === user.id ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      id={`btn-copiar-senha-${user.id}`}
                      type="button"
                      onClick={() => copiarTexto(user.senhaPadrao, `senha-${user.id}`)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                      title="Copiar senha"
                    >
                      {copiadoId === `senha-${user.id}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {user.telefone && (
                  <div className="pt-1 border-t border-slate-200/60 text-slate-500 flex items-center justify-between">
                    <span className="font-semibold text-slate-700">WhatsApp:</span>
                    <span className="text-slate-600">{user.telefone}</span>
                  </div>
                )}
              </div>

              {/* Nível de Acesso & Resumo de Permissões */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Nível de Acesso:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      user.role === 'GESTOR'
                        ? 'bg-[#0B1F3A] text-[#B8960C] border border-[#B8960C]/30'
                        : user.role === 'MEDICO'
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : user.role === 'RECEPCAO_COMERCIAL'
                        ? 'bg-blue-100 text-blue-900 border border-blue-200'
                        : user.role === 'POS_VENDA'
                        ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                        : 'bg-purple-100 text-purple-900 border border-purple-200'
                    }`}
                  >
                    {user.role === 'GESTOR' && '👑 Gestão Geral'}
                    {user.role === 'MEDICO' && '🩺 Médica / Especialista'}
                    {user.role === 'RECEPCAO_COMERCIAL' && '📞 Recepção & Comercial'}
                    {user.role === 'POS_VENDA' && '🔄 Pós-Venda & Retenção'}
                    {user.role === 'PERSONALIZADO' && '⚙️ Acesso Personalizado'}
                  </span>
                </div>

                {/* Badges de permissões ativas */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {user.permissoes.podeCadastrarLeads && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                      Cadastro Rápido
                    </span>
                  )}
                  {user.permissoes.podeAcessarEmCaptacao && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                      Em Captação
                    </span>
                  )}
                  {user.permissoes.podeAcessarPosConsulta && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                      Pós Consulta
                    </span>
                  )}
                  {user.permissoes.podeAcessarPosProcedimento && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                      Pós Procedimento
                    </span>
                  )}
                  {user.permissoes.podeAcessarReativacao && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                      Reativação
                    </span>
                  )}
                  {user.permissoes.podeAcessarNutricao && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                      Nutrição
                    </span>
                  )}
                  {user.permissoes.podeAcessarHistoricoCompras && (
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                      Histórico Compras
                    </span>
                  )}
                  {user.permissoes.podeAcessarControleAcessos && (
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 text-[10px] font-bold border border-amber-200">
                      Controle Acessos
                    </span>
                  )}
                </div>
              </div>

              {/* Rodapé de Ações do Card */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  id={`btn-simular-login-${user.id}`}
                  type="button"
                  onClick={() => {
                    loginComResponsavel(user);
                    dispararFeedback(`Visão alternada para "${user.nome}".`);
                  }}
                  title="Alternar login ativo para este usuário"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#0B1F3A] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#B8960C]" />
                  <span>{isEu ? 'Sessão Ativa' : 'Testar Visão'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    id={`btn-editar-usuario-${user.id}`}
                    type="button"
                    onClick={() => handleAbrirEditar(user)}
                    className="p-1.5 text-slate-600 hover:text-[#0B1F3A] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Editar dados e permissões"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    id={`btn-redefinir-senha-${user.id}`}
                    type="button"
                    onClick={() => {
                      setNovaSenhaTemp(`Lumina@${new Date().getFullYear()}`);
                      setUsuarioRedefinirSenha(user);
                    }}
                    className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                    title="Redefinir senha de acesso"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>

                  {!isEu && (
                    <button
                      id={`btn-excluir-usuario-${user.id}`}
                      type="button"
                      onClick={() => setUsuarioExcluir(user)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir usuário"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {usuariosFiltrados.length === 0 && (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-[#0B1F3A]">Nenhum colaborador encontrado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Não foram encontrados colaboradores com os termos de busca ou filtros selecionados.
          </p>
          <button
            id="btn-limpar-filtros-busca"
            type="button"
            onClick={() => {
              setBusca('');
              setFiltroRole('TODOS');
              setFiltroStatus('TODOS');
            }}
            className="px-3.5 py-1.5 text-xs font-semibold text-[#0B1F3A] bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            Limpar Filtros
          </button>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE COLABORADOR             */}
      {/* ==================================================== */}
      {modalNovoUsuarioAberto && (
        <div
          id="modal-usuario-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            id="modal-usuario-container"
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header do Modal */}
            <div className="px-6 py-4.5 bg-[#0B1F3A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#B8960C] text-slate-950 flex items-center justify-center font-bold">
                  {usuarioEmEdicao ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5 text-slate-950" />}
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {usuarioEmEdicao ? 'Editar Colaborador & Permissões' : 'Criar Nova Credencial de Acesso'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Defina identificação, senha de login e permissões nos módulos
                  </p>
                </div>
              </div>
              <button
                id="btn-fechar-modal-usuario"
                type="button"
                onClick={() => setModalNovoUsuarioAberto(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSalvarUsuario} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {formErro && (
                <div
                  id="form-usuario-erro"
                  className="p-3 bg-rose-50 text-rose-800 text-xs font-semibold rounded-xl border border-rose-200 flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formErro}</span>
                </div>
              )}

              {/* Seção 1: Dados de Identificação */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Users className="w-4 h-4 text-[#0B1F3A]" />
                  <h4 className="text-sm font-bold text-[#0B1F3A]">1. Identificação & Credenciais</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo *</label>
                    <input
                      id="input-nome-colaborador"
                      type="text"
                      required
                      placeholder="Ex: Dra. Mariana Costa"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0B1F3A] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Cargo / Função *</label>
                    <input
                      id="input-cargo-colaborador"
                      type="text"
                      required
                      placeholder="Ex: Médica Injetora, Secretária Líder..."
                      value={formData.cargo}
                      onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0B1F3A] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Login / Usuário (Apelido)
                    </label>
                    <input
                      id="input-login-colaborador"
                      type="text"
                      placeholder="Ex: cadu, gestao, mariana"
                      value={formData.login}
                      onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0B1F3A] focus:outline-hidden font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">E-mail de Login *</label>
                    <input
                      id="input-email-colaborador"
                      type="email"
                      required
                      placeholder="Ex: mariana@lumina.med.br"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0B1F3A] focus:outline-hidden font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Senha de Primeiro Acesso *</label>
                    <input
                      id="input-senha-colaborador"
                      type="text"
                      required
                      placeholder="Ex: Lumina@2026"
                      value={formData.senhaPadrao}
                      onChange={(e) => setFormData({ ...formData, senhaPadrao: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0B1F3A] focus:outline-hidden font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp / Telefone</label>
                    <input
                      id="input-telefone-colaborador"
                      type="text"
                      placeholder="Ex: (11) 98765-4321"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0B1F3A] focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Nível de Acesso (Perfis) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <ShieldCheck className="w-4 h-4 text-[#0B1F3A]" />
                  <h4 className="text-sm font-bold text-[#0B1F3A]">2. Nível de Acesso Predefinido</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      role: 'GESTOR' as NivelAcesso,
                      titulo: '👑 Gestão Geral',
                      desc: 'Acesso total irrestrito a funis, compras, relatórios e controle de acessos.',
                    },
                    {
                      role: 'MEDICO' as NivelAcesso,
                      titulo: '🩺 Médica / Injetora',
                      desc: 'Acesso a Pós Consulta, Pós Procedimento, Histórico de Compras e Ficha Clínica.',
                    },
                    {
                      role: 'RECEPCAO_COMERCIAL' as NivelAcesso,
                      titulo: '📞 Recepção & Comercial',
                      desc: 'Cadastro Rápido, Em Captação, Agendamentos e Leads Perdidos.',
                    },
                    {
                      role: 'POS_VENDA' as NivelAcesso,
                      titulo: '🔄 Pós-Venda & Retenção',
                      desc: 'Pós Procedimento, Reativação, Nutrição e Histórico de Compras.',
                    },
                  ].map((preset) => {
                    const isSelected = formData.role === preset.role;
                    return (
                      <button
                        key={preset.role}
                        type="button"
                        onClick={() => handleSelecionarRole(preset.role)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0B1F3A]/5 border-[#0B1F3A] ring-1 ring-[#0B1F3A]'
                            : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-[#0B1F3A]">{preset.titulo}</p>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#0B1F3A]" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">{preset.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seção 3: Matriz Granular de Permissões */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#0B1F3A]" />
                    <h4 className="text-sm font-bold text-[#0B1F3A]">3. Permissões Granulares por Módulo</h4>
                  </div>
                  {formData.role === 'PERSONALIZADO' && (
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      Personalizado
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="checkbox"
                      checked={formData.permissoes.podeCadastrarLeads}
                      onChange={() => handleTogglePermissao('podeCadastrarLeads')}
                      className="mt-0.5 rounded text-[#0B1F3A] focus:ring-[#0B1F3A]"
                    />
                    <div>
                      <p className="font-semibold text-slate-800">Cadastro Rápido de Leads</p>
                      <p className="text-[11px] text-slate-500">Permite criar novos leads e fichas</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="checkbox"
                      checked={formData.permissoes.podeAcessarEmCaptacao}
                      onChange={() => handleTogglePermissao('podeAcessarEmCaptacao')}
                      className="mt-0.5 rounded text-[#0B1F3A] focus:ring-[#0B1F3A]"
                    />
                    <div>
                      <p className="font-semibold text-slate-800">Em Captação (Cadência Inicial)</p>
                      <p className="text-[11px] text-slate-500">Cadência de 5 contatos para novos contatos</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="checkbox"
                      checked={formData.permissoes.podeAcessarPosConsulta}
                      onChange={() => handleTogglePermissao('podeAcessarPosConsulta')}
                      className="mt-0.5 rounded text-[#0B1F3A] focus:ring-[#0B1F3A]"
                    />
                    <div>
                      <p className="font-semibold text-slate-800">Pós Consulta (Cadência Avaliação)</p>
                      <p className="text-[11px] text-slate-500">Acompanhamento de orçamentos</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="checkbox"
                      checked={formData.permissoes.podeAcessarPosProcedimento}
                      onChange={() => handleTogglePermissao('podeAcessarPosProcedimento')}
                      className="mt-0.5 rounded text-[#0B1F3A] focus:ring-[#0B1F3A]"
                    />
                    <div>
                      <p className="font-semibold text-slate-800">Pós Procedimento (Retornos)</p>
                      <p className="text-[11px] text-slate-500">Acompanhamento pós-tratamento</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="checkbox"
                      checked={formData.permissoes.podeAcessarReativacao}
                      onChange={() => handleTogglePermissao('podeAcessarReativacao')}
                      className="mt-0.5 rounded text-[#0B1F3A] focus:ring-[#0B1F3A]"
                    />
                    <div>
                      <p className="font-semibold text-slate-800">Reativação de Clientes</p>
                      <p className="text-[11px] text-slate-500">Resgate de leads inativos</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="checkbox"
                      checked={formData.permissoes.podeAcessarNutricao}
                      onChange={() => handleTogglePermissao('podeAcessarNutricao')}
                      className="mt-0.5 rounded text-[#0B1F3A] focus:ring-[#0B1F3A]"
                    />
                    <div>
                      <p className="font-semibold text-slate-800">Nutrição & Transmissão VIP</p>
                      <p className="text-[11px] text-slate-500">Gestão de leads em listas de conteúdo</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="checkbox"
                      checked={formData.permissoes.podeAcessarHistoricoCompras}
                      onChange={() => handleTogglePermissao('podeAcessarHistoricoCompras')}
                      className="mt-0.5 rounded text-[#0B1F3A] focus:ring-[#0B1F3A]"
                    />
                    <div>
                      <p className="font-semibold text-slate-800">Histórico de Compras</p>
                      <p className="text-[11px] text-slate-500">Visualizar faturamento e compras de leads</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="checkbox"
                      checked={formData.permissoes.podeAcessarControleAcessos}
                      onChange={() => handleTogglePermissao('podeAcessarControleAcessos')}
                      className="mt-0.5 rounded text-[#0B1F3A] focus:ring-[#0B1F3A]"
                    />
                    <div>
                      <p className="font-semibold text-amber-900 font-bold">Controle de Acessos</p>
                      <p className="text-[11px] text-slate-500">Exclusivo do Gestor Geral</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Botões de Ação do Modal */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  id="btn-cancelar-modal-usuario"
                  type="button"
                  onClick={() => setModalNovoUsuarioAberto(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-salvar-colaborador"
                  type="submit"
                  disabled={formSalvando}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-[#0B1F3A] hover:bg-[#152e52] rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {formSalvando
                    ? 'Salvando...'
                    : usuarioEmEdicao
                    ? 'Salvar Alterações'
                    : 'Criar Credencial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL DE REDEFINIÇÃO RÁPIDA DE SENHA                 */}
      {/* ==================================================== */}
      {usuarioRedefinirSenha && (
        <div
          id="modal-redefinir-senha-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0B1F3A]">Redefinir Senha de Acesso</h3>
                <p className="text-xs text-slate-500">Colaborador: {usuarioRedefinirSenha.nome}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Nova Senha de Acesso</label>
              <input
                type="text"
                value={novaSenhaTemp}
                onChange={(e) => setNovaSenhaTemp(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:border-[#0B1F3A] focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-500">
                Copie a nova senha e envie ao colaborador para o próximo login.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUsuarioRedefinirSenha(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarRedefinirSenha}
                className="px-4 py-2 text-xs font-bold text-white bg-[#0B1F3A] hover:bg-[#152e52] rounded-xl shadow-xs cursor-pointer"
              >
                Atualizar Senha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO                     */}
      {/* ==================================================== */}
      {usuarioExcluir && (
        <div
          id="modal-excluir-usuario-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0B1F3A]">Remover Colaborador</h3>
                <p className="text-xs text-slate-500">{usuarioExcluir.nome}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza que deseja desativar o acesso de <strong>{usuarioExcluir.nome}</strong> ({usuarioExcluir.email})? O colaborador perderá o acesso imediato ao sistema da clínica.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUsuarioExcluir(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusao}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer"
              >
                Confirmar Remoção
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
