const STORAGE_KEY = 'clientes_pro_v3';
const ALERTS_KEY = 'clientes_alertas_lidos_v3';
const SETTINGS_KEY = 'clientes_settings_v3';

const DEFAULT_SETTINGS = {
  statuses: ['Novo', 'Em negociação', 'Fechado', 'Perdido'],
  extraField: { enabled: false, label: 'Campo extra' }
};

const settings = loadSettings();

const form = document.getElementById('clienteForm');
const lista = document.getElementById('listaClientes');
const busca = document.getElementById('busca');
const exportCsvBtn = document.getElementById('exportCsv');
const exportJsonBtn = document.getElementById('exportJson');
const importCsvInput = document.getElementById('importCsv');
const importJsonInput = document.getElementById('importJson');
const backupBtn = document.getElementById('backup');
const filtersBar = document.getElementById('filtersBar');
const toast = document.getElementById('toast');
const toggleKanbanBtn = document.getElementById('toggleKanban');
const kanban = document.getElementById('kanban');
const statsBar = document.getElementById('statsBar');
const alertasLista = document.getElementById('alertasLista');
const clearReadAlertsBtn = document.getElementById('clearReadAlerts');
const clienteIdInput = document.getElementById('clienteId');
const submitBtn = document.getElementById('submitBtn');
const statusSelect = document.getElementById('status');
const novoStatusInput = document.getElementById('novoStatus');
const addStatusBtn = document.getElementById('addStatusBtn');
const statusList = document.getElementById('statusList');
const campoExtraWrap = document.getElementById('campoExtraWrap');
const campoExtraInput = document.getElementById('campoExtra');
const campoExtraHead = document.getElementById('campoExtraHead');
const campoExtraLabelInput = document.getElementById('campoExtraLabel');
const mostrarCampoExtraInput = document.getElementById('mostrarCampoExtra');
const saveCampoExtraBtn = document.getElementById('saveCampoExtraBtn');
const removeCampoExtraBtn = document.getElementById('removeCampoExtraBtn');

let clientes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let alertasLidos = JSON.parse(localStorage.getItem(ALERTS_KEY) || '{}');
let sortState = { key: 'nome', dir: 1 };
let currentFilter = 'all';

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return {
      statuses: Array.isArray(saved.statuses) && saved.statuses.length ? saved.statuses : [...DEFAULT_SETTINGS.statuses],
      extraField: {
        enabled: !!saved?.extraField?.enabled,
        label: (saved?.extraField?.label || DEFAULT_SETTINGS.extraField.label).trim() || DEFAULT_SETTINGS.extraField.label
      }
    };
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\s+/g, ' ').trim();
}

function phoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function firstStatus() {
  return settings.statuses[0] || 'Novo';
}

function sanitizeCliente(cliente = {}) {
  const status = settings.statuses.includes(cliente.status) ? cliente.status : firstStatus();
  return {
    id: cliente.id || uid(),
    nome: (cliente.nome || '').trim(),
    email: (cliente.email || '').trim(),
    telefone: normalizePhone(cliente.telefone || ''),
    renda: cliente.renda || '',
    status,
    nascimento: cliente.nascimento || '',
    primeiroContato: cliente.primeiroContato || '',
    proximoContato: cliente.proximoContato || '',
    origem: (cliente.origem || '').trim(),
    campoExtra: (cliente.campoExtra || '').trim(),
    observacoes: (cliente.observacoes || '').trim(),
    createdAt: cliente.createdAt || new Date().toISOString()
  };
}

clientes = clientes.map(sanitizeCliente);
salvarClientes();

function salvarClientes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clientes));
}

function salvarAlertasLidos() {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alertasLidos));
}

function showToast(msg, timeout = 3500) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.add('hidden'), timeout);
}

function dedupeKey(cliente) {
  const nome = (cliente.nome || '').trim().toLowerCase();
  const telefone = phoneDigits(cliente.telefone || '');
  const email = (cliente.email || '').trim().toLowerCase();
  return `${nome}|${telefone}|${email}`;
}

