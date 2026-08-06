import React, { useState, useMemo } from 'react';
import { UserPlus, X, ArrowRight, Check } from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { SituacaoLead, TODAS_SITUACOES, Lead, ProcedimentoClinica } from '../types';

interface NovoPacienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadCreated: (lead: Lead) => void;
}

export const NovoPacienteModal: React.FC<NovoPacienteModalProps> = ({
  isOpen,
  onClose,
  onLeadCreated,
}) => {
  const { criarLead, responsaveis, procedimentos } = useCrm();

  const [nome, setNome] = useState('');
  const [situacao, setSituacao] = useState<SituacaoLead>('Em captação');
  const [interesse, setInteresse] = useState('');
  const [isCustomInteresse, setIsCustomInteresse] = useState(false);
  const [possivelValor, setPossivelValor] = useState<string>('');
  const [responsavel, setResponsavel] = useState(responsaveis[0] || 'Secretária 1');
  const [erroNome, setErroNome] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Procedimentos cadastrados ativos
  const procedimentosAtivos = useMemo(() => {
    return (procedimentos || []).filter((p) => !p.deleted_at && p.ativo);
  }, [procedimentos]);

  // Agrupamento por categoria
  const categoriasProcedimentos = useMemo<Record<string, ProcedimentoClinica[]>>(() => {
    const mapa: Record<string, ProcedimentoClinica[]> = {};
    for (const p of procedimentosAtivos) {
      const cat = p.categoria || 'Procedimentos Gerais';
      if (!mapa[cat]) mapa[cat] = [];
      mapa[cat].push(p);
    }
    return mapa;
  }, [procedimentosAtivos]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      setErroNome(true);
      return;
    }

    setErroNome(false);
    setIsSubmitting(true);

    try {
      const valorNumerico = possivelValor ? parseFloat(possivelValor.replace(',', '.')) : 0;

      const novoLead = await criarLead({
        nome: nome.trim(),
        situacao,
        interesse: interesse.trim(),
        possivelValor: isNaN(valorNumerico) ? 0 : valorNumerico,
        responsavel,
      });

      // Reset
      setNome('');
      setInteresse('');
      setIsCustomInteresse(false);
      setPossivelValor('');
      
      onClose();
      onLeadCreated(novoLead);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="modal-novo-paciente-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="modal-novo-paciente-content"
        className="bg-white rounded-sm border border-[#D9D6D0] shadow-xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header do Modal */}
        <div className="px-5 py-3.5 bg-[#1A1A1A] text-white flex items-center justify-between border-b border-[#5C3A22]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-sm bg-[#5C3A22] flex items-center justify-center text-white font-bold">
              <UserPlus className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-sm font-bold tracking-wider text-white uppercase">
              Novo Paciente
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-sm text-[#D9D6D0] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Nome */}
          <div className="space-y-1.5">
            <label
              htmlFor="modal-lead-nome-input"
              className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider"
            >
              Nome do Paciente <span className="text-[#5C3A22]">*</span>
            </label>
            <input
              id="modal-lead-nome-input"
              type="text"
              required
              autoFocus
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                if (erroNome) setErroNome(false);
              }}
              placeholder="Ex: Amanda Silva"
              className={`w-full h-10 px-3 text-sm rounded-sm border bg-[#F2EFEA]/30 text-[#1A1A1A] focus:bg-white focus:outline-hidden transition-all placeholder:text-[#8F887E] ${
                erroNome
                  ? 'border-rose-500 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                  : 'border-[#D9D6D0] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22]'
              }`}
            />
            {erroNome && (
              <p className="text-xs text-rose-600 font-medium">Por favor, preencha o nome do paciente.</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Situação */}
            <div className="space-y-1.5">
              <label
                htmlFor="modal-lead-situacao-select"
                className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider"
              >
                Situação Inicial
              </label>
              <select
                id="modal-lead-situacao-select"
                value={situacao}
                onChange={(e) => setSituacao(e.target.value as SituacaoLead)}
                className="w-full h-10 px-3 text-sm rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:outline-hidden focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] transition-all font-medium"
              >
                {TODAS_SITUACOES.map((sit) => (
                  <option key={sit} value={sit}>
                    {sit}
                  </option>
                ))}
              </select>
            </div>

            {/* Responsável */}
            <div className="space-y-1.5">
              <label
                htmlFor="modal-lead-responsavel-select"
                className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider"
              >
                Responsável
              </label>
              <select
                id="modal-lead-responsavel-select"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:outline-hidden focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] transition-all"
              >
                {responsaveis.map((resp) => (
                  <option key={resp} value={resp}>
                    {resp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Interesse / Procedimento */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="modal-lead-interesse-input"
                className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider"
              >
                Interesse / Procedimento
              </label>
              <button
                type="button"
                onClick={() => setIsCustomInteresse(!isCustomInteresse)}
                className="text-[11px] font-bold text-[#5C3A22] hover:underline cursor-pointer"
              >
                {isCustomInteresse ? '📋 Tabela' : '✏️ Digitar outro'}
              </button>
            </div>

            {isCustomInteresse ? (
              <input
                id="modal-lead-interesse-input"
                type="text"
                value={interesse}
                onChange={(e) => setInteresse(e.target.value)}
                placeholder="Ex: Toxina Botulínica, Preenchimento..."
                className="w-full h-10 px-3 text-sm rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/30 text-[#1A1A1A] focus:bg-white focus:outline-hidden focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] transition-all placeholder:text-[#8F887E]"
              />
            ) : (
              <select
                id="modal-lead-interesse-input"
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
                    setPossivelValor(proc.valor.toString());
                  }
                }}
                className="w-full h-10 px-3 text-sm rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:outline-hidden focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] transition-all font-medium cursor-pointer"
              >
                <option value="">Selecione um procedimento (opcional)...</option>
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
                <option value="__custom__">➕ Digitar outro procedimento...</option>
              </select>
            )}
          </div>

          {/* Possível Valor */}
          <div className="space-y-1.5">
            <label
              htmlFor="modal-lead-valor-input"
              className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider"
            >
              Possível Valor (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#8F887E]">
                R$
              </span>
              <input
                id="modal-lead-valor-input"
                type="number"
                step="0.01"
                min="0"
                value={possivelValor}
                onChange={(e) => setPossivelValor(e.target.value)}
                placeholder="0,00"
                className="w-full h-10 pl-8 pr-3 text-sm rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/30 text-[#1A1A1A] focus:bg-white focus:outline-hidden focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] transition-all font-medium"
              />
            </div>
          </div>

          {/* Ações */}
          <div className="pt-4 border-t border-[#D9D6D0] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#6E6E6E] hover:text-[#1A1A1A] hover:bg-[#F2EFEA] rounded-sm transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="btn-confirmar-novo-paciente"
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#5C3A22] hover:bg-[#4A2E1B] text-white font-bold text-xs uppercase tracking-wider rounded-sm shadow-xs transition-all duration-150 cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Salvando...' : 'Cadastrar Paciente'}</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
