// src/client/index.ts
import { Whatsapp } from 'venom-bot';
import { BoasVindas } from '../messages/boasVindas';
import { setTimeout } from 'timers/promises';
import { UserInfo } from '../utils/userInfo';
import { sites } from '../messages/sites';
import {
  loadUsers,
  saveUser,
  setUserEtapa,
  moveUserToClient,
  isUserFinalizado,
  loadAllUsers,
} from '../utils/storage';
import { aplicativos } from '../messages/aplicativos';
import { automations } from '../messages/automations';

// 🔄 Função para acessar os usuários armazenados
export function getUsers() {
  return loadUsers();
}

export enum OpcoesMenuPrincipal {
  DESENVOLVER_SITE = '1',
  CRIAR_APLICATIVO = '2',
  AUTOMATIZAR_PROCESSOS = '3',
  CONECTAR_SISTEMAS = '4',
  CONSULTORIA_SUPORTE = '5',
  FALAR_COM_ESPECIALISTA = '6',
  VER_TECNOLOGIAS = '7',
  SOBRE_OLYMPIA = '8',
  OUTROS_ASSUNTOS = '9',
  ENCERRAR_ATENDIMENTO = '0',
}

// 🚀 Inicia o tratamento das mensagens recebidas
export function startMessage(client: Whatsapp) {
  client.onMessage(async (message) => {
    const user = UserInfo(message);

    console.log('📩 Mensagem recebida:', {
      from: message.from,
      body: message.body,
      name: user.name,
    });
    console.log('🧠 UserInfo:', user);

    if (user.group) return;

    // 1. Verifica se é novo usuário
    const iniciado = await verificaNovoUsuario(client, message, user);
    if (iniciado) return;

    // 2. Verifica se o usuário foi finalizado
    const reativado = await verificaFinalizado(client, message, user);
    if (reativado) return;

    // 3. Processa a mensagem conforme a etapa
    await processaMensagem(client, message, user);
  });
}

// 🔁 Verifica se o usuário estava finalizado e reinicia com "Mynd"
async function verificaFinalizado(
  client: Whatsapp,
  message,
  user
): Promise<boolean> {
  console.log('🔍 Verificando usuário finalizado...');

  const allUsers = loadAllUsers();
  const finalizado = allUsers[message.from]?.status === 'finalizado';

  const texto = message.body.toLowerCase();

  if (!finalizado) return false;

  if (texto.startsWith('mynd')) {
    const newUser = {
      status: 'ativo' as const,
      etapa: 1,
      etapaName: 'reiniciado via Mynd:',
      name: user.name || 'Cliente',
    };

    await saveUser(message.from, newUser);

    await client.sendText(
      message.from,
      `Olá novamente, ${user.name || 'Cliente'}!\nVamos começar de novo.`
    );
    await client.sendText(message.from, BoasVindas.opcoes);
    return true; // continua fluxo
  } else {
    // Cliente tentou mandar mensagem sem reativar
    return true;
  }
}

// 👋 Trata o primeiro contato do usuário
async function verificaNovoUsuario(
  client: Whatsapp,
  message,
  user
): Promise<boolean> {
  const users = getUsers();
  const allUsers = loadAllUsers();
  const isFinalizado = allUsers[message.from]?.status === 'finalizado';
  if (users[message.from] || isFinalizado) return false;

  const newUser = {
    status: 'ativo' as const,
    etapa: 1,
    etapaName: 'inicio',
    name: user.name || 'Cliente',
  };

  await saveUser(message.from, newUser);

  client.startTyping(message.from, true);
  await setTimeout(2000);
  await client.sendText(
    message.from,
    `Olá ${user.name || 'Cliente'}!\n\n${BoasVindas.BoasVindas}`
  );
  console.log('Mensagem de boas-vindas enviada:', user.name || 'Cliente');
  console.log('👋 Novo usuário iniciado:', user.name);
  await client.sendText(message.from, BoasVindas.opcoes);
  console.log('Menu de opções enviado:', user.name || 'Cliente');
  return true;
}

async function mostrarMenuDaEtapa(client, phone: string, etapa: number) {
  switch (etapa) {
    case 1:
      await client.sendText(phone, BoasVindas.opcoes);
      break;

    case 2:
      await client.sendText(phone, sites.menu);
      break;

    case 3:
      await client.sendText(phone, sites.siteInstitucional.menu);
      break;

    case 4:
      await client.sendText(phone, sites.ecommerce.menu);
      break;

    case 5:
      await client.sendText(phone, sites.blog.menu);
      break;

    case 6:
      await client.sendText(phone, aplicativos.menu);
      break;

    case 7:
      await client.sendText(phone, automations.menu);
      break;

    // Adicione outros menus conforme novas etapas
    default:
      await client.sendText(phone, 'Menu não encontrado para essa etapa.');
      break;
  }
}

