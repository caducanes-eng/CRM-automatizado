import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const STORAGE_KEY_SUPABASE = 'crm_supabase_config_v1';
const FIRESTORE_DOC_PATH = { collection: 'configuracoes_sistema', doc: 'supabase' };

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  origem: 'env' | 'custom' | 'nenhuma';
}

export interface RealtimeEventLog {
  id: string;
  timestamp: string;
  tabela: string;
  evento: 'INSERT' | 'UPDATE' | 'DELETE' | 'SYSTEM';
  descricao: string;
  detalhes?: any;
}

export type RealtimeConnectionStatus = 'DESCONECTADO' | 'CONECTANDO' | 'CONECTADO' | 'ERRO';
export type RealtimeLogEntry = RealtimeEventLog;
export type RealtimeStatusType = RealtimeConnectionStatus;

let cachedClient: SupabaseClient | null = null;
let lastClientKey = '';
let globalRealtimeChannel: RealtimeChannel | null = null;
let currentRealtimeStatus: RealtimeConnectionStatus = 'DESCONECTADO';
const realtimeStatusListeners: Set<(status: RealtimeConnectionStatus) => void> = new Set();
const realtimeLogs: RealtimeEventLog[] = [];
const realtimeLogListeners: Set<(log: RealtimeEventLog) => void> = new Set();

/**
 * Registra um log de evento em tempo real e notifica observadores
 */
export function logRealtimeEvent(
  tabela: string,
  evento: 'INSERT' | 'UPDATE' | 'DELETE' | 'SYSTEM',
  descricao: string,
  detalhes?: any
): void {
  const log: RealtimeEventLog = {
    id: 'rt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    tabela,
    evento,
    descricao,
    detalhes,
  };

  realtimeLogs.unshift(log);
  if (realtimeLogs.length > 50) {
    realtimeLogs.pop();
  }

  realtimeLogListeners.forEach((fn) => {
    try {
      fn(log);
    } catch (e) {}
  });
}

/**
 * Atualiza o status da conexão em tempo real e notifica ouvintes
 */
export function setRealtimeStatus(status: RealtimeConnectionStatus): void {
  currentRealtimeStatus = status;
  realtimeStatusListeners.forEach((fn) => {
    try {
      fn(status);
    } catch (e) {}
  });
}

export function getRealtimeStatus(): RealtimeConnectionStatus {
  return currentRealtimeStatus;
}

export function subscribeRealtimeStatus(fn: (status: RealtimeConnectionStatus) => void): () => void {
  realtimeStatusListeners.add(fn);
  fn(currentRealtimeStatus);
  return () => realtimeStatusListeners.delete(fn);
}

export function subscribeRealtimeLogs(fn: (log: RealtimeEventLog) => void): () => void {
  realtimeLogListeners.add(fn);
  return () => realtimeLogListeners.delete(fn);
}

export function getRealtimeLogs(): RealtimeEventLog[] {
  return [...realtimeLogs];
}

/**
 * Obtém as credenciais ativas do Supabase (prioridade: localStorage configurado > variáveis VITE_*)
 */
export function getSupabaseConfig(): SupabaseConfig {
  const envObj = (import.meta as any).env || {};
  const envUrl = (envObj.VITE_SUPABASE_URL || '').trim();
  const envKey = (envObj.VITE_SUPABASE_ANON_KEY || '').trim();

  try {
    const salvo = localStorage.getItem(STORAGE_KEY_SUPABASE);
    if (salvo) {
      const parsed = JSON.parse(salvo);
      if (parsed.url && parsed.anonKey) {
        return {
          url: parsed.url.trim(),
          anonKey: parsed.anonKey.trim(),
          origem: 'custom',
        };
      }
    }
  } catch (e) {
    console.error('Erro ao ler configuração do Supabase no localStorage', e);
  }

  if (envUrl && envKey) {
    return {
      url: envUrl,
      anonKey: envKey,
      origem: 'env',
    };
  }

  return {
    url: '',
    anonKey: '',
    origem: 'nenhuma',
  };
}

