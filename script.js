// CONSTANTE PRINCIPAL DO BACKEND (COLE A URL DO SEU WEB APP AQUI)
const API_URL = "https://script.google.com/macros/s/AKfycbxv-1XirLHQYGmrmNpkf42vTbmW1m6wT1bJbT5uoVKzDdj-L4ziPof8BSJW5fwNgont/exec"; 

// Variáveis de Estado Global
let participantesArray = [];
let wishesArray = [];
let currentEventCode = "";
let currentUser = "";
let friendDrawn = "";

// Elementos UI
const views = document.querySelectorAll('.view');
const loader = document.getElementById('loader');

// Funções de Navegação
function showView(viewId) {
    views.forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

function showLoader() { loader.classList.remove('hidden'); }
function hideLoader() { loader.classList.add('hidden'); }

// Comunicação com Apps Script
async function fetchAPI(action, data = {}) {
    showLoader();
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: action, data: data }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' } // text/plain evita block de CORS complexo
        });
        const result = await response.json();
        hideLoader();
        if (result.success) {
            return result.data;
        } else {
            alert("Erro: " + result.error);
            return null;
        }
    } catch (error) {
        hideLoader();
        alert("Erro na conexão com o banco de dados.");
        console.error(error);
        return null;
    }
}

function setupTagInput(inputId, containerId, arrayRef) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);

    function renderTags() {
        container.innerHTML = '';
        arrayRef.forEach((item, index) => {
            const tag = document.createElement('div');
            tag.className = 'tag';
            tag.innerHTML = `${item} <span onclick="removeTag('${inputId}', ${index})">✖</span>`;
            container.appendChild(tag);
        });
    }

    // Função interna para adicionar a tag
    function addTag() {
        let val = input.value.replace(',', '').trim();
        if (val !== '' && !arrayRef.includes(val)) {
            arrayRef.push(val);
            renderTags();
        }
        input.value = '';
    }

    // Evento 'input' funciona perfeitamente em mobile para capturar a vírgula
    input.addEventListener('input', () => {
        if (input.value.includes(',')) {
            addTag();
        }
    });

    // Evento 'keydown' para capturar o Enter
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Evita recarregar a tela sem querer
            addTag();
        }
    });

    // Anexa método de render e remoção ao escopo da janela
    window[`render_${inputId}`] = renderTags;
}

window.removeTag = function(inputId, index) {
    if(inputId === 'ce-participante-input') {
        participantesArray.splice(index, 1);
        window[`render_ce-participante-input`]();
    } else if (inputId === 'fa-wish-input') {
        wishesArray.splice(index, 1);
        window[`render_fa-wish-input`]();
    }
}

window.addWishTag = function(wish) {
    if (!wishesArray.includes(wish)) {
        wishesArray.push(wish);
        window[`render_fa-wish-input`]();
    }
}

// Geração de Código Inalterável (Letras e números)
function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ---------------- EVENT LISTENERS DE NAVEGAÇÃO ----------------

document.getElementById('btn-secret-config').addEventListener('click', () => {
    showView('view-config-options');
});

document.querySelectorAll('.btn-voltar-home').forEach(btn => {
    btn.addEventListener('click', () => showView('view-home'));
});

document.querySelectorAll('.btn-voltar-config').forEach(btn => {
    btn.addEventListener('click', () => showView('view-config-options'));
});

document.querySelector('.btn-voltar-events').addEventListener('click', () => {
    showView('view-list-events');
});