async function encerrarAtendimento(
  client,
  phone: string,
  nome: string = 'Cliente'
) {
  // Pega todos os usuários
  const allUsers = loadUsers();

  // Pega o usuário específico
  const userData = allUsers[phone] || { etapa: 1 };

  // Atualiza o status e salva
  await saveUser(phone, {
    ...userData,
    etapa: userData.etapa || 1,
    status: 'finalizado',
  });

  await moveUserToClient(phone); // Agora pode mover, pois está finalizado

  await client.sendText(phone, `✅ Atendimento encerrado, ${nome}.`);
  await client.sendText(phone, `Quando quiser retomar, é só mandar "Mynd".`);
}

// 🧠 Fluxo principal de atendimento por etapa
async function processaMensagem(client: Whatsapp, message, user) {
  const phone = message.from;
  const allUsers = loadAllUsers();
  const currentUser = allUsers[phone];
  const etapaAtual = currentUser?.etapa || 1;
  const msg = message.body.trim().toLowerCase().replace(/\s+/g, '');

  console.log('📞 Usuário:', phone);
  console.log('🔄 Etapa atual:', etapaAtual);
  console.log('💬 Mensagem:', msg);

  switch (etapaAtual) {
    case 1:
      await tratarEtapa1(client, message, user, msg);
      break;

    case 2:
      await tratarEtapa2(client, message, user, msg);
      break;

    case 3:
      await tratarEtapa3(client, message, user, msg);
      break;

    // case 4:
    //   await tratarEtapa4(client, message, user, msg);
    //   break;

    // case 5:
    //   await tratarEtapa5(client, message, user, msg);
    //   break;

    default:
      await client.sendText(phone, 'Ops! Algo deu errado. Reiniciando...');
      await mostrarMenuDaEtapa(client, phone, etapaAtual);
  }
}

// ➕ Etapa 1 - Menu principal
async function tratarEtapa1(client, message, user, msg) {
  const phone = message.from;

  switch (msg) {
    case OpcoesMenuPrincipal.DESENVOLVER_SITE:
      await client.sendText(phone, sites.menu);
      await setUserEtapa(phone, 2, 'op: Desenvolvimento de sites');
      break;

    case OpcoesMenuPrincipal.CRIAR_APLICATIVO:
      await client.sendText(phone, aplicativos.menu);
      await setUserEtapa(phone, 2, 'op: Criar aplicativo');
      break;

    case OpcoesMenuPrincipal.ENCERRAR_ATENDIMENTO:
      await encerrarAtendimento(client, phone, user.name);
      console.log(`✅ ${phone} foi encerrado e movido para client.json`);

      break;

    default:
      await client.sendText(phone, 'Opção inválida. Digite um número do menu.');
      await client.sendText(phone, BoasVindas.opcoes);
  }
}

// ➕ Etapa 2 - Submenu "Desenvolvimento de Sites"
async function tratarEtapa2(client, message, user, msg) {
  const phone = message.from;

  switch (msg) {
    case '1':
      await client.sendText(phone, sites.siteInstitucional.menu);
      await setUserEtapa(phone, 3, 'submenu site institucional');
      break;

    case '2':
      await client.sendText(phone, sites.ecommerce.menu);
      await setUserEtapa(phone, 3, 'ecommerce');
      break;

    case '3':
      await client.sendText(phone, sites.portfolio.menu);
      await setUserEtapa(phone, 3, 'portfolio');
      break;

    case '0':
      await client.sendText(phone, BoasVindas.opcoes);
      await setUserEtapa(phone, 1, 'voltou ao menu principal');
      break;

    default:
      await client.sendText(phone, 'Opção inválida. Escolha novamente:');
      await client.sendText(phone, sites.menu);
      break;
  }
}

// Etapa 3 - Submenu "site institucional"

async function tratarEtapa3(client, message, user, msg) {
  const phone = message.from;
  const tempo = await setTimeout(1500);

  switch (msg) {
    case '1':
      await client.sendText(phone, sites.siteInstitucional.explicacao);

      await setUserEtapa(phone, 4, 'explicação: site institucional');
      break;

    case '2':
      await client.sendText(phone, sites.siteInstitucional.exemplos);
      tempo;

      await setUserEtapa(phone, 4, 'exemplos: site institucional');
      break;

    case '0':
      await client.sendText(phone, sites.menu);
      await setUserEtapa(phone, 1, 'voltou ao menu principal do site ');
      break;

    default:
      await client.sendText(phone, 'Opção inválida. Escolha novamente:');
      await client.sendText(phone, sites.siteInstitucional.menu);
      break;
  }
}
