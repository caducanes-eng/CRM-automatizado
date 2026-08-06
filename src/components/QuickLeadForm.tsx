import React, { useState, useMemo } from 'react';
import { UserPlus, ArrowRight } from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { SituacaoLead, TODAS_SITUACOES, Lead, ProcedimentoClinica } from '../types';

interface QuickLeadFormProps {
  onLeadCreated: (lead: Lead) => void;
  onOpenImportExport?: () => void;
}

export const QuickLeadForm: React.FC<QuickLeadFormProps> = ({ onLeadCreated, onOpenImportExport }) => {
  const { criarLead, responsaveis, procedimentos } = useCrm();

  const [nome, setNome] = useState('');
  const [situacao, setSituacao] = useState<SituacaoLead>('Em captação');
  const [interesse, setInteresse] = useState('');
  const [isCustomInteresse, setIsCustomInteresse] = useState(false);
  const [possivelValor, setPossivelValor] = useState<string>('');
  const [responsavel, setResponsavel] = useState(responsaveis[0] || 'Secretária 1');
  const [erroNome, setErroNome] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      setErroNome(true);
      return;
    }

    setErroNome(false);

    const valorNumerico = possivelValor ? parseFloat(possivelValor.replace(',', '.')) : 0;

    const novoLead = await criarLead({
      nome: nome.trim(),
      situacao,
      interesse: interesse.trim(),
      possivelValor: isNaN(valorNumerico) ? 0 : valorNumerico,
      responsavel,
    });

    // Resetar campos do formulário para o próximo lead
    setNome('');
    setInteresse('');
    setIsCustomInteresse(false);
    setPossivelValor('');
    
    // Abre a ficha do lead criado
    onLeadCreated(novoLead);
  };

  return (
    <div
      id="bloco-cadastro-rapido"
      className="bg-white rounded-sm border border-[#D9D6D0] shadow-xs overflow-hidden"
    >
      <div className="px-6 py-3.5 bg-[#1A1A1A] text-white flex items-center justify-between border-b border-[#5C3A22]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-sm bg-[#5C3A22] flex items-center justify-center text-white font-bold">
            <UserPlus className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-xs sm:text-sm font-bold tracking-wider text-white uppercase">
            Cadastro Rápido de Paciente
          </h2>
        </div>
      </div>

      <form id="form-cadastro-rapido" onSubmit={handleSubmit} className="p-5 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
          {/* Nome */}
          <div className="lg:col-span-3 space-y-1.5">
            <label
              htmlFor="lead-nome-input"
              className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider"
            >
              Nome do Paciente <span className="text-[#5C3A22]">*</span>
            </label>
            <input
              id="lead-nome-input"
              type="text"
              required
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                if (erroNome) setErroNome(false);
              }}
              placeholder="Ex: Amanda Silva"
              className={`w-full h-10 px-3 text-xs sm:text-sm rounded-sm border bg-[#F2EFEA]/30 text-[#1A1A1A] focus:bg-white focus:outline-hidden transition-all placeholder:text-[#8F887E] ${
                erroNome
                  ? 'border-rose-500 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                  : 'border-[#D9D6D0] focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22]'
              }`}
            />
          </div>

          {/* Situação */}
          <div className="lg:col-span-2 space-y-1.5">
            <label
              htmlFor="lead-situacao-select"
              className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider"
            >
              Situação
            </label>
            <select
              id="lead-situacao-select"
              value={situacao}
              onChange={(e) => setSituacao(e.target.value as SituacaoLead)}
              className="w-full h-10 px-3 text-xs sm:text-sm rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:outline-hidden focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] transition-all font-medium"
            >
              {TODAS_SITUACOES.map((sit) => (
                <option key={sit} value={sit}>
                  {sit}
                </option>
              ))}
            </select>
          </div>

          {/* Interesse / Procedimento com Menu Suspenso dos Procedimentos Cadastrados */}
          <div className="lg:col-span-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="lead-interesse-input"
                className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider"
              >
                Interesse / Procedimento
              </label>
              <button
                type="button"
                onClick={() => setIsCustomInteresse(!isCustomInteresse)}
                className="text-[10px] font-bold text-[#5C3A22] hover:underline cursor-pointer"
              >
                {isCustomInteresse ? '📋 Tabela' : '✏️ Outro'}
              </button>
            </div>

            {isCustomInteresse ? (
              <input
                id="lead-interesse-input"
                type="text"
                value={interesse}
                onChange={(e) => setInteresse(e.target.value)}
                placeholder="Ex: Toxina Botulínica..."
                className="w-full h-10 px-3 text-xs sm:text-sm rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/30 text-[#1A1A1A] focus:bg-white focus:outline-hidden focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] transition-all placeholder:text-[#8F887E]"
              />
            ) : (
              <select
                id="lead-interesse-input"
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
                className="w-full h-10 px-3 text-xs sm:text-sm rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:outline-hidden focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] transition-all font-medium cursor-pointer"
              >
                <option value="">Selecione um procedimento...</option>
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
          <div className="lg:col-span-2 space-y-1.5">
            <label
              htmlFor="lead-valor-input"
              className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider"
            >
              Possível Valor (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#8F887E]">
                R$
              </span>
              <input
                id="lead-valor-input"
                type="number"
                step="0.01"
                min="0"
                value={possivelValor}
                onChange={(e) => setPossivelValor(e.target.value)}
                placeholder="0,00"
                className="w-full h-10 pl-8 pr-3 text-xs sm:text-sm rounded-sm border border-[#D9D6D0] bg-[#F2EFEA]/30 text-[#1A1A1A] focus:bg-white focus:outline-hidden focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] transition-all font-medium"
              />
            </div>
          </div>

          {/* Responsável */}
          <div className="lg:col-span-2 space-y-1.5">
            <label
              htmlFor="lead-responsavel-select"
              className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider"
            >
              Responsável
            </label>
            <select
              id="lead-responsavel-select"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              className="w-full h-10 px-3 text-xs sm:text-sm rounded-sm border border-[#D9D6D0] bg-white text-[#1A1A1A] focus:outline-hidden focus:border-[#5C3A22] focus:ring-1 focus:ring-[#5C3A22] transition-all"
            >
              {responsaveis.map((resp) => (
                <option key={resp} value={resp}>
                  {resp}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botão de Salvar */}
        <div className="mt-4 pt-4 border-t border-[#D9D6D0] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#6E6E6E] text-center sm:text-left">
            Ao cadastrar, a ficha clínica complementar do paciente será aberta para detalhamento.
          </p>
          <button
            id="btn-salvar-lead-rapido"
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#1A1A1A] hover:bg-[#5C3A22] text-white font-bold text-xs uppercase tracking-wider rounded-sm shadow-xs transition-all duration-150 cursor-pointer"
          >
            <span>Cadastrar Paciente</span>
            <ArrowRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </form>
    </div>
  );
};
