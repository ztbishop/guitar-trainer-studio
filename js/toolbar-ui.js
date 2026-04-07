// toolbar-ui.js
// Owns: popup menu open/close behavior and toolbar wiring
// Do NOT: put trainer, MIDI routing, or alphaTab business logic here

const PANEL_BY_BUTTON = {
  'btn-scores': 'scores-panel',
  'btn-practice': 'practice-popup',
  'btn-tempo': 'tempo-popup',
  'btn-looper': 'looper-popup',
  'btn-more': 'more-popup',
  'btn-options': 'options-overlay',
};

function setPopupState(element, isOpen) {
  if (!element) return;
  element.classList.toggle('hidden', !isOpen);
  element.classList.toggle('is-open', isOpen);
  element.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
}

export function initToolbar({ onIntent } = {}) {
  void onIntent;

  const backdrop = document.getElementById('toolbar-backdrop');
  const buttonIds = Object.keys(PANEL_BY_BUTTON);
  const buttons = buttonIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const panels = buttonIds
    .map((id) => document.getElementById(PANEL_BY_BUTTON[id]))
    .filter(Boolean);

  let activeButtonId = null;

  function closeAllPopups() {
    activeButtonId = null;
    buttons.forEach((button) => button.classList.remove('is-open'));
    panels.forEach((panel) => setPopupState(panel, false));
    if (backdrop) {
      backdrop.classList.add('hidden');
    }
  }

  function openPopup(buttonId) {
    const panelId = PANEL_BY_BUTTON[buttonId];
    const nextPanel = document.getElementById(panelId);
    if (!nextPanel) return;

    const isSamePanel = activeButtonId === buttonId;
    closeAllPopups();
    if (isSamePanel) return;

    activeButtonId = buttonId;
    document.getElementById(buttonId)?.classList.add('is-open');
    setPopupState(nextPanel, true);
    if (backdrop) {
      backdrop.classList.remove('hidden');
    }
  }

  buttons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      openPopup(button.id);
    });
  });

  panels.forEach((panel) => {
    panel.addEventListener('click', (event) => {
      event.stopPropagation();
    });
  });

  backdrop?.addEventListener('click', closeAllPopups);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAllPopups();
    }
  });
  document.addEventListener('click', closeAllPopups);
}
