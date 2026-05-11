'use strict';

const STORAGE_KEY = 'behavior-register-state-v1';
const EMPTY_STATE = { positive: [], negative: [] };

let state = loadState();
let showBothSides = false;
let tableView = false;
let pendingDelete = null;
let pendingEdit = null;

const dom = {
  form: document.querySelector('.entry-form'),
  typeInputs: document.querySelectorAll('input[name="type"]'),
  entryPanel: document.querySelector('#entryPanel'),
  entryTypeBadge: document.querySelector('#entryTypeBadge'),
  behaviorLabel: document.querySelector('#behaviorLabel'),
  behaviorInput: document.querySelector('textarea[name="behavior"]'),
  judgmentInput: document.querySelector('textarea[name="judgment"]'),
  behaviorHelp: document.querySelector('#behaviorHelp'),
  entrySubmitButton: document.querySelector('#entrySubmitButton'),
  positiveList: document.querySelector('#positiveList'),
  negativeList: document.querySelector('#negativeList'),
  positiveTable: document.querySelector('#positiveTable'),
  negativeTable: document.querySelector('#negativeTable'),
  positivePanel: document.querySelector('.list-panel--positive'),
  negativePanel: document.querySelector('.list-panel--negative'),
  positiveMeta: document.querySelector('#positiveMeta'),
  negativeMeta: document.querySelector('#negativeMeta'),
  positiveCount: document.querySelector('#positiveCount'),
  negativeCount: document.querySelector('#negativeCount'),
  totalCount: document.querySelector('#totalCount'),
  printPositiveCount: document.querySelector('#printPositiveCount'),
  printNegativeCount: document.querySelector('#printNegativeCount'),
  printTotalCount: document.querySelector('#printTotalCount'),
  tableViewButton: document.querySelector('#tableViewButton'),
  showBothToggle: document.querySelector('#showBothToggle'),
  exportButton: document.querySelector('#exportButton'),
  exportPdfButton: document.querySelector('#exportPdfButton'),
  exportPngButton: document.querySelector('#exportPngButton'),
  importButton: document.querySelector('#importButton'),
  importDialog: document.querySelector('#importDialog'),
  importJsonInput: document.querySelector('#importJsonInput'),
  clearButton: document.querySelector('#clearButton'),
  confirmDialog: document.querySelector('#confirmDialog'),
  deleteDialog: document.querySelector('#deleteDialog'),
  deletePreview: document.querySelector('#deletePreview'),
  editDialog: document.querySelector('#editDialog'),
  editTypeInputs: document.querySelectorAll('input[name="editType"]'),
  editBehaviorInput: document.querySelector('#editBehaviorInput'),
  editJudgmentInput: document.querySelector('#editJudgmentInput'),
  toastRegion: document.querySelector('#toastRegion'),
  template: document.querySelector('#entryTemplate'),
};

