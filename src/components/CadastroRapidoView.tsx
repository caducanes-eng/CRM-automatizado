import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, UserPlus } from 'lucide-react';
import { NovoPacienteModal } from './NovoPacienteModal';
import { LeadTableView } from './LeadTableView';
import { ImportExportModal } from './ImportExportModal';
import { useCrm } from '../context/CrmContext';
import { Lead } from '../types';

export const CadastroRapidoView: React.FC = () => {
  const { leads, abrirFichaLead, isFichaLeadOpen } = useCrm();
  const [leadRecenteCriado, setLeadRecenteCriado] = useState<Lead | null>(null);
  const [isNovoPacienteOpen, setIsNovoPacienteOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

  const handleLeadCreated = (novoLead: Lead) => {
    setLeadRecenteCriado(novoLead);
    abrirFichaLead(novoLead.id);
  };

  return (
    <motion.div
      key="cadastro_rapido"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-5"
    >
      {/* Notificação toast rápida se um paciente acabou de ser criado */}
      {leadRecenteCriado && !isFichaLeadOpen && (
        <div
          id="toast-lead-criado"
          className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-sm flex items-center justify-between text-xs font-medium animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Paciente <strong>{leadRecenteCriado.nome}</strong> cadastrado com sucesso!
            </span>
          </div>
          <button
            type="button"
            onClick={() => abrirFichaLead(leadRecenteCriado.id)}
            className="text-xs font-bold text-emerald-800 underline hover:text-emerald-950 cursor-pointer"
          >
            Abrir ficha
          </button>
        </div>
      )}

      {/* Barra de Ação Superior: Botão Único para Cadastrar Paciente */}
      <div className="flex items-center justify-end pb-1">
        <button
          id="btn-abrir-novo-paciente"
          type="button"
          onClick={() => setIsNovoPacienteOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#5C3A22] hover:bg-[#4A2E1B] text-white font-bold text-xs uppercase tracking-wider rounded-sm shadow-xs transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4 text-white" />
          <span>Cadastrar Paciente</span>
        </button>
      </div>

      {/* Tabela de Pacientes cadastrados */}
      <LeadTableView
        onOpenFicha={(id) => abrirFichaLead(id)}
        onOpenNovoPaciente={() => setIsNovoPacienteOpen(true)}
      />

      {/* Modal de Cadastro de Paciente */}
      <NovoPacienteModal
        isOpen={isNovoPacienteOpen}
        onClose={() => setIsNovoPacienteOpen(false)}
        onLeadCreated={handleLeadCreated}
      />

      {/* Modal Central de Importação / Exportação / Tabela Modelo */}
      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        leadsFiltrados={leads}
      />
    </motion.div>
  );
};


