// Utilitário: formatações
const fmtKwh = (v) => (isFinite(v) ? v.toFixed(3).replace('.', ',') : '0,000');
const fmtBRL = (v) => (isFinite(v) ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00');

// Catálogo base (Sala) — valores de potência são sugestões; usuário pode editar
const CATALOGO = [
  { id: 'tv32', desc: 'TV LED/LCD 32"', watts: 70, h: 4, m: 0 },
  { id: 'tv50', desc: 'TV LED/LCD 50"', watts: 120, h: 4, m: 0 },
  { id: 'soundbar', desc: 'Soundbar/Home Theater', watts: 50, h: 2, m: 0 },
  { id: 'ac9000', desc: 'Ar-condicionado 9.000 BTU (frio)', watts: 900, h: 6, m: 0 },
  { id: 'ventilador', desc: 'Ventilador de coluna', watts: 60, h: 6, m: 0 },
  { id: 'lampada9', desc: 'Lâmpada LED 9W', watts: 9, h: 5, m: 0 },
  { id: 'pc', desc: 'Computador/Notebook em uso', watts: 120, h: 4, m: 0 },
  { id: 'carregador', desc: 'Carregador celular', watts: 10, h: 2, m: 0 },
];

// Estado e persistência
const state = {
  tarifa: 0.636240,
  itens: [] // { id, qtd, desc, watts, h, m }
};

const LS_KEY = 'simulador_sala_v1';

function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}
function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object') {
        state.tarifa = typeof obj.tarifa === 'number' ? obj.tarifa : state.tarifa;
        state.itens = Array.isArray(obj.itens) ? obj.itens : [];
      }
    }
  } catch(e) {}
}

// Cálculo por item
function calcItem(it) {
  // kWh/mês = (watts * horasDia * qtd * 30) / 1000
  const horasDia = (Number(it.h) || 0) + (Number(it.m) || 0) / 60;
  const kwhMes = (Number(it.watts) || 0) * horasDia * (Number(it.qtd) || 0) * 30 / 1000;
  const custoMes = kwhMes * state.tarifa;
  return { kwhMes, custoMes };
}

function renderCatalogo() {
  const sel = document.querySelector('#catalogo');
  sel.innerHTML = '';
  const optDefault = document.createElement('option');
  optDefault.value = '';
  optDefault.textContent = '— selecione um item—';
  sel.appendChild(optDefault);
  CATALOGO.forEach(c => {
    const op = document.createElement('option');
    op.value = c.id;
    op.textContent = c.desc;
    sel.appendChild(op);
  });
}

function addFromCatalogo() {
  const sel = document.querySelector('#catalogo');
  const id = sel.value;
  if (!id) return;
  const base = CATALOGO.find(c => c.id === id);
  if (!base) return;
  state.itens.push({ id: `${id}-${Date.now()}`, qtd: 1, desc: base.desc, watts: base.watts, h: base.h, m: base.m });
  sel.value = '';
  save();
  renderTabela();
}

function addCustom(desc, watts, h, m) {
  state.itens.push({ id: `custom-${Date.now()}`, qtd: 1, desc, watts: Number(watts)||0, h: Number(h)||0, m: Number(m)||0 });
  save();
  renderTabela();
}

function removeItem(id) {
  state.itens = state.itens.filter(x => x.id !== id);
  save();
  renderTabela();
}

function bindCellInput(tr, it, key, type='number') {
  const td = document.createElement('td');
  td.setAttribute('data-label', key === 'qtd' ? 'Quantidade' : key === 'watts' ? 'Potência (W)' : 'Descrição');
  const input = document.createElement('input');
  input.type = type;
  input.value = it[key];
  input.min = type === 'number' ? '0' : undefined;
  if (key === 'qtd') input.step = '1';
  if (key === 'watts') input.step = '1';
  if (key === 'desc') input.setAttribute('aria-label', 'Descrição do aparelho');
  input.addEventListener('input', () => {
    if (type === 'number') it[key] = Number(input.value);
    else it[key] = input.value;
    save();
    updateTotalsRow(tr, it);
    renderTotais();
  });
  td.appendChild(input);
  tr.appendChild(td);
}

function bindTimeInputs(tr, it) {
  const td = document.createElement('td');
  td.className = 'time';
  td.setAttribute('data-label', 'Uso diário');
  const h = document.createElement('input');
  h.type = 'number'; h.min = '0'; h.step = '1'; h.value = it.h;
  h.setAttribute('aria-label', 'Horas por dia');
  const labelH = document.createElement('span'); labelH.textContent = 'h';
  const m = document.createElement('input');
  m.type = 'number'; m.min = '0'; m.max = '59'; m.step = '1'; m.value = it.m;
  m.setAttribute('aria-label', 'Minutos por dia');
  const labelM = document.createElement('span'); labelM.textContent = 'min';

  [ ['h', h], ['m', m] ].forEach(([k, inp]) => {
    inp.addEventListener('input', () => {
      it[k] = Number(inp.value);
      save();
      updateTotalsRow(tr, it);
      renderTotais();
    });
  });

  td.appendChild(h); td.appendChild(labelH); td.appendChild(m); td.appendChild(labelM);
  tr.appendChild(td);
}