/**
 * Salva credenciais do Supabase no armazenamento local e sincroniza no Firestore para todos os acessos
 */
export function saveSupabaseConfig(url: string, anonKey: string): void {
  const limpoUrl = url.trim();
  const limpoKey = anonKey.trim();

  localStorage.setItem(
    STORAGE_KEY_SUPABASE,
    JSON.stringify({ url: limpoUrl, anonKey: limpoKey })
  );

  // Invalida cliente em cache para reinicializar
  if (globalRealtimeChannel) {
    try {
      globalRealtimeChannel.unsubscribe();
    } catch (e) {}
    globalRealtimeChannel = null;
  }
  cachedClient = null;
  lastClientKey = '';

  logRealtimeEvent('SISTEMA', 'SYSTEM', 'Novas credenciais do Supabase salvas localmente.');

  // Sincroniza credenciais no Firestore para outros navegadores
  if (db && limpoUrl && limpoKey) {
    try {
      const docRef = doc(db, FIRESTORE_DOC_PATH.collection, FIRESTORE_DOC_PATH.doc);
      setDoc(docRef, {
        url: limpoUrl,
        anonKey: limpoKey,
        updatedAt: new Date().toISOString(),
      }, { merge: true }).catch((e) => {
        console.warn('Erro ao salvar config do Supabase no Firestore:', e);
      });
    } catch (e) {
      console.warn('Aviso ao sincronizar Supabase no Firestore:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('supabase-config-changed'));
  }
}

export function iniciarEscutaSupabaseConfigFirestore(): () => void {
  if (!db) return () => {};

  try {
    const docRef = doc(db, FIRESTORE_DOC_PATH.collection, FIRESTORE_DOC_PATH.doc);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && data.url && data.anonKey) {
            const configAtual = getSupabaseConfig();
            if (configAtual.url !== data.url || configAtual.anonKey !== data.anonKey) {
              console.log('🔄 Sincronizando credenciais do Supabase obtidas via Firestore...');
              localStorage.setItem(
                STORAGE_KEY_SUPABASE,
                JSON.stringify({ url: data.url.trim(), anonKey: data.anonKey.trim() })
              );
              cachedClient = null;
              lastClientKey = '';
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('supabase-config-changed'));
              }
            }
          }
        }
      },
      (error) => {
        console.warn('Aviso ao escutar Supabase config no Firestore:', error);
      }
    );
    return unsubscribe;
  } catch (e) {
    console.warn('Erro ao iniciar listener de Supabase config no Firestore:', e);
    return () => {};
  }
}

/**
 * Remove credenciais do Supabase salvas no navegador
 */
export function clearSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY_SUPABASE);
  if (globalRealtimeChannel) {
    try {
      globalRealtimeChannel.unsubscribe();
    } catch (e) {}
    globalRealtimeChannel = null;
  }
  cachedClient = null;
  lastClientKey = '';
  setRealtimeStatus('DESCONECTADO');

  logRealtimeEvent('SISTEMA', 'SYSTEM', 'Credenciais do Supabase removidas.');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('supabase-config-changed'));
  }
}

/**
 * Verifica se o Supabase possui URL e chave configuradas e válidas
 */
export function isSupabaseConfigured(): boolean {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) return false;
  try {
    const parsed = new URL(config.url);
    return Boolean(parsed.protocol && (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname);
  } catch (e) {
    return false;
  }
}

/**
 * Retorna a instância singleton do SupabaseClient sem recriar conexões
 */
export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  const currentKey = `${config.url}:::${config.anonKey}`;
  if (cachedClient && lastClientKey === currentKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // Evita disparar reinicializações paralelas do GoTrueClient
      },
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
    });
    lastClientKey = currentKey;
    return cachedClient;
  } catch (error) {
    console.error('Erro ao criar cliente Supabase:', error);
    return null;
  }
}

/**
 * Testa a conexão real com o Supabase efetuando uma query simples na tabela 'empresas' ou verificação de API
 */
