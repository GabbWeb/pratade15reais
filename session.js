// Gerenciador de sessão simples em memória
// Para produção, substituir por Redis ou banco de dados

const sessions = new Map();

// Tempo de expiração da sessão: 30 minutos sem interação
const SESSION_TTL_MS = 30 * 60 * 1000;

export async function getSession(phone) {
  const entry = sessions.get(phone);

  if (!entry) return { step: "menu" };

  // Expirou?
  if (Date.now() - entry.updatedAt > SESSION_TTL_MS) {
    sessions.delete(phone);
    return { step: "menu" };
  }

  return entry.data;
}

export async function saveSession(phone, data) {
  const existing = sessions.get(phone);
  sessions.set(phone, {
    data: { ...(existing?.data || {}), ...data },
    updatedAt: Date.now(),
  });
}

export async function clearSession(phone) {
  sessions.delete(phone);
}

// Limpa sessões expiradas a cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [phone, entry] of sessions.entries()) {
    if (now - entry.updatedAt > SESSION_TTL_MS) {
      sessions.delete(phone);
    }
  }
}, 10 * 60 * 1000);
