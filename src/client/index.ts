// src/client/index.ts
import { Whatsapp } from 'venom-bot';
import { messages } from '../messages/messages';
import { setTimeout } from 'timers/promises';
import { UserInfo } from '../utils/userInfo';
import {
  loadUsers,
  saveUser,
  setUserEtapa,
  moveUserToClient,
  isUserFinalizado,
} from '../utils/storage';

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

  const finalizado = isUserFinalizado(message.from);
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
    await client.sendText(message.from, messages.opcoes);

    return true;
  }

  return true;
}

// 👋 Trata o primeiro contato do usuário
async function verificaNovoUsuario(
  client: Whatsapp,
  message,
  user
): Promise<boolean> {
  const users = getUsers();
  if (users[message.from]) return false;

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
    `Olá ${user.name || 'Cliente'}!\n\n${messages.BoasVindas}`
  );
  await client.sendText(message.from, messages.opcoes);
  return true;
}

// 🧠 Fluxo principal de atendimento por etapa
async function processaMensagem(client: Whatsapp, message, user) {
  const phone = message.from;
  const allUsers = getUsers();
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

    default:
      await client.sendText(phone, 'Ops! Algo deu errado. Reiniciando...');
      await setUserEtapa(phone, 1, 'Reiniciado por erro de etapa');
      await client.sendText(phone, messages.opcoes);
  }
}

// ➕ Etapa 1 - Menu principal
async function tratarEtapa1(client, message, user, msg) {
  const phone = message.from;

  switch (msg) {
    case OpcoesMenuPrincipal.DESENVOLVER_SITE:
      await client.sendText(phone, messages.subop1);
      await setUserEtapa(phone, 2, 'op: Desenvolvimento de sites');
      break;

    case OpcoesMenuPrincipal.CRIAR_APLICATIVO:
      await client.sendText(phone, messages.subop2);
      await setUserEtapa(phone, 2, 'op: Criar aplicativo');
      break;

    default:
      await client.sendText(phone, 'Opção inválida. Digite um número do menu.');
      await client.sendText(phone, messages.opcoes);
  }
}

// ➕ Etapa 2 - Submenu "Desenvolvimento de Sites"
async function tratarEtapa2(client, message, user, msg) {
  const phone = message.from;

  switch (msg) {
    case '1':
      await client.sendText(phone, messages.siteInstitucional);
      await setUserEtapa(phone, 3, 'site institucional');
      break;

    case '2':
      await client.sendText(phone, messages.ecommerce);
      await setUserEtapa(phone, 3, 'ecommerce');
      break;

    case '3':
      await client.sendText(phone, messages.portfolio);
      await setUserEtapa(phone, 3, 'portfolio');
      break;

    case '0':
      await client.sendText(phone, messages.opcoes);
      await setUserEtapa(phone, 1, 'voltou ao menu principal');
      break;

    default:
      await client.sendText(phone, 'Opção inválida. Escolha novamente:');
      await client.sendText(phone, messages.subop1);
  }
}
