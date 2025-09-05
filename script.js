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
          <td>${c.nascimento}</td>
          <td>${c.contato}</td>
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
    nascimento: form.nascimento.value,
    contato: form.contato.value,
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
  form.nascimento.value = c.nascimento;
  form.contato.value = c.contato;
  form.interesse.value = c.interesse;
  clientes.splice(i, 1);
  salvarClientes();
  renderizarClientes();
}

busca.addEventListener("input", e => {
  renderizarClientes(e.target.value);
});

exportar.addEventListener("click", () => {
  const csv = ["Nome,Email,Telefone,Nascimento,Contato,Interesse"];
  clientes.forEach(c => {
    csv.push(`${c.nome},${c.email},${c.telefone},${c.nascimento},${c.contato},${c.interesse}`);
  });
  const blob = new Blob([csv.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "clientes.csv";
  a.click();
});

renderizarClientes();