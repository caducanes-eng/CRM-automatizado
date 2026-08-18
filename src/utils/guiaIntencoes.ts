import { SituacaoLead } from '../types';

export interface IntencaoMensagem {
  categoria:
    | 'CAPTAÇÃO'
    | 'AGENDAMENTO E CONFIRMAÇÃO'
    | 'NUTRIÇÃO (LEADS PARADOS)'
    | 'PÓS-PROCEDIMENTO'
    | 'REATIVAÇÃO (BASE ANTIGA)'
    | 'PÓS-CONSULTA';
  etapaStatus: string;
  situacaoDesc: string;
  intencao: string;
  finalidade: string;
  dicaTom: string;
  exemploPratico?: string;
}

export const GUIA_INTENCOES_OFICIAL: IntencaoMensagem[] = [
  // CAPTAÇÃO
  {
    categoria: 'CAPTAÇÃO',
    etapaStatus: 'Primeiro contato (dia 1)',
    situacaoDesc: 'Novo lead via Instagram / WhatsApp',
    intencao: 'Acolher e validar interesse real',
    finalidade:
      'Recepcionar a paciente com acolhimento genuíno, ouvir o desejo principal dela e validar o interesse sem empurrar venda imediatamente.',
    dicaTom: 'Tom caloroso, profissional e empático. Faça perguntas abertas sobre o que ela busca.',
    exemploPratico:
      'Olá, [Nome]! Seja muito bem-vinda à clínica da Dra. Agda. Vi que você se interessou por [Procedimento]. Me conta, você já realizou esse cuidado antes ou é a sua primeira vez?',
  },
  {
    categoria: 'CAPTAÇÃO',
    etapaStatus: 'Contato 2 (dia 3)',
    situacaoDesc: 'Lead em andamento no primeiro contato',
    intencao: 'Responder rápido, mostrar atenção',
    finalidade:
      'Demonstrar prontidão e disponibilidade, mantendo o diálogo vivo e facilitando a escolha da paciente.',
    dicaTom: 'Ágil, atencioso e prestativo.',
    exemploPratico:
      'Olá, [Nome]! Tudo bem? Passando para ver se conseguiu pensar sobre o que conversamos e se ficou alguma dúvida que eu possa esclarecer para você.',
  },
  {
    categoria: 'CAPTAÇÃO',
    etapaStatus: 'Contato 3 (dia 5)',
    situacaoDesc: 'Lead demonstrou interesse mas não definiu data',
    intencao: 'Mostrar vaga real, gerar ação',
    finalidade:
      'Apresentar opções reais e limitadas de horários na agenda para incentivar a tomada de decisão sem pressionar.',
    dicaTom: 'Consultivo e proativo, oferecendo 2 alternativas claras de horário.',
    exemploPratico:
      'Oi, [Nome]! A Dra. Agda abriu duas vagas especiais nesta semana: quinta às 14h ou sexta às 10h. Algum desses horários fica melhor para você?',
  },
  {
    categoria: 'CAPTAÇÃO',
    etapaStatus: 'Contato 4 (dia 9)',
    situacaoDesc: 'Lead sem resposta recente',
    intencao: 'Reabrir sem parecer cobrança',
    finalidade:
      'Retomar o contato de forma natural e suave, oferecendo apoio e desfazendo eventuais barreiras ou receios.',
    dicaTom: 'Leve, sem cobrança, demonstrando que a clínica está sempre de portas abertas.',
    exemploPratico:
      'Olá, [Nome]! Imagino que sua rotina esteja corrida por aí. Só passei para te desejar uma ótima semana e reforçar que sigo à disposição quando quiser retomar!',
  },
  {
    categoria: 'CAPTAÇÃO',
    etapaStatus: 'Contato 5 (dia 17)',
    situacaoDesc: 'Última tentativa de contato ativo',
    intencao: 'Última tentativa, tom leve',
    finalidade:
      'Concluir a cadência ativa educadamente, deixando o canal aberto caso a paciente decida agendar futuramente.',
    dicaTom: 'Descontraído, elegante e livre de pressão.',
    exemploPratico:
      'Oi, [Nome]! Para não encher suas mensagens, vou encerrar nossos lembretes por aqui, tá bom? Sempre que decidir cuidar da sua autoestima com a Dra. Agda, é só me mandar um alô!',
  },

  // AGENDAMENTO E CONFIRMAÇÃO
  {
    categoria: 'AGENDAMENTO E CONFIRMAÇÃO',
    etapaStatus: 'Oferta de horário',
    situacaoDesc: 'Lead pronto para marcar consulta',
    intencao: 'Facilitar escolha, reduzir fricção',
    finalidade:
      'Apresentar alternativas concretas de dias e turnos para a paciente escolher com facilidade imediata.',
    dicaTom: 'Direto, cortês e objetivo.',
    exemploPratico:
      'Que maravilha, [Nome]! Para sua avaliação com a Dra. Agda, temos terça-feira às 15h30 ou quinta às 11h. Qual combina melhor com a sua rotina?',
  },
  {
    categoria: 'AGENDAMENTO E CONFIRMAÇÃO',
    etapaStatus: 'Lembrete 2h antes',
    situacaoDesc: 'Confirmação + lanche + música',
    intencao: 'Confirmar presença, cuidar do detalhe',
    finalidade:
      'Garantir a pontualidade da paciente criando uma experiência memorável e personalizada na recepção.',
    dicaTom: 'Encantador, atencioso aos detalhes.',
    exemploPratico:
      'Olá, [Nome]! Estamos ansiosos te esperando hoje às [Horário]. Preparamos nosso café especial para você! Se tiver alguma preferência de música ambiente, pode me avisar!',
  },
  {
    categoria: 'AGENDAMENTO E CONFIRMAÇÃO',
    etapaStatus: 'No-show',
    situacaoDesc: 'Paciente não compareceu à consulta',
    intencao: 'Reabrir contato sem cobrar',
    finalidade:
      'Checar se está tudo bem com a paciente e oferecer uma nova oportunidade de reagendamento sem gerar constrangimento.',
    dicaTom: 'Compreensivo e acolhedor.',
    exemploPratico:
      'Olá, [Nome]! Sentimos sua falta hoje na clínica. Esperamos que esteja tudo bem! Se quiser, posso verificar os próximos horários disponíveis para remarcar sua consulta com calma.',
  },
  {
    categoria: 'AGENDAMENTO E CONFIRMAÇÃO',
    etapaStatus: 'Remarcação',
    situacaoDesc: 'Pediu para trocar de data',
    intencao: 'Priorizar data mais próxima',
    finalidade:
      'Encontrar rapidamente uma nova data para evitar que o compromisso caia no esquecimento.',
    dicaTom: 'Rápido, solícito e resolutivo.',
    exemploPratico:
      'Sem problemas, [Nome], imprevistos acontecem! Já estou com a agenda aberta: consigo remanejar para depois de amanhã às 16h ou no início da próxima semana. Qual você prefere?',
  },

  // NUTRIÇÃO (LEADS PARADOS)
  {
    categoria: 'NUTRIÇÃO (LEADS PARADOS)',
    etapaStatus: 'Fluxo de conteúdo 1 (Cuidados) / Sumiu na cobrança',
    situacaoDesc: 'Travou ao ver preço / consulta ou lead frio',
    intencao: 'Reabrir sem parecer cobrança',
    finalidade:
      'Entregar valor educacional e reforçar os diferenciais da Dra. Agda sem insistir diretamente em valores.',
    dicaTom: 'Educativo, leve e elegante.',
    exemploPratico:
      'Olá, [Nome]! Separamos esse guia rápido de cuidados com a pele que a Dra. Agda preparou para nossas pacientes. Espero que goste das dicas!',
  },
  {
    categoria: 'NUTRIÇÃO (LEADS PARADOS)',
    etapaStatus: 'Fluxo de conteúdo 2 (Novidades) / Fez 1 e sumiu',
    situacaoDesc: 'Já é paciente, não voltou para sequência',
    intencao: 'Lembrar prazo, facilitar retorno',
    finalidade:
      'Relembrar o benefício do cuidado preventivo contínuo e disponibilizar formas práticas de retorno.',
    dicaTom: 'Cuidadoso, destacando a importância da manutenção.',
    exemploPratico:
      'Oi, [Nome]! Como estão os resultados do seu último procedimento? Para manter aquele efeito incrível e natural, a Dra. Agda recomenda uma revisão nessa época.',
  },
  {
    categoria: 'NUTRIÇÃO (LEADS PARADOS)',
    etapaStatus: 'Convite para evento / Botox Day / Intenção sem ação',
    situacaoDesc: 'Disse que ia agendar mas parou no caminho',
    intencao: 'Mostrar vaga real, gerar ação',
    finalidade:
      'Apresentar uma oportunidade exclusiva com data e vagas especiais para gerar decisão imediata.',
    dicaTom: 'Exclusivo e convidativo.',
    exemploPratico:
      'Olá, [Nome]! Teremos um dia especial de Botox Day na clínica com vagas reservadas para você garantir seu retoque. Gostaria de reservar seu horário?',
  },

  // PÓS-PROCEDIMENTO
  {
    categoria: 'PÓS-PROCEDIMENTO',
    etapaStatus: 'Contato 1 (dia 1)',
    situacaoDesc: 'Check-in 24h após o procedimento',
    intencao: 'Cuidar, mostrar presença',
    finalidade:
      'Checar o bem-estar da paciente no dia seguinte, orientar sobre os cuidados iniciais e transmitir segurança.',
    dicaTom: 'Muito atencioso, acolhedor e seguro.',
    exemploPratico:
      'Bom dia, [Nome]! Como foi sua noite? A Dra. Agda pediu para passar aqui e checar como você está se sentindo hoje após o procedimento.',
  },
  {
    categoria: 'PÓS-PROCEDIMENTO',
    etapaStatus: 'Contato 2 (dia 7)',
    situacaoDesc: 'Paciente relata desconforto ou evolução semanal',
    intencao: 'Escutar, acionar Dra. depois',
    finalidade:
      'Praticar escuta atenta, acalmar a paciente com empatia e levar qualquer dúvida clínica imediatamente para a Dra. Agda.',
    dicaTom: 'Tranquilizador e focado em acolhimento clínico.',
    exemploPratico:
      'Oi, [Nome]! Passando para saber como está a evolução do seu procedimento esta semana. Qualquer dúvida ou sensação diferente, estou por aqui para te apoiar!',
  },
  {
    categoria: 'PÓS-PROCEDIMENTO',
    etapaStatus: 'Contato 3 (dia 15)',
    situacaoDesc: 'Acompanhamento de consolidação do resultado',
    intencao: 'Cuidar, mostrar presença',
    finalidade:
      'Monitorar a maturação dos resultados e reforçar a satisfação da paciente com o tratamento.',
    dicaTom: 'Celebrativo e atencioso.',
    exemploPratico:
      'Olá, [Nome]! Já estamos no 15º dia! Como está amando os resultados? Se precisar de qualquer orientação de skincare complementar, conte com a gente!',
  },
  {
    categoria: 'PÓS-PROCEDIMENTO',
    etapaStatus: 'Contato 4 - Confirmação do retorno (dia 29)',
    situacaoDesc: 'Confirmação do retorno presencial ou avaliação de retoque',
    intencao: 'Confirmar presença, cuidar do detalhe',
    finalidade:
      'Garantir que a paciente compareça à consulta de revisão/retoque de 30 dias para fechar o ciclo de excelência.',
    dicaTom: 'Pontual, seguro e focado na entrega do resultado perfeito.',
    exemploPratico:
      'Oi, [Nome]! Seu retorno de revisão com a Dra. Agda está previsto para os próximos dias. Vamos agendar para ela conferir de perto o resultado final?',
  },

  // REATIVAÇÃO (BASE ANTIGA)
  {
    categoria: 'REATIVAÇÃO (BASE ANTIGA)',
    etapaStatus: 'Contato 1 (dia 1)',
    situacaoDesc: '~4 meses pós-toxina / ~12 meses preenchedor',
    intencao: 'Lembrar sem soar venda',
    finalidade:
      'Relembrar que o prazo biológico de durabilidade está vencendo, oferecendo cuidado preventivo antes que o efeito suma por completo.',
    dicaTom: 'Consultivo, sutil e focado na longevidade dos resultados.',
    exemploPratico:
      'Olá, [Nome]! Faz cerca de 4 meses que você fez sua aplicação de toxina com a Dra. Agda. Para manter a pele lisinha e prevenir novas marcas, esse é o momento ideal de renovação.',
  },
  {
    categoria: 'REATIVAÇÃO (BASE ANTIGA)',
    etapaStatus: 'Contato 2 (dia 3)',
    situacaoDesc: 'Já foi paciente, tempo parado',
    intencao: 'Reabrir com facilidade, não desconto',
    finalidade:
      'Facilitar a volta da paciente reforçando a familiaridade, sem desvalorizar o serviço com leilão de preços.',
    dicaTom: 'Caloroso e acolhedor.',
    exemploPratico:
      'Oi, [Nome]! Sei que a rotina voa, mas queremos muito te ver de novo por aqui! Quer que eu veja um horário especial para você nesta semana?',
  },
  {
    categoria: 'REATIVAÇÃO (BASE ANTIGA)',
    etapaStatus: 'Contato 3 (dia 5)',
    situacaoDesc: 'Paciente considerou retorno mas não fechou',
    intencao: 'Facilitar escolha, reduzir fricção',
    finalidade:
      'Propor opções de encaixe flexíveis para facilitar a vinda da paciente à clínica.',
    dicaTom: 'Prestativo e dinâmico.',
    exemploPratico:
      'Olá, [Nome]! A Dra. Agda tem alguns horários no final da tarde nesta quinta ou sexta pela manhã. Fica melhor no início ou no fim do dia para você?',
  },
  {
    categoria: 'REATIVAÇÃO (BASE ANTIGA)',
    etapaStatus: 'Contato 4 (dia 9)',
    situacaoDesc: 'Reforço de cuidado contínuo',
    intencao: 'Lembrar prazo, facilitar retorno',
    finalidade:
      'Relembrar a importância da manutenção preventiva para economizar produtos e manter a harmonia facial.',
    dicaTom: 'Informativo e amigável.',
    exemploPratico:
      'Oi, [Nome]! Manter o tratamento em dia evita que as ruguinhas voltem a marcar a pele. Se quiser garantir seu horário, posso segurar uma vaga para você até amanhã!',
  },
  {
    categoria: 'REATIVAÇÃO (BASE ANTIGA)',
    etapaStatus: 'Contato 5 (dia 17)',
    situacaoDesc: '2ª/3ª tentativa sem resposta recente',
    intencao: 'Última tentativa, tom leve',
    finalidade:
      'Encerrar o ciclo de reativação sem insistência, preservando o bom relacionamento com a paciente.',
    dicaTom: 'Descontraído, respeitoso e sem cobrança.',
    exemploPratico:
      'Oi, [Nome]! Vou deixar você tranquila, mas lembre-se de que a Dra. Agda e toda nossa equipe estamos sempre aqui de braços abertos para te receber quando você quiser!',
  },

  // PÓS-CONSULTA
  {
    categoria: 'PÓS-CONSULTA',
    etapaStatus: 'Contato 1 (dia 1)',
    situacaoDesc: 'Check-in pós-avaliação / orçamento entregue',
    intencao: 'Acolher e validar interesse real',
    finalidade:
      'Saber o que a paciente achou do plano de tratamento proposto pela Dra. Agda e tirar qualquer dúvida inicial.',
    dicaTom: 'Atencioso, focado em ouvir e apoiar.',
    exemploPratico:
      'Olá, [Nome]! Foi um prazer te receber ontem na clínica! A Dra. Agda pediu para passar aqui e ver se ficou alguma dúvida sobre o plano que ela desenhou para você.',
  },
  {
    categoria: 'PÓS-CONSULTA',
    etapaStatus: 'Contato 2 (dia 3)',
    situacaoDesc: 'Travou na proposta ou orçamento',
    intencao: 'Reabrir sem parecer cobrança',
    finalidade:
      'Compreender se a paciente precisa de condições facilitadas de pagamento ou ajustes de cronograma.',
    dicaTom: 'Flexível, acolhedor e sem pressionar.',
    exemploPratico:
      'Oi, [Nome]! Tudo bem? Passando para te lembrar que podemos parcelar o seu plano de tratamento ou iniciar pelo procedimento prioritário. Como fica melhor para você?',
  },
  {
    categoria: 'PÓS-CONSULTA',
    etapaStatus: 'Contato 3 (dia 5)',
    situacaoDesc: 'Paciente aprovou ideia mas não definiu data',
    intencao: 'Facilitar escolha, reduzir fricção',
    finalidade:
      'Sugerir horários ideais para a realização do procedimento com tranquilidade.',
    dicaTom: 'Proativo e resolutivo.',
    exemploPratico:
      'Olá, [Nome]! A Dra. Agda tem horários reservados para procedimentos na próxima semana. Quer que eu garanta um horário para você iniciar sua transformação?',
  },
  {
    categoria: 'PÓS-CONSULTA',
    etapaStatus: 'Contato 4 (dia 9)',
    situacaoDesc: 'Paciente indecisa',
    intencao: 'Mostrar vaga real, gerar ação',
    finalidade:
      'Oferecer suporte para decisão final antes que o plano orçado perca a validade de agenda.',
    dicaTom: 'Consultivo e encorajador.',
    exemploPratico:
      'Oi, [Nome]! Passando para te avisar que estamos fechando a grade de procedimentos do mês. Se ainda quiser realizar o seu tratamento, me avisa para eu te encaixar!',
  },
  {
    categoria: 'PÓS-CONSULTA',
    etapaStatus: 'Contato 5 (dia 17)',
    situacaoDesc: 'Última tentativa de follow-up do orçamento',
    intencao: 'Última tentativa, tom leve',
    finalidade:
      'Encerrar o acompanhamento do orçamento sem constrangimento, mantendo as portas abertas para quando ela quiser.',
    dicaTom: 'Leve, amigável e descontraído.',
    exemploPratico:
      'Olá, [Nome]! Vou deixar seu plano arquivado com muito carinho por aqui. Quando você sentir que é o momento certo de realizar, é só me mandar uma mensagem!',
  },
];

