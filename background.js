// background.js — Service worker (Manifest V3)
// Crea el menú contextual y reenvía las órdenes de traducción al content script.

const MENU_ID = "translate-selection";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: 'Traducir "%s" con Google Translate',
    contexts: ["selection"]
  });

  // Valores por defecto de configuración
  chrome.storage.sync.get(["targetLang", "showBubble"], (cfg) => {
    const defaults = {};
    if (!cfg.targetLang) defaults.targetLang = chrome.i18n?.getUILanguage?.().split("-")[0] || "es";
    if (cfg.showBubble === undefined) defaults.showBubble = true;
    if (Object.keys(defaults).length) chrome.storage.sync.set(defaults);
  });
});

function sendTranslateToTab(tabId, text) {
  if (!tabId || !text) return;
  chrome.tabs.sendMessage(tabId, { type: "TRANSLATE_TEXT", text });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID && tab?.id) {
    sendTranslateToTab(tab.id, info.selectionText);
  }
});

// Atajo de teclado (Alt+Shift+T por defecto)
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "translate-selection") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString() || ""
    });
    if (result) sendTranslateToTab(tab.id, result);
  } catch (e) {
    // Páginas internas de Chrome no permiten scripting; se ignora.
  }
});

// Permite que popup.js pida traducción directa a través del background
// (útil para mantener toda la lógica de red en un único lugar).
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "TRANSLATE_REQUEST") {
    translateText(msg.text, msg.targetLang)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // respuesta asíncrona
  }
});

async function translateText(text, targetLang) {
  const url =
    "https://translate.googleapis.com/translate_a/single" +
    "?client=gtx&sl=auto&tl=" + encodeURIComponent(targetLang) +
    "&dt=t&dt=bd&dj=1&q=" + encodeURIComponent(text);

  const res = await fetch(url);
  if (!res.ok) throw new Error("Error de red: " + res.status);
  const json = await res.json();

  const translated = (json.sentences || [])
    .map((s) => s.trans || "")
    .join("");
  const detectedLang = json.src || null;

  return { translated, detectedLang };
}
