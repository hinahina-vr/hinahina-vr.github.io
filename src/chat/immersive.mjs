import { SOUL_THEMES } from './themes.mjs';
const VISUAL_KEY = 'waddy-chat-visual-v1';
const PALETTE = [[.87, .62, .76], [.62, .75, .98], [.78, .67, .96], [.72, .88, .84], [.95, .8, .59], [.75, .79, .97]];

export function createChatView() {
  const $ = id => document.getElementById(id);
  const drawer = $('chat-drawer');
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)');
  let storage;
  let stored = {};
  try { storage = localStorage; stored = JSON.parse(storage.getItem(VISUAL_KEY) || '{}') || {}; } catch { /* Visual preferences are optional. */ }
  let immersive = false;
  let reduced = typeof stored.reduced === 'boolean' ? stored.reduced : prefersReduced.matches;
  let intensity = Number.isFinite(stored.intensity) ? Math.max(20, Math.min(100, stored.intensity)) : 65;
  let theme = SOUL_THEMES.some(t => t.id === stored.theme) ? stored.theme : 'sakura';
  let renderer = null;
  let rendererLoading = false;
  let tint = PALETTE[0];
  let personaTint = PALETTE[0];
  let state = { busy: false, connected: false, typing: false };
  let replying = false;
  let moved = [];
  let noticeTimer;
  let drawerKind;
  let returnFocus;
  let focusComposerAfterClose = false;

  function persist() {
    try { storage?.setItem(VISUAL_KEY, JSON.stringify({ mode: immersive ? 'immersive' : 'classic', reduced, intensity, theme })); } catch { /* Keep using the in-memory choice. */ }
  }
  function applyTheme() {
    const index = SOUL_THEMES.findIndex(t => t.id === theme), item = SOUL_THEMES[index];
    tint = theme === 'night' ? personaTint : item.tint.map((v, i) => v * .93 + personaTint[i] * .07);
    document.body.dataset.soulTheme = theme;
    document.documentElement.style.setProperty('--soul-color', tint.map(v => Math.round(v * 255)).join(' '));
    renderer?.setTheme(index); renderer?.setTint(tint);
    $('wardrobe-status').textContent = `${item.name}を着ているよ。`;
    for (const radio of document.querySelectorAll('input[name=soul-theme]')) radio.checked = radio.value === theme;
  }
  for (const item of SOUL_THEMES) {
    const label = document.createElement('label'); label.className = 'wardrobe-option'; label.dataset.theme = item.id;
    const input = document.createElement('input'); input.type = 'radio'; input.name = 'soul-theme'; input.value = item.id;
    const preview = document.createElement('span'); preview.className = 'wardrobe-preview'; preview.setAttribute('aria-hidden', 'true');
    const mini = document.createElement('span'); mini.className = 'mini-soul'; mini.textContent = item.id === 'night' ? '✧' : '· ᴗ ·';
    const mark = document.createElement('span'); mark.className = 'wardrobe-symbol'; mark.textContent = item.symbol; preview.append(mini, mark);
    const name = document.createElement('strong'); name.textContent = item.name;
    const description = document.createElement('small'); description.textContent = item.description;
    label.append(input, preview, name, description); $('wardrobe-choices').append(label);
    input.addEventListener('change', () => { if (input.checked) { theme = item.id; applyTheme(); persist(); } });
  }
  function notice(message) {
    clearTimeout(noticeTimer); $('view-status').textContent = message;
    noticeTimer = setTimeout(() => { $('view-status').textContent = ''; }, 5000);
  }
  function viewport() {
    const v = window.visualViewport;
    const height = v && v.scale === 1 ? v.height : innerHeight;
    document.documentElement.style.setProperty('--chat-height', `${Math.round(height)}px`);
    if (immersive) renderer?.resize();
  }
  function autoSize() {
    if (!immersive) { $('message').style.removeProperty('height'); return; }
    $('message').style.height = '0px';
    $('message').style.height = `${Math.max(46, Math.min(140, $('message').scrollHeight))}px`;
  }
  function refreshPhase() {
    const phase = state.busy ? replying ? 'replying' : 'waiting' : state.typing ? 'typing' : 'idle';
    document.body.dataset.soulPhase = phase;
    document.body.dataset.chatConnected = String(state.connected);
    $('soul-presence-text').textContent = { idle: 'ここにいるよ', typing: 'あなたのペースで', waiting: '言葉を探している', replying: 'ことばが届いている' }[phase];
    $('soul-session').textContent = state.connected ? 'SOUL / CONNECTED' : 'SOUL / SPACE';
    renderer?.setEnergy({ idle: .03, typing: .2, waiting: .5, replying: .85 }[phase]);
    $('composer-settings').hidden = !immersive || state.connected;
    $('open-residents').disabled = state.busy;
    autoSize();
  }
  function setAvailability(available) {
    document.body.dataset.soulRenderer = available ? 'webgl' : 'fallback';
    $('soul-render-note').textContent = available ? '入力と返事に合わせて、光の動きが変わるよ。' : 'この環境では、軽量な光の表示で使えるよ。';
  }
  async function ensureRenderer() {
    if (rendererLoading || renderer) return;
    rendererLoading = true;
    try {
      const { SoulRenderer } = await import('./soul.mjs');
      renderer = new SoulRenderer($('soul-canvas'), setAvailability);
      applyTheme(); renderer.configure({ reduced, brightness: .35 + intensity / 80 });
      renderer.setActive(immersive); refreshPhase();
    } catch { setAvailability(false); }
    finally { rendererLoading = false; }
  }
  function restore() {
    for (const entry of moved) {
      entry.marker.replaceWith(entry.node);
      if (entry.open !== undefined) entry.node.open = entry.open;
      entry.node.hidden = entry.hidden;
    }
    moved = []; drawerKind = null;
  }
  function closeDrawer(focusMessage = false) {
    focusComposerAfterClose = focusMessage;
    if (drawer.open) drawer.close();
    else if (focusMessage) $('message').focus();
  }
  function openDrawer(kind) {
    if (!immersive || (kind === 'residents' && state.busy)) return;
    if (drawer.open) {
      if (drawerKind === kind) return;
      drawer.addEventListener('close', () => openDrawer(kind), { once: true }); drawer.close(); return;
    }
    returnFocus = document.activeElement;
    drawerKind = kind;
    const nodes = kind === 'residents' ? [document.querySelector('.resident-panel')]
      : kind === 'wardrobe' ? [$('soul-wardrobe')]
      : kind === 'history' ? [$('transcript'), $('clear-conversation'), $('export-conversation')]
      : [$('connection'), document.querySelector('.additional-settings'), document.querySelector('.history-settings'), $('immersive-preferences')];
    $('drawer-title').textContent = { residents: '話す相手を選ぶ', history: '会話の履歴', settings: '会話の設定', wardrobe: '魂の着せ替え' }[kind];
    for (const node of nodes) {
      const marker = document.createComment('chat-panel-position'); node.before(marker);
      moved.push({ marker, node, hidden: node.hidden, open: node.tagName === 'DETAILS' ? node.open : undefined });
      $('drawer-content').append(node); node.hidden = false;
      if (node.tagName === 'DETAILS') node.open = true;
    }
    drawer.dataset.panel = kind; drawer.showModal();
    if (kind === 'residents') $('persona-search').focus();
    if (kind === 'history') { $('transcript').scrollTop = $('transcript').scrollHeight; $('transcript').focus(); }
    if (kind === 'settings') (state.connected ? $('personality') : $('api-key')).focus();
  }
  drawer.addEventListener('close', () => {
    restore();
    if (immersive) { if (focusComposerAfterClose) $('message').focus(); else returnFocus?.focus(); }
    focusComposerAfterClose = false;
  });
  $('drawer-close').addEventListener('click', () => closeDrawer());
  $('back-to-conversation').addEventListener('click', () => closeDrawer(true));
  drawer.addEventListener('click', event => {
    const b = drawer.getBoundingClientRect();
    if (event.target === drawer && (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom)) closeDrawer();
  });
  function setMode(enabled, persistChoice = true) {
    if (!enabled && drawer.open) { drawer.close(); restore(); }
    immersive = enabled;
    document.body.classList.toggle('chat-immersive', enabled);
    $('soul-stage').hidden = !enabled;
    $('immersive-toggle').setAttribute('aria-pressed', String(enabled));
    $('immersive-toggle-label').textContent = enabled ? '通常表示' : '没入モード';
    $('immersive-toggle').title = enabled ? '通常表示に戻る（Esc）' : '没入モードで話す';
    $('composer-hint').textContent = enabled ? 'Enterで送信 · Shift + Enterで改行' : 'Enterで改行 · Ctrl / ⌘ + Enterで送信';
    const url = new URL(location.href); url.searchParams.set('mode', enabled ? 'immersive' : 'classic'); history.replaceState(null, '', url);
    if (persistChoice) persist();
    viewport(); refreshPhase(); renderer?.setActive(enabled);
    if (enabled) { void ensureRenderer(); }
    else if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  }
  $('immersive-toggle').addEventListener('click', () => setMode(!immersive));
  $('open-residents').addEventListener('click', () => openDrawer('residents'));
  $('open-history').addEventListener('click', () => openDrawer('history'));
  $('open-settings').addEventListener('click', () => openDrawer('settings'));
  $('open-wardrobe').addEventListener('click', () => openDrawer('wardrobe'));
  $('composer-settings').addEventListener('click', () => openDrawer('settings'));
  $('chat-fullscreen').hidden = !document.fullscreenEnabled;
  $('chat-fullscreen').addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { notice('この環境では、ブラウザの枠を残した没入表示で使えるよ。'); }
  });
  document.addEventListener('fullscreenchange', () => {
    const active = !!document.fullscreenElement;
    $('chat-fullscreen').setAttribute('aria-label', active ? 'ブラウザの全画面を終了する' : 'ブラウザを全画面にする');
    $('chat-fullscreen').title = active ? 'ブラウザの全画面を終了する' : 'ブラウザを全画面にする'; viewport();
  });
  $('soul-reduced-motion').checked = reduced; $('soul-intensity').value = String(intensity);
  function configureVisuals() {
    reduced = $('soul-reduced-motion').checked; intensity = Number($('soul-intensity').value);
    document.body.classList.toggle('soul-reduced', reduced);
    renderer?.configure({ reduced, brightness: .35 + intensity / 80 }); persist();
  }
  $('soul-reduced-motion').addEventListener('change', configureVisuals);
  $('soul-intensity').addEventListener('input', configureVisuals);
  prefersReduced.addEventListener('change', event => {
    if (event.matches) { $('soul-reduced-motion').checked = true; configureVisuals(); }
  });
  window.addEventListener('resize', viewport);
  window.visualViewport?.addEventListener('resize', viewport);
  document.addEventListener('visibilitychange', () => { document.hidden ? renderer?.stop() : immersive && renderer?.start(); });
  window.addEventListener('pagehide', () => renderer?.stop());
  window.addEventListener('pageshow', () => { if (immersive) renderer?.start(); });
  window.addEventListener('pointermove', event => { if (immersive && !drawer.open) renderer?.setPointer(event.clientX / innerWidth * 2 - 1, 1 - event.clientY / innerHeight * 2); }, { passive: true });
  $('message').addEventListener('input', () => { autoSize(); renderer?.pulse(); });
  $('message').addEventListener('keydown', event => {
    if (!immersive || event.isComposing || event.keyCode === 229) return;
    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault(); if (!$('send').disabled) $('message-form').requestSubmit();
    }
  });
  document.addEventListener('keydown', event => {
    if (!immersive || event.isComposing) return;
    if (event.key === 'Escape') { if (!drawer.open && !document.fullscreenElement) setMode(false); return; }
    if (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); openDrawer('residents'); }
    const editable = event.target.matches('input, textarea, select, [contenteditable=true]');
    if (event.key === '/' && !editable && !drawer.open) { event.preventDefault(); $('message').focus(); }
  });
  const queryMode = new URL(location.href).searchParams.get('mode');
  applyTheme();
  setMode(queryMode === 'immersive' || (queryMode !== 'classic' && stored.mode === 'immersive'), false);

  return {
    update(next) { if (!next.busy || !state.busy) replying = false; state = next; refreshPhase(); },
    setPersona(id) {
      const hash = [...id].reduce((sum, c) => sum + c.charCodeAt(0), 0);
      personaTint = id === 'hina' ? PALETTE[0] : PALETTE[hash % PALETTE.length];
      applyTheme();
    },
    replyPulse() { replying = true; refreshPhase(); renderer?.pulse(); },
    connectionApplied() { if (immersive && drawerKind === 'settings') { closeDrawer(true); notice('接続設定を反映したよ。'); } },
  };
}
