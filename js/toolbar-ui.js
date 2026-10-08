// toolbar-ui.js
// Owns: popup menu open/close behavior and responsive toolbar collapse wiring
// Do NOT: put trainer, MIDI routing, or alphaTab business logic here

const PANEL_BY_BUTTON = {
  'btn-scores': 'scores-panel',
  'btn-practice': 'practice-popup',
  'btn-tempo': 'tempo-popup',
  'btn-looper': 'looper-popup',
  'btn-more': 'more-popup',
  'btn-options': 'options-overlay',
};

const TOOLBAR_BREAKPOINTS = {
  compact: 1100,
  collapseToMore: 1035,
  condensed: 945,
  stacked: 680,
};

function setPopupState(element, isOpen) {
  if (!element) return;
  element.classList.toggle('hidden', !isOpen);
  element.classList.toggle('is-open', isOpen);
  element.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
}

function applyToolbarResponsiveState(toolbar) {
  if (!toolbar) return;
  const width = Math.round(toolbar.getBoundingClientRect().width || window.innerWidth || 0);
  toolbar.classList.toggle('is-compact', width <= TOOLBAR_BREAKPOINTS.compact);
  toolbar.classList.toggle('is-collapse-to-more', width <= TOOLBAR_BREAKPOINTS.collapseToMore);
  toolbar.classList.toggle('is-condensed', width <= TOOLBAR_BREAKPOINTS.condensed);
  toolbar.classList.toggle('is-stacked', width <= TOOLBAR_BREAKPOINTS.stacked);
}

export function initToolbar({ onIntent } = {}) {
  void onIntent;

  const toolbar = document.getElementById('static-menu');
  const backdrop = document.getElementById('toolbar-backdrop');
  const buttonIds = Object.keys(PANEL_BY_BUTTON);
  const buttons = buttonIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const launchButtons = Array.from(document.querySelectorAll('[data-launch-panel]'));
  const panelIds = new Set([
    ...Object.values(PANEL_BY_BUTTON),
    ...launchButtons.map((button) => button.dataset.launchPanel),
  ]);
  const panels = Array.from(panelIds)
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  let activeButtonId = null;
  let activePanelId = null;

  function blurFocusedDescendant(root) {
    const active = document.activeElement;
    if (root && active instanceof HTMLElement && root.contains(active)) {
      active.blur();
    }
  }

  function closeAllPopups() {
    panels.forEach((panel) => {
      blurFocusedDescendant(panel);
      setPopupState(panel, false);
    });
    activeButtonId = null;
    activePanelId = null;
    buttons.forEach((button) => button.classList.remove('is-open'));
    if (backdrop) {
      backdrop.classList.add('hidden');
    }
  }

  function openPanelById(panelId, sourceButtonId = null) {
    const nextPanel = document.getElementById(panelId);
    if (!nextPanel) return;

    const isSamePanel = activePanelId === panelId;
    closeAllPopups();
    if (isSamePanel) return;

    activeButtonId = sourceButtonId;
    activePanelId = panelId;
    if (sourceButtonId) {
      document.getElementById(sourceButtonId)?.classList.add('is-open');
    }
    setPopupState(nextPanel, true);
    if (backdrop) {
      backdrop.classList.remove('hidden');
    }
  }

  function openPopup(buttonId) {
    const panelId = PANEL_BY_BUTTON[buttonId];
    if (!panelId) return;
    openPanelById(panelId, buttonId);
  }

  buttons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      openPopup(button.id);
    });
  });

  launchButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      button.blur();
      openPanelById(button.dataset.launchPanel, 'btn-more');
    });
  });

  panels.forEach((panel) => {
    panel.addEventListener('click', (event) => {
      event.stopPropagation();
    });
  });

  const updateToolbarLayout = () => applyToolbarResponsiveState(toolbar);
  updateToolbarLayout();
  window.addEventListener('resize', updateToolbarLayout);
  if (typeof ResizeObserver !== 'undefined' && toolbar) {
    const toolbarObserver = new ResizeObserver(updateToolbarLayout);
    toolbarObserver.observe(toolbar);
  }

  backdrop?.addEventListener('click', closeAllPopups);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAllPopups();
    }
  });
  document.addEventListener('click', closeAllPopups);
}
