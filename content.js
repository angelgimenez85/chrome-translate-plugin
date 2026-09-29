// content.js — Se inyecta en todas las páginas.
// Muestra un icono flotante al seleccionar texto y una burbuja con la traducción.

(() => {
  const NS = "gt-selection-translate";
  let icon = null;
  let bubble = null;
  let lastSelectionText = "";
  let lastRange = null;
  let settings = { targetLang: "es", showBubble: true };

  chrome.storage.sync.get(["targetLang", "showBubble"], (cfg) => {
    if (cfg.targetLang) settings.targetLang = cfg.targetLang;
    if (cfg.showBubble !== undefined) settings.showBubble = cfg.showBubble;
  });
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.targetLang) settings.targetLang = changes.targetLang.newValue;
    if (changes.showBubble) settings.showBubble = changes.showBubble.newValue;
  });

  function removeIcon() {
    if (icon) {
      icon.remove();
      icon = null;
    }
  }

  function removeBubble() {
    if (bubble) {
      bubble.remove();
      bubble = null;
    }
  }

  function getSelectionRect() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) return null;
    lastRange = range;
    return rect;
  }

  function showIcon(rect) {
    removeIcon();
    icon = document.createElement("div");
    icon.className = `${NS}-icon`;
    icon.title = "Traducir con Google Translate";
    icon.textContent = "G";
    icon.style.top = `${window.scrollY + rect.bottom + 6}px`;
    icon.style.left = `${window.scrollX + rect.left}px`;

    icon.addEventListener("mousedown", (e) => {
      // Evita que el mousedown limpie la selección antes del click.
      e.preventDefault();
      e.stopPropagation();
    });

    icon.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (lastSelectionText) {
        doTranslate(lastSelectionText, rect);
      }
      removeIcon();
    });

    document.documentElement.appendChild(icon);
  }

  function showLoadingBubble(rect) {
    removeBubble();
    bubble = document.createElement("div");
    bubble.className = `${NS}-bubble`;
    bubble.innerHTML = `<div class="${NS}-loading">Traduciendo…</div>`;
    positionBubble(rect);
    document.documentElement.appendChild(bubble);
  }

  function positionBubble(rect) {
    if (!bubble) return;
    const top = window.scrollY + rect.bottom + 10;
    let left = window.scrollX + rect.left;
    bubble.style.top = `${top}px`;
    bubble.style.left = `${left}px`;

    // Reajusta si se sale de la ventana visible (tras insertarse en el DOM).
    requestAnimationFrame(() => {
      if (!bubble) return;
      const bRect = bubble.getBoundingClientRect();
      if (bRect.right > window.innerWidth) {
        bubble.style.left = `${window.scrollX + Math.max(8, window.innerWidth - bRect.width - 8)}px`;
      }
      if (bRect.bottom > window.innerHeight + window.scrollY) {
        bubble.style.top = `${window.scrollY + rect.top - bRect.height - 10}px`;
      }
    });
  }

  const LANG_NAMES = {
    es: "Español", en: "Inglés", fr: "Francés", de: "Alemán", it: "Italiano",
    pt: "Portugués", ru: "Ruso", ja: "Japonés", ko: "Coreano", zh: "Chino",
    "zh-CN": "Chino", ar: "Árabe", nl: "Neerlandés", pl: "Polaco", tr: "Turco",
    ca: "Catalán", gl: "Gallego", eu: "Euskera"
  };

  function langName(code) {
    if (!code) return "";
    return LANG_NAMES[code] || code.toUpperCase();
  }

  function renderResult(original, translated, detectedLang) {
    if (!bubble) return;
    const fromName = langName(detectedLang);
    const toName = langName(settings.targetLang);
    bubble.innerHTML = `
      <div class="${NS}-header">
        <span class="${NS}-langs">${fromName} → ${toName}</span>
        <button type="button" class="${NS}-close" aria-label="Cerrar">×</button>
      </div>
      <div class="${NS}-translated">${escapeHtml(translated)}</div>
      <div class="${NS}-original" title="${escapeHtml(original)}">${escapeHtml(truncate(original, 140))}</div>
      <div class="${NS}-actions">
        <button type="button" class="${NS}-copy">Copiar</button>
      </div>
    `;
    bubble.querySelector(`.${NS}-close`).addEventListener("click", removeBubble);
    bubble.querySelector(`.${NS}-copy`).addEventListener("click", (e) => {
      navigator.clipboard?.writeText(translated).then(() => {
        const btn = e.currentTarget;
        const prev = btn.textContent;
        btn.textContent = "¡Copiado!";
        setTimeout(() => (btn.textContent = prev), 1200);
      });
    });
  }

  function renderError(message) {
    if (!bubble) return;
    bubble.innerHTML = `
      <div class="${NS}-header">
        <span class="${NS}-langs">Error</span>
        <button type="button" class="${NS}-close" aria-label="Cerrar">×</button>
      </div>
      <div class="${NS}-error">${escapeHtml(message)}</div>
    `;
    bubble.querySelector(`.${NS}-close`).addEventListener("click", removeBubble);
  }

  function truncate(str, n) {
    return str.length > n ? str.slice(0, n - 1) + "…" : str;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function doTranslate(text, rect) {
    showLoadingBubble(rect);
    chrome.runtime.sendMessage(
      { type: "TRANSLATE_REQUEST", text, targetLang: settings.targetLang },
      (response) => {
        if (chrome.runtime.lastError) {
          renderError("No se pudo contactar con la extensión.");
          return;
        }
        if (!response?.ok) {
          renderError(response?.error || "Error desconocido al traducir.");
          return;
        }
        const { translated, detectedLang } = response.data;
        if (!translated) {
          renderError("No se obtuvo traducción.");
          return;
        }
        renderResult(text, translated, detectedLang);
      }
    );
  }

  // Traducción disparada desde el menú contextual o el atajo de teclado.
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "TRANSLATE_TEXT" && msg.text) {
      const rect = getSelectionRect() || { top: 100, bottom: 120, left: 100, right: 200 };
      doTranslate(msg.text, rect);
    }
  });

  // Icono flotante al seleccionar texto con el ratón.
  document.addEventListener("mouseup", (e) => {
    if (icon && icon.contains(e.target)) return;
    if (bubble && bubble.contains(e.target)) return;

    setTimeout(() => {
      const text = window.getSelection()?.toString().trim() || "";
      lastSelectionText = text;

      if (!settings.showBubble || !text || text.length < 1) {
        removeIcon();
        return;
      }
      const rect = getSelectionRect();
      if (rect) showIcon(rect);
    }, 0);
  });

  document.addEventListener("mousedown", (e) => {
    if (icon && icon.contains(e.target)) return;
    if (bubble && bubble.contains(e.target)) return;
    removeIcon();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      removeIcon();
      removeBubble();
    }
  });
})();
