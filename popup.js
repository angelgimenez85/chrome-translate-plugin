// popup.js — Lógica del popup de la extensión.

const targetLangSelect = document.getElementById("targetLang");
const inputText = document.getElementById("inputText");
const btnTranslate = document.getElementById("btnTranslate");
const btnTranslateSelection = document.getElementById("btnTranslateSelection");
const btnCopy = document.getElementById("btnCopy");
const resultBox = document.getElementById("result");
const resultLangs = document.getElementById("resultLangs");
const resultText = document.getElementById("resultText");
const statusBox = document.getElementById("status");
const openOptions = document.getElementById("openOptions");

const LANG_NAMES = Object.fromEntries(LANGUAGES);

function populateLangSelect(selected) {
  targetLangSelect.innerHTML = "";
  for (const [code, name] of LANGUAGES) {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = name;
    if (code === selected) opt.selected = true;
    targetLangSelect.appendChild(opt);
  }
}

function setStatus(message, isError = false) {
  if (!message) {
    statusBox.hidden = true;
    return;
  }
  statusBox.hidden = false;
  statusBox.textContent = message;
  statusBox.classList.toggle("error", isError);
}

function showResult(translated, detectedLang, targetLang) {
  resultBox.hidden = false;
  resultLangs.textContent =
    `${LANG_NAMES[detectedLang] || (detectedLang || "auto").toUpperCase()} → ${LANG_NAMES[targetLang] || targetLang}`;
  resultText.textContent = translated;
}

function translate(text) {
  const targetLang = targetLangSelect.value;
  if (!text || !text.trim()) {
    setStatus("Escribe o selecciona algún texto primero.", true);
    return;
  }
  setStatus("Traduciendo…");
  resultBox.hidden = true;

  chrome.runtime.sendMessage(
    { type: "TRANSLATE_REQUEST", text, targetLang },
    (response) => {
      if (chrome.runtime.lastError) {
        setStatus("No se pudo contactar con la extensión.", true);
        return;
      }
      if (!response?.ok) {
        setStatus(response?.error || "Error al traducir.", true);
        return;
      }
      const { translated, detectedLang } = response.data;
      if (!translated) {
        setStatus("No se obtuvo traducción.", true);
        return;
      }
      setStatus("");
      showResult(translated, detectedLang, targetLang);
    }
  );
}

async function getSelectionFromActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return "";
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString() || ""
    });
    return result || "";
  } catch (e) {
    return "";
  }
}

btnTranslate.addEventListener("click", () => translate(inputText.value));

btnTranslateSelection.addEventListener("click", async () => {
  setStatus("Buscando selección en la página…");
  const text = await getSelectionFromActiveTab();
  if (!text) {
    setStatus("No hay texto seleccionado en la página activa.", true);
    return;
  }
  inputText.value = text;
  translate(text);
});

btnCopy.addEventListener("click", () => {
  navigator.clipboard?.writeText(resultText.textContent || "").then(() => {
    const prev = btnCopy.textContent;
    btnCopy.textContent = "¡Copiado!";
    setTimeout(() => (btnCopy.textContent = prev), 1200);
  });
});

targetLangSelect.addEventListener("change", () => {
  chrome.storage.sync.set({ targetLang: targetLangSelect.value });
});

openOptions.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// Inicialización: cargar idioma preferido y, si ya hay texto seleccionado, precargarlo.
(async () => {
  const cfg = await chrome.storage.sync.get(["targetLang"]);
  populateLangSelect(cfg.targetLang || "es");

  const selection = await getSelectionFromActiveTab();
  if (selection) {
    inputText.value = selection;
  }
})();
