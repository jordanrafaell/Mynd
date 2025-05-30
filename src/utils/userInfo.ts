// utils/userInfo.ts
export function UserInfo(message) {
  // Tipos de dados que o bot pega do usuário
  return{
    name: message.sender?.pushname || 'Cliente',
    number: message.from.replace('@c.us', ''),
    group: message.isGroupMsg,

  }
}
