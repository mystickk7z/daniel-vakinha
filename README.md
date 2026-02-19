# Vaquinha para Daniel

Site de arrecadação de fundos para ajudar o Daniel com integração SyncPay.

## Deploy no Vercel

1. Instale o Vercel CLI:
```bash
npm install -g vercel
```

2. Faça login:
```bash
vercel login
```

3. Configure as variáveis de ambiente no Vercel:
   - Acesse o dashboard do Vercel
   - Vá em Settings > Environment Variables
   - Adicione:
     - `SYNCPAY_CLIENT_ID`: 20f930b6-97ea-4ec0-9fe4-b5fc9813a880
     - `SYNCPAY_CLIENT_SECRET`: 16c8dcaa-ee59-4007-a0ef-f7e9cc1be444
     - `WEBHOOK_URL`: https://seu-site.vercel.app/webhook (substitua pela URL real)

4. Faça o deploy:
```bash
vercel
```

5. Para deploy em produção:
```bash
vercel --prod
```

## Deploy no Railway

1. Acesse https://railway.app
2. Faça login com GitHub
3. New Project > Deploy from GitHub repo
4. Selecione o repositório
5. Adicione as variáveis de ambiente:
   - `SYNCPAY_CLIENT_ID`
   - `SYNCPAY_CLIENT_SECRET`
   - `WEBHOOK_URL`

## Deploy no Render

1. Acesse https://render.com
2. New > Web Service
3. Conecte seu repositório
4. Configure:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Adicione as variáveis de ambiente

## Configurar Webhook no SyncPay

Após fazer deploy, configure o webhook no painel do SyncPay:
1. Acesse o painel do SyncPay
2. Vá em Webhooks
3. Configure a URL: `https://seu-site.vercel.app/webhook`

## Rodar localmente

```bash
npm install
npm start
```

Acesse: http://localhost:3000


