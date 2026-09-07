// Gerencia os dados salvos no Cache/LocalStorage do navegador
const Auth = {
    saveSession: function(nome, codigo, senha) {
        const sessionData = {
            nome: nome,
            codigo: codigo,
            senha: senha
        };
        localStorage.setItem('amigoSecretoSession', JSON.stringify(sessionData));
    },

    getSession: function() {
        const data = localStorage.getItem('amigoSecretoSession');
        return data ? JSON.parse(data) : null;
    },

    clearSession: function() {
        localStorage.removeItem('amigoSecretoSession');
    },

    hasSession: function() {
        return localStorage.getItem('amigoSecretoSession') !== null;
    }
};
