import React, { useState, useRef, useEffect } from 'react';
import { Menu, Building2, ChevronDown, Check, Crown, Plus, X, Sparkles } from 'lucide-react';
import { useEmpresa } from '../context/EmpresaContext';

interface HeaderProps {
  activeTitle: string;
  activeDescription?: string;
  onOpenMobileSidebar: () => void;
  isQuickRegistration?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTitle,
  onOpenMobileSidebar,
}) => {
  const {
    empresas,
    empresaAtiva,
    empresaAtivaId,
    definirEmpresaAtivaId,
    isPlataformaAdmin,
    criarEmpresa,
    config,
  } = useEmpresa();

  const [menuEmpresasAberto, setMenuEmpresasAberto] = useState(false);
  const [modalNovaEmpresaAberto, setModalNovaEmpresaAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  const [formNovaEmpresa, setFormNovaEmpresa] = useState({
    nome: '',
    subtitulo: '',
    monogramaIniciais: '',
    cnpj: '',
    telefone: '',
    email: '',
    endereco: '',
    unidadePadrao: 'Unidade Principal',
    adminNome: '',
    adminEmail: '',
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuEmpresasAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const corPrimaria = config.estetica?.corPrimaria || '#5C3A22';

  const handleCriarEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNovaEmpresa.nome.trim()) {
      setErroForm('Por favor, informe o nome da clínica ou empresa.');
      return;
    }

    setSalvando(true);
    setErroForm(null);

    try {
      const nova = await criarEmpresa({
        nome: formNovaEmpresa.nome.trim(),
        subtitulo: formNovaEmpresa.subtitulo.trim(),
        cnpj: formNovaEmpresa.cnpj.trim(),
        telefone: formNovaEmpresa.telefone.trim(),
        email: formNovaEmpresa.email.trim(),
        endereco: formNovaEmpresa.endereco.trim(),
        unidadePadrao: formNovaEmpresa.unidadePadrao.trim() || 'Matriz',
        status: 'ativa',
        tipoLogo: 'monograma',
        adminNome: formNovaEmpresa.adminNome.trim() || undefined,
        adminEmail: formNovaEmpresa.adminEmail.trim() || undefined,
      });

      definirEmpresaAtivaId(nova.id);
      setModalNovaEmpresaAberto(false);
      setFormNovaEmpresa({
        nome: '',
        subtitulo: '',
        monogramaIniciais: '',
        cnpj: '',
        telefone: '',
        email: '',
        endereco: '',
        unidadePadrao: 'Unidade Principal',
        adminNome: '',
        adminEmail: '',
      });
    } catch (err: any) {
      console.error('Erro ao cadastrar empresa:', err);
      setErroForm(err?.message || 'Falha ao cadastrar a nova clínica. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <header
        id="main-app-header"
        className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-[#D9D6D0] shadow-xs"
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            id="btn-mobile-sidebar-toggle"
            type="button"
            onClick={onOpenMobileSidebar}
            className="p-1.5 -ml-1.5 rounded-sm text-[#1A1A1A] hover:bg-[#F2EFEA] lg:hidden focus:outline-hidden cursor-pointer shrink-0"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <h1
            id="header-page-title"
            className="text-base sm:text-lg font-bold tracking-tight text-[#1A1A1A] uppercase truncate"
          >
            {activeTitle}
          </h1>
        </div>

        {/* Lado Direito: Seletor de Clínica / Espaço Ativo para Super Admin & Gestores */}
        <div className="flex items-center gap-3">
          {/* Seletor de Clínica Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="btn-header-empresa-dropdown"
              type="button"
              onClick={() => setMenuEmpresasAberto(!menuEmpresasAberto)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm border border-[#D9D6D0] bg-[#F8F7F4] hover:bg-[#F2EFEA] transition-colors cursor-pointer text-left"
            >
              <div
                className="w-5 h-5 rounded-xs flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow-2xs"
                style={{ backgroundColor: corPrimaria }}
              >
                {empresaAtiva?.monogramaIniciais || config.monogramaIniciais || 'AR'}
              </div>
              <div className="hidden sm:block min-w-0 max-w-[160px]">
                <p className="text-[11px] font-bold text-[#1A1A1A] truncate leading-tight">
                  {empresaAtiva?.nome || config.nomeEmpresa || 'Dra. Agda Rodrigues'}
                </p>
                <p className="text-[9px] text-[#6E6E6E] truncate leading-none mt-0.5">
                  {isPlataformaAdmin ? 'Espaço de Atendimento' : 'Minha Clínica'}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#6E6E6E] shrink-0" />
            </button>

            {menuEmpresasAberto && (
              <div
                id="header-empresa-menu"
                className="absolute right-0 mt-1.5 w-72 bg-white border border-[#D9D6D0] rounded-sm shadow-xl z-50 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#D9D6D0]/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6E6E]">
                    {isPlataformaAdmin ? 'Alternar Espaço de Clínica' : 'Clínica Selecionada'}
                  </span>
                  <span className="text-[10px] text-[#8F887E]">
                    {empresas.length} {empresas.length === 1 ? 'unidade' : 'unidades'}
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto py-1">
                  {empresas.map((emp) => {
                    const isSelecionada = emp.id === empresaAtivaId;
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          definirEmpresaAtivaId(emp.id);
                          setMenuEmpresasAberto(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[#F8F7F4] transition-colors cursor-pointer ${
                          isSelecionada ? 'bg-amber-50/60 font-semibold' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-xs bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                            {emp.monogramaIniciais || emp.nome.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#1A1A1A] truncate">{emp.nome}</p>
                            <p className="text-[10px] text-[#6E6E6E] truncate">
                              {emp.subtitulo || (emp.status === 'ativa' ? 'Ativa' : 'Suspensa')}
                            </p>
                          </div>
                        </div>
                        {isSelecionada && <Check className="w-3.5 h-3.5 text-amber-700 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Botão de Criação de Nova Empresa */}
                <div className="border-t border-[#D9D6D0]/60 p-1.5 bg-[#FAF9F6]">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuEmpresasAberto(false);
                      setModalNovaEmpresaAberto(true);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white hover:bg-[#F2EFEA] border border-[#D9D6D0] rounded-xs text-[#1A1A1A] font-semibold text-[11px] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-700" />
                    Cadastrar Nova Clínica / Unidade
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal de Cadastro de Nova Empresa / Clínica */}
      {modalNovaEmpresaAberto && (
        <div
          id="modal-nova-empresa"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg bg-white rounded-sm border border-[#D9D6D0] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#D9D6D0] bg-[#FAF9F6]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xs bg-[#1A1A1A] text-white flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wide">
                    Cadastrar Nova Clínica ou Unidade
                  </h3>
                  <p className="text-[11px] text-[#6E6E6E]">
                    Cria um espaço independente com dados, equipe e leads isolados
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNovaEmpresaAberto(false)}
                className="p-1 text-[#6E6E6E] hover:text-[#1A1A1A] rounded-xs hover:bg-[#EAE7E0] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCriarEmpresa} className="p-5 space-y-3.5">
              {erroForm && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xs">
                  {erroForm}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#1A1A1A] mb-1">
                  Nome da Clínica / Profissional *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dra. Juliana Santos ou Clínica Estética Prime"
                  value={formNovaEmpresa.nome}
                  onChange={(e) =>
                    setFormNovaEmpresa({ ...formNovaEmpresa, nome: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-[#D9D6D0] rounded-xs focus:outline-hidden focus:border-[#1A1A1A] bg-[#FAF9F6]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                    Subtítulo / Especialidade
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Harmonização Facial & Laser"
                    value={formNovaEmpresa.subtitulo}
                    onChange={(e) =>
                      setFormNovaEmpresa({ ...formNovaEmpresa, subtitulo: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#D9D6D0] rounded-xs focus:outline-hidden focus:border-[#1A1A1A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                    CNPJ (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={formNovaEmpresa.cnpj}
                    onChange={(e) =>
                      setFormNovaEmpresa({ ...formNovaEmpresa, cnpj: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#D9D6D0] rounded-xs focus:outline-hidden focus:border-[#1A1A1A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                    Telefone / WhatsApp Comercial
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 99999-8888"
                    value={formNovaEmpresa.telefone}
                    onChange={(e) =>
                      setFormNovaEmpresa({ ...formNovaEmpresa, telefone: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#D9D6D0] rounded-xs focus:outline-hidden focus:border-[#1A1A1A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                    Email de Contato
                  </label>
                  <input
                    type="email"
                    placeholder="contato@clinica.com.br"
                    value={formNovaEmpresa.email}
                    onChange={(e) =>
                      setFormNovaEmpresa({ ...formNovaEmpresa, email: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#D9D6D0] rounded-xs focus:outline-hidden focus:border-[#1A1A1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Av. Paulista, 1000 - Bela Vista, São Paulo/SP"
                  value={formNovaEmpresa.endereco}
                  onChange={(e) =>
                    setFormNovaEmpresa({ ...formNovaEmpresa, endereco: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-[#D9D6D0] rounded-xs focus:outline-hidden focus:border-[#1A1A1A]"
                />
              </div>

              <div className="p-3 bg-[#F8F7F4] border border-[#D9D6D0]/80 rounded-xs space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#1A1A1A]">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  Gestor Responsável Inicial (Opcional)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nome do Gestor"
                    value={formNovaEmpresa.adminNome}
                    onChange={(e) =>
                      setFormNovaEmpresa({ ...formNovaEmpresa, adminNome: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#D9D6D0] rounded-xs"
                  />
                  <input
                    type="email"
                    placeholder="Email do Gestor"
                    value={formNovaEmpresa.adminEmail}
                    onChange={(e) =>
                      setFormNovaEmpresa({ ...formNovaEmpresa, adminEmail: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#D9D6D0] rounded-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D9D6D0]">
                <button
                  type="button"
                  onClick={() => setModalNovaEmpresaAberto(false)}
                  className="px-4 py-2 border border-[#D9D6D0] text-[#1A1A1A] font-semibold text-xs rounded-xs hover:bg-[#F2EFEA] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-4 py-2 bg-[#1A1A1A] hover:bg-black text-white font-bold text-xs rounded-xs transition-colors cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  {salvando ? 'Cadastrando...' : 'Criar e Ativar Clínica'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
