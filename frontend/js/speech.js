const SPEED_KEY = 'reviva_speech_rate';
const MODE_KEY = 'reviva_reading_mode';
const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let utterances = [];
let currentIndex = 0;
let active = false;
let paused = false;
let runId = 0;
let voices = [];
let readingMode = localStorage.getItem(MODE_KEY) === 'true' && supported;
let lastTarget = null;

const widget = document.createElement('section');
widget.className = 'speech-widget';
widget.setAttribute('aria-label', 'Acessibilidade por áudio');

const toggle = document.createElement('button');
toggle.type = 'button';
toggle.className = 'speech-toggle';
toggle.setAttribute('aria-expanded', 'false');
toggle.setAttribute('aria-controls', 'speechPanel');
toggle.setAttribute('aria-label', 'Abrir controles de leitura em áudio');
toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16 9a5 5 0 0 1 0 6M18.5 6.5a9 9 0 0 1 0 11"/></svg><span>Ouvir</span>';

const panel = document.createElement('div');
panel.className = 'speech-panel';
panel.id = 'speechPanel';
panel.hidden = true;
panel.setAttribute('aria-labelledby', 'speechTitle');
panel.innerHTML = '<div class="speech-panel-heading"><h2 id="speechTitle">Leitura da página</h2><button type="button" class="speech-close" aria-label="Fechar controles de áudio">Fechar</button></div><p class="speech-help">A leitura usa uma voz disponível neste dispositivo e não envia conteúdo para serviços externos.</p><button type="button" class="speech-action speech-mode" data-speech-mode aria-pressed="false">Ativar modo de leitura</button><label class="speech-rate-label" for="speechRate">Velocidade da fala</label><select id="speechRate"><option value="0.75">Mais lenta · 0,75×</option><option value="1">Normal · 1×</option><option value="1.25">Mais rápida · 1,25×</option><option value="1.5">Rápida · 1,5×</option></select><div class="speech-actions"><button type="button" class="speech-action speech-start">Ouvir página</button><button type="button" class="speech-action" data-speech-pause>Pausar</button><button type="button" class="speech-action" data-speech-resume>Continuar</button><button type="button" class="speech-action" data-speech-stop>Parar</button></div><p class="speech-status" role="status" aria-live="polite" aria-atomic="true"></p>';
widget.append(toggle, panel);
document.body.append(widget);

const status = panel.querySelector('.speech-status');
const startButton = panel.querySelector('.speech-start');
const pauseButton = panel.querySelector('[data-speech-pause]');
const resumeButton = panel.querySelector('[data-speech-resume]');
const stopButton = panel.querySelector('[data-speech-stop]');
const rate = panel.querySelector('#speechRate');
const closeButton = panel.querySelector('.speech-close');
const modeButton = panel.querySelector('[data-speech-mode]');

function syncControls() {
  startButton.disabled = !supported;
  document.querySelectorAll('[data-speech-mode]').forEach((button) => {
    button.disabled = !supported;
    button.setAttribute('aria-pressed', String(readingMode));
    button.textContent = readingMode ? 'Desativar modo de leitura' : 'Ativar modo de leitura';
  });
  pauseButton.disabled = !supported || !active || paused;
  resumeButton.disabled = !supported || !active || !paused;
  stopButton.disabled = !supported || !active;
}

function openPanel(open) {
  panel.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Fechar controles de leitura em áudio' : 'Abrir controles de leitura em áudio');
  if (open) closeButton.focus();
  else toggle.focus();
}

function dismissPanel() {
  panel.hidden = true;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Abrir controles de leitura em áudio');
}

function pageText() {
  const main = document.querySelector('main');
  if (!main) return '';
  const copy = main.cloneNode(true);
  copy.querySelectorAll('label').forEach((label) => {
    if (label.querySelector('input[type="password"]')) label.remove();
  });
  copy.querySelectorAll('canvas[aria-label]').forEach((canvas) => {
    canvas.replaceWith(document.createTextNode(canvas.getAttribute('aria-label')));
  });
  copy.querySelectorAll('script,style,svg,nav,button,input,select,textarea,option,[hidden],[aria-hidden="true"],[data-speech-ignore],dialog,.speech-widget,.skip-link').forEach((node) => node.remove());
  const blockTags = new Set(['H1', 'H2', 'H3', 'H4', 'P', 'LI', 'TR', 'TH', 'TD', 'LABEL', 'DT', 'DD', 'LEGEND']);
  const collect = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
    const content = [...node.childNodes].map(collect).filter(Boolean).join(' ');
    return blockTags.has(node.tagName) ? `${content}. ` : content;
  };
  return collect(copy).replace(/\s+/g, ' ').replace(/\s+([.,;!?])/g, '$1').trim();
}

function visibleText(node) {
  const copy = node.cloneNode(true);
  copy.querySelectorAll('button,input,select,textarea,svg,[hidden],[aria-hidden="true"],[data-speech-ignore],.speech-widget').forEach((child) => child.remove());
  return (copy.innerText || copy.textContent || '').replace(/\s+/g, ' ').trim();
}

function elementDescription(node) {
  if (!node || node.closest('.speech-widget,[data-speech-ignore]') || node.matches('input[type="password"]')) return '';
  const labelledBy = node.getAttribute('aria-labelledby')?.split(/\s+/).map((id) => document.getElementById(id)?.textContent?.trim()).filter(Boolean).join(' ');
  const explicit = node.getAttribute('aria-label') || labelledBy;
  const tag = node.tagName.toLowerCase();
  const label = explicit || (node.labels ? [...node.labels].map((item) => item.textContent.trim()).join(' ') : '') || visibleText(node);
  if (!label) return '';

  let kind = 'Conteúdo';
  if (tag === 'button' || node.getAttribute('role') === 'button') kind = 'Botão';
  else if (tag === 'a') kind = 'Link';
  else if (['input', 'select', 'textarea'].includes(tag)) kind = 'Campo';
  else if (/^h[1-6]$/.test(tag)) kind = 'Título';
  else if (node.matches('.surface-card,.metric-card,.collection-card,.achievement-card,.journey-card,.admin-request')) kind = 'Cartão';

  let description = `${kind}: ${label}`;
  if (tag === 'a') {
    try {
      const destination = new URL(node.href, location.href);
      if (destination.origin === location.origin && destination.pathname.endsWith('.html')) {
        const page = destination.pathname.split('/').pop().replace(/\.html$/, '').replace(/[-_]/g, ' ');
        description += `. Destino: ${page}`;
      } else if (destination.origin !== location.origin) description += '. Link para outro site';
    } catch { /* Mantém o nome acessível do link sem tentar anunciar uma URL inválida. */ }
  }
  const describedBy = node.getAttribute('aria-describedby')?.split(/\s+/).map((id) => document.getElementById(id)?.textContent?.trim()).filter(Boolean).join(' ');
  if (describedBy) description += `. ${describedBy}`;
  if (node.required) description += '. Obrigatório';
  return description.slice(0, 480);
}

function identifiedTarget(origin) {
  if (!(origin instanceof Element)) return null;
  if (origin.closest('.speech-widget,[data-speech-ignore],[hidden],nav,header,footer,dialog')) return null;
  const candidate = origin.closest('button,a,input:not([type="password"]),select,textarea,[role="button"],[tabindex],.surface-card,.metric-card,.collection-card,.achievement-card,.journey-card,.admin-request,h1,h2,h3,h4,h5,h6,p,li,th,td,dt,dd');
  if (!candidate || candidate.closest('[data-speech-ignore]')) return null;
  return candidate;
}

function readElement(node) {
  if (!readingMode || !supported) return;
  if (node === lastTarget && (window.speechSynthesis.speaking || window.speechSynthesis.pending || window.speechSynthesis.paused)) return;
  const text = elementDescription(node);
  if (!text) return;
  lastTarget = node;
  speakText(text, 'Lendo elemento em português.');
}

function makeChunks(text) {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const chunks = [];
  let current = '';
  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/);
    for (const word of words) {
      if (current && `${current} ${word}`.length > 220) {
        chunks.push(current);
        current = word;
      } else current = current ? `${current} ${word}` : word;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function chooseVoice() {
  voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => /^pt-BR$/i.test(voice.lang))
    || voices.find((voice) => /^pt(?:-|$)/i.test(voice.lang))
    || voices.find((voice) => voice.default)
    || null;
}

