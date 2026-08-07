import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../lib/firebase';
import {
  ConfiguracoesEmpresa,
  EsteticaPlataforma,
  ESTETICAS_PRESET,
} from '../types';
import { obterCoresSidebarCompletas } from '../utils/estetica';

const STORAGE_KEY_EMPRESA = 'crm_estetica_empresa_v1';

export const CONFIGURACOES_PADRAO: ConfiguracoesEmpresa = {
  nomeEmpresa: 'Dra. Agda Rodrigues',
  subtitulo: 'Harmonização Facial',
  tipoLogo: 'monograma',
  monogramaIniciais: 'AR',
  logoAltura: 'padrao',
  logoAjusteLateral: 'total',
  logoFundoHeader: 'integrado',
  cnpj: '45.123.890/0001-34',
  registroProfissional: 'CRM-SP 184.920 / RQE 92.410',
  telefone: '(11) 98452-1920',
  email: 'contato@agdarodrigues.med.br',
  endereco: 'Av. Brigadeiro Faria Lima, 3477 - 12º andar - Itaim Bibi, São Paulo - SP, CEP 04538-133',
  horarioFuncionamento: 'Segunda a Sexta: 08h às 19h | Sábados: 08h às 13h',
  unidadePadrao: 'Consultório Principal - Itaim Bibi',
  estetica: ESTETICAS_PRESET[0],
  esteticasSalvas: ESTETICAS_PRESET,
  updated_at: new Date().toISOString(),
};

interface EmpresaContextType {
  config: ConfiguracoesEmpresa;
  isCarregandoConfig: boolean;
  atualizarConfig: (novosDados: Partial<ConfiguracoesEmpresa>) => Promise<boolean>;
  aplicarEstetica: (estetica: EsteticaPlataforma) => Promise<boolean>;
  salvarNovaEstetica: (novaEstetica: EsteticaPlataforma) => Promise<boolean>;
  removerEsteticaSalva: (idPreset: string) => Promise<boolean>;
  resetarConfiguracoes: () => Promise<boolean>;
  uploadLogoArquivo: (file: File) => Promise<{ sucesso: boolean; mensagem?: string }>;
}

const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined);

function aplicarVariaveisCss(estetica: EsteticaPlataforma) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const c = obterCoresSidebarCompletas(estetica);

  root.style.setProperty('--cor-primaria', c.corPrimaria);
  root.style.setProperty('--cor-secundaria', c.corSecundaria);
  root.style.setProperty('--cor-sidebar', c.corSidebar);
  root.style.setProperty('--cor-sidebar-texto', c.corSidebarTexto);
  root.style.setProperty('--cor-nav-categoria-texto', c.corNavCategoriaTexto);
  root.style.setProperty('--cor-nav-texto-inativo', c.corNavTextoInativo);
  root.style.setProperty('--cor-nav-texto-hover', c.corNavTextoHover);
  root.style.setProperty('--cor-nav-hover-bg', c.corNavHoverBg);
  root.style.setProperty('--cor-nav-ativo-bg', c.corNavAtivoBg);
  root.style.setProperty('--cor-nav-ativo-texto', c.corNavAtivoTexto);
  root.style.setProperty('--cor-nav-ativo-borda', c.corNavAtivoBorda);
  root.style.setProperty('--cor-nav-badge-bg', c.corNavBadgeBg);
  root.style.setProperty('--cor-nav-badge-texto', c.corNavBadgeTexto);
  root.style.setProperty('--cor-nav-footer-bg', c.corNavFooterBg);
  root.style.setProperty('--cor-nav-footer-texto-principal', c.corNavFooterTextoPrincipal);
  root.style.setProperty('--cor-nav-footer-texto-secundario', c.corNavFooterTextoSecundario);
  root.style.setProperty('--cor-nav-footer-icone', c.corNavFooterIcone);
  root.style.setProperty('--cor-fundo-destaque', c.corFundoDestaque);
  root.style.setProperty('--cor-borda', c.corBorda);
  root.style.setProperty('--cor-texto', c.corTexto);
}