function updateTotalsRow(tr, it) {
  const { kwhMes, custoMes } = calcItem(it);
  tr.querySelector('[data-cell="kwh"]').textContent = fmtKwh(kwhMes);
  tr.querySelector('[data-cell="custo"]').textContent = fmtBRL(custoMes);
}

function renderTabela() {
  const tbody = document.querySelector('#linhas');
  tbody.innerHTML = '';
  state.itens.forEach(it => {
    const tr = document.createElement('tr');

    // Remover
    const tdRem = document.createElement('td');
    tdRem.className = 'remove';
    tdRem.setAttribute('data-label', 'Remover');
    const btnR = document.createElement('button');
    btnR.textContent = '×';
    btnR.setAttribute('aria-label', `Remover ${it.desc}`);
    btnR.addEventListener('click', () => removeItem(it.id));
    tdRem.appendChild(btnR);
    tr.appendChild(tdRem);

    // Quantidade
    bindCellInput(tr, it, 'qtd');

    // Descrição
    bindCellInput(tr, it, 'desc', 'text');

    // Tempo
    bindTimeInputs(tr, it);

    // Potência
    bindCellInput(tr, it, 'watts');

    // kWh/mês
    const tdK = document.createElement('td');
    tdK.setAttribute('data-label', 'kWh/mês');
    tdK.setAttribute('data-cell','kwh');
    tr.appendChild(tdK);

    // Custo/mês
    const tdC = document.createElement('td');
    tdC.setAttribute('data-label', 'Custo/mês');
    tdC.setAttribute('data-cell','custo');
    tr.appendChild(tdC);

    tbody.appendChild(tr);
    updateTotalsRow(tr, it);
  });
  renderTotais();
}

function renderTotais() {
  const totalK = state.itens.reduce((s, it) => s + calcItem(it).kwhMes, 0);
  const totalC = totalK * state.tarifa;
  document.querySelector('#totalKwh').textContent = fmtKwh(totalK);
  document.querySelector('#totalCusto').textContent = fmtBRL(totalC);
}

function resetAll() {
  if (!confirm('Tem certeza que deseja reiniciar a simulação?')) return;
  state.itens = [];
  save();
  renderTabela();
}

function exportCSV() {
  const rows = [
    ['Quantidade','Descrição','Horas/dia','Minutos/dia','Potência (W)','kWh/mês','Custo/mês (R$)']
  ];
  state.itens.forEach(it => {
    const { kwhMes, custoMes } = calcItem(it);
    rows.push([it.qtd, it.desc, it.h, it.m, it.watts, kwhMes.toFixed(3).replace('.',','), custoMes.toFixed(2).replace('.',',')]);
  });
  const totalK = state.itens.reduce((s, it) => s + calcItem(it).kwhMes, 0);
  rows.push([]);
  rows.push(['','','','','Total', totalK.toFixed(3).replace('.',','), (totalK*state.tarifa).toFixed(2).replace('.',',')]);
  const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(';')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'simulacao_sala.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

function printPage() {
  window.print();
}

function setupTour() {
  alert([
    'Bem-vindo ao simulador!',
    '1) Escolha um aparelho no seletor e clique "Adicionar".',
    '2) Ajuste quantidade, uso diário (horas/min) e potência (W).',
    '3) Edite a tarifa se necessário.',
    '4) Veja os totais no rodapé da tabela.',
    '5) Exporte para CSV, imprima ou reinicie se quiser recomeçar.',
  ].join('\n'));
}

// Modal custom
function openCustomModal() {
  const dlg = document.querySelector('#modalCustom');
  dlg.showModal();
  dlg.querySelector('#customDesc').focus();
}
function bindCustomModal() {
  const dlg = document.querySelector('#modalCustom');
  const form = document.querySelector('#customForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
  });
  dlg.querySelector('#customSave').addEventListener('click', () => {
    const desc = dlg.querySelector('#customDesc').value.trim();
    const w = Number(dlg.querySelector('#customW').value);
    const h = Number(dlg.querySelector('#customH').value);
    const m = Number(dlg.querySelector('#customM').value);
    if (!desc || !isFinite(w) || w <= 0) return;
    addCustom(desc, w, h, m);
    dlg.close();
    dlg.querySelector('#customDesc').value='';
  });
}

function init() {
  load();
  renderCatalogo();
  renderTabela();

  const tarifaInput = document.querySelector('#tarifa');
  tarifaInput.value = state.tarifa.toFixed(6);
  tarifaInput.addEventListener('input', () => {
    state.tarifa = Number(tarifaInput.value) || 0;
    save();
    renderTotais();
    // também atualiza os custos por item
    document.querySelectorAll('#linhas tr').forEach((tr, idx) => {
      const it = state.itens[idx];
      if (it) updateTotalsRow(tr, it);
    });
  });

  document.querySelector('#btnAdd').addEventListener('click', addFromCatalogo);
  document.querySelector('#btnAddCustom').addEventListener('click', openCustomModal);
  document.querySelector('#btnReset').addEventListener('click', resetAll);
  document.querySelector('#btnExport').addEventListener('click', exportCSV);
  document.querySelector('#btnPrint').addEventListener('click', printPage);
  document.querySelector('#btnTour').addEventListener('click', setupTour);

  bindCustomModal();
}

document.addEventListener('DOMContentLoaded', init);
