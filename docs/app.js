'use strict';
const byId = id => document.getElementById(id);
const form = byId('proposal');
const titleInput = byId('title-input');
const originalCriteria = byId('criteria').cloneNode(true);
let checked = false;

function syncScope() {
  const foreign = byId('scope').value === 'foreign';
  byId('foreign-note').hidden = !foreign;
  byId('foreign-confirm').hidden = !foreign;
}

function clearFeedback() {
  if (!checked) return;
  checked = false;
  byId('revision').hidden = true;
  byId('criteria').replaceChildren(...originalCriteria.cloneNode(true).children);
  byId('status').textContent = 'Du hast den Entwurf geändert. Prüfe ihn erneut.';
}

function renderCheck() {
  const data = Object.fromEntries(new FormData(form));
  for (const key of Object.keys(data)) data[key] = data[key].trim();
  const { result, hints } = checkProposal(data);
  checked = true;
  byId('revision').hidden = hints.length === 0;
  byId('rewrite').replaceChildren(...hints.map(hint => {
    const item = document.createElement('li');
    item.textContent = hint;
    return item;
  }));
  const list = byId('criteria');
  list.replaceChildren();
  for (const row of result) {
    const item = document.createElement('li');
    const status = document.createElement('span');
    status.className = 'state';
    status.dataset.tone = row.tone;
    status.textContent = row.label;
    const heading = document.createElement('strong');
    heading.textContent = row.name;
    const feedback = document.createElement('p');
    feedback.textContent = row.feedback;
    const next = document.createElement('p');
    const action = document.createElement('b');
    action.textContent = 'Nächster Schritt: ';
    next.append(action, row.next);
    item.append(status, heading, feedback, next);
    list.append(item);
  }
  byId('status').textContent = result.some(row => row.tone === 'bad')
    ? 'Überarbeite zuerst die markierten Punkte.'
    : result.some(row => row.tone === 'warn')
      ? 'Einige Punkte brauchen noch deine Abklärung.'
      : 'Für alle vier Regeln liegen Anhaltspunkte vor. Prüfe die offenen Details anhand deiner Quellen.';
}

form.addEventListener('input', () => {
  titleInput.setCustomValidity('');
  syncScope();
  clearFeedback();
  byId('copy-fallback').hidden = true;
  byId('copy-status').textContent = '';
});
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!titleInput.value.trim()) {
    titleInput.setCustomValidity('Gib zuerst eine Fragestellung ein.');
    titleInput.reportValidity();
    return;
  }
  renderCheck();
  byId('feedback-title').focus();
});
byId('example').addEventListener('click', () => {
  if ([...form.querySelectorAll('input:not([type=checkbox]), textarea')].some(field => field.value.trim()) &&
      !window.confirm('Den aktuellen Entwurf durch ein Beispiel ersetzen?')) return;
  form.reset();
  titleInput.setCustomValidity('');
  titleInput.value = 'Soll die fiktive Schweizer Gemeinde Lindenau an ihren Primarschulen täglich ein kostenloses Mittagessen anbieten?';
  byId('body').value = 'Fiktives Beispiel: Heute bezahlen die Eltern das Mittagessen. Zu recherchieren wäre, wie die Gemeinde das Angebot finanzieren könnte und wer über das Budget entscheidet.';
  byId('baseline').value = 'Die Eltern bezahlen das Mittagessen.';
  byId('yes-outcome').value = 'different';
  byId('no-outcome').value = 'same';
  byId('yes-detail').value = 'Die Gemeinde bietet das Mittagessen kostenlos an.';
  byId('route').value = 'Petition an den Gemeinderat; Budgetzuständigkeit gemäss Gemeindeordnung klären.';
  byId('pro').value = 'Ein kostenloses Mittagessen entlastet Familien finanziell.';
  byId('contra').value = 'Das Angebot bindet Mittel, die der Gemeinde dann für andere Aufgaben fehlen.';
  byId('rights').value = 'yes';
  syncScope();
  byId('context').open = true;
  byId('copy-status').textContent = '';
  byId('copy-fallback').hidden = true;
  renderCheck();
  titleInput.focus();
});

async function copy(fieldId, label) {
  const value = byId(fieldId).value.trim();
  const status = byId('copy-status');
  const fallback = byId('copy-fallback');
  fallback.hidden = true;
  if (!value) {
    status.textContent = label + ': Es gibt noch keinen Text zum Kopieren.';
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
    status.textContent = label + ' kopiert.';
  } catch {
    fallback.value = value;
    fallback.hidden = false;
    fallback.focus();
    fallback.select();
    status.textContent = 'Der Text ist markiert. Kopiere ihn mit Ctrl+C oder ⌘C.';
  }
}
byId('copy-title').addEventListener('click', () => copy('title-input', 'Thementitel'));
byId('copy-body').addEventListener('click', () => copy('body', 'Beitrag'));
syncScope();