export const EmpresaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<ConfiguracoesEmpresa>(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY_EMPRESA);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (parsed && parsed.nomeEmpresa) {
          // Garante fallback de esteticas
          return {
            ...CONFIGURACOES_PADRAO,
            ...parsed,
            estetica: parsed.estetica || CONFIGURACOES_PADRAO.estetica,
            esteticasSalvas:
              parsed.esteticasSalvas && parsed.esteticasSalvas.length > 0
                ? parsed.esteticasSalvas
                : ESTETICAS_PRESET,
          };
        }
      }
    } catch (e) {
      console.warn('Erro ao ler configuracoes do storage:', e);
    }
    return CONFIGURACOES_PADRAO;
  });

  const [isCarregandoConfig, setIsCarregandoConfig] = useState(false);

  // Aplica as variáveis CSS imediatamente na montagem e nas mudanças de estética
  useEffect(() => {
    if (config.estetica) {
      aplicarVariaveisCss(config.estetica);
    }
  }, [config.estetica]);

  // Salva no localStorage sempre que houver alteração
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EMPRESA, JSON.stringify(config));
    } catch (e) {
      console.warn('Erro ao salvar configuracoes no storage:', e);
    }
  }, [config]);

  // Sincronização em tempo real com Firestore (coleção `configuracoes`, doc `geral`)
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const inicializarConfiguracoesFirestore = async () => {
      try {
        const docRef = doc(db, 'configuracoes', 'geral');
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
          // Cria o documento inicial no Firestore se ainda não existir
          await setDoc(docRef, sanitizeForFirestore(CONFIGURACOES_PADRAO));
        }

        // Listener em tempo real
        unsubscribe = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as ConfiguracoesEmpresa;
            if (data && data.nomeEmpresa) {
              setConfig((prev) => ({
                ...prev,
                ...data,
                esteticasSalvas:
                  data.esteticasSalvas && data.esteticasSalvas.length > 0
                    ? data.esteticasSalvas
                    : prev.esteticasSalvas || ESTETICAS_PRESET,
              }));
              if (data.estetica) {
                aplicarVariaveisCss(data.estetica);
              }
            }
          }
        });
      } catch (err) {
        console.warn('Nota sobre inicialização de Firestore configuracoes:', err);
      }
    };

    inicializarConfiguracoesFirestore();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Atualizar configurações parciais
  const atualizarConfig = useCallback(
    async (novosDados: Partial<ConfiguracoesEmpresa>): Promise<boolean> => {
      try {
        setIsCarregandoConfig(true);
        const configAtualizada: ConfiguracoesEmpresa = {
          ...config,
          ...novosDados,
          updated_at: new Date().toISOString(),
        };

        setConfig(configAtualizada);

        if (novosDados.estetica) {
          aplicarVariaveisCss(novosDados.estetica);
        }

        // Salva no Firestore
        try {
          const docRef = doc(db, 'configuracoes', 'geral');
          await setDoc(docRef, sanitizeForFirestore(configAtualizada), { merge: true });
        } catch (fsErr) {
          console.warn('Erro ao sincronizar config no Firestore:', fsErr);
        }

        return true;
      } catch (error) {
        console.error('Erro ao atualizar configurações:', error);
        return false;
      } finally {
        setIsCarregandoConfig(false);
      }
    },
    [config]
  );

  // Aplicar uma estética (preset ou salva)
  const aplicarEstetica = useCallback(
    async (estetica: EsteticaPlataforma): Promise<boolean> => {
      return atualizarConfig({ estetica });
    },
    [atualizarConfig]
  );

  // Salvar uma nova estética personalizada na lista de estéticas
  const salvarNovaEstetica = useCallback(
    async (novaEstetica: EsteticaPlataforma): Promise<boolean> => {
      try {
        const esteticasAtuais = config.esteticasSalvas || ESTETICAS_PRESET;
        // Se já existe com esse ID, substitui; caso contrário, adiciona
        const indexExistente = esteticasAtuais.findIndex((e) => e.idPreset === novaEstetica.idPreset);
        let novaLista: EsteticaPlataforma[];

        if (indexExistente >= 0) {
          novaLista = [...esteticasAtuais];
          novaLista[indexExistente] = novaEstetica;
        } else {
          novaLista = [...esteticasAtuais, novaEstetica];
        }

        return await atualizarConfig({
          estetica: novaEstetica,
          esteticasSalvas: novaLista,
        });
      } catch (e) {
        console.error('Erro ao salvar nova estética:', e);
        return false;
      }
    },
    [config.esteticasSalvas, atualizarConfig]
  );

  // Remover uma estética personalizada salva
  const removerEsteticaSalva = useCallback(
    async (idPreset: string): Promise<boolean> => {
      try {
        const esteticasAtuais = config.esteticasSalvas || ESTETICAS_PRESET;
        // Não remove presets oficiais fixos
        if (ESTETICAS_PRESET.some((p) => p.idPreset === idPreset)) {
          return false;
        }

        const novaLista = esteticasAtuais.filter((e) => e.idPreset !== idPreset);
        return await atualizarConfig({ esteticasSalvas: novaLista });
      } catch (e) {
        console.error('Erro ao remover estética:', e);
        return false;
      }
    },
    [config.esteticasSalvas, atualizarConfig]
  );

  // Upload de arquivo de logo (converte para Base64 Data URL)
  const uploadLogoArquivo = useCallback(
    async (file: File): Promise<{ sucesso: boolean; mensagem?: string }> => {
      if (!file) {
        return { sucesso: false, mensagem: 'Nenhum arquivo selecionado.' };
      }

      // Validar tipo de arquivo
      const tiposPermitidos = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
      if (!tiposPermitidos.includes(file.type)) {
        return {
          sucesso: false,
          mensagem: 'Formato inválido. Utilize PNG, SVG, WEBP ou JPEG.',
        };
      }

      // Validar tamanho (máximo 2MB)
      const maxBytes = 2 * 1024 * 1024;
      if (file.size > maxBytes) {
        return {
          sucesso: false,
          mensagem: 'O arquivo excede o limite de 2MB. Otimize a imagem antes de enviar.',
        };
      }

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const dataUrl = reader.result as string;
            await atualizarConfig({
              logoUrl: dataUrl,
              tipoLogo: 'imagem',
            });
            resolve({ sucesso: true, mensagem: 'Logo carregada com sucesso!' });
          } catch (e) {
            resolve({ sucesso: false, mensagem: 'Erro ao processar imagem.' });
          }
        };
        reader.onerror = () => {
          resolve({ sucesso: false, mensagem: 'Falha ao ler arquivo do dispositivo.' });
        };
        reader.readAsDataURL(file);
      });
    },
    [atualizarConfig]
  );

  // Resetar para padrão oficial
  const resetarConfiguracoes = useCallback(async (): Promise<boolean> => {
    return atualizarConfig(CONFIGURACOES_PADRAO);
  }, [atualizarConfig]);

  return (
    <EmpresaContext.Provider
      value={{
        config,
        isCarregandoConfig,
        atualizarConfig,
        aplicarEstetica,
        salvarNovaEstetica,
        removerEsteticaSalva,
        resetarConfiguracoes,
        uploadLogoArquivo,
      }}
    >
      {children}
    </EmpresaContext.Provider>
  );
};

export const useEmpresa = (): EmpresaContextType => {
  const context = useContext(EmpresaContext);
  if (!context) {
    throw new Error('useEmpresa deve ser utilizado dentro de um EmpresaProvider');
  }
  return context;
};