function loadState() {
  try {
    const rawState = localStorage.getItem(STORAGE_KEY);
    if (!rawState) return structuredClone(EMPTY_STATE);

    const parsedState = JSON.parse(rawState);
    return {
      positive: Array.isArray(parsedState.positive) ? parsedState.positive : [],
      negative: Array.isArray(parsedState.negative) ? parsedState.negative : [],
    };
  } catch (error) {
    console.warn('No se pudo cargar el estado guardado:', error);
    return structuredClone(EMPTY_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function addEntry(type, behavior, judgment) {
  if (!['positive', 'negative'].includes(type)) return;

  const entry = {
    id: crypto.randomUUID(),
    behavior: behavior.trim(),
    judgment: judgment.trim(),
    createdAt: new Date().toISOString(),
  };

  state[type].unshift(entry);
  saveState();
  render();
  showToast(type === 'positive' ? 'Comportamiento positivo añadido.' : 'Comportamiento negativo añadido.');
}

function deleteEntry(type, id) {
  if (!['positive', 'negative'].includes(type)) return;

  state[type] = state[type].filter((entry) => entry.id !== id);
  saveState();
  render();
  showToast('Registro eliminado.');
}

function updateEntry(currentType, id, nextType, behavior, judgment) {
  if (!['positive', 'negative'].includes(currentType) || !['positive', 'negative'].includes(nextType)) return false;

  const entryIndex = state[currentType].findIndex((entry) => entry.id === id);
  if (entryIndex === -1) return false;

  const updatedEntry = {
    ...state[currentType][entryIndex],
    behavior: behavior.trim(),
    judgment: judgment.trim(),
    updatedAt: new Date().toISOString(),
  };

  if (currentType === nextType) {
    state[currentType][entryIndex] = updatedEntry;
  } else {
    state[currentType].splice(entryIndex, 1);
    state[nextType].unshift(updatedEntry);
  }

  saveState();
  render();
  showToast('Registro actualizado.');
  return true;
}

function render() {
  renderList('positive', dom.positiveList, dom.positiveTable, dom.positivePanel, dom.positiveMeta);
  renderList('negative', dom.negativeList, dom.negativeTable, dom.negativePanel, dom.negativeMeta);
  renderStats();
}

function renderList(type, listElement, tableElement, panelElement, metaElement) {
  const entries = state[type];
  listElement.replaceChildren();
  tableElement.replaceChildren();
  panelElement.classList.toggle('is-empty', entries.length === 0);
  metaElement.textContent = formatCount(entries.length);

  const fragment = document.createDocumentFragment();

  entries.forEach((entry) => {
    const node = dom.template.content.firstElementChild.cloneNode(true);
    const date = new Date(entry.createdAt);
    const flipButton = node.querySelector('.entry-card__flip');
    const editButton = node.querySelector('.entry-card__edit');
    const deleteButton = node.querySelector('.entry-card__delete');
    const timeElement = node.querySelector('.entry-card__date');

    node.dataset.type = type;
    node.dataset.id = entry.id;
    node.classList.add(`entry-card--${type}`);
    node.querySelector('.entry-card__behavior').textContent = entry.behavior;
    node.querySelector('.entry-card__judgment').textContent = entry.judgment;
    timeElement.textContent = formatDate(date);
    timeElement.dateTime = entry.createdAt;
    flipButton.setAttribute('aria-label', `Ver juicio asociado a: ${entry.behavior.slice(0, 80)}`);
    flipButton.addEventListener('click', () => toggleCardFlip(node, flipButton));
    flipButton.addEventListener('keydown', (event) => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      toggleCardFlip(node, flipButton);
    });
    editButton.setAttribute('aria-label', `Editar registro: ${entry.behavior.slice(0, 60)}`);
    editButton.addEventListener('click', () => openEditDialog(type, entry));
    deleteButton.setAttribute('aria-label', `Eliminar registro: ${entry.behavior.slice(0, 60)}`);
    deleteButton.addEventListener('click', () => openDeleteConfirm(type, entry));

    fragment.append(node);
  });

  listElement.append(fragment);
  renderTable(type, entries, tableElement);
}

function renderTable(type, entries, tableElement) {
  if (entries.length === 0) return;

  const table = document.createElement('table');
  table.className = `entries-table entries-table--${type}`;
  table.innerHTML = `
    <thead>
      <tr>
        <th scope="col">Comportamiento</th>
        <th scope="col">Juicio</th>
        <th scope="col">Acción</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');

  entries.forEach((entry) => {
    const row = document.createElement('tr');
    const behaviorCell = document.createElement('td');
    const judgmentCell = document.createElement('td');
    const actionCell = document.createElement('td');
    const actionGroup = document.createElement('div');
    const editButton = document.createElement('button');
    const deleteButton = document.createElement('button');

    behaviorCell.textContent = entry.behavior;
    judgmentCell.textContent = entry.judgment;
    actionGroup.className = 'entries-table__actions';
    editButton.className = 'entries-table__edit';
    editButton.type = 'button';
    editButton.textContent = 'Editar';
    editButton.setAttribute('aria-label', `Editar registro: ${entry.behavior.slice(0, 60)}`);
    editButton.addEventListener('click', () => openEditDialog(type, entry));
    deleteButton.className = 'entries-table__delete';
    deleteButton.type = 'button';
    deleteButton.textContent = 'Eliminar';
    deleteButton.setAttribute('aria-label', `Eliminar registro: ${entry.behavior.slice(0, 60)}`);
    deleteButton.addEventListener('click', () => openDeleteConfirm(type, entry));

    actionGroup.append(editButton, deleteButton);
    actionCell.append(actionGroup);
    row.append(behaviorCell, judgmentCell, actionCell);
    tbody.append(row);
  });

  table.append(tbody);
  tableElement.append(table);
}

function toggleCardFlip(card, flipButton) {
  if (showBothSides) return;

  const isFlipped = card.classList.toggle('is-flipped');
  flipButton.setAttribute('aria-pressed', String(isFlipped));
}

function setShowBothSides(enabled) {
  showBothSides = enabled;
  document.body.classList.toggle('show-both-sides', showBothSides);
  document.querySelectorAll('.entry-card.is-flipped').forEach((card) => {
    card.classList.remove('is-flipped');
    card.querySelector('.entry-card__flip')?.setAttribute('aria-pressed', 'false');
  });
}

function setTableView(enabled) {
  tableView = enabled;
  document.body.classList.toggle('table-view', tableView);
  dom.tableViewButton.textContent = tableView ? 'Ver tarjetas' : 'Ver tabla';
  dom.tableViewButton.setAttribute('aria-pressed', String(tableView));
}

function openDeleteConfirm(type, entry) {
  pendingDelete = { type, id: entry.id };
  dom.deletePreview.textContent = entry.behavior;
  dom.deleteDialog.showModal();
}

function openEditDialog(type, entry) {
  pendingEdit = { type, id: entry.id };
  dom.editTypeInputs.forEach((input) => {
    input.checked = input.value === type;
  });
  dom.editBehaviorInput.value = entry.behavior;
  dom.editJudgmentInput.value = entry.judgment;
  dom.editDialog.showModal();
  dom.editBehaviorInput.focus();
}

function renderStats() {
  const positiveCount = state.positive.length;
  const negativeCount = state.negative.length;

  dom.positiveCount.textContent = positiveCount;
  dom.negativeCount.textContent = negativeCount;
  dom.totalCount.textContent = positiveCount + negativeCount;
  dom.printPositiveCount.textContent = positiveCount;
  dom.printNegativeCount.textContent = negativeCount;
  dom.printTotalCount.textContent = positiveCount + negativeCount;
}

function formatCount(count) {
  return count === 1 ? '1 registro' : `${count} registros`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function showToast(message) {
  const toast = document.createElement('p');
  toast.className = 'toast';
  toast.textContent = message;
  dom.toastRegion.append(toast);

  window.setTimeout(() => {
    toast.classList.add('is-leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 2600);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `registro-comportamientos-${new Date().toISOString().slice(0, 10)}.json`);
  showToast('JSON exportado.');
}

function exportPdf() {
  if (state.positive.length + state.negative.length === 0) {
    showToast('No hay registros para exportar en PDF.');
    return;
  }

  setTableView(true);
  document.body.classList.add('pdf-export-mode');
  window.print();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildPngExportSection(type, title, entries) {
  if (!entries.length) return '';

  const rows = entries
    .map(
      (entry) => `
        <tr>
          <td>${escapeHtml(entry.behavior)}</td>
          <td>${escapeHtml(entry.judgment)}</td>
        </tr>
      `,
    )
    .join('');

  return `
    <section class="png-export__section png-export__section--${type}">
      <div class="png-export__section-head">
        <h2>${escapeHtml(title)}</h2>
        <span>${entries.length} ${entries.length === 1 ? 'registro' : 'registros'}</span>
      </div>
      <table class="png-export__table png-export__table--${type}">
        <thead>
          <tr>
            <th scope="col">Comportamiento</th>
            <th scope="col">Juicio</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
}

function buildPngExportMarkup() {
  const totalCount = state.positive.length + state.negative.length;

  return `
    <div xmlns="http://www.w3.org/1999/xhtml" class="png-export-root">
      <style>
        .png-export-root {
          width: 1200px;
          padding: 40px;
          color: #191527;
          background: linear-gradient(180deg, #f7f3ff 0%, #eef6ff 100%);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .png-export__sheet {
          border: 1px solid rgba(76, 59, 120, 0.14);
          border-radius: 28px;
          padding: 32px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 24px 70px rgba(71, 47, 133, 0.14);
        }

        .png-export__eyebrow {
          display: inline-block;
          margin: 0 0 14px;
          padding: 8px 12px;
          border-radius: 999px;
          color: #5b21b6;
          background: rgba(124, 58, 237, 0.09);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .png-export__title {
          margin: 0;
          font-size: 42px;
          line-height: 1.02;
          letter-spacing: -0.06em;
        }

        .png-export__subtitle {
          margin: 14px 0 0;
          color: #6c647d;
          font-size: 17px;
          line-height: 1.55;
        }

        .png-export__meta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin: 24px 0 0;
        }

        .png-export__pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 42px;
          padding: 0 14px;
          border-radius: 999px;
          background: rgba(124, 58, 237, 0.08);
          color: #352c4b;
          font-size: 14px;
          font-weight: 700;
        }

        .png-export__pill strong {
          color: #191527;
          font-size: 16px;
        }

        .png-export__sections {
          display: grid;
          gap: 22px;
          margin-top: 28px;
        }

        .png-export__section {
          overflow: hidden;
          border: 1px solid rgba(76, 59, 120, 0.12);
          border-radius: 22px;
          background: #ffffff;
        }

        .png-export__section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 18px 20px;
          border-bottom: 1px solid rgba(76, 59, 120, 0.1);
        }

        .png-export__section-head h2 {
          margin: 0;
          font-size: 24px;
          line-height: 1.1;
          letter-spacing: -0.04em;
        }

        .png-export__section-head span {
          color: #6c647d;
          font-size: 14px;
          font-weight: 700;
        }

        .png-export__table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 15px;
        }

        .png-export__table th,
        .png-export__table td {
          padding: 14px 16px;
          border-bottom: 1px solid rgba(76, 59, 120, 0.08);
          text-align: left;
          vertical-align: top;
          word-break: break-word;
          white-space: pre-wrap;
        }

        .png-export__table th {
          color: #6c647d;
          background: #f8fafc;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .png-export__table td:first-child {
          width: 41%;
          color: #191527;
          font-weight: 800;
        }

        .png-export__table td:last-child {
          width: 59%;
          color: #352c4b;
          line-height: 1.5;
        }

        .png-export__table tbody tr:last-child td {
          border-bottom: 0;
        }

        .png-export__table--positive tbody tr:nth-child(odd) {
          background: rgba(16, 185, 129, 0.06);
        }

        .png-export__table--negative tbody tr:nth-child(odd) {
          background: rgba(244, 63, 94, 0.06);
        }
      </style>
      <div class="png-export__sheet">
        <p class="png-export__eyebrow">Psicología · Registro privado</p>
        <h1 class="png-export__title">Registro de comportamientos y juicios</h1>
        <p class="png-export__subtitle">Exportación visual en PNG generada desde la vista de tabla para compartirla o revisarla fuera de la app.</p>
        <div class="png-export__meta">
          <span class="png-export__pill">Positivos <strong>${state.positive.length}</strong></span>
          <span class="png-export__pill">Negativos <strong>${state.negative.length}</strong></span>
          <span class="png-export__pill">Total <strong>${totalCount}</strong></span>
          <span class="png-export__pill">Generado <strong>${escapeHtml(formatDate(new Date()))}</strong></span>
        </div>
        <div class="png-export__sections">
          ${buildPngExportSection('positive', 'Lista positiva', state.positive)}
          ${buildPngExportSection('negative', 'Lista negativa', state.negative)}
        </div>
      </div>
    </div>
  `;
}

async function createPngBlobFromMarkup(markup) {
  const measureHost = document.createElement('div');
  measureHost.style.cssText = 'position: fixed; left: -200vw; top: 0; visibility: hidden; pointer-events: none; z-index: -1;';
  measureHost.innerHTML = markup;
  document.body.append(measureHost);

  await new Promise((resolve) => window.requestAnimationFrame(resolve));

  const exportRoot = measureHost.firstElementChild;
  const width = Math.ceil(exportRoot.getBoundingClientRect().width);
  const height = Math.ceil(exportRoot.scrollHeight);
  const svgMarkup = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <foreignObject width="100%" height="100%">${exportRoot.outerHTML}</foreignObject>
    </svg>
  `;

  measureHost.remove();

  const image = await new Promise((resolve, reject) => {
    const preview = new Image();
    preview.onload = () => resolve(preview);
    preview.onerror = () => reject(new Error('No se pudo renderizar la tabla en imagen.'));
    preview.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
  });

  const scale = Math.max(1.5, Math.min(2, window.devicePixelRatio || 1));
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);

  const context = canvas.getContext('2d');
  context.scale(scale, scale);
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((pngBlob) => {
      if (pngBlob) {
        resolve(pngBlob);
        return;
      }
      reject(new Error('El navegador no pudo convertir la tabla a PNG.'));
    }, 'image/png');
  });

  return blob;
}

async function exportPng() {
  if (state.positive.length + state.negative.length === 0) {
    showToast('No hay registros para exportar en PNG.');
    return;
  }

  try {
    const blob = await createPngBlobFromMarkup(buildPngExportMarkup());
    downloadBlob(blob, `registro-comportamientos-${new Date().toISOString().slice(0, 10)}.png`);
    showToast('PNG exportado.');
  } catch (error) {
    console.error('No se pudo exportar el PNG:', error);
    showToast('No se pudo exportar el PNG.');
  }
}

function normalizeImportedEntries(entries) {
  if (!Array.isArray(entries)) return [];

  return entries
    .map((entry) => ({
      id: typeof entry?.id === 'string' && entry.id.trim() ? entry.id : crypto.randomUUID(),
      behavior: typeof entry?.behavior === 'string' ? entry.behavior.trim() : '',
      judgment: typeof entry?.judgment === 'string' ? entry.judgment.trim() : '',
      createdAt: Number.isNaN(Date.parse(entry?.createdAt)) ? new Date().toISOString() : entry.createdAt,
    }))
    .filter((entry) => entry.behavior && entry.judgment);
}

function importJson(rawJson) {
  let parsedState;

  try {
    parsedState = JSON.parse(rawJson);
  } catch (error) {
    showToast('El JSON pegado no es válido.');
    return false;
  }

  const importedState = {
    positive: normalizeImportedEntries(parsedState.positive),
    negative: normalizeImportedEntries(parsedState.negative),
  };
  const importedTotal = importedState.positive.length + importedState.negative.length;

  if (importedTotal === 0) {
    showToast('No se han encontrado registros válidos en ese JSON.');
    return false;
  }

  const existingIds = new Set([...state.positive, ...state.negative].map((entry) => entry.id));
  let addedCount = 0;

  ['positive', 'negative'].forEach((type) => {
    importedState[type].forEach((entry) => {
      if (existingIds.has(entry.id)) return;
      existingIds.add(entry.id);
      state[type].unshift(entry);
      addedCount += 1;
    });
  });

  saveState();
  render();
  showToast(addedCount === 1 ? '1 registro importado.' : `${addedCount} registros importados.`);
  return true;
}

function clearAllEntries() {
  state = structuredClone(EMPTY_STATE);
  saveState();
  render();
  showToast('Todos los registros han sido borrados.');
}

function handleSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);
  const type = String(formData.get('type') || 'positive');
  const behavior = String(formData.get('behavior') || '');
  const judgment = String(formData.get('judgment') || '');

  if (!behavior.trim() || !judgment.trim()) {
    showToast('Completa el comportamiento y el juicio asociado.');
    return;
  }

  addEntry(type, behavior, judgment);
  form.reset();
  updateEntryFormType('positive');
  form.querySelector('textarea')?.focus();
}

function updateEntryFormType(type) {
  const isPositive = type === 'positive';
  dom.entryPanel.classList.toggle('panel--positive-selected', isPositive);
  dom.entryPanel.classList.toggle('panel--negative-selected', !isPositive);
  dom.entryTypeBadge.className = `badge ${isPositive ? 'badge--positive' : 'badge--negative'}`;
  dom.entryTypeBadge.textContent = isPositive ? '+' : '−';
  dom.behaviorLabel.textContent = isPositive ? 'Comportamiento positivo' : 'Comportamiento negativo';
  dom.behaviorInput.placeholder = isPositive
    ? 'Ej. He respirado antes de contestar...'
    : 'Ej. He interrumpido antes de escuchar...';
  dom.judgmentInput.placeholder = isPositive
    ? 'Ej. Puedo regularme incluso cuando estoy tenso...'
    : 'Ej. Cuando me siento atacado, reacciono demasiado rápido...';
  dom.behaviorHelp.textContent = isPositive
    ? 'Describe una conducta concreta y observable.'
    : 'Registra el hecho sin convertirlo en una etiqueta personal.';
  dom.entrySubmitButton.className = `button ${isPositive ? 'button--positive' : 'button--negative'}`;
  dom.entrySubmitButton.textContent = isPositive ? 'Añadir positivo' : 'Añadir negativo';
}

function bindEvents() {
  dom.form.addEventListener('submit', handleSubmit);
  dom.typeInputs.forEach((input) => input.addEventListener('change', () => updateEntryFormType(input.value)));
  dom.tableViewButton.addEventListener('click', () => setTableView(!tableView));
  dom.showBothToggle.addEventListener('change', () => setShowBothSides(dom.showBothToggle.checked));
  dom.exportButton.addEventListener('click', exportJson);
  dom.exportPdfButton.addEventListener('click', exportPdf);
  dom.exportPngButton.addEventListener('click', exportPng);
  window.addEventListener('afterprint', () => document.body.classList.remove('pdf-export-mode'));
  dom.importButton.addEventListener('click', () => {
    dom.importJsonInput.value = '';
    dom.importDialog.showModal();
    dom.importJsonInput.focus();
  });
  dom.importDialog.addEventListener('close', () => {
    if (dom.importDialog.returnValue !== 'confirm') return;
    const imported = importJson(dom.importJsonInput.value.trim());
    if (!imported) dom.importDialog.showModal();
  });
  dom.clearButton.addEventListener('click', () => dom.confirmDialog.showModal());
  dom.confirmDialog.addEventListener('close', () => {
    if (dom.confirmDialog.returnValue === 'confirm') clearAllEntries();
  });
  dom.deleteDialog.addEventListener('close', () => {
    if (dom.deleteDialog.returnValue === 'confirm' && pendingDelete) {
      deleteEntry(pendingDelete.type, pendingDelete.id);
    }
    pendingDelete = null;
    dom.deletePreview.textContent = '';
  });
  dom.editDialog.addEventListener('close', () => {
    if (dom.editDialog.returnValue !== 'confirm') {
      pendingEdit = null;
      return;
    }

    const behavior = dom.editBehaviorInput.value.trim();
    const judgment = dom.editJudgmentInput.value.trim();
    const nextType = [...dom.editTypeInputs].find((input) => input.checked)?.value || pendingEdit?.type || 'positive';

    if (!behavior || !judgment) {
      showToast('Completa el comportamiento y el juicio asociado.');
      dom.editDialog.showModal();
      return;
    }

    if (pendingEdit) updateEntry(pendingEdit.type, pendingEdit.id, nextType, behavior, judgment);
    pendingEdit = null;
  });
}

bindEvents();
updateEntryFormType('positive');
render();