function speakNext(id) {
  if (id !== runId || !active || paused) return;
  if (currentIndex >= utterances.length) {
    active = false;
    status.textContent = 'Leitura concluída.';
    syncControls();
    return;
  }
  const utterance = new window.SpeechSynthesisUtterance(utterances[currentIndex]);
  utterance.lang = 'pt-BR';
  utterance.rate = Number(rate.value);
  const voice = chooseVoice();
  if (voice) utterance.voice = voice;
  utterance.onend = () => {
    if (id !== runId) return;
    currentIndex += 1;
    speakNext(id);
  };
  utterance.onerror = (event) => {
    if (id !== runId || event.error === 'canceled' || event.error === 'interrupted') return;
    active = false;
    paused = false;
    status.textContent = 'O navegador não conseguiu reproduzir a leitura. Tente novamente.';
    syncControls();
  };
  window.speechSynthesis.speak(utterance);
}

function speakText(text, message) {
  if (!supported) return;
  if (!text) {
    status.textContent = 'Não encontrei conteúdo disponível para leitura nesta página.';
    return;
  }
  runId += 1;
  window.speechSynthesis.cancel();
  utterances = makeChunks(text);
  currentIndex = 0;
  active = true;
  paused = false;
  status.textContent = message;
  syncControls();
  speakNext(runId);
}

function startReading() {
  speakText(pageText(), 'Lendo o conteúdo principal em português.');
}

function stopReading(message = 'Leitura interrompida.') {
  if (supported) window.speechSynthesis.cancel();
  runId += 1;
  active = false;
  paused = false;
  lastTarget = null;
  status.textContent = message;
  syncControls();
}

function toggleReadingMode() {
  if (!supported) return;
  readingMode = !readingMode;
  localStorage.setItem(MODE_KEY, String(readingMode));
  lastTarget = null;
  if (readingMode) status.textContent = 'Modo ativo. Aponte, toque ou navegue com o foco até um elemento para ouvi-lo.';
  else stopReading('Modo de leitura desativado.');
  syncControls();
}

toggle.addEventListener('click', () => openPanel(panel.hidden));
closeButton.addEventListener('click', () => openPanel(false));
startButton.addEventListener('click', startReading);
modeButton.addEventListener('click', toggleReadingMode);
pauseButton.addEventListener('click', () => {
  if (!active || paused) return;
  window.speechSynthesis.pause();
  paused = true;
  status.textContent = 'Leitura pausada.';
  syncControls();
});
resumeButton.addEventListener('click', () => {
  if (!active || !paused) return;
  window.speechSynthesis.resume();
  paused = false;
  status.textContent = 'Leitura retomada.';
  syncControls();
});
stopButton.addEventListener('click', () => stopReading());
rate.value = ['0.75', '1', '1.25', '1.5'].includes(localStorage.getItem(SPEED_KEY)) ? localStorage.getItem(SPEED_KEY) : '1';
rate.addEventListener('change', () => localStorage.setItem(SPEED_KEY, rate.value));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !panel.hidden) openPanel(false);
});
document.addEventListener('pointerover', (event) => {
  if (!readingMode || (event.pointerType !== 'mouse' && event.pointerType !== 'touch')) return;
  const target = identifiedTarget(event.target);
  if (target && target !== identifiedTarget(event.relatedTarget)) readElement(target);
});
document.addEventListener('focusin', (event) => {
  if (!readingMode) return;
  const target = identifiedTarget(event.target);
  if (target) readElement(target);
});
if (!('PointerEvent' in window)) {
  document.addEventListener('touchstart', (event) => {
    if (!readingMode) return;
    const target = identifiedTarget(event.target);
    if (target) readElement(target);
  }, { passive: true });
}
document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  if (event.target.closest('[data-open-speech]')) openPanel(true);
  else if (event.target.closest('[data-speech-mode]') && !modeButton.contains(event.target)) toggleReadingMode();
  else if (!panel.hidden && !widget.contains(event.target)) dismissPanel();
});
window.addEventListener('pagehide', () => stopReading('Leitura interrompida ao sair da página.'));
window.speechSynthesis?.addEventListener?.('voiceschanged', () => { voices = window.speechSynthesis.getVoices(); });

if (supported) {
  status.textContent = 'Escolha “Ouvir página” ou ative o modo para ouvir elementos ao apontar ou navegar.';
} else {
  status.textContent = 'Este navegador ou dispositivo não oferece suporte à leitura por voz.';
  rate.disabled = true;
}
syncControls();
