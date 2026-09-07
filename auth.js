const Auth = {
  save: function(nome, codigo, senha) {
    localStorage.setItem('as_nome', nome);
    localStorage.setItem('as_codigo', codigo);
    localStorage.setItem('as_senha', senha);
  },
  get: function() {
    return {
      nome: localStorage.getItem('as_nome'),
      codigo: localStorage.getItem('as_codigo'),
      senha: localStorage.getItem('as_senha')
    };
  },
  clear: function() {
    localStorage.removeItem('as_nome');
    localStorage.removeItem('as_codigo');
    localStorage.removeItem('as_senha');
  },
  check: function() {
    const data = this.get();
    return (data.nome && data.codigo && data.senha);
  }
};