function clienteExists(cliente, ignoreId = '') {
  const key = dedupeKey(cliente);
  return clientes.some(c => c.id !== ignoreId && dedupeKey(c) === key && key !== '||');
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeCsvField(str = '') {
  const s = String(str ?? '');
  if (/["\n;,]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function downloadBlob(content, type, filename) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function exportCSV() {
  const header = ['Nome', 'Email', 'Telefone', 'Renda', 'Status', 'Nascimento', 'Primeiro Contato', 'Proximo Contato', 'Origem'];
  if (settings.extraField.enabled) header.push(settings.extraField.label);
  header.push('Observacoes');

  const rows = clientes.map(c => {
    const base = [
      escapeCsvField(c.nome),
      escapeCsvField(c.email),
      escapeCsvField(c.telefone),
      escapeCsvField(c.renda),
      escapeCsvField(c.status),
      escapeCsvField(c.nascimento),
      escapeCsvField(c.primeiroContato),
      escapeCsvField(c.proximoContato),
      escapeCsvField(c.origem)
    ];
    if (settings.extraField.enabled) base.push(escapeCsvField(c.campoExtra || ''));
    base.push(escapeCsvField(c.observacoes));
    return base.join(';');
  });

  const bom = '\uFEFF';
  const csv = bom + [header.join(';'), ...rows].join('\n');
  downloadBlob(csv, 'text/csv;charset=utf-8;', 'clientes.csv');
  showToast('CSV exportado com sucesso');
}

function exportJSON() {
  downloadBlob(JSON.stringify({ settings, clientes }, null, 2), 'application/json', 'clientes.json');
  showToast('JSON exportado com sucesso');
}

function parseCSV(text) {
  const rows = [];
  let cur = [];
  let field = '';
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ';' || ch === ',') {
      cur.push(field);
      field = '';
      i++;
      continue;
    }
    if (ch === '\r') {
      i++;
      continue;
    }
    if (ch === '\n') {
      cur.push(field);
      rows.push(cur);
      cur = [];
      field = '';
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field !== '' || cur.length) {
    cur.push(field);
    rows.push(cur);
  }
  return rows;
}

function decodeFile(file, callback) {
  const reader = new FileReader();
  reader.onload = e => {
    const buffer = e.target.result;
    let text = '';
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch {
      text = new TextDecoder('iso-8859-1').decode(buffer);
    }
    callback(text);
  };
  reader.readAsArrayBuffer(file);
}

function importCSVFile(file) {
  decodeFile(file, text => {
    const rows = parseCSV(text).filter(r => r.some(cell => String(cell).trim() !== ''));
    if (rows.length < 2) {
      showToast('CSV vazio ou inválido');
      return;
    }

    const header = rows[0].map(h => String(h).trim().toLowerCase());
    const mapIndex = (...names) => header.findIndex(h => names.includes(h));
    const extraHeader = settings.extraField.label.trim().toLowerCase();

    const idx = {
      nome: mapIndex('nome'),
      email: mapIndex('email', 'e-mail'),
      telefone: mapIndex('telefone', 'celular', 'fone'),
      renda: mapIndex('renda'),
      status: mapIndex('status'),
      nascimento: mapIndex('nascimento', 'data de nascimento'),
      primeiroContato: mapIndex('primeiro contato'),
      proximoContato: mapIndex('proximo contato', 'próximo contato'),
      origem: mapIndex('origem'),
      campoExtra: settings.extraField.enabled ? mapIndex(extraHeader, 'campo extra') : -1,
      observacoes: mapIndex('observacoes', 'observações')
    };

    let importados = 0;
    let ignorados = 0;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const cliente = sanitizeCliente({
        nome: idx.nome >= 0 ? row[idx.nome] : row[0],
        email: idx.email >= 0 ? row[idx.email] : '',
        telefone: idx.telefone >= 0 ? row[idx.telefone] : '',
        renda: idx.renda >= 0 ? row[idx.renda] : '',
        status: idx.status >= 0 ? row[idx.status] : firstStatus(),
        nascimento: idx.nascimento >= 0 ? row[idx.nascimento] : '',
        primeiroContato: idx.primeiroContato >= 0 ? row[idx.primeiroContato] : '',
        proximoContato: idx.proximoContato >= 0 ? row[idx.proximoContato] : '',
        origem: idx.origem >= 0 ? row[idx.origem] : '',
        campoExtra: idx.campoExtra >= 0 ? row[idx.campoExtra] : '',
        observacoes: idx.observacoes >= 0 ? row[idx.observacoes] : ''
      });

      if (!cliente.nome || clienteExists(cliente)) {
        ignorados++;
        continue;
      }
      clientes.push(cliente);
      importados++;
    }

    salvarClientes();
    renderAll();
    showToast(`CSV importado: ${importados} novo(s), ${ignorados} ignorado(s)`);
  });
}

function importJSONFile(file) {
  decodeFile(file, text => {
    try {
      const data = JSON.parse(text);
      const importedSettings = data?.settings;
      const rows = Array.isArray(data) ? data : Array.isArray(data?.clientes) ? data.clientes : null;
      if (!rows) {
        showToast('JSON inválido');
        return;
      }

      if (importedSettings?.statuses?.length) {
        settings.statuses = [...new Set(importedSettings.statuses.map(s => String(s).trim()).filter(Boolean))];
      }
      if (importedSettings?.extraField) {
        settings.extraField.enabled = !!importedSettings.extraField.enabled;
        settings.extraField.label = (importedSettings.extraField.label || settings.extraField.label || 'Campo extra').trim();
      }
      saveSettings();

      let importados = 0;
      let ignorados = 0;
      rows.forEach(item => {
        const cliente = sanitizeCliente(item);
        if (!cliente.nome || clienteExists(cliente)) {
          ignorados++;
          return;
        }
        clientes.push(cliente);
        importados++;
      });
      salvarClientes();
      renderAll();
      showToast(`JSON importado: ${importados} novo(s), ${ignorados} ignorado(s)`);
    } catch {
      showToast('Erro ao ler JSON');
    }
  });
}

function formatCurrency(value) {
  if (value === '' || value == null) return '';
  const num = Number(String(value).replace(',', '.'));
  if (Number.isNaN(num)) return value;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

function formatDate(value) {
  if (!value) return '';
  const [y, m, d] = String(value).split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function prazoInfo(dateStr) {
  if (!dateStr) return { label: 'Sem data', className: 'deadline-future', diff: 9999 };
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((alvo - hoje) / 86400000);

  if (diff < 0) return { label: `Atrasado ${Math.abs(diff)}d`, className: 'deadline-overdue', diff };
  if (diff === 0) return { label: 'Hoje', className: 'deadline-today', diff };
  if (diff <= 3) return { label: `Em ${diff}d`, className: 'deadline-soon', diff };
  return { label: `Em ${diff}d`, className: 'deadline-future', diff };
}

function statusClass(status) {
  return `status-${String(status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')}`;
}

function bindSortableHeaders() {
  document.querySelectorAll('thead th[data-key]').forEach(th => {
    th.onclick = () => {
      const key = th.dataset.key;
      if (sortState.key === key) sortState.dir *= -1;
      else sortState = { key, dir: 1 };
      renderizarClientes();
    };
  });
}

function renderFilters() {
  filtersBar.innerHTML = '';
  const buttons = ['all', ...settings.statuses];
  buttons.forEach(status => {
    const btn = document.createElement('button');
    btn.textContent = status === 'all' ? 'Todos' : status;
    btn.dataset.filter = status;
    if (currentFilter === status) btn.classList.add('active');
    btn.addEventListener('click', () => {
      currentFilter = status;
      renderFilters();
      renderizarClientes();
    });
    filtersBar.appendChild(btn);
  });
  if (!buttons.includes(currentFilter)) currentFilter = 'all';
}

function renderStatusSelect() {
  const current = statusSelect.value;
  statusSelect.innerHTML = settings.statuses.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  statusSelect.value = settings.statuses.includes(current) ? current : firstStatus();
}

function renderStatusManager() {
  statusList.innerHTML = '';
  settings.statuses.forEach(status => {
    const item = document.createElement('div');
    item.className = 'tag-item';
    item.innerHTML = `<span>${escapeHtml(status)}</span><button type="button" data-remove-status="${escapeHtml(status)}">✕</button>`;
    statusList.appendChild(item);
  });
}

function renderCampoExtraConfig() {
  campoExtraLabelInput.value = settings.extraField.label;
  mostrarCampoExtraInput.checked = settings.extraField.enabled;
  campoExtraWrap.classList.toggle('hidden', !settings.extraField.enabled);
  campoExtraHead.classList.toggle('hidden', !settings.extraField.enabled);
  campoExtraInput.placeholder = settings.extraField.label || 'Campo extra';
  campoExtraHead.textContent = settings.extraField.label || 'Campo extra';
}

function criarLinhaTabela(cliente) {
  const tr = document.createElement('tr');
  const prazo = prazoInfo(cliente.proximoContato);
  if (prazo.diff < 0) tr.classList.add('row-overdue');
  if (prazo.diff === 0) tr.classList.add('row-today');

  const extraCell = settings.extraField.enabled ? `<td>${escapeHtml(cliente.campoExtra || '')}</td>` : '';

  tr.innerHTML = `
    <td>${escapeHtml(cliente.nome)}</td>
    <td>${escapeHtml(cliente.email)}</td>
    <td>${escapeHtml(cliente.telefone)}</td>
    <td>${escapeHtml(formatCurrency(cliente.renda))}</td>
    <td><span class="status-chip ${statusClass(cliente.status)}">${escapeHtml(cliente.status)}</span></td>
    <td>${escapeHtml(formatDate(cliente.nascimento))}</td>
    <td>${escapeHtml(formatDate(cliente.primeiroContato))}</td>
    <td>${escapeHtml(formatDate(cliente.proximoContato))}</td>
    <td><span class="deadline-chip ${prazo.className}">${escapeHtml(prazo.label)}</span></td>
    <td>${escapeHtml(cliente.origem)}</td>
    ${extraCell}
    <td class="small">${escapeHtml((cliente.observacoes || '').slice(0, 140))}</td>
    <td class="actions">
      <button data-action="edit" data-id="${cliente.id}">✏️</button>
      <button data-action="delete" data-id="${cliente.id}">🗑️</button>
      <button data-action="no-answer" data-id="${cliente.id}" title="Cliente não respondeu">📌</button>
      <a href="tel:${phoneDigits(cliente.telefone)}" title="Ligar"><button>📞</button></a>
      <a href="https://wa.me/55${phoneDigits(cliente.telefone)}" target="_blank" rel="noopener" title="WhatsApp"><button>💬</button></a>
    </td>
  `;
  return tr;
}

function getFilteredClientes() {
  const q = (busca.value || '').trim().toLowerCase();
  return clientes
    .filter(c => currentFilter === 'all' ? true : c.status === currentFilter)
    .filter(c => {
      if (!q) return true;
      const text = `${c.nome} ${c.email} ${c.telefone} ${c.origem} ${c.campoExtra || ''} ${c.observacoes}`.toLowerCase();
      return text.includes(q);
    })
    .sort((a, b) => {
      const aVal = String(a[sortState.key] || '').toLowerCase();
      const bVal = String(b[sortState.key] || '').toLowerCase();
      if (aVal > bVal) return sortState.dir;
      if (aVal < bVal) return -sortState.dir;
      return 0;
    });
}

function renderStats(filtered) {
  const total = clientes.length;
  const overdue = clientes.filter(c => prazoInfo(c.proximoContato).diff < 0).length;
  const today = clientes.filter(c => prazoInfo(c.proximoContato).diff === 0).length;
  statsBar.innerHTML = `
    <span class="stat-pill">Total: ${total}</span>
    <span class="stat-pill">Filtrados: ${filtered.length}</span>
    <span class="stat-pill">Atrasados: ${overdue}</span>
    <span class="stat-pill">Hoje: ${today}</span>
  `;
}

function renderizarClientes() {
  lista.innerHTML = '';
  const filtered = getFilteredClientes();
  filtered.forEach(cliente => lista.appendChild(criarLinhaTabela(cliente)));
  renderStats(filtered);
  renderKanban();
}

function preencherFormulario(cliente) {
  clienteIdInput.value = cliente.id;
  form.nome.value = cliente.nome;
  form.email.value = cliente.email;
  form.telefone.value = cliente.telefone;
  form.renda.value = cliente.renda;
  form.status.value = cliente.status;
  form.nascimento.value = cliente.nascimento;
  form.primeiroContato.value = cliente.primeiroContato;
  form.proximoContato.value = cliente.proximoContato;
  form.origem.value = cliente.origem;
  campoExtraInput.value = cliente.campoExtra || '';
  form.observacoes.value = cliente.observacoes;
  submitBtn.textContent = 'Atualizar Cliente';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
  form.reset();
  clienteIdInput.value = '';
  renderStatusSelect();
  submitBtn.textContent = 'Salvar Cliente';
}

function editarCliente(id) {
  const cliente = clientes.find(c => c.id === id);
  if (!cliente) return;
  preencherFormulario(cliente);
  showToast('Cliente carregado para edição');
}

function excluirCliente(id) {
  const cliente = clientes.find(c => c.id === id);
  if (!cliente) return;
  if (!confirm(`Confirma excluir ${cliente.nome}?`)) return;
  clientes = clientes.filter(c => c.id !== id);
  delete alertasLidos[id];
  salvarClientes();
  salvarAlertasLidos();
  renderAll();
  showToast('Cliente excluído');
}

function marcarNaoRespondeu(id) {
  const cliente = clientes.find(c => c.id === id);
  if (!cliente) return;
  const carimbo = new Date().toLocaleString('pt-BR');
  const nota = `Tentativa sem resposta em ${carimbo}. Lead segue em acompanhamento.`;
  cliente.observacoes = cliente.observacoes ? `${cliente.observacoes}\n${nota}` : nota;
  salvarClientes();
  renderizarClientes();
  showToast('Observação de não retorno registrada');
}

function saveOrUpdateCliente(e) {
  e.preventDefault();
  const draft = sanitizeCliente({
    id: clienteIdInput.value || uid(),
    nome: form.nome.value,
    email: form.email.value,
    telefone: form.telefone.value,
    renda: form.renda.value,
    status: form.status.value,
    nascimento: form.nascimento.value,
    primeiroContato: form.primeiroContato.value,
    proximoContato: form.proximoContato.value,
    origem: form.origem.value,
    campoExtra: campoExtraInput.value,
    observacoes: form.observacoes.value
  });

  if (!draft.nome) {
    showToast('Preencha o nome do cliente');
    return;
  }

  if (clienteExists(draft, draft.id)) {
    showToast('Cliente duplicado detectado. Revise nome, telefone ou e-mail.');
    return;
  }

  const idx = clientes.findIndex(c => c.id === draft.id);
  if (idx >= 0) {
    clientes[idx] = { ...clientes[idx], ...draft };
    showToast('Cliente atualizado com sucesso');
  } else {
    clientes.push(draft);
    showToast('Cliente salvo com sucesso');
  }

  salvarClientes();
  resetForm();
  renderAll();
}

function renderizarAlertas() {
  const pendentes = clientes
    .filter(c => c.proximoContato)
    .filter(c => !alertasLidos[c.id])
    .filter(c => prazoInfo(c.proximoContato).diff <= 3)
    .sort((a, b) => prazoInfo(a.proximoContato).diff - prazoInfo(b.proximoContato).diff);

  if (!pendentes.length) {
    alertasLista.className = 'alert-list empty-state';
    alertasLista.textContent = 'Nenhum alerta pendente no momento.';
    return;
  }

  alertasLista.className = 'alert-list';
  alertasLista.innerHTML = '';
  pendentes.forEach(cliente => {
    const prazo = prazoInfo(cliente.proximoContato);
    const type = prazo.diff < 0 ? 'overdue' : prazo.diff === 0 ? 'today' : 'soon';
    const div = document.createElement('div');
    div.className = `alert-item ${type}`;
    div.innerHTML = `
      <div class="alert-main">
        <strong>${escapeHtml(cliente.nome)}</strong>
        <div class="alert-meta">Próximo contato: ${escapeHtml(formatDate(cliente.proximoContato))} · ${escapeHtml(prazo.label)}</div>
      </div>
      <div class="alert-actions">
        <button class="btn-open" data-alert-open="${cliente.id}">Abrir</button>
        <button class="btn-ok" data-alert-ok="${cliente.id}">Concluir</button>
      </div>
    `;
    alertasLista.appendChild(div);
  });
}

function concluirAlerta(id) {
  alertasLidos[id] = true;
  salvarAlertasLidos();
  renderizarAlertas();
  showToast('Aviso concluído');
}

function abrirAlerta(id) {
  const cliente = clientes.find(c => c.id === id);
  if (!cliente) return;
  preencherFormulario(cliente);
}

function verificarAlertasToast() {
  const contatosHoje = clientes.filter(c => prazoInfo(c.proximoContato).diff === 0 && !alertasLidos[c.id]);
  const contatosAtrasados = clientes.filter(c => prazoInfo(c.proximoContato).diff < 0 && !alertasLidos[c.id]);
  if (contatosAtrasados.length) {
    showToast(`Você tem ${contatosAtrasados.length} atendimento(s) atrasado(s)`);
    return;
  }
  if (contatosHoje.length) showToast(`Você tem ${contatosHoje.length} atendimento(s) para hoje`);
}

function renderKanban() {
  kanban.innerHTML = '';
  settings.statuses.forEach(status => {
    const col = document.createElement('div');
    col.className = 'column';
    col.dataset.status = status;
    col.innerHTML = `<h3>${escapeHtml(status)}</h3><div class="cards"></div>`;
    const container = col.querySelector('.cards');

    clientes.filter(c => c.status === status).forEach(cliente => {
      const card = document.createElement('div');
      card.className = 'card';
      card.draggable = true;
      card.dataset.id = cliente.id;
      const prazo = prazoInfo(cliente.proximoContato);
      const extraText = settings.extraField.enabled && cliente.campoExtra ? `<div class="meta">${escapeHtml(settings.extraField.label)}: ${escapeHtml(cliente.campoExtra)}</div>` : '';
      card.innerHTML = `
        <strong>${escapeHtml(cliente.nome)}</strong>
        <div class="meta">${escapeHtml(cliente.email || 'Sem e-mail')} · ${escapeHtml(cliente.telefone || 'Sem telefone')}</div>
        <div class="meta">${escapeHtml(cliente.proximoContato ? formatDate(cliente.proximoContato) : 'Sem próximo contato')} · ${escapeHtml(prazo.label)}</div>
        ${extraText}
        <div class="card-actions small">
          <button data-action="edit" data-id="${cliente.id}">✏️</button>
          <button data-action="delete" data-id="${cliente.id}">🗑️</button>
        </div>
      `;
      card.addEventListener('dragstart', ev => ev.dataTransfer.setData('text/plain', cliente.id));
      container.appendChild(card);
    });

    col.ondragover = ev => { ev.preventDefault(); col.classList.add('drag-over'); };
    col.ondragleave = () => col.classList.remove('drag-over');
    col.ondrop = ev => {
      ev.preventDefault();
      col.classList.remove('drag-over');
      const id = ev.dataTransfer.getData('text/plain');
      const cliente = clientes.find(c => c.id === id);
      if (!cliente) return;
      cliente.status = status;
      salvarClientes();
      renderizarClientes();
      showToast('Status atualizado');
    };

    kanban.appendChild(col);
  });
}

function addStatus() {
  const name = (novoStatusInput.value || '').trim();
  if (!name) {
    showToast('Digite o nome da nova coluna');
    return;
  }
  if (settings.statuses.some(s => s.toLowerCase() === name.toLowerCase())) {
    showToast('Esse status já existe');
    return;
  }
  settings.statuses.push(name);
  saveSettings();
  novoStatusInput.value = '';
  renderAll();
  showToast('Nova coluna adicionada');
}

function removeStatus(status) {
  if (settings.statuses.length <= 1) {
    showToast('É preciso manter pelo menos uma coluna');
    return;
  }
  if (!confirm(`Remover a coluna "${status}"?`)) return;
  const destination = settings.statuses.find(s => s !== status) || firstStatus();
  clientes.forEach(c => {
    if (c.status === status) c.status = destination;
  });
  settings.statuses = settings.statuses.filter(s => s !== status);
  if (currentFilter === status) currentFilter = 'all';
  saveSettings();
  salvarClientes();
  renderAll();
  showToast(`Coluna removida. Clientes movidos para ${destination}`);
}

function saveCampoExtra() {
  const label = (campoExtraLabelInput.value || '').trim() || 'Campo extra';
  settings.extraField.label = label;
  settings.extraField.enabled = mostrarCampoExtraInput.checked;
  saveSettings();
  renderAll();
  showToast('Campo extra atualizado');
}

function removeCampoExtra() {
  settings.extraField.enabled = false;
  saveSettings();
  renderAll();
  showToast('Campo extra ocultado');
}

function renderAll() {
  renderFilters();
  renderStatusSelect();
  renderStatusManager();
  renderCampoExtraConfig();
  renderizarClientes();
  renderizarAlertas();
  bindSortableHeaders();
}

form.addEventListener('submit', saveOrUpdateCliente);
document.getElementById('limpar').addEventListener('click', resetForm);
busca.addEventListener('input', renderizarClientes);
exportCsvBtn.addEventListener('click', exportCSV);
exportJsonBtn.addEventListener('click', exportJSON);
backupBtn.addEventListener('click', () => {
  exportJSON();
  showToast('Backup gerado em JSON');
});
addStatusBtn.addEventListener('click', addStatus);
novoStatusInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addStatus(); } });
saveCampoExtraBtn.addEventListener('click', saveCampoExtra);
removeCampoExtraBtn.addEventListener('click', removeCampoExtra);
mostrarCampoExtraInput.addEventListener('change', saveCampoExtra);

importCsvInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) importCSVFile(file);
  e.target.value = '';
});

importJsonInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) importJSONFile(file);
  e.target.value = '';
});

toggleKanbanBtn.addEventListener('click', () => {
  kanban.classList.toggle('hidden');
  document.querySelector('.list-section').classList.toggle('hidden');
  toggleKanbanBtn.textContent = kanban.classList.contains('hidden') ? 'Ver Kanban' : 'Ver Lista';
  if (!kanban.classList.contains('hidden')) renderKanban();
});

clearReadAlertsBtn.addEventListener('click', () => {
  alertasLidos = {};
  salvarAlertasLidos();
  renderizarAlertas();
  showToast('Avisos lidos foram reativados');
});

alertasLista.addEventListener('click', e => {
  const okId = e.target.getAttribute('data-alert-ok');
  const openId = e.target.getAttribute('data-alert-open');
  if (okId) concluirAlerta(okId);
  if (openId) abrirAlerta(openId);
});

statusList.addEventListener('click', e => {
  const status = e.target.getAttribute('data-remove-status');
  if (status) removeStatus(status);
});

document.addEventListener('click', e => {
  const action = e.target.getAttribute('data-action');
  const id = e.target.getAttribute('data-id');
  if (!action || !id) return;
  if (action === 'edit') editarCliente(id);
  if (action === 'delete') excluirCliente(id);
  if (action === 'no-answer') marcarNaoRespondeu(id);
});

window.addEventListener('load', () => {
  renderAll();
  verificarAlertasToast();
});

setInterval(() => {
  renderizarAlertas();
  verificarAlertasToast();
}, 1000 * 60 * 5);
