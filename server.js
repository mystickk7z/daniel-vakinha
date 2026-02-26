const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Configurar SecurePayments
const SECUREPAY_PUBLIC_KEY = process.env.SECUREPAY_PUBLIC_KEY;
const SECUREPAY_SECRET_KEY = process.env.SECUREPAY_SECRET_KEY;
const SECUREPAY_API_URL = 'https://www.securepayments.com.br/api/v1';

// Criar credenciais Base64 para autenticação
function getAuthCredentials() {
    if (!SECUREPAY_PUBLIC_KEY || !SECUREPAY_SECRET_KEY) {
        throw new Error('Chaves da SecurePayments não configuradas');
    }
    const credentials = `${SECUREPAY_PUBLIC_KEY}:${SECUREPAY_SECRET_KEY}`;
    return Buffer.from(credentials).toString('base64');
}

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Criar cobrança Pix na SecurePayments
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

        console.log('Enviando para SecurePayments:', paymentData);

        const credentials = getAuthCredentials();
        const response = await axios.post(`${SECUREPAY_API_URL}/transactions`, paymentData, {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Resposta da SecurePayments:', response.data);

        // A resposta retorna pixCode e pixQrCodeUrl
        res.json({ 
            pix_code: response.data.pixCode,
            qr_code: response.data.pixCode,
            qr_code_url: response.data.pixQrCodeUrl,
            charge_id: response.data.id
        });
    } catch (error) {
        console.error('Erro ao criar pagamento:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        
        const errorMessage = error.response?.data?.message || error.message;
        
        res.status(error.response?.status || 500).json({ 
            error: 'Erro ao criar cobrança',
            message: errorMessage
        });
    }
});

// Webhook para receber notificações de pagamento
app.post('/webhook', async (req, res) => {
    try {
        console.log('Webhook recebido:', req.body);
        res.sendStatus(200);
    } catch (error) {
        console.error('Erro no webhook:', error);
        res.sendStatus(500);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log('Gateway: SecurePayments');
});