/**
 * Busca a intenção e diretriz oficial da mensagem com base na situação e etapa do lead
 */
export function obterIntencaoDaEtapa(
  situacao: SituacaoLead,
  etapaNome?: string | null
): IntencaoMensagem {
  const etapaNormalizada = (etapaNome || '').toLowerCase();

  // 1. PÓS-PROCEDIMENTO
  if (situacao === 'Pós procedimento') {
    if (etapaNormalizada.includes('dia 29') || etapaNormalizada.includes('retorno') || etapaNormalizada.includes('contato 4')) {
      return GUIA_INTENCOES_OFICIAL.find((i) => i.categoria === 'PÓS-PROCEDIMENTO' && i.etapaStatus.includes('dia 29'))!;
    }
    if (etapaNormalizada.includes('dia 15') || etapaNormalizada.includes('contato 3')) {
      return GUIA_INTENCOES_OFICIAL.find((i) => i.categoria === 'PÓS-PROCEDIMENTO' && i.etapaStatus.includes('dia 15'))!;
    }
    if (etapaNormalizada.includes('dia 7') || etapaNormalizada.includes('contato 2')) {
      return GUIA_INTENCOES_OFICIAL.find((i) => i.categoria === 'PÓS-PROCEDIMENTO' && i.etapaStatus.includes('dia 7'))!;
    }
    return GUIA_INTENCOES_OFICIAL.find((i) => i.categoria === 'PÓS-PROCEDIMENTO' && i.etapaStatus.includes('dia 1'))!;
  }

  // 2. NUTRIÇÃO
  if (situacao === 'Nutrição') {
    if (etapaNormalizada.includes('evento') || etapaNormalizada.includes('botox day')) {
      return GUIA_INTENCOES_OFICIAL.find((i) => i.categoria === 'NUTRIÇÃO (LEADS PARADOS)' && i.etapaStatus.includes('Botox Day'))!;
    }
    if (etapaNormalizada.includes('conteúdo 2') || etapaNormalizada.includes('novidades')) {
      return GUIA_INTENCOES_OFICIAL.find((i) => i.categoria === 'NUTRIÇÃO (LEADS PARADOS)' && i.etapaStatus.includes('conteúdo 2'))!;
    }
    return GUIA_INTENCOES_OFICIAL.find((i) => i.categoria === 'NUTRIÇÃO (LEADS PARADOS)' && i.etapaStatus.includes('conteúdo 1'))!;
  }

  // 3. REATIVAÇÃO
  if (situacao === 'Reativação') {
    if (etapaNormalizada.includes('dia 17') || etapaNormalizada.includes('contato 5')) {
      return GUIA_INTENCOES_OFICIAL.find((i) => i.categoria === 'REATIVAÇÃO (BASE ANTIGA)' && i.etapaStatus.includes('dia 17'))!;
    }
    if (etapaNormalizada.includes('dia 9') || etapaNormalizada.includes('contato 4')) {
      return GUIA_INTENCOES_OFICIAL.find((i) => i.categoria === 'REATIVAÇÃO (BASE ANTIGA)' && i.etapaStatus.includes('dia 9'))!;
    }
    if (etapaNormalizada.includes('dia 5') || etapaNormalizada.includes('contato 3')) {
      return GUIA_INTENCOES_OFICIAL.find((i) => i.categoria === 'REATIVAÇÃO (BASE ANTIGA)' && i.etapaStatus.includes('dia 5'))!;
    }
    if (etapaNormalizada.includes('dia 3') || etapaNormalizada.includes('contato 2')) {
      return GUIA_INTENCOES_OFICIAL.find((i) => i.categoria === 'REATIVAÇÃO (BASE ANTIGA)' && i.etapaStatus.includes('dia 3'))!;
    }
    return GUIA_INTENCOES_OFICIAL.find((i) => i.categoria === 'REATIVAÇÃO (BASE ANTIGA)' && i.etapaStatus.includes('dia 1'))!;
  }

  // 4. PÓS-CONSULTA
  if (situacao === 'Pós consulta') {
    if (etapaNormalizada.includes('dia 17') || etapaNormalizada.includes('contato 5')) {
      return GUIA_INTENCOES_OFICIAL.find((i) => i.categoria === 'PÓS-CONSULTA' && i.etapaStatus.includes('dia 17'))!;
    }
    if (etapaNormalizada.includes('dia 9') || etapaNormalizada.includes('contato 4')) {
      return GUIA_INTENCOES_OFICIAL.find((i) => i.categoria === 'PÓS-CONSULTA' && i.etapaStatus.includes('dia 9'))!;
    }
    if (etapaNormalizada.includes('dia 5') || etapaNormalizada.includes('contato 3')) {
      return GUIA_INTENCOES_OFICIAL.find((i) => i.categoria === 'PÓS-CONSULTA' && i.etapaStatus.includes('dia 5'))!;
    }
    if (etapaNormalizada.includes('dia 3') || etapaNormalizada.includes('contato 2')) {
      return GUIA_INTENCOES_OFICIAL.find((i) => i.categoria === 'PÓS-CONSULTA' && i.etapaStatus.includes('dia 3'))!;
    }
    return GUIA_INTENCOES_OFICIAL.find((i) => i.categoria === 'PÓS-CONSULTA' && i.etapaStatus.includes('dia 1'))!;
  }

  // 5. AGENDAMENTO E CONFIRMAÇÃO
  if (situacao === 'Consulta agendada' || situacao === 'Procedimento agendado') {
    return GUIA_INTENCOES_OFICIAL.find((i) => i.categoria === 'AGENDAMENTO E CONFIRMAÇÃO' && i.etapaStatus.includes('Lembrete'))!;
  }

  // 6. CAPTAÇÃO (Padrão)
  if (etapaNormalizada.includes('dia 17') || etapaNormalizada.includes('contato 5')) {
    return GUIA_INTENCOES_OFICIAL.find((i) => i.categoria === 'CAPTAÇÃO' && i.etapaStatus.includes('dia 17'))!;
  }
  if (etapaNormalizada.includes('dia 9') || etapaNormalizada.includes('contato 4')) {
    return GUIA_INTENCOES_OFICIAL.find((i) => i.categoria === 'CAPTAÇÃO' && i.etapaStatus.includes('dia 9'))!;
  }
  if (etapaNormalizada.includes('dia 5') || etapaNormalizada.includes('contato 3')) {
    return GUIA_INTENCOES_OFICIAL.find((i) => i.categoria === 'CAPTAÇÃO' && i.etapaStatus.includes('dia 5'))!;
  }
  if (etapaNormalizada.includes('dia 3') || etapaNormalizada.includes('contato 2')) {
    return GUIA_INTENCOES_OFICIAL.find((i) => i.categoria === 'CAPTAÇÃO' && i.etapaStatus.includes('dia 3'))!;
  }

  return GUIA_INTENCOES_OFICIAL[0];
}
