const API_URL = '/api';

const form = document.getElementById('log-form');
const input = document.getElementById('log-input');
const priorityInput = document.getElementById('priority-input');
const filterInput = document.getElementById('filter-input');
const list = document.getElementById('log-list');
const emptyState = document.getElementById('empty-state');

let entries = [];
let editingId = null;

async function fetchLogs() {
  const res = await fetch(`${API_URL}/logs`);
  entries = await res.json();
  render();
}

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString('es-EC', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

function render() {
  const query = filterInput.value.trim().toLowerCase();
  const filtered = entries.filter(e => e.content.toLowerCase().includes(query));

  list.innerHTML = '';
  emptyState.hidden = filtered.length > 0;

  filtered.forEach(entry => {
    const li = document.createElement('li');
    li.className = `log-entry${entry.resolved ? ' resolved' : ''}`;
    li.dataset.priority = entry.priority;

    if (entry.id === editingId) {
      li.innerHTML = `
        <span class="entry-time">${formatTime(entry.logged_at)}</span>
        <span class="entry-status ${entry.resolved ? 'done' : 'pending'}">${entry.resolved ? '[OK]' : '[...]'}</span>
        <input type="text" class="entry-content edit-content-input" value="${escapeHtml(entry.content)}">
        <select class="edit-priority-select">
          <option value="normal">normal</option>
          <option value="alta">alta</option>
          <option value="crítica">crítica</option>
        </select>
        <span class="entry-actions">
          <button class="save-btn">guardar</button>
          <button class="cancel-btn">cancelar</button>
        </span>
      `;

      const contentInput = li.querySelector('.edit-content-input');
      const prioritySelect = li.querySelector('.edit-priority-select');
      prioritySelect.value = entry.priority;
      applyInlineFieldStyle(contentInput);
      applyInlineFieldStyle(prioritySelect);

      const commit = () => saveEdit(entry, contentInput.value, prioritySelect.value);

      li.querySelector('.save-btn').addEventListener('click', commit);
      li.querySelector('.cancel-btn').addEventListener('click', cancelEdit);
      contentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') cancelEdit();
      });

      list.appendChild(li);
      contentInput.focus();
      contentInput.setSelectionRange(contentInput.value.length, contentInput.value.length);
      return;
    }

    li.innerHTML = `
      <span class="entry-time">${formatTime(entry.logged_at)}</span>
      <span class="entry-status ${entry.resolved ? 'done' : 'pending'}">${entry.resolved ? '[OK]' : '[...]'}</span>
      <span class="entry-content">${escapeHtml(entry.content)}</span>
      <span class="entry-actions">
        <button class="edit-btn">editar</button>
        <button class="toggle-btn">${entry.resolved ? 'reabrir' : 'resolver'}</button>
        <button class="del-btn">borrar</button>
      </span>
    `;

    li.querySelector('.edit-btn').addEventListener('click', () => startEdit(entry.id));
    li.querySelector('.toggle-btn').addEventListener('click', () => toggleResolved(entry));
    li.querySelector('.del-btn').addEventListener('click', () => deleteEntry(entry.id));

    list.appendChild(li);
  });
}

// Aplica los mismos tokens visuales ya definidos en styles.css (colores, fuente)
// directamente al campo de edición, para que no rompa el diseño existente
// sin necesidad de agregar ninguna regla nueva a la hoja de estilos.
function applyInlineFieldStyle(field) {
  field.style.background = 'transparent';
  field.style.border = 'none';
  field.style.outline = 'none';
  field.style.color = 'var(--text)';
  field.style.fontFamily = 'var(--mono)';
  field.style.fontSize = '13px';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function addEntry(content, priority) {
  await fetch(`${API_URL}/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, priority })
  });
  await fetchLogs();
}

function startEdit(id) {
  editingId = id;
  render();
}

function cancelEdit() {
  editingId = null;
  render();
}

async function saveEdit(entry, newContent, newPriority) {
  const content = newContent.trim();
  if (!content) return;

  await fetch(`${API_URL}/logs/${entry.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      priority: newPriority,
      resolved: entry.resolved
    })
  });

  editingId = null;
  await fetchLogs();
}

async function toggleResolved(entry) {
  await fetch(`${API_URL}/logs/${entry.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: entry.content,
      priority: entry.priority,
      resolved: !entry.resolved
    })
  });
  await fetchLogs();
}

async function deleteEntry(id) {
  await fetch(`${API_URL}/logs/${id}`, { method: 'DELETE' });
  await fetchLogs();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const content = input.value.trim();
  if (!content) return;
  addEntry(content, priorityInput.value);
  input.value = '';
});

filterInput.addEventListener('input', render);

fetchLogs();
