// src/utils/storage.ts
import * as fs from 'fs';
import * as path from 'path';
import { setTimeout } from 'timers/promises';

// Interfaces
interface UserData {
  status: 'ativo' | 'finalizado' | 'em_espera';
  etapa: number;
  etapaName?: string;
}

interface Users {
  [key: string]: UserData;
}

// Caminhos
const TEMP_PATH = path.join(
  __dirname,
  '..',
  '..',
  'backend',
  'data',
  'temp',
  'temp.json'
);
const CLIENT_PATH = path.join(
  __dirname,
  '..',
  '..',
  'backend',
  'data',
  'client',
  'client.json'
);

let usersCache: Users = {};

/* === Funções auxiliares === */
// Carrega todos os usuários (temp + client)
export function loadAllUsers(): Users {
  const tempUsers = loadUsers();
  let clientUsers: Users = {};

  try {
    ensureFileExists(CLIENT_PATH);
    const clientData = fs.readFileSync(CLIENT_PATH, 'utf8');
    clientUsers = clientData ? JSON.parse(clientData) : {};
  } catch (error) {
    console.error('❌ Erro ao carregar client.json:', error);
  }

  return { ...clientUsers, ...tempUsers };
}


// Faz o usuário finalizar o atendimento e voltar caso digite Mynd
export function isUserFinalizado(phone: string): boolean | null {
  try {
    const users = loadUsers();
    return users[phone]?.status === 'finalizado';
  } catch (error) {
    console.error('❌ Erro ao verificar finalizado:', error);
    return null; // Retorna null se der erro
  }
}


// Garante que a pasta existe
function ensureDirExists(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Garante que o arquivo existe
function ensureFileExists(filePath: string) {
  ensureDirExists(filePath);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '{}');
    console.log(`🗄️ Criado arquivo: ${filePath}`);
  }
}

// Atualiza o cache e o arquivo
async function updateUsersFile(data: Users): Promise<void> {
  usersCache = data;
  ensureFileExists(TEMP_PATH);
  await fs.promises.writeFile(TEMP_PATH, JSON.stringify(data, null, 2));
}

// Carrega usuários do arquivo (com cache)
export function loadUsers(): Users {
  if (Object.keys(usersCache).length === 0) {
    try {
      ensureFileExists(TEMP_PATH); // Garante que o arquivo existe
      const data = fs.readFileSync(TEMP_PATH, 'utf8');
      usersCache = data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('❌ Erro ao carregar usuários:', error);
      usersCache = {}; // Previne crash
    }
  }

  return usersCache;
}



// Salva um usuário específico no arquivo
export async function saveUser(phone: string, data: UserData): Promise<void> {
  const users = loadUsers();
  users[phone] = data;
  await updateUsersFile(users);
}

// Obtém dados de um usuário
export function getUser(phone: string): UserData | undefined {
  const users = loadUsers();
  return users[phone];
}

// Atualiza apenas a etapa do usuário
export async function setUserEtapa(
  phone: string,
  etapa: number,
  etapaName?: string
): Promise<void> {
  console.log('setUserEtapa chamado para', phone, 'etapa:', etapa);
  const users = loadUsers();
  if (!users[phone]) {
    console.log('Usuário não encontrado em setUserEtapa:', phone);
    return;
  }

  users[phone].etapa = etapa;
  if (etapaName) {
    users[phone].etapaName = etapaName;
  }

  await updateUsersFile(users);
  console.log('Etapa atualizada no arquivo para', phone);
}

// Remove um usuário temporário (ex: encerrou)
export function removeUser(phone: string): void {
  const users = loadUsers();
  delete users[phone];
  fs.writeFileSync(TEMP_PATH, JSON.stringify(users, null, 2));
  usersCache = users;
}

// Move usuário da base TEMP para CLIENT
export function moveUserToClient(phone: string): void {
  const tempUsers = loadUsers();
  let clientUsers: Users = {};

  try {
    ensureFileExists(CLIENT_PATH);
    const clientData = fs.readFileSync(CLIENT_PATH, 'utf8');
    clientUsers = JSON.parse(clientData);
  } catch {
    clientUsers = {};
  }

  const userData = tempUsers[phone];

  if (!userData || userData.status !== 'finalizado') {
    console.log(
      `🚫 Usuário ${phone} não foi movido. Status diferente de 'finalizado'.`
    );
    return;
  }

  // ✅ Agora sim: só se for finalizado
  clientUsers[phone] = userData;
  delete tempUsers[phone];

  // Atualiza os arquivos
  ensureFileExists(TEMP_PATH);
  ensureFileExists(CLIENT_PATH);

  fs.writeFileSync(TEMP_PATH, JSON.stringify(tempUsers, null, 2));
  fs.writeFileSync(CLIENT_PATH, JSON.stringify(clientUsers, null, 2));

  usersCache = tempUsers;

  console.log(
    `✅ Usuário ${phone} movido para client.json com status 'finalizado'.`
  );

}