// ---------------- CRIAR EVENTO ----------------
document.getElementById('btn-novo-evento').addEventListener('click', () => {
    // Esvazia o array mantendo a mesma referência de memória
    participantesArray.length = 0; 
    
    if (window['render_ce-participante-input']) {
        window['render_ce-participante-input']();
    }
    showView('view-create-event');
});

    document.getElementById('btn-salvar-evento').addEventListener('click', async () => {
    const nome = document.getElementById('ce-nome').value.trim();
    const dataEvt = document.getElementById('ce-data').value;
    const local = document.getElementById('ce-local').value.trim();
    const link = document.getElementById('ce-link').value.trim();
    const valor = document.getElementById('ce-valor').value;

    if (!nome) return alert("Por favor, preencha o Nome do Evento.");
    if (!dataEvt) return alert("Por favor, escolha a Data do evento.");
    if (!local) return alert("Por favor, digite o Local do evento.");
    if (participantesArray.length < 3) return alert("Adicione pelo menos 3 participantes.");

    const payload = {
        nomeDoEvento: nome,
        data: dataEvt,
        local: local,
        link_local: link,
        valorMinimo: valor,
        participantes: participantesArray,
        codigo: generateCode()
    };

    const res = await fetchAPI("createEvent", payload);
    if (res) {
        alert(`Evento criado com sucesso!\nCódigo do Evento: ${res.codigo}\nAnote ou compartilhe este código com os participantes.`);
        showView('view-home');
        // Limpar forms
        document.querySelectorAll('#view-create-event input').forEach(i => i.value = '');
    }
});

// ---------------- ENTRAR NO EVENTO ----------------
document.getElementById('btn-entrar').addEventListener('click', async () => {
    const session = Auth.getSession();
    if (session) {
        // Pular direto pro dashboard se tiver cache
        currentEventCode = session.codigo;
        currentUser = session.nome;
        loadDashboard();
        return;
    }

    const events = await fetchAPI("getEvents");
    if (events) {
        const container = document.getElementById('events-list-container');
        container.innerHTML = '';
        events.forEach(evt => {
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.innerText = evt.nomeDoEvento;
            btn.onclick = () => loadEventLogin(evt.codigo, evt.nomeDoEvento);
            container.appendChild(btn);
        });
        showView('view-list-events');
    }
});

async function loadEventLogin(codigo, nomeEvento) {
    currentEventCode = codigo;
    document.getElementById('cn-evento-nome').innerText = nomeEvento;
    const participants = await fetchAPI("getParticipants", { codigo: codigo });
    
    if (participants) {
        const select = document.getElementById('cn-select-name');
        select.innerHTML = '<option value="">Selecione seu nome...</option>';
        participants.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.innerText = p;
            select.appendChild(opt);
        });
        document.getElementById('login-password-area').classList.add('hidden');
        showView('view-choose-name');
    }
}

document.getElementById('cn-select-name').addEventListener('change', async (e) => {
    const nome = e.target.value;
    currentUser = nome;
    if (nome) {
        const status = await fetchAPI("checkUser", { codigo: currentEventCode, nome: nome });
        if (status) {
            if (status.isFirstAccess) {
                // Ir para primeiro acesso
                document.getElementById('fa-nome-user').innerText = nome;
                wishesArray = [];
                window[`render_fa-wish-input`]();
                friendDrawn = "";
                document.getElementById('btn-sortear').classList.remove('disabled');
                document.getElementById('btn-sortear').disabled = false;
                document.getElementById('resultado-sorteio').classList.add('hidden');
                document.getElementById('btn-salvar-dados').classList.add('disabled');
                document.getElementById('btn-salvar-dados').disabled = true;
                
                showView('view-first-access');
            } else {
                // Mostrar campo de login
                document.getElementById('login-password-area').classList.remove('hidden');
            }
        }
    } else {
        document.getElementById('login-password-area').classList.add('hidden');
    }
});

// Fazer Login (Já possui senha)
document.getElementById('btn-fazer-login').addEventListener('click', async () => {
    const senha = document.getElementById('cn-senha-login').value;
    if (!senha) return alert("Digite a senha!");

    const res = await fetchAPI("login", { codigo: currentEventCode, nome: currentUser, senha: senha });
    if (res && res.success) {
        Auth.saveSession(currentUser, currentEventCode, senha);
        document.getElementById('cn-senha-login').value = '';
        loadDashboard();
    }
});

