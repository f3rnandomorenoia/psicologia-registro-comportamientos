'use strict';

const STORAGE_KEY = 'behavior-register-state-v1';
const EMPTY_STATE = { positive: [], negative: [] };

let state = loadState();

const dom = {
  forms: document.querySelectorAll('.entry-form'),
  positiveList: document.querySelector('#positiveList'),
  negativeList: document.querySelector('#negativeList'),
  positivePanel: document.querySelector('.list-panel--positive'),
  negativePanel: document.querySelector('.list-panel--negative'),
  positiveMeta: document.querySelector('#positiveMeta'),
  negativeMeta: document.querySelector('#negativeMeta'),
  positiveCount: document.querySelector('#positiveCount'),
  negativeCount: document.querySelector('#negativeCount'),
  totalCount: document.querySelector('#totalCount'),
  exportButton: document.querySelector('#exportButton'),
  importButton: document.querySelector('#importButton'),
  importDialog: document.querySelector('#importDialog'),
  importJsonInput: document.querySelector('#importJsonInput'),
  clearButton: document.querySelector('#clearButton'),
  confirmDialog: document.querySelector('#confirmDialog'),
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

function render() {
  renderList('positive', dom.positiveList, dom.positivePanel, dom.positiveMeta);
  renderList('negative', dom.negativeList, dom.negativePanel, dom.negativeMeta);
  renderStats();
}

function renderList(type, listElement, panelElement, metaElement) {
  const entries = state[type];
  listElement.replaceChildren();
  panelElement.classList.toggle('is-empty', entries.length === 0);
  metaElement.textContent = formatCount(entries.length);

  const fragment = document.createDocumentFragment();

  entries.forEach((entry) => {
    const node = dom.template.content.firstElementChild.cloneNode(true);
    const date = new Date(entry.createdAt);
    const deleteButton = node.querySelector('.entry-card__delete');
    const timeElement = node.querySelector('.entry-card__date');

    node.dataset.type = type;
    node.dataset.id = entry.id;
    node.classList.add(`entry-card--${type}`);
    node.querySelector('.entry-card__behavior').textContent = entry.behavior;
    node.querySelector('.entry-card__judgment').textContent = entry.judgment;
    timeElement.textContent = formatDate(date);
    timeElement.dateTime = entry.createdAt;
    deleteButton.setAttribute('aria-label', `Eliminar registro: ${entry.behavior.slice(0, 60)}`);
    deleteButton.addEventListener('click', () => deleteEntry(type, entry.id));

    fragment.append(node);
  });

  listElement.append(fragment);
}

function renderStats() {
  const positiveCount = state.positive.length;
  const negativeCount = state.negative.length;

  dom.positiveCount.textContent = positiveCount;
  dom.negativeCount.textContent = negativeCount;
  dom.totalCount.textContent = positiveCount + negativeCount;
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

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `registro-comportamientos-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast('JSON exportado.');
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
  const type = form.dataset.type;
  const behavior = String(formData.get('behavior') || '');
  const judgment = String(formData.get('judgment') || '');

  if (!behavior.trim() || !judgment.trim()) {
    showToast('Completa el comportamiento y el juicio asociado.');
    return;
  }

  addEntry(type, behavior, judgment);
  form.reset();
  form.querySelector('textarea')?.focus();
}

function bindEvents() {
  dom.forms.forEach((form) => form.addEventListener('submit', handleSubmit));
  dom.exportButton.addEventListener('click', exportJson);
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
}

bindEvents();
render();
