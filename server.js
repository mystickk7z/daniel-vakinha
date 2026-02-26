const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Configurar SecurePay
const SECUREPAY_PUBLIC_KEY = process.env.SECUREPAY_PUBLIC_KEY;
const SECUREPAY_SECRET_KEY = process.env.SECUREPAY_SECRET_KEY;
const SECUREPAY_API_URL = 'https://www.securepayments.com.br/api/v1';

// Criar credenciais Base64 para autenticação
function getAuthCredentials() {
    const credentials = `${SECUREPAY_PUBLIC_KEY}:${SECUREPAY_SECRET_KEY}`;
    return Buffer.from(credentials).toString('base64');
}

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Criar cobrança Pix na SecurePay
app.post('/create-payment', async (req, res) => {
    try {
        const { amount, name, email } = req.body;

        console.log('Criando pagamento:', { amount, name, email });

        // Validar valor
        if (!amount || amount <= 0) {
            return res.status(400).json({ 
                error: 'Valor inválido',
                details: 'O valor da doação deve ser maior que zero'
            });
        }

        // Converter valor para centavos
        const amountInCents = Math.round(parseFloat(amount) * 100);

        const paymentData = {
            amount: amountInCents,
            description: `Doação para Daniel - ${name || 'Doador Anônimo'}`,
            name: name || 'Doador Anônimo',
            email: email && email.includes('@') ? email : 'doador@vaquinha.com',
            cpf: '12345678900',
            phone: '11999999999',
            postbackUrl: process.env.WEBHOOK_URL || 'https://daniel-vakinha.onrender.com/webhook'
        };

        console.log('Enviando para SecurePay:', paymentData);

        const credentials = getAuthCredentials();
        const response = await axios.post(`${SECUREPAY_API_URL}/transactions`, paymentData, {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Resposta da SecurePay:', response.data);

        // A resposta da SecurePay retorna pixCode e pixQrCodeUrl
        res.json({ 
            pix_code: response.data.pixCode,
            qr_code: response.data.pixCode,
            qr_code_url: response.data.pixQrCodeUrl,
            charge_id: response.data.id,
            external_id: response.data.externalId
        });
    } catch (error) {
        console.error('Erro detalhado:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            config: {
                url: error.config?.url,
                data: error.config?.data
            }
        });
        
        // Retornar erro mais detalhado
        const errorMessage = error.response?.data?.message || error.message;
        const errorDetails = error.response?.data?.errors || error.response?.data;
        
        res.status(error.response?.status || 500).json({ 
            error: 'Erro ao criar cobrança',
            details: errorDetails || errorMessage,
            message: errorMessage
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
    console.log('Gateway: SecurePay');
    console.log('Chave pública configurada!');
});
