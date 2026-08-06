import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { QuickLeadForm } from './QuickLeadForm';
import { LeadTableView } from './LeadTableView';
import { ImportExportModal } from './ImportExportModal';
import { useCrm } from '../context/CrmContext';
import { Lead } from '../types';

export const CadastroRapidoView: React.FC = () => {
  const { leads, abrirFichaLead, isFichaLeadOpen } = useCrm();
  const [leadRecenteCriado, setLeadRecenteCriado] = useState<Lead | null>(null);
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
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6"
    >
      {/* Notificação toast rápida se um lead acabou de ser criado */}
      {leadRecenteCriado && !isFichaLeadOpen && (
        <div
          id="toast-lead-criado"
          className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-lg flex items-center justify-between text-xs font-medium animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Lead <strong>{leadRecenteCriado.nome}</strong> cadastrado com sucesso!
            </span>
          </div>
          <button
            type="button"
            onClick={() => abrirFichaLead(leadRecenteCriado.id)}
            className="text-xs font-bold text-emerald-800 underline hover:text-emerald-950 cursor-pointer"
          >
            Reabrir ficha
          </button>
        </div>
      )}

      {/* BLOCO 1: Formulário compacto de cadastro rápido */}
      <QuickLeadForm
        onLeadCreated={handleLeadCreated}
        onOpenImportExport={() => setIsImportExportOpen(true)}
      />

      {/* BLOCO 2: Tabela de Leads cadastrados */}
      <LeadTableView onOpenFicha={(id) => abrirFichaLead(id)} />

      {/* Modal Central de Importação / Exportação / Tabela Modelo */}
      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        leadsFiltrados={leads}
      />
    </motion.div>
  );
};

