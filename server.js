const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Configurar SyncPay
const SYNCPAY_CLIENT_ID = '20f930b6-97ea-4ec0-9fe4-b5fc9813a880';
const SYNCPAY_CLIENT_SECRET = '16c8dcaa-ee59-4007-a0ef-f7e9cc1be444';
const SYNCPAY_API_URL = 'https://api.syncpayments.com.br';

let accessToken = null;
let tokenExpiry = null;

// Função para gerar o Bearer Token
async function getAccessToken() {
    // Se já temos um token válido, retornar
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
        return accessToken;
    }

    try {
        const response = await axios.post(`${SYNCPAY_API_URL}/api/partner/v1/auth-token`, {
            client_id: SYNCPAY_CLIENT_ID,
            client_secret: SYNCPAY_CLIENT_SECRET
        });

        accessToken = response.data.access_token;
        // Token expira em 1 hora (3600 segundos)
        tokenExpiry = Date.now() + (response.data.expires_in * 1000);
        
        console.log('Token gerado com sucesso!');
        return accessToken;
    } catch (error) {
        console.error('Erro ao gerar token:', error.response?.data || error.message);
        throw error;
    }
}

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Criar cobrança Pix no SyncPay
app.post('/create-payment', async (req, res) => {
    try {
        const { amount, name, email } = req.body;

        console.log('Criando pagamento:', { amount, name, email });

        // Gerar token de acesso
        const token = await getAccessToken();

        const paymentData = {
            amount: parseFloat(amount),
            description: 'Doação para Daniel',
            client: {
                name: name || 'Doador Anônimo',
                email: email && email.includes('@') ? email : 'doador@vaquinha.com',
                cpf: '00000000000',
                phone: '00000000000'
            },
            webhook_url: process.env.WEBHOOK_URL || 'http://localhost:3000/webhook'
        };

        console.log('Enviando para SyncPay:', paymentData);

        const response = await axios.post(`${SYNCPAY_API_URL}/api/partner/v1/cash-in`, paymentData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        console.log('Resposta do SyncPay:', response.data);

        res.json({ 
            payment_url: response.data.payment_url || response.data.qr_code_url || response.data.url,
            qr_code: response.data.qr_code || response.data.pix_code,
            pix_code: response.data.pix_code,
            charge_id: response.data.id || response.data.identifier || response.data.transaction_id
        });
    } catch (error) {
        console.error('Erro detalhado:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        res.status(500).json({ 
            error: 'Erro ao criar cobrança',
            details: error.response?.data || error.message 
        });
    }
});

// Webhook para receber notificações de pagamento
app.post('/webhook', async (req, res) => {
    try {
        const { event, data } = req.body;

        console.log('Webhook recebido:', event, data);

        if (event === 'charge.paid' || event === 'payment.approved') {
            console.log('Pagamento aprovado!', {
                id: data.id,
                amount: data.amount,
                customer: data.customer
            });
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Erro no webhook:', error);
        res.sendStatus(500);
    }
});

// Rotas de retorno
app.get('/success', (req, res) => {
    res.send(`
        <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial; text-align: center; padding: 50px; background: #4CAF50; color: white; }
                    h1 { font-size: 3em; }
                    a { color: white; text-decoration: underline; }
                </style>
            </head>
            <body>
                <h1>✅ Pagamento Aprovado!</h1>
                <p>Obrigado pela sua contribuição para ajudar o Daniel!</p>
                <a href="/">Voltar para a página inicial</a>
            </body>
        </html>
    `);
});

app.get('/failure', (req, res) => {
    res.send(`
        <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial; text-align: center; padding: 50px; background: #f44336; color: white; }
                    h1 { font-size: 3em; }
                    a { color: white; text-decoration: underline; }
                </style>
            </head>
            <body>
                <h1>❌ Pagamento Falhou</h1>
                <p>Houve um problema com o pagamento. Tente novamente.</p>
                <a href="/">Voltar e tentar novamente</a>
            </body>
        </html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log('Gateway: SyncPay');
    console.log('Chave pública configurada!');
});
