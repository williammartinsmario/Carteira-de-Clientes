
/* Mini-CRM enhanced script */
const form = document.getElementById("clienteForm");
const lista = document.getElementById("listaClientes");
const busca = document.getElementById("busca");
const exportCsvBtn = document.getElementById("exportCsv");
const exportJsonBtn = document.getElementById("exportJson");
const importCsvInput = document.getElementById("importCsv");
const importJsonInput = document.getElementById("importJson");
const backupBtn = document.getElementById("backup");
const filters = document.querySelectorAll(".filters button");
const toast = document.getElementById("toast");
const toggleKanbanBtn = document.getElementById("toggleKanban");
const kanban = document.getElementById("kanban");

let clientes = JSON.parse(localStorage.getItem("clientes")) || [];
let sortState = { key: 'nome', dir: 1 }; // 1 asc, -1 desc
let currentFilter = 'all';

function salvarClientes() {
  localStorage.setItem("clientes", JSON.stringify(clientes));
}

function showToast(msg, timeout=4000){
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=> toast.classList.add('hidden'), timeout);
}

function escapeCsvField(str=''){
  if(str==null) return '';
  const s = String(str);
  if(/["\n,]/.test(s)) {
    return '"' + s.replace(/"/g,'""') + '"';
  }
  return s;
}

function exportCSV(){
  const header = ["Nome","Email","Telefone","Renda","Status","Nascimento","Primeiro Contato","Proximo Contato","Origem","Observacoes"];
  const rows = clientes.map(c => [
    escapeCsvField(c.nome),
    escapeCsvField(c.email),
    escapeCsvField(c.telefone),
    escapeCsvField(c.renda),
    escapeCsvField(c.status),
    escapeCsvField(c.nascimento),
    escapeCsvField(c.primeiroContato),
    escapeCsvField(c.proximoContato),
    escapeCsvField(c.origem),
    escapeCsvField(c.observacoes)
  ].join(","));
  const csv = [header.join(",")].concat(rows).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "clientes.csv";
  a.click();
  showToast("CSV exportado ✔️");
}

function exportJSON(){
  const blob = new Blob([JSON.stringify(clientes, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "clientes.json";
  a.click();
  showToast("JSON exportado ✔️");
}

function parseCSV(text){
  // Basic CSV parser that supports quoted fields with commas and newlines
  const rows = [];
  let cur = [];
  let i = 0;
  let field = '';
  let inQuotes = false;
  while(i < text.length){
    const ch = text[i];
    if(inQuotes){
      if(ch === '"'){
        if(text[i+1] === '"'){ field += '"'; i += 2; continue; }
        else { inQuotes = false; i++; continue; }
      } else {
        field += ch; i++; continue;
      }
    } else {
      if(ch === '"'){ inQuotes = true; i++; continue; }
      if(ch === ','){ cur.push(field); field=''; i++; continue; }
      if(ch === '\r'){ i++; continue; }
      if(ch === '\n'){ cur.push(field); rows.push(cur); cur=[]; field=''; i++; continue; }
      field += ch; i++; continue;
    }
  }
  // push last
  if(field !== '' || inQuotes) cur.push(field);
  if(cur.length) rows.push(cur);
  return rows;
}

function importCSVFile(file){
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    const rows = parseCSV(text);
    if(rows.length < 2){ showToast("CSV vazio ou inválido"); return; }
    const header = rows[0].map(h => h.trim().toLowerCase());
    const expected = ["nome","email","telefone","renda","status","nascimento","primeiro contato","proximo contato","origem","observacoes"];
    // map indices
    const idx = {};
    expected.forEach((ex,i) => {
      const k = ex;
      const found = header.findIndex(h => h === k);
      idx[k] = found;
    });
    // add rows
    for(let r=1;r<rows.length;r++){
      const row = rows[r];
      if(row.length === 0) continue;
      const cliente = {
        nome: row[idx["nome"]] || row[0] || '',
        email: row[idx["email"]] || '',
        telefone: row[idx["telefone"]] || '',
        renda: row[idx["renda"]] || '',
        status: row[idx["status"]] || 'Novo',
        nascimento: row[idx["nascimento"]] || '',
        primeiroContato: row[idx["primeiro contato"]] || '',
        proximoContato: row[idx["proximo contato"]] || '',
        origem: row[idx["origem"]] || '',
        observacoes: row[idx["observacoes"]] || ''
      };
      if(cliente.nome) clientes.push(cliente);
    }
    salvarClientes();
    renderizarClientes();
    showToast("CSV importado ✔️");
  };
  reader.readAsText(file, 'UTF-8');
}

function importJSONFile(file){
  const reader = new FileReader();
  reader.onload = e => {
    try{
      const data = JSON.parse(e.target.result);
      if(Array.isArray(data)){
        data.forEach(d => {
          if(d && d.nome) clientes.push(Object.assign({
            nome:'', email:'', telefone:'', renda:'', status:'Novo', nascimento:'', primeiroContato:'', proximoContato:'', origem:'', observacoes:''
          }, d));
        });
        salvarClientes();
        renderizarClientes();
        showToast("JSON importado ✔️");
      } else showToast("JSON inválido");
    }catch(err){ showToast("Erro ao ler JSON"); }
  };
  reader.readAsText(file, 'UTF-8');
}

function formatDate(d){
  if(!d) return '';
  return d;
}

function criarLinhaTabela(c, i){
  const tr = document.createElement('tr');
  tr.className = "status-" + c.status.replace(/\s+/g,'\ ');
  tr.innerHTML = `
    <td>${c.nome}</td>
    <td>${c.email || ''}</td>
    <td>${c.telefone || ''}</td>
    <td>${c.renda || ''}</td>
    <td>${c.status || ''}</td>
    <td>${formatDate(c.nascimento)}</td>
    <td>${formatDate(c.primeiroContato)}</td>
    <td>${formatDate(c.proximoContato)}</td>
    <td>${c.origem || ''}</td>
    <td class="small">${(c.observacoes||'').slice(0,120)}</td>
    <td class="actions">
      <button onclick="editarCliente(${i})">✏️</button>
      <button onclick="excluirCliente(${i})">🗑️</button>
      <a href="tel:${c.telefone}" title="Ligar"><button>📞</button></a>
      <a href="https://wa.me/55${(c.telefone||'').replace(/\D/g,'')}" target="_blank" title="WhatsApp"><button>💬</button></a>
    </td>
  `;
  return tr;
}

function renderizarClientes(filtroTexto=''){
  lista.innerHTML = "";
  const q = filtroTexto || busca.value || '';
  let filtered = clientes.filter(c => {
    const matchesFilter = (currentFilter === 'all') ? true : (c.status === currentFilter);
    const text = (c.nome + ' ' + (c.email||'') + ' ' + (c.telefone||'') + ' ' + (c.origem||'')).toLowerCase();
    const matchesBusca = q.trim() === '' ? true : text.includes(q.toLowerCase());
    return matchesFilter && matchesBusca;
  });

  // sort
  filtered.sort((a,b) => {
    const A = (a[sortState.key] || '').toString().toLowerCase();
    const B = (b[sortState.key] || '').toString().toLowerCase();
    if(A>B) return sortState.dir;
    if(A<B) return -sortState.dir;
    return 0;
  });

  filtered.forEach((c, i) => {
    const tr = criarLinhaTabela(c, clientes.indexOf(c));
    lista.appendChild(tr);
  });
  renderKanban();
}

function editarCliente(i){
  const c = clientes[i];
  form.nome.value = c.nome;
  form.email.value = c.email;
  form.telefone.value = c.telefone;
  form.renda.value = c.renda;
  form.status.value = c.status;
  form.nascimento.value = c.nascimento;
  form.primeiroContato.value = c.primeiroContato;
  form.proximoContato.value = c.proximoContato;
  form.origem.value = c.origem;
  form.observacoes.value = c.observacoes;
  clientes.splice(i,1);
  salvarClientes();
  renderizarClientes();
  showToast("Editando cliente (salve para atualizar)");
}

function excluirCliente(i){
  if(!confirm("Confirma exclusão deste cliente?")) return;
  clientes.splice(i,1);
  salvarClientes();
  renderizarClientes();
  showToast("Cliente excluído");
}

form.addEventListener("submit", e => {
  e.preventDefault();
  const cliente = {
    nome: form.nome.value.trim(),
    email: form.email.value.trim(),
    telefone: form.telefone.value.trim(),
    renda: form.renda.value,
    status: form.status.value,
    nascimento: form.nascimento.value,
    primeiroContato: form.primeiroContato.value,
    proximoContato: form.proximoContato.value,
    origem: form.origem.value.trim(),
    observacoes: form.observacoes.value.trim()
  };
  clientes.push(cliente);
  salvarClientes();
  renderizarClientes();
  form.reset();
  showToast("Cliente salvo ✔️");
});

document.getElementById('limpar').addEventListener('click', () => {
  form.reset();
});

busca.addEventListener('input', () => renderizarClientes());

exportCsvBtn.addEventListener('click', exportCSV);
exportJsonBtn.addEventListener('click', exportJSON);
importCsvInput.addEventListener('change', e => {
  const f = e.target.files[0];
  if(f) importCSVFile(f);
  e.target.value = '';
});
importJsonInput.addEventListener('change', e => {
  const f = e.target.files[0];
  if(f) importJSONFile(f);
  e.target.value = '';
});

backupBtn.addEventListener('click', () => {
  exportJSON();
  showToast("Backup iniciado (JSON) — ver sua pasta de downloads");
});

// filters
filters.forEach(b => b.addEventListener('click', e => {
  filters.forEach(x => x.classList.remove('active'));
  e.target.classList.add('active');
  currentFilter = e.target.dataset.filter;
  renderizarClientes();
}));

// sorting headers
document.querySelectorAll('thead th[data-key]').forEach(th => {
  th.addEventListener('click', ()=> {
    const k = th.dataset.key;
    if(sortState.key === k) sortState.dir *= -1;
    else { sortState.key = k; sortState.dir = 1; }
    renderizarClientes();
  });
});

// alerts (anniversaries and next contacts) shown in toast
function verificarAlertas(){
  const hoje = new Date().toISOString().split('T')[0];
  const amanhaDate = new Date(); amanhaDate.setDate(amanhaDate.getDate()+1);
  const amanha = amanhaDate.toISOString().split('T')[0];

  const aniversariantes = clientes.filter(c => c.nascimento && c.nascimento.slice(5) === hoje.slice(5));
  if(aniversariantes.length) showToast('🎂 Aniversário hoje: ' + aniversariantes.map(x=>x.nome).join(', '), 7000);

  const contatosHoje = clientes.filter(c => c.proximoContato === hoje);
  if(contatosHoje.length) showToast('📞 Contatos hoje: ' + contatosHoje.map(x=>x.nome).join(', '), 7000);

  const contatosAmanha = clientes.filter(c => c.proximoContato === amanha);
  if(contatosAmanha.length) showToast('📅 Contatos amanhã: ' + contatosAmanha.map(x=>x.nome).join(', '), 7000);
}

setInterval(verificarAlertas, 1000*60*5); // a cada 5 minutos
window.addEventListener('load', ()=> { renderizarClientes(); verificarAlertas(); });

// Kanban functions
function renderKanban(){
  const columns = document.querySelectorAll('.kanban .column');
  columns.forEach(col => {
    const status = col.dataset.status;
    const container = col.querySelector('.cards');
    container.innerHTML = '';
    clientes.filter(c => c.status === status).forEach((c, idx) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.draggable = true;
      card.dataset.index = clientes.indexOf(c);
      card.innerHTML = `<strong>${c.nome}</strong><div class="meta">${c.email || ''} • ${c.telefone || ''}</div>
        <div class="card-actions small">
          <button onclick="editarCliente(${clientes.indexOf(c)})">✏️</button>
          <button onclick="excluirCliente(${clientes.indexOf(c)})">🗑️</button>
        </div>`;
      container.appendChild(card);

      card.addEventListener('dragstart', ev => {
        ev.dataTransfer.setData('text/plain', clientes.indexOf(c));
      });
    });
  });

  // set up drop handlers
  document.querySelectorAll('.kanban .column').forEach(col => {
    col.addEventListener('dragover', ev => { ev.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', ev => { col.classList.remove('drag-over'); });
    col.addEventListener('drop', ev => {
      ev.preventDefault();
      col.classList.remove('drag-over');
      const idxStr = ev.dataTransfer.getData('text/plain');
      const idx = parseInt(idxStr,10);
      if(Number.isInteger(idx)){
        clientes[idx].status = col.dataset.status;
        salvarClientes();
        renderizarClientes();
        showToast('Status atualizado');
      }
    });
  });
}

// toggle kanban
toggleKanbanBtn.addEventListener('click', ()=> {
  kanban.classList.toggle('hidden');
  document.querySelector('.list-section').classList.toggle('hidden');
  if(!kanban.classList.contains('hidden')) {
    renderKanban();
    toggleKanbanBtn.textContent = 'Ver Lista';
  } else toggleKanbanBtn.textContent = 'Ver Kanban';
});

// Expose some functions to global so buttons inside cards can call them
window.editarCliente = editarCliente;
window.excluirCliente = excluirCliente;
