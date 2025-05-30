// src\index.ts
import { create } from 'venom-bot';
import { startMessage } from './client/index';
import { SESSION_CLIENT } from './config/session';

create({
  session: SESSION_CLIENT,
  headless: 'new',
  disableWelcome: true,
  logQR: true
})  .then((client) => {
    console.log('🟢 Bot iniciado com sucesso');
    startMessage(client);
  })
  .catch((error) => {
    console.log('🔴 Erro ao iniciar o bot: ', error);
  });
