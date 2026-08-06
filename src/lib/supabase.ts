import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_SUPABASE = 'crm_supabase_config_v1';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  origem: 'env' | 'custom' | 'nenhuma';
}

let cachedClient: SupabaseClient | null = null;
let lastClientKey = '';

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
 * Salva credenciais do Supabase no armazenamento local
 */
export function saveSupabaseConfig(url: string, anonKey: string): void {
  const limpoUrl = url.trim();
  const limpoKey = anonKey.trim();

  localStorage.setItem(
    STORAGE_KEY_SUPABASE,
    JSON.stringify({ url: limpoUrl, anonKey: limpoKey })
  );

  // Invalida cliente em cache para reinicializar
  cachedClient = null;
  lastClientKey = '';
}

/**
 * Remove credenciais do Supabase salvas no navegador
 */
export function clearSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY_SUPABASE);
  cachedClient = null;
  lastClientKey = '';
}

/**
 * Verifica se o Supabase possui URL e chave configuradas
 */
export function isSupabaseConfigured(): boolean {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey);
}

/**
 * Inicializa ou retorna a instância singleton do SupabaseClient
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

    // Testa tabela procedimentos
    const { error: errProc } = await client.from('procedimentos').select('id').limit(1);
    if (!errProc) tabelasValidadas.push('procedimentos');

    // Testa tabela compras
    const { error: errCompras } = await client.from('compras').select('id').limit(1);
    if (!errCompras) tabelasValidadas.push('compras');

    // Testa tabela usuarios
    const { error: errUsuarios } = await client.from('usuarios').select('id').limit(1);
    if (!errUsuarios) tabelasValidadas.push('usuarios');

    return {
      sucesso: true,
      mensagem: `Conexão ativa e autenticada! (${tabelasValidadas.length} tabelas identificadas)`,
      tabelasEncontradas: tabelasValidadas,
      detalhes: { empresasEncontradas: empresas?.length || 0 },
    };
  } catch (error: any) {
    return {
      sucesso: false,
      mensagem: `Falha de rede ou configuração ao comunicar com Supabase: ${error?.message || 'Erro desconhecido'}`,
      detalhes: error,
    };
  }
}
