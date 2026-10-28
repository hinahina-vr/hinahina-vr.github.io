import { SOUL_THEMES } from './themes.mjs';
const VISUAL_VERSION = '20261028-r2';
const VISUAL_KEY = 'waddy-chat-visual-v1';
const PALETTE = [[.87, .62, .76], [.62, .75, .98], [.78, .67, .96], [.72, .88, .84], [.95, .8, .59], [.75, .79, .97]];

export function createChatView() {
  const $ = id => document.getElementById(id);
  const drawer = $('chat-drawer');
  const mobileLayout = matchMedia('(max-width: 720px), (max-width: 1000px) and (max-height: 600px)');
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)');
  let storage;
  let stored = {};
  try { storage = localStorage; stored = JSON.parse(storage.getItem(VISUAL_KEY) || '{}') || {}; } catch { /* Visual preferences are optional. */ }
  let immersive = false;
  let scene = stored.scene === 'light' ? 'light' : 'bedroom';
  let chatSpace = stored.chatSpace === 'conversation' ? 'conversation' : 'character';
  let followingLatest = true;
  let activePersona = '';
  const portrait = $('soul-character');
  portrait.addEventListener('load', () => { document.body.dataset.soulArt = 'ready'; });
  portrait.addEventListener('error', () => { document.body.dataset.soulArt = 'unavailable'; });
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
  let closePending = false;
  let pendingDrawerKind = null;
  const settingsTabs = [...document.querySelectorAll("[data-settings-tab]")];
  let returnFocus;
  let focusComposerAfterClose = false;

  function persist() {
    try { storage?.setItem(VISUAL_KEY, JSON.stringify({ mode: immersive ? 'immersive' : 'classic', reduced, intensity, theme, scene, chatSpace })); } catch { /* Keep using the in-memory choice. */ }
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
    const mini = document.createElement('span'); mini.className = 'mini-soul'; if (item.id === 'night') mini.textContent = '✧'; else { const art = document.createElement('img'); art.alt = ''; mini.append(art); }
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
  function updateReadingIndicator() {
    const transcript = $('transcript');
    const distance = transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight;
    $('latest-chat').hidden = !immersive || !mobileLayout.matches || drawer.open || !$('chat-error').hidden || transcript.clientHeight < 56 || distance <= 32 || !transcript.querySelector('.chat-message');
    document.documentElement.style.setProperty('--composer-space', $('message-form').offsetHeight + 'px');
  }
  function scrollLatest() {
    followingLatest = true;
    $('transcript').scrollTop = $('transcript').scrollHeight;
    updateReadingIndicator();
  }
  function applyChatSpace() {
    const expanded = chatSpace === 'conversation';
    document.body.dataset.chatSpace = chatSpace;
    $('chat-space-toggle').setAttribute('aria-pressed', String(expanded));
    $('chat-space-toggle').setAttribute('aria-label', expanded ? 'キャラの表示を大きくする' : '会話欄を広げる');
    $('chat-space-toggle').textContent = expanded ? 'キャラを大きく ↕' : '会話を広く ↕';
  }
  $('transcript').addEventListener('scroll', () => {
    const node = $('transcript');
    followingLatest = node.scrollHeight - node.scrollTop - node.clientHeight <= 32;
    updateReadingIndicator();
  }, { passive: true });
  $('latest-chat').addEventListener('click', scrollLatest);
  $('chat-space-toggle').addEventListener('click', () => {
    const follow = followingLatest, position = $('transcript').scrollTop;
    chatSpace = chatSpace === 'conversation' ? 'character' : 'conversation';
    applyChatSpace(); persist(); viewport();
    if (follow) scrollLatest(); else { $('transcript').scrollTop = position; updateReadingIndicator(); }
  });
  applyChatSpace();
  function reserveCharacterSpace() {
    if (!immersive || mobileLayout.matches) return;
    const panel = document.querySelector('.conversation-panel');
    const reserve = panel.getBoundingClientRect().height + parseFloat(getComputedStyle(panel).bottom) + 16;
    document.documentElement.style.setProperty('--chat-reserved', Math.ceil(reserve) + 'px');
  }
  function viewport() {
    const v = window.visualViewport;
    const height = v && v.scale === 1 ? v.height : innerHeight;
    document.documentElement.style.setProperty('--chat-height', Math.round(height) + 'px');
    document.documentElement.style.setProperty('--chat-viewport-top', (v && v.scale === 1 ? Math.round(v.offsetTop) : 0) + 'px');
    document.documentElement.style.setProperty('--mobile-chat-height', Math.round(Math.min(Math.max(120, height - 164), Math.max(196, Math.min(chatSpace === 'conversation' ? 520 : 380, height * (chatSpace === 'conversation' ? .6 : .44))))) + 'px');
    document.body.dataset.chatCompact = String(height < 580);
    if (immersive) { autoSize(); renderer?.resize(); reserveCharacterSpace(); }
    updateReadingIndicator();
  }
  function autoSize() {
    if (!immersive) { $('message').style.removeProperty('height'); return; }
    const height = window.visualViewport?.height || innerHeight;
    const maximum = mobileLayout.matches ? height < 580 ? 56 : 88 : 140;
    $('message').style.height = '0px';
    $('message').style.height = Math.max(44, Math.min(maximum, $('message').scrollHeight)) + 'px';
  }
  function refreshPhase() {
    const phase = state.busy ? replying ? 'replying' : 'waiting' : state.typing ? 'typing' : 'idle';
    document.body.dataset.soulPhase = phase;
    const activity = phase === 'waiting' ? '返事を考えてる…' : phase === 'replying' ? 'お返事が届いてる…' : '';
    $('mobile-chat-activity').textContent = activity; $('mobile-chat-activity').hidden = !activity;
    $('mobile-chat-heading').hidden = !!activity;
    document.body.dataset.chatConnected = String(state.connected);
    $('soul-presence-text').textContent = { idle: 'ここにいるよ', typing: 'あなたのペースで', waiting: '言葉を探している', replying: 'ことばが届いている' }[phase];
    $('soul-session').textContent = state.connected ? 'SOUL / CONNECTED' : 'SOUL / SPACE';
    renderer?.setEnergy({ idle: .03, typing: .2, waiting: .5, replying: .85 }[phase]);
    $('composer-settings').hidden = !immersive || state.connected;
    $('open-residents').disabled = state.busy; $('change-resident').disabled = state.busy;
    autoSize(); updateReadingIndicator();
  }
  function setAvailability(available) {
    document.body.dataset.soulRenderer = available ? 'webgl' : 'fallback';
    $('soul-render-note').textContent = available ? '入力と返事に合わせて、光の動きが変わるよ。' : 'この環境では、軽量な光の表示で使えるよ。';
  }
  async function ensureRenderer() {
    if (rendererLoading || renderer) return;
    rendererLoading = true;
    try {
      const { SoulRenderer } = await import('./soul.mjs?v=' + VISUAL_VERSION);
      renderer = new SoulRenderer($('soul-canvas'), setAvailability);
      applyTheme(); renderer.setScene(scene); renderer.configure({ reduced, brightness: .35 + intensity / 80 });
      renderer.setActive(immersive); refreshPhase();
    } catch { setAvailability(false); }
    finally { rendererLoading = false; }
  }
  function restore() {
    for (const entry of moved) {
      entry.marker.replaceWith(entry.node);
      if (entry.open !== undefined) { entry.node.open = entry.open; entry.node.querySelector('summary').inert = entry.summaryInert; }
      entry.node.hidden = entry.hidden;
    }
    moved = []; drawerKind = null;
    $("drawer-content").replaceChildren();
    $("settings-tabs").hidden = true;
  }
  function closeDrawer(focusMessage = false) {
    focusComposerAfterClose = focusMessage;
    if (drawer.open) { closePending = true; drawer.close(); restore(); }
    else if (focusMessage) $('message').focus();
  }
  function openDrawer(kind) {
    if ((!immersive && kind !== 'settings' && kind !== 'residents') || (kind === 'residents' && state.busy)) return;
    if (closePending || (!drawer.open && moved.length)) { pendingDrawerKind = kind; return; }
    if (drawer.open) {
      if (drawerKind === kind) return;
      pendingDrawerKind = kind; closeDrawer(); return;
    }
    returnFocus = document.activeElement;
    drawerKind = kind;
    const nodes = kind === 'residents' ? [document.querySelector('.resident-panel')]
      : kind === 'menu' ? [$('open-residents'), $('open-wardrobe'), $('chat-fullscreen'), $('immersive-toggle')].filter(node => !node.hidden)
      : kind === 'wardrobe' ? [$('soul-wardrobe')]
      : kind === 'history' ? [$('transcript'), $('clear-conversation'), $('export-conversation')]
      : [$('connection'), document.querySelector('.additional-settings'), document.querySelector('.history-settings'), $('immersive-preferences')];
    $('drawer-title').textContent = { residents: '話す相手を選ぶ', history: '会話の履歴', settings: 'おしゃべり設定', wardrobe: '魂の着せ替え', menu: '表示と相手' }[kind];
    $('settings-tabs').hidden = kind !== 'settings';
    const categories = ['connection', 'personality', 'history', 'visuals'];
    for (const [index, node] of nodes.entries()) {
      const marker = document.createComment('chat-panel-position'); node.before(marker);
      moved.push({ marker, node, hidden: node.hidden, open: node.tagName === 'DETAILS' ? node.open : undefined, summaryInert: node.querySelector('summary')?.inert });
      if (kind === 'settings') {
        const category = categories[index], panel = document.createElement('section');
        panel.id = 'settings-panel-' + category; panel.className = 'settings-tab-panel';
        panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', 'settings-tab-' + category); panel.tabIndex = 0;
        panel.append(node); $('drawer-content').append(panel);
      } else $('drawer-content').append(node);
      node.hidden = false;
      if (node.tagName === 'DETAILS') { node.open = true; node.querySelector('summary').inert = kind === 'settings'; }
    }
    drawer.dataset.panel = kind; drawer.showModal(); updateReadingIndicator();
    if (kind === 'residents') $('persona-search').focus();
    if (kind === 'history') { $('transcript').scrollTop = $('transcript').scrollHeight; $('transcript').focus(); }
    if (kind === 'settings') {
      selectSettingsTab(state.connected ? 'personality' : 'connection');
      (state.connected ? $('personality') : $('api-key')).focus();
    }
  }
  function selectSettingsTab(id, focus = false) {
    for (const tab of settingsTabs) {
      const selected = tab.dataset.settingsTab === id;
      tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
      const panel = $(tab.getAttribute('aria-controls')); if (panel) panel.hidden = !selected;
      if (selected && focus) tab.focus();
    }
    $('drawer-content').scrollTop = 0;
  }
  for (const tab of settingsTabs) {
    tab.addEventListener('click', () => selectSettingsTab(tab.dataset.settingsTab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = settingsTabs.indexOf(tab);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? settingsTabs.length - 1 : (index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + settingsTabs.length) % settingsTabs.length;
      selectSettingsTab(settingsTabs[next].dataset.settingsTab, true);
    });
  }
  for (const button of document.querySelectorAll('[data-setting-prompt]')) button.addEventListener('click', () => {
    const input = $('personality'), value = input.value.trim();
    if (input.disabled || $('save-personality').disabled) return;
    const prompt = button.dataset.settingPrompt;
    if (!value.split('\n').includes(prompt)) input.value = (value ? value + '\n' : '') + prompt;
    input.dispatchEvent(new Event('input', { bubbles: true })); input.focus();
  });
  drawer.addEventListener('close', () => {
    restore(); closePending = false; updateReadingIndicator();
    if (pendingDrawerKind) { const kind = pendingDrawerKind; pendingDrawerKind = null; focusComposerAfterClose = false; openDrawer(kind); return; }
    if (focusComposerAfterClose) $('message').focus(); else returnFocus?.focus();
    focusComposerAfterClose = false;
  });
  $('drawer-close').addEventListener('click', () => closeDrawer());
  $('back-to-conversation').addEventListener('click', () => closeDrawer(true));
  drawer.addEventListener('click', event => {
    const b = drawer.getBoundingClientRect();
    if (event.target === drawer && (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom)) closeDrawer();
  });
  function setMode(enabled, persistChoice = true) {
    if (!enabled && drawer.open) { pendingDrawerKind = null; closeDrawer(); }
    immersive = enabled;
    document.body.classList.toggle('chat-immersive', enabled);
    $('soul-stage').hidden = !enabled;
    $('immersive-toggle').setAttribute('aria-pressed', String(enabled));
    $('immersive-toggle-label').textContent = enabled ? '通常表示' : '没入モード';
    $('immersive-toggle').title = enabled ? '通常表示に戻る（Esc）' : '没入モードで話す';
    $('composer-hint').textContent = enabled ? mobileLayout.matches ? 'Enterで改行 · ボタンで送信' : 'Enterで送信 · Shift + Enterで改行' : 'Enterで改行 · Ctrl / ⌘ + Enterで送信';
    const url = new URL(location.href); url.searchParams.set('mode', enabled ? 'immersive' : 'classic'); history.replaceState(null, '', url);
    if (persistChoice) persist();
    viewport(); refreshPhase(); renderer?.setActive(enabled);
    if (enabled) { void ensureRenderer(); }
    else if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  }
  $('immersive-toggle').addEventListener('click', () => setMode(!immersive));
  $('open-residents').addEventListener('click', () => openDrawer('residents'));
  $('change-resident').addEventListener('click', () => openDrawer('residents'));
  $('open-chat-menu').addEventListener('click', () => openDrawer('menu'));
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
  document.body.classList.toggle('soul-reduced', reduced); $('soul-scene').value = scene; document.body.dataset.soulScene = scene;
  $('soul-scene').addEventListener('change', () => { scene = $('soul-scene').value; document.body.dataset.soulScene = scene; renderer?.setScene(scene); persist(); });
  $('soul-reduced-motion').checked = reduced; $('soul-intensity').value = String(intensity); $('soul-intensity-value').value = intensity + '%';
  function configureVisuals() {
    reduced = $('soul-reduced-motion').checked; intensity = Number($('soul-intensity').value);
    document.body.classList.toggle('soul-reduced', reduced);
    $('soul-intensity-value').value = intensity + '%';
    renderer?.configure({ reduced, brightness: .35 + intensity / 80 }); persist();
  }
  $('soul-reduced-motion').addEventListener('change', configureVisuals);
  $('soul-intensity').addEventListener('input', configureVisuals);
  prefersReduced.addEventListener('change', event => {
    if (event.matches) { $('soul-reduced-motion').checked = true; configureVisuals(); }
  });
  window.addEventListener('resize', viewport);
  window.visualViewport?.addEventListener('resize', viewport);
  window.visualViewport?.addEventListener('scroll', viewport);
  mobileLayout.addEventListener('change', viewport);
  const conversationResize = new ResizeObserver(reserveCharacterSpace);
  conversationResize.observe(document.querySelector('.conversation-panel'));
  const readingResize = new ResizeObserver(() => { if (followingLatest && !drawer.open) scrollLatest(); else updateReadingIndicator(); });
  readingResize.observe($('transcript')); readingResize.observe($('message-form'));
  document.addEventListener('visibilitychange', () => { document.hidden ? renderer?.stop() : immersive && renderer?.start(); });
  window.addEventListener('pagehide', () => renderer?.stop());
  window.addEventListener('pageshow', () => { if (immersive) renderer?.start(); });
  window.addEventListener('pointermove', event => { if (immersive && !drawer.open) renderer?.setPointer(event.clientX / innerWidth * 2 - 1, 1 - event.clientY / innerHeight * 2); }, { passive: true });
  $('message').addEventListener('input', () => { autoSize(); renderer?.pulse(); });
  $('message').addEventListener('keydown', event => {
    if (!immersive || mobileLayout.matches || event.isComposing || event.keyCode === 229) return;
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
  setMode(queryMode === 'immersive' || (queryMode !== 'classic' && (stored.mode === 'immersive' || (!stored.mode && mobileLayout.matches))), false);

  return {
    conversationRendered() { scrollLatest(); },
    transcriptChanged() { if (followingLatest) scrollLatest(); else updateReadingIndicator(); },
    replyFinished() { if (!mobileLayout.matches && !drawer.open && [document.body, $('message'), $('send'), $('stop')].includes(document.activeElement)) $('message').focus(); updateReadingIndicator(); },
    update(next) { if (!next.busy || !state.busy) replying = false; state = next; refreshPhase(); },
    setPersona(id) {
      if (/^[a-z0-9-]+$/.test(id) && activePersona !== id) {
        activePersona = id; document.body.dataset.soulCharacter = id; document.body.dataset.soulArt = 'loading';
        $('settings-persona-name').textContent = $('conversation-title').textContent;
        portrait.src = new URL('../../assets/chat/characters/' + id + '.webp?v=' + VISUAL_VERSION, import.meta.url).href;
        $('settings-persona-art').src = portrait.src;
        for (const image of document.querySelectorAll('.mini-soul img')) image.src = portrait.src;
      }
      const hash = [...id].reduce((sum, c) => sum + c.charCodeAt(0), 0);
      personaTint = id === 'hina' ? PALETTE[0] : PALETTE[hash % PALETTE.length];
      applyTheme();
    },
    replyPulse() { replying = true; refreshPhase(); renderer?.pulse(); },
    connectionApplied() { if (immersive && drawerKind === 'settings') { closeDrawer(true); notice('接続設定を反映したよ。'); } },
  };
}
