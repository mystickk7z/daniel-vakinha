// Configurações da vaquinha
let currentAmount = 0;
let goalAmount = 15000;
let contributors = [];
let selectedAmount = 0;

// Inicializar
updateProgress();

function selectAmount(amount) {
    selectedAmount = amount;
    document.getElementById('custom-value').value = '';
    
    // Remover seleção anterior
    document.querySelectorAll('.donation-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Adicionar seleção ao botão clicado
    event.target.classList.add('selected');
    
    // Mostrar o valor selecionado na barra
    document.getElementById('current-amount').textContent = formatCurrency(amount);
    document.getElementById('current-amount').style.color = '#4CAF50';
    document.getElementById('current-amount').style.fontWeight = 'bold';
}

function donate() {
    const customValue = parseFloat(document.getElementById('custom-value').value);
    const amount = customValue || selectedAmount;
    
    if (!amount || amount <= 0) {
        alert('Por favor, selecione ou digite um valor para contribuir!');
        return;
    }
    
    // Validar valor máximo
    if (amount > 120) {
        alert('⚠️ O valor máximo por transação é R$ 120,00.\n\nPara valores maiores, faça múltiplas doações.');
        return;
    }
    
    // Pedir informações do doador
    const name = prompt('Digite seu nome (opcional):') || 'Doador Anônimo';
    const email = prompt('Digite seu email (opcional):') || '';
    
    // Criar pagamento no SyncPay
    createPayment(amount, name, email);
}

async function createPayment(amount, name, email) {
    try {
        console.log('Enviando requisição de pagamento...');
        
        // Usar URL relativa para funcionar tanto local quanto em produção
        const response = await fetch('/create-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                amount: parseFloat(amount),
                name: name,
                email: email
            })
        });
        
        const data = await response.json();
        
        console.log('Resposta recebida:', data);
        
        if (data.pix_code) {
            // Salvar no localStorage e redirecionar para página de pagamento
            localStorage.setItem('pixCode', data.pix_code);
            localStorage.setItem('pixAmount', amount);
            window.location.href = '/pagamento.html';
        } else {
            console.error('Erro nos dados:', data);
            const errorMsg = typeof data.details === 'object' ? JSON.stringify(data.details) : data.details;
            alert('Erro ao gerar link de pagamento: ' + (errorMsg || data.error || 'Tente novamente'));
        }
        
    } catch (error) {
        console.error('Erro ao processar pagamento:', error);
        alert('Erro ao processar pagamento. Verifique sua conexão e tente novamente.');
    }
}

function updateProgress() {
    const percentage = Math.min((currentAmount / goalAmount) * 100, 100);
    
    document.getElementById('current-amount').textContent = formatCurrency(currentAmount);
    document.getElementById('goal-amount').textContent = formatCurrency(goalAmount);
    document.getElementById('contributors').textContent = contributors.length;
    document.getElementById('progress-fill').style.width = percentage + '%';
    document.getElementById('percentage').textContent = percentage.toFixed(1);
}

function updateContributorsList() {
    const listElement = document.getElementById('contributors-list');
    
    if (contributors.length === 0) {
        listElement.innerHTML = '<p class="no-contributors">Seja o primeiro a contribuir!</p>';
        return;
    }
    
    // Mostrar últimos 5 contribuidores
    const recentContributors = contributors.slice(-5).reverse();
    
    listElement.innerHTML = recentContributors.map(contributor => `
        <div class="contributor-item">
            <span class="contributor-name">${contributor.name}</span>
            <span class="contributor-amount">${formatCurrency(contributor.amount)}</span>
        </div>
    `).join('');
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function shareWhatsApp() {
    const text = encodeURIComponent('Ajude esta causa! Acesse: ' + window.location.href);
    window.open(`https://wa.me/?text=${text}`, '_blank');
}

function shareInstagram() {
    // Instagram não permite compartilhamento direto via URL, então copiamos o link
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        alert('Link copiado! Cole no Instagram para compartilhar a vaquinha do Scott 💚');
    }).catch(() => {
        alert('Link da vaquinha: ' + url + '\n\nCopie e compartilhe no Instagram!');
    });
}

// Permitir Enter no campo de valor customizado
document.getElementById('custom-value').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        donate();
    }
});

// Atualizar valor quando digitar
document.getElementById('custom-value').addEventListener('input', function(e) {
    const value = parseFloat(e.target.value);
    if (value > 0) {
        // Remover seleção dos botões
        document.querySelectorAll('.donation-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        selectedAmount = 0;
        
        // Mostrar valor digitado na barra
        document.getElementById('current-amount').textContent = formatCurrency(value);
        document.getElementById('current-amount').style.color = '#4CAF50';
        document.getElementById('current-amount').style.fontWeight = 'bold';
    } else {
        // Voltar ao valor original se apagar
        document.getElementById('current-amount').textContent = formatCurrency(currentAmount);
        document.getElementById('current-amount').style.color = '';
        document.getElementById('current-amount').style.fontWeight = '';
    }
});


function shareWhatsApp() {
    const url = window.location.href;
    const text = encodeURIComponent('Ajude o Daniel! Contribua para a vaquinha de tratamento: ' + url);
    window.open(`https://wa.me/?text=${text}`, '_blank');
}

function shareInstagram() {
    const url = window.location.href;
    // Copiar link e redirecionar para Instagram
    navigator.clipboard.writeText(url).then(() => {
        alert('✅ Link copiado!\n\nVocê será redirecionado para o Instagram. Cole o link em seus Stories ou publicação!');
        setTimeout(() => {
            window.open('https://www.instagram.com/', '_blank');
        }, 1000);
    }).catch(() => {
        alert('Link da vaquinha: ' + url + '\n\nCopie e compartilhe no Instagram!');
        window.open('https://www.instagram.com/', '_blank');
    });
}
