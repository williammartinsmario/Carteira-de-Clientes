const form = document.getElementById("clienteForm");
const lista = document.getElementById("listaClientes");
const busca = document.getElementById("busca");
const exportar = document.getElementById("exportar");

let clientes = JSON.parse(localStorage.getItem("clientes")) || [];

function salvarClientes() {
  localStorage.setItem("clientes", JSON.stringify(clientes));
}

function renderizarClientes(filtro = "") {
  lista.innerHTML = "";
  clientes
    .filter(c => c.nome.toLowerCase().includes(filtro.toLowerCase()))
    .forEach((c, i) => {
      const row = `
        <tr>
          <td>${c.nome}</td>
          <td>${c.email}</td>
          <td>${c.telefone}</td>
          <td>${c.renda}</td>
          <td>${c.status}</td>
          <td>${c.nascimento}</td>
          <td>${c.primeiroContato}</td>
          <td>${c.proximoContato}</td>
          <td>${c.interesse}</td>
          <td>
            <button onclick="editarCliente(${i})">✏️</button>
            <button onclick="excluirCliente(${i})">🗑️</button>
            <a href="tel:${c.telefone}" title="Ligar"><button>📞</button></a>
            <a href="https://wa.me/55${c.telefone.replace(/\D/g,'')}" target="_blank" title="WhatsApp"><button>💬</button></a>
          </td>
        </tr>`;
      lista.innerHTML += row;
    });
}

form.addEventListener("submit", e => {
  e.preventDefault();
  const cliente = {
    nome: form.nome.value,
    email: form.email.value,
    telefone: form.telefone.value,
    renda: form.renda.value,
    status: form.status.value,
    nascimento: form.nascimento.value,
    primeiroContato: form.primeiroContato.value,
    proximoContato: form.proximoContato.value,
    interesse: form.interesse.value
  };
  clientes.push(cliente);
  salvarClientes();
  renderizarClientes();
  form.reset();
});

function excluirCliente(i) {
  clientes.splice(i, 1);
  salvarClientes();
  renderizarClientes();
}

function editarCliente(i) {
  const c = clientes[i];
  form.nome.value = c.nome;
  form.email.value = c.email;
  form.telefone.value = c.telefone;
  form.renda.value = c.renda;
  form.status.value = c.status;
  form.nascimento.value = c.nascimento;
  form.primeiroContato.value = c.primeiroContato;
  form.proximoContato.value = c.proximoContato;
  form.interesse.value = c.interesse;
  clientes.splice(i, 1);
  salvarClientes();
  renderizarClientes();
}

busca.addEventListener("input", e => {
  renderizarClientes(e.target.value);
});

exportar.addEventListener("click", () => {
  const csv = ["Nome,Email,Telefone,Renda,Status,Nascimento,Primeiro Contato,Proximo Contato,Interesse"];
  clientes.forEach(c => {
    csv.push(`${c.nome},${c.email},${c.telefone},${c.renda},${c.status},${c.nascimento},${c.primeiroContato},${c.proximoContato},${c.interesse}`);
  });
  const blob = new Blob([csv.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "clientes.csv";
  a.click();
});

function verificarAlertas() {
  const hoje = new Date().toISOString().split("T")[0];

  const aniversariantes = clientes.filter(c => c.nascimento && c.nascimento.slice(5) === hoje.slice(5));
  if (aniversariantes.length > 0) {
    alert(`🎂 Hoje é aniversário de: ${aniversariantes.map(c => c.nome).join(", ")}`);
  }

  const contatosHoje = clientes.filter(c => c.proximoContato === hoje);
  if (contatosHoje.length > 0) {
    alert(`📞 Você tem ${contatosHoje.length} cliente(s) para contato hoje: ${contatosHoje.map(c => c.nome).join(", ")}`);
  }
}

renderizarClientes();
verificarAlertas();