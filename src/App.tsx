/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SectionId } from './types';
import { useAuth } from './context/AuthContext';
import { useEmpresa } from './context/EmpresaContext';
import { iniciarEscutaSupabaseConfigFirestore } from './lib/supabase';
import { LoginView } from './components/LoginView';
import { Sidebar, navigationItems } from './components/Sidebar';
import { Header } from './components/Header';
import { PlaceholderView } from './components/PlaceholderView';
import { CadastroRapidoView } from './components/CadastroRapidoView';
import { ConsultasAgendadasView } from './components/ConsultasAgendadasView';
import { CadenciaView } from './components/CadenciaView';
import { NutricaoView } from './components/NutricaoView';
import { LeadsPerdidosView } from './components/LeadsPerdidosView';
import { HistoricoComprasView } from './components/HistoricoComprasView';
import { FunilConversaoView } from './components/FunilConversaoView';
import { ControleAcessosView } from './components/ControleAcessosView';
import { ConfiguracoesEmpresaView } from './components/ConfiguracoesEmpresaView';
import { FichaLeadModal } from './components/FichaLeadModal';

// Helper to look up active item meta
function findSectionMeta(sectionId: SectionId) {
  for (const group of navigationItems) {
    for (const item of group.items) {
      if (item.id === sectionId) {
        return item;
      }
    }
  }
  return {
    id: sectionId,
    label: 'Cadastro rápido',
    description: 'Entrada ultra rápida de novos pacientes',
  };
}

export default function App() {
  const { user, isLoading } = useAuth();
  const { config } = useEmpresa();
  const [activeSection, setActiveSection] = useState<SectionId>('cadastro_rapido');
  const [isOpenMobile, setIsOpenMobile] = useState<boolean>(false);

  // Inicia a escuta global em tempo real para sincronizar credenciais do Supabase alteradas pelo Gestor Master
  useEffect(() => {
    const unsub = iniciarEscutaSupabaseConfigFirestore();
    return () => unsub();
  }, []);

  const corPrimaria = config.estetica?.corPrimaria || '#5C3A22';
  const corSecundaria = config.estetica?.corSecundaria || '#8A6142';

  // 1. Tela de Carregamento Inicial
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center text-[#0F172A] space-y-3 font-sans">
        <div className="w-12 h-12 rounded-xl bg-[#0F172A] text-white flex items-center justify-center font-bold text-xl shadow-md animate-pulse">
          CRM
        </div>
        <div className="text-center space-y-1">
          <p className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            SISTEMA CRM DE GESTÃO
          </p>
          <p className="text-[11px] text-[#64748B]">Carregando ambiente seguro...</p>
        </div>
      </div>
    );
  }

  // 2. Se o Responsável não estiver autenticado, exibe a tela de login
  if (!user) {
    return <LoginView />;
  }

  const activeMeta = findSectionMeta(activeSection);

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'cadastro_rapido':
        return <CadastroRapidoView />;

      case 'em_captacao':
        return (
          <CadenciaView
            situacao="Em captação"
            titulo="Em captação"
            subtitulo="Acompanhamento da cadência de novos contatos e primeiros retornos"
          />
        );

      case 'consulta_agendada':
        return <ConsultasAgendadasView />;

      case 'pos_consulta':
        return (
          <CadenciaView
            situacao="Pós consulta"
            titulo="Pós consulta"
            subtitulo="Acompanhamento da cadência de pós-avaliação e orçamentos apresentados"
          />
        );

      case 'pos_procedimento':
        return (
          <CadenciaView
            situacao="Pós procedimento"
            titulo="Pós procedimento"
            subtitulo="Acompanhamento pós-procedimento e confirmação do retorno"
          />
        );

      case 'reativacao':
        return (
          <CadenciaView
            situacao="Reativação"
            titulo="Reativação"
            subtitulo="Cadência de reativação e resgate de leads inativos"
          />
        );

      case 'nutricao':
        return <NutricaoView />;

      case 'leads_perdidos':
        return <LeadsPerdidosView />;

      case 'historico_compras':
        return <HistoricoComprasView />;

      case 'funil_conversao':
        return <FunilConversaoView />;

      case 'controle_acessos':
        return <ControleAcessosView />;

      case 'configuracoes':
        return <ConfiguracoesEmpresaView />;

      default:
        return (
          <PlaceholderView
            id={activeSection}
            title={activeMeta.label}
            description={activeMeta.description}
          />
        );
    }
  };

  return (
    <div id="app-root" className="h-screen w-screen overflow-hidden flex bg-white text-[#1A1A1A]">
      {/* Sidebar Navigation - Fixed & Non-scrolling */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={(id) => setActiveSection(id)}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
      />

      {/* Main Content Area - Offset by fixed sidebar width (w-72 / 288px) on desktop */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden lg:pl-72">
        <Header
          activeTitle={activeMeta.label}
          activeDescription={activeMeta.description}
          onOpenMobileSidebar={() => setIsOpenMobile(true)}
          isQuickRegistration={activeSection === 'cadastro_rapido'}
        />

        <main id="main-content-scroll" className="flex-1 overflow-y-auto bg-[#F8F7F4]/40">
          {renderSectionContent()}
        </main>
      </div>

      {/* Modal Global da Ficha do Lead */}
      <FichaLeadModal />
    </div>
  );
}
