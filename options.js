// options.js — Lógica de la página de opciones.

const targetLangSelect = document.getElementById("targetLang");
const showBubbleCheckbox = document.getElementById("showBubble");
const saveBtn = document.getElementById("save");
const savedLabel = document.getElementById("saved");

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

(async () => {
  const cfg = await chrome.storage.sync.get(["targetLang", "showBubble"]);
  populateLangSelect(cfg.targetLang || "es");
  showBubbleCheckbox.checked = cfg.showBubble !== false;
})();

saveBtn.addEventListener("click", () => {
  chrome.storage.sync.set(
    {
      targetLang: targetLangSelect.value,
      showBubble: showBubbleCheckbox.checked
    },
    () => {
      savedLabel.hidden = false;
      setTimeout(() => (savedLabel.hidden = true), 1500);
    }
  );
});
