# 📱 WhatsApp Bot — Prata de 15 Reais
> Integração Meta Cloud API + Tray Commerce

---

## 📁 Estrutura do projeto

```
whatsapp-tray/
├── server.js      → Servidor principal (recebe mensagens do WhatsApp)
├── flows.js       → Fluxos automáticos para revendedoras
├── whatsapp.js    → Funções de envio de mensagens
├── tray.js        → Integração com Tray Commerce
├── session.js     → Controle de estado da conversa por cliente
├── .env.example   → Modelo das variáveis de ambiente
└── package.json
```

---

## 🚀 Como instalar e rodar

### 1. Instalar dependências
```bash
npm install
```

### 2. Criar arquivo .env
```bash
cp .env.example .env
```
Preencher com os tokens reais (ver seção de configuração abaixo).

### 3. Rodar o servidor
```bash
# Produção
npm start

# Desenvolvimento (reinicia automaticamente ao salvar)
npm run dev
```

---

## 🔑 Configuração — Passo a passo

### Meta Cloud API (WhatsApp oficial)

1. Acesse: https://developers.facebook.com
2. Crie um app do tipo "Business"
3. Adicione o produto "WhatsApp"
4. Em **WhatsApp > Configuração**:
   - Anote o `Phone Number ID`
   - Gere um token de acesso permanente → coloque em `WHATSAPP_ACCESS_TOKEN`
5. Em **Webhooks**:
   - URL: `https://SEU_DOMINIO/webhook`
   - Token: o mesmo que você colocou em `WHATSAPP_VERIFY_TOKEN`
   - Inscreva-se no evento: `messages`

### Tray Commerce

1. Acesse: Painel Tray → Configurações → API
2. Gere o token de acesso
3. Anote o Store ID
4. Coloque em `TRAY_STORE_ID` e `TRAY_ACCESS_TOKEN`

---

## 🌐 Expor o servidor para a Meta (desenvolvimento)

A Meta precisa acessar seu servidor pelo webhook. Em desenvolvimento, use o ngrok:

```bash
# Instalar ngrok: https://ngrok.com
npx ngrok http 3000
```

Copie a URL `https://xxxx.ngrok-free.app` e use como URL do webhook na Meta.

**Em produção:** hospedar em Railway, Render, VPS, ou qualquer servidor com HTTPS.

---

## 📋 Fluxo de conversa — Revendedoras

```
Cliente envia qualquer mensagem
    ↓
Menu principal aparece:
    1. Ver catálogo → puxa produtos da Tray
    2. Meus pedidos → busca por telefone na Tray
    3. Preços e promoções → mensagem fixa
    4. Como revender → instruções de cadastro
    5. Falar com atendente → passa para humano

Comandos globais (qualquer etapa):
    "menu" ou "0" → volta ao menu
    "humano" ou "atendente" → passa para humano
```

---

## 📦 Envio ativo de promoções (mensagens em massa)

Para enviar promoções para a lista de revendedoras:

1. Crie um template na Meta (precisa de aprovação, leva ~24h)
2. Use a função `sendTemplate()` do `whatsapp.js`

Exemplo:
```javascript
import { sendTemplate } from "./whatsapp.js";

const revendedoras = ["5511999990001", "5511999990002"];

for (const numero of revendedoras) {
  await sendTemplate(numero, PHONE_NUMBER_ID, {
    templateName: "promocao_atacado",
    language: "pt_BR",
  });
  await new Promise(r => setTimeout(r, 500)); // Espera 500ms entre envios
}
```

---

## 🔄 Sessões

O controle de estado é em memória por padrão (reinicia quando o servidor reinicia).

Para produção com alto volume, substituir por Redis:
```bash
npm install ioredis
```
E adaptar o arquivo `session.js` para usar Redis em vez de `Map`.

---

## ✅ Tarefas para subir em produção

- [ ] Criar conta Meta for Developers e app Business
- [ ] Ativar número no WhatsApp Business API
- [ ] Preencher `.env` com tokens reais
- [ ] Hospedar servidor (Railway ou Render — gratuito para começar)
- [ ] Configurar webhook na Meta
- [ ] Testar fluxo completo com número real
- [ ] (Opcional) Migrar sessões para Redis
- [ ] (Opcional) Criar templates de promoção na Meta
