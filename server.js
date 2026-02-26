const express = require('express');
const cors = require('cors');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

// Segurança: Headers HTTP seguros
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    }
}));

// Segurança: Rate limiting para prevenir abuso
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // máximo 10 requisições por IP
    message: 'Muitas tentativas. Tente novamente em 15 minutos.'
});

const paymentLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 3, // máximo 3 pagamentos por minuto
    message: 'Muitas tentativas de pagamento. Aguarde 1 minuto.'
});

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

// Validar CPF
function isValidCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    return digit === parseInt(cpf.charAt(10));
}

app.use(cors());
app.use(express.json({ limit: '10kb' })); // Limitar tamanho do body
app.use(express.static('.'));

// Aplicar rate limiting geral
app.use(limiter);

// Criar cobrança Pix na SecurePayments
app.post('/create-payment', paymentLimiter, async (req, res) => {
    try {
        const { amount, name, email, cpf } = req.body;

        console.log('Criando pagamento:', { amount, name, email, cpf: cpf ? '***' : 'não informado' });

        // Validar valor
        if (!amount || amount <= 0) {
            return res.status(400).json({ 
                error: 'Valor inválido',
                details: 'O valor da doação deve ser maior que zero'
            });
        }

        // Validar valor mínimo e máximo
        if (amount < 5) {
            return res.status(400).json({ 
                error: 'Valor inválido',
                details: 'O valor mínimo é R$ 5,00'
            });
        }

        if (amount > 120) {
            return res.status(400).json({ 
                error: 'Valor inválido',
                details: 'O valor máximo é R$ 120,00'
            });
        }

        // Validar CPF se fornecido
        const cleanCPF = cpf ? cpf.replace(/\D/g, '') : '06306367888';
        if (cpf && !isValidCPF(cleanCPF)) {
            return res.status(400).json({ 
                error: 'CPF inválido',
                details: 'Por favor, forneça um CPF válido'
            });
        }

        // Sanitizar inputs
        const sanitizedName = (name || 'Doador Anônimo').substring(0, 100);
        const sanitizedEmail = email && email.includes('@') ? email.substring(0, 100) : 'doador@vaquinha.com';

        // Converter valor para centavos
        const amountInCents = Math.round(parseFloat(amount) * 100);

        const paymentData = {
            amount: amountInCents,
            description: `Doação para Daniel - ${sanitizedName}`,
            name: sanitizedName,
            email: sanitizedEmail,
            cpf: cleanCPF,
            phone: '11999999999',
            postbackUrl: process.env.WEBHOOK_URL || 'https://daniel-vakinha.onrender.com/webhook'
        };

        console.log('Enviando para SecurePayments');

        const credentials = getAuthCredentials();
        const response = await axios.post(`${SECUREPAY_API_URL}/transactions`, paymentData, {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 segundos timeout
        });

        console.log('Pagamento criado com sucesso');

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
            status: error.response?.status
        });
        
        const errorMessage = error.response?.data?.message || 'Erro ao processar pagamento';
        
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
