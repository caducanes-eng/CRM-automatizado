import React from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  Layers,
  Clock,
  ArrowRight,
  ShieldAlert,
  Zap,
  CheckCircle2,
  Database,
} from 'lucide-react';
import { SectionId } from '../types';

interface PlaceholderViewProps {
  id: SectionId;
  title: string;
  description: string;
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({
  id,
  title,
  description,
}) => {
  const isQuickRegistration = id === 'cadastro_rapido';

  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="p-6 md:p-8 max-w-6xl mx-auto w-full space-y-6"
    >
      {/* Top Banner Card */}
      <div
        id={`view-card-${id}`}
        className={`rounded-2xl border p-6 md:p-8 transition-all ${
          isQuickRegistration
            ? 'bg-gradient-to-br from-white via-slate-50 to-[#FAF7EE] border-[#B8960C]/30 shadow-sm'
            : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <h1
                id={`page-title-${id}`}
                className="text-2xl md:text-3xl font-bold tracking-tight text-[#0B1F3A]"
              >
                {title}
              </h1>
              {isQuickRegistration ? (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#B8960C] text-slate-950">
                  Tela Principal
                </span>
              ) : (
                <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                  Módulo Secundário
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 max-w-2xl">{description}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Em construção
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="pt-8 pb-4">
          {isQuickRegistration ? (
            <div className="space-y-6">
              <div className="p-6 rounded-xl bg-white border border-[#B8960C]/20 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#0B1F3A] text-[#B8960C] flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#0B1F3A]">
                      Área de Cadastro Ultra Rápido
                    </h3>
                    <p className="text-xs text-slate-500">
                      Esqueleto inicial pronto. Aguardando a definição do modelo de dados.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-lg bg-[#F8FAFC] border border-slate-200/80">
                    <div className="flex items-center gap-2 text-[#0B1F3A] font-semibold text-xs mb-1">
                      <CheckCircle2 className="w-4 h-4 text-[#B8960C]" />
                      Navegação Estruturada
                    </div>
                    <p className="text-xs text-slate-500">
                      9 seções configuradas no menu lateral com foco na velocidade de atendimento.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-[#F8FAFC] border border-slate-200/80">
                    <div className="flex items-center gap-2 text-[#0B1F3A] font-semibold text-xs mb-1">
                      <CheckCircle2 className="w-4 h-4 text-[#B8960C]" />
                      Identidade Visual
                    </div>
                    <p className="text-xs text-slate-500">
                      Paleta Navy (#0B1F3A) e Dourado (#B8960C) com contraste refinado.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#B8960C]/30 bg-[#FAF7EE]/50">
                    <div className="flex items-center gap-2 text-[#8C7207] font-semibold text-xs mb-1">
                      <Database className="w-4 h-4 text-[#B8960C]" />
                      Próximo Bloco
                    </div>
                    <p className="text-xs text-slate-600">
                      Pronto para receber o Modelo de Domínio e campos de formulário.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Layers className="w-6 h-6 text-slate-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-[#0B1F3A]">
                  Módulo: {title}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Esta tela secundária está devidamente estruturada no roteamento e será populada conforme as regras de negócio e etapas do CRM.
                </p>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium px-3 py-1 bg-white rounded-md border border-slate-200">
                  Status: Em construção
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