export async function testSupabaseConnection(
  urlCustom?: string,
  keyCustom?: string
): Promise<{
  sucesso: boolean;
  mensagem: string;
  tabelasEncontradas?: string[];
  detalhes?: any;
}> {
  let client: SupabaseClient | null = null;

  if (urlCustom && keyCustom) {
    try {
      client = createClient(urlCustom.trim(), keyCustom.trim());
    } catch (e: any) {
      return {
        sucesso: false,
        mensagem: `URL ou Chave inválidas: ${e?.message || 'Erro de inicialização'}`,
      };
    }
  } else {
    client = getSupabaseClient();
  }

  if (!client) {
    return {
      sucesso: false,
      mensagem: 'Supabase não configurado. Forneça a URL do projeto e a Chave Anon.',
    };
  }

  try {
    // Testa consulta na tabela 'empresas'
    const { data: empresas, error: errEmpresas } = await client
      .from('empresas')
      .select('id, nome, updated_at')
      .limit(1);

    if (errEmpresas) {
      // Se a tabela não existe ainda (código 42P01 no postgres), a conexão funcionou mas precisa rodar a migration
      if (
        errEmpresas.code === '42P01' ||
        errEmpresas.message?.includes('relation "empresas" does not exist') ||
        errEmpresas.message?.includes('does not exist')
      ) {
        return {
          sucesso: true,
          mensagem: 'Conexão com o Supabase bem-sucedida! Porém as tabelas ainda não foram criadas no banco de dados. Execute o script schema.sql no SQL Editor do Supabase.',
          detalhes: { tabelasPendentes: true, erroOriginal: errEmpresas },
        };
      }

      return {
        sucesso: false,
        mensagem: `Erro retornado pelo Supabase: ${errEmpresas.message} (Código: ${errEmpresas.code || 'N/A'})`,
        detalhes: errEmpresas,
      };
    }

    // Se chegou aqui, a conexão com 'empresas' funcionou perfeitamente
    const tabelasValidadas: string[] = ['empresas'];

    // Testa tabela leads
    const { error: errLeads } = await client.from('leads').select('id').limit(1);
    if (!errLeads) tabelasValidadas.push('leads');

    // Testa tabela fichas_leads ou fichas_lead
    const { error: errFichas1 } = await client.from('fichas_leads').select('id').limit(1);
    if (!errFichas1) {
      tabelasValidadas.push('fichas_leads');
    } else {
      const { error: errFichas2 } = await client.from('fichas_lead').select('id').limit(1);
      if (!errFichas2) tabelasValidadas.push('fichas_lead');
    }

    // Testa tabela procedimentos
    const { error: errProc } = await client.from('procedimentos').select('id').limit(1);
    if (!errProc) tabelasValidadas.push('procedimentos');

    // Testa tabela compras
    const { error: errCompras } = await client.from('compras').select('id').limit(1);
    if (!errCompras) tabelasValidadas.push('compras');

    // Testa tabela usuarios
    const { error: errUsuarios } = await client.from('usuarios').select('id').limit(1);
    if (!errUsuarios) tabelasValidadas.push('usuarios');

    // Testa tabela empresa_membros
    const { error: errMembros } = await client.from('empresa_membros').select('id').limit(1);
    if (!errMembros) tabelasValidadas.push('empresa_membros');

    logRealtimeEvent('SISTEMA', 'SYSTEM', `Conexão validada com sucesso. ${tabelasValidadas.length} tabelas prontas.`);

    return {
      sucesso: true,
      mensagem: `Conexão ativa, autenticada e pronta! (${tabelasValidadas.length} tabelas identificadas)`,
      tabelasEncontradas: tabelasValidadas,
      detalhes: { empresasEncontradas: empresas?.length || 0 },
    };
  } catch (error: any) {
    const isFetchError = error?.message?.includes('Failed to fetch') || error?.name === 'TypeError';
    return {
      sucesso: false,
      mensagem: isFetchError
        ? 'Falha ao conectar no Supabase. Verifique se a URL e a Chave Anon estão corretas e se o projeto Supabase está ativo.'
        : `Falha de rede ou configuração ao comunicar com Supabase: ${error?.message || 'Erro desconhecido'}`,
      detalhes: error,
    };
  }
}