// ---------------- PRIMEIRO ACESSO E SORTEIO ----------------
document.getElementById('btn-sortear').addEventListener('click', async () => {
    const senha = document.getElementById('fa-senha').value;
    const senhaConf = document.getElementById('fa-senha-conf').value;

    if (senha.length < 4 || /\s/.test(senha) || /[\u{1F300}-\u{1F9FF}]/u.test(senha)) {
        return alert("A senha deve ter no mínimo 4 dígitos, sem espaços ou emojis.");
    }
    if (senha !== senhaConf) {
        return alert("As senhas não coincidem!");
    }
    if (wishesArray.length === 0) {
        return alert("Adicione pelo menos um item na sua lista de desejos.");
    }

    // Pede ao backend a lista de amigos disponíveis
    const available = await fetchAPI("getAvailableFriends", { codigo: currentEventCode, nome: currentUser });
    
    if (available && available.length > 0) {
        // Escolhe aleatoriamente no front
        const randomIndex = Math.floor(Math.random() * available.length);
        friendDrawn = available[randomIndex];
        
        document.getElementById('amigo-sorteado-nome').innerText = friendDrawn;
        document.getElementById('resultado-sorteio').classList.remove('hidden');
        
        // Desativa botão de sortear e ativa o de salvar
        const btnSortear = document.getElementById('btn-sortear');
        btnSortear.disabled = true;
        btnSortear.classList.add('disabled');
        
        const btnSalvar = document.getElementById('btn-salvar-dados');
        btnSalvar.disabled = false;
        btnSalvar.classList.remove('disabled');
    } else {
        alert("Ops! Ocorreu um erro no sorteio (talvez só reste o seu próprio nome). Contate o organizador.");
    }
});

document.getElementById('btn-salvar-dados').addEventListener('click', async () => {
    const payload = {
        codigo: currentEventCode,
        nome: currentUser,
        senha: document.getElementById('fa-senha').value,
        sugestaoBrincadeira: document.getElementById('fa-brincadeira').value,
        listaDePresentes: wishesArray,
        amigoSecreto: friendDrawn
    };

    const res = await fetchAPI("saveFirstAccess", payload);
    if (res && res.success) {
        Auth.saveSession(currentUser, currentEventCode, payload.senha);
        alert("Dados salvos com sucesso! Redirecionando para a tela principal.");
        loadDashboard();
    }
});

// ---------------- DASHBOARD PRINCIPAL ----------------
async function loadDashboard() {
    const data = await fetchAPI("getDashboard", { codigo: currentEventCode, nome: currentUser });
    if (data) {
        document.getElementById('dash-user-nome').innerText = data.usuario.nome;
        document.getElementById('dash-amigo-nome').innerText = data.amigoSecreto.nome;
        document.getElementById('dash-amigo-wishes').innerText = data.amigoSecreto.listaDePresentes.split(',').join(' • ');
        
        document.getElementById('dash-evento-nome').innerText = data.evento.nomeDoEvento;
        
        // Formatar data
        const dateObj = new Date(data.evento.data);
        document.getElementById('dash-data').innerText = dateObj.toLocaleDateString('pt-BR', {timeZone: 'UTC'});
        
        document.getElementById('dash-valor').innerText = data.evento.valorMinimo;
        document.getElementById('dash-local').innerText = data.evento.local;
        
        document.getElementById('dash-link-btn').href = data.evento.link_local;
        document.getElementById('dash-user-wishes').innerText = data.usuario.listaDePresentes.split(',').join(' • ');

        // Configurar Iframe do Maps (Busca baseada no endereço digitado)
        const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(data.evento.local)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
        document.getElementById('dash-map-iframe').src = mapUrl;

        showView('view-dashboard');
    }
}

document.getElementById('btn-logout').addEventListener('click', () => {
    Auth.clearSession();
    currentEventCode = "";
    currentUser = "";
    showView('view-home');
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    setupTagInput('ce-participante-input', 'participants-tags', participantesArray);
    setupTagInput('fa-wish-input', 'wishes-tags', wishesArray);
    
    // Checa cache logo na abertura
    if(Auth.hasSession()) {
        showView('view-home'); // Fica na home, mas quando clicar em entrar pula.
    }
});
