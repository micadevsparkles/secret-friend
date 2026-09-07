// VARIÁVEIS GLOBAIS DE ESTADO
let state = {
  currentEventCode: null,
  currentEventName: null,
  currentUser: null,
  participantsTags: [],
  wishlistTags: [],
  drawnFriend: null
};

// CONTROLE DE UI
const app = {
  showView: (viewId) => {
    document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
  },
  
  showLoading: (show) => {
    document.getElementById('loader').classList[show ? 'remove' : 'add']('hidden');
  },

  generateCode: () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  },

  // === FLUXO DE CRIAÇÃO / EDIÇÃO DE EVENTO ===
  prepareCreateEvent: () => {
    state.participantsTags = [];
    app.renderTags('ev-tags-container', state.participantsTags);
    document.getElementById('ev-codigo').value = app.generateCode();
    document.getElementById('ev-nome').value = '';
    document.getElementById('ev-data').value = '';
    document.getElementById('ev-local').value = '';
    document.getElementById('ev-link').value = '';
    document.getElementById('ev-valor').value = '';
    document.getElementById('event-form-title').innerText = "Criar Evento";
    app.showView('view-event-form');
  },

  prepareEditEvent: () => {
    const code = document.getElementById('edit-codigo').value.trim().toUpperCase();
    if (!code) return alert("Digite um código!");
    
    app.showLoading(true);
    google.script.run.withSuccessHandler(res => {
      app.showLoading(false);
      if (res.success) {
        state.participantsTags = res.data.participantes.split(',').map(p => p.trim()).filter(Boolean);
        document.getElementById('ev-codigo').value = res.data.codigo;
        document.getElementById('ev-nome').value = res.data.nomeDoEvento;
        
        // Conversão de data para input type date
        let dataInput = res.data.data;
        if(dataInput && dataInput.substring) {
            dataInput = new Date(dataInput).toISOString().split('T')[0];
        }
        document.getElementById('ev-data').value = dataInput;
        document.getElementById('ev-local').value = res.data.local;
        document.getElementById('ev-link').value = res.data.link_local;
        document.getElementById('ev-valor').value = res.data.valorMinimo;
        app.renderTags('ev-tags-container', state.participantsTags);
        document.getElementById('event-form-title').innerText = "Editar Evento";
        app.showView('view-event-form');
      } else {
        alert(res.message);
      }
    }).buscarEvento(code);
  },

  saveEvent: () => {
    const payload = {
      codigo: document.getElementById('ev-codigo').value,
      nomeDoEvento: document.getElementById('ev-nome').value,
      data: document.getElementById('ev-data').value,
      local: document.getElementById('ev-local').value,
      link_local: document.getElementById('ev-link').value,
      valorMinimo: document.getElementById('ev-valor').value,
      participantes: state.participantsTags
    };

    if(!payload.nomeDoEvento || state.participantsTags.length < 3) {
      return alert("Preencha o nome e adicione pelo menos 3 participantes.");
    }

    app.showLoading(true);
    google.script.run.withSuccessHandler(res => {
      app.showLoading(false);
      if(res.success) {
        alert("Evento configurado com sucesso! Código: " + payload.codigo);
        app.showView('view-home');
      } else {
        alert("Erro: " + res.message);
      }
    }).salvarEvento(payload);
  },

  // === FLUXO DE ENTRADA DO PARTICIPANTE ===
  loadEventList: () => {
    app.showLoading(true);
    google.script.run.withSuccessHandler(res => {
      app.showLoading(false);
      if(res.success) {
        const container = document.getElementById('event-list-container');
        container.innerHTML = '';
        res.data.forEach(ev => {
          const btn = document.createElement('button');
          btn.className = 'btn btn-green';
          btn.innerText = ev.nome;
          btn.onclick = () => app.selectEvent(ev.codigo, ev.nome);
          container.appendChild(btn);
        });
        app.showView('view-select-event');
      }
    }).listarEventos();
  },

  selectEvent: (codigo, nome) => {
    state.currentEventCode = codigo;
    state.currentEventName = nome;
    document.getElementById('id-event-name').innerText = nome;
    
    app.showLoading(true);
    google.script.run.withSuccessHandler(res => {
      app.showLoading(false);
      if(res.success) {
        const select = document.getElementById('id-participant-select');
        select.innerHTML = '<option value="">Selecione seu nome</option>';
        res.data.forEach(p => {
          select.innerHTML += `<option value="${p}">${p}</option>`;
        });
        app.showView('view-identify');
      }
    }).listarParticipantes(codigo);
  },

  handleParticipantSelection: () => {
    const nome = document.getElementById('id-participant-select').value;
    if(!nome) return alert("Selecione seu nome!");
    state.currentUser = nome;

    // Checa cache local primeiro
    if (Auth.check()) {
      const sess = Auth.get();
      if (sess.codigo === state.currentEventCode && sess.nome === nome) {
        return app.loadDashboard();
      }
    }

    app.showLoading(true);
    google.script.run.withSuccessHandler(res => {
      app.showLoading(false);
      if(res.success) {
        if(res.hasPassword) {
          document.getElementById('login-name').innerText = nome;
          document.getElementById('login-senha').value = '';
          app.showView('view-login');
        } else {
          app.prepareSetupParticipant();
        }
      }
    }).checarStatusParticipante(state.currentEventCode, nome);
  },

  doLogin: () => {
    const senha = document.getElementById('login-senha').value;
    if(!senha) return alert("Digite a senha.");
    
    app.showLoading(true);
    google.script.run.withSuccessHandler(res => {
      if(res.success) {
        Auth.save(state.currentUser, state.currentEventCode, senha);
        app.loadDashboard();
      } else {
        app.showLoading(false);
        alert(res.message);
      }
    }).loginParticipante(state.currentEventCode, state.currentUser, senha);
  },

  prepareSetupParticipant: () => {
    document.getElementById('setup-name').innerText = state.currentUser;
    state.wishlistTags = [];
    app.renderTags('gift-tags-container', state.wishlistTags);
    document.getElementById('setup-senha').value = '';
    document.getElementById('setup-senha-conf').value = '';
    document.getElementById('setup-sugestao').value = '';
    
    document.getElementById('btn-sortear').classList.remove('hidden');
    document.getElementById('draw-result').classList.add('hidden');
    document.getElementById('btn-save-setup').classList.add('hidden');
    state.drawnFriend = null;

    app.showView('view-setup-participant');
  },

  doDraw: () => {
    app.showLoading(true);
    google.script.run.withSuccessHandler(res => {
      app.showLoading(false);
      if(res.success) {
        state.drawnFriend = res.data;
        document.getElementById('draw-name-display').innerText = res.data;
        document.getElementById('btn-sortear').classList.add('hidden');
        document.getElementById('draw-result').classList.remove('hidden');
        document.getElementById('btn-save-setup').classList.remove('hidden');
      } else {
        alert("Erro no sorteio: " + res.message);
      }
    }).sortearAmigoSecreto(state.currentEventCode, state.currentUser);
  },

  saveSetup: () => {
    const senha = document.getElementById('setup-senha').value.trim();
    const senhaConf = document.getElementById('setup-senha-conf').value.trim();
    const sugestao = document.getElementById('setup-sugestao').value;
    const lista = state.wishlistTags.join(', ');

    if(senha.length < 4 || /\s/.test(senha)) return alert("A senha deve ter min 4 dígitos e sem espaços.");
    if(senha !== senhaConf) return alert("As senhas não conferem.");
    if(!state.drawnFriend) return alert("Você precisa sortear seu amigo secreto!");

    app.showLoading(true);
    google.script.run.withSuccessHandler(res => {
      if(res.success) {
        Auth.save(state.currentUser, state.currentEventCode, senha);
        app.loadDashboard();
      } else {
        app.showLoading(false);
        alert(res.message);
      }
    }).salvarConfiguracaoParticipante(state.currentEventCode, state.currentUser, senha, sugestao, lista, state.drawnFriend);
  },

  loadDashboard: () => {
    const sess = Auth.get();
    if(!sess.codigo) return app.showView('view-home');
    
    app.showLoading(true);
    google.script.run.withSuccessHandler(res => {
      app.showLoading(false);
      if(res.success) {
        const d = res.data;
        document.getElementById('dash-user-name').innerText = d.user.nome;
        document.getElementById('dash-user-lista').innerText = d.user.listaDePresentes || "Nenhuma";
        
        document.getElementById('dash-amigo-nome').innerText = d.user.amigoSecreto;
        document.getElementById('dash-amigo-lista').innerText = d.amigoData ? d.amigoData.listaDePresentes : "Nenhuma";
        document.getElementById('dash-amigo-brincadeira').innerText = d.amigoData ? d.amigoData.sugestaoBrincadeira : "Nenhuma";

        document.getElementById('dash-ev-nome').innerText = d.evento.nomeDoEvento;
        
        // Formatar a data
        let displayDate = d.evento.data;
        if(d.evento.data) {
           const dt = new Date(d.evento.data);
           displayDate = dt.toLocaleDateString('pt-BR');
        }

        document.getElementById('dash-ev-data').innerText = displayDate;
        document.getElementById('dash-ev-local').innerText = d.evento.local;
        document.getElementById('dash-ev-valor').innerText = d.evento.valorMinimo;

        const mapContainer = document.getElementById('dash-ev-map');
        if(d.evento.link_local && d.evento.link_local.includes('http')) {
          if(d.evento.link_local.includes('embed')) {
             mapContainer.innerHTML = `<iframe src="${d.evento.link_local}" allowfullscreen="" loading="lazy"></iframe>`;
          } else {
             mapContainer.innerHTML = `<a href="${d.evento.link_local}" target="_blank" class="btn-link">Abrir no Google Maps</a>`;
          }
        } else {
          mapContainer.innerHTML = '';
        }

        app.showView('view-dashboard');
      } else {
        Auth.clear();
        app.showView('view-home');
      }
    }).getDashboardInfo(sess.codigo, sess.nome);
  },

  // === UTILITÁRIOS DE TAGS ===
  setupTagInput: (inputId, arrayRef, containerId) => {
    const input = document.getElementById(inputId);
    input.addEventListener('keyup', (e) => {
      if(e.key === ',') {
        let val = input.value.replace(',', '').trim();
        if(val && !state[arrayRef].includes(val)) {
          state[arrayRef].push(val);
          app.renderTags(containerId, state[arrayRef], arrayRef);
        }
        input.value = '';
      }
    });
  },

  renderTags: (containerId, tagsArray, arrayRef) => {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    tagsArray.forEach((tag, index) => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.innerHTML = `${tag} <span onclick="app.removeTag('${arrayRef}', ${index}, '${containerId}')">✖</span>`;
      container.appendChild(span);
    });
  },

  removeTag: (arrayRef, index, containerId) => {
    if(state[arrayRef]) {
      state[arrayRef].splice(index, 1);
      app.renderTags(containerId, state[arrayRef], arrayRef);
    }
  },

  addGiftPreset: (item) => {
    if(!state.wishlistTags.includes(item)) {
      state.wishlistTags.push(item);
      app.renderTags('gift-tags-container', state.wishlistTags, 'wishlistTags');
    }
  }
};

// INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
  app.setupTagInput('ev-participante-input', 'participantsTags', 'ev-tags-container');
  app.setupTagInput('gift-input', 'wishlistTags', 'gift-tags-container');
  
  // Checa se já existe cache salvo no dispositivo
  if (Auth.check()) {
    app.loadDashboard();
  } else {
    app.showView('view-home');
  }
});
