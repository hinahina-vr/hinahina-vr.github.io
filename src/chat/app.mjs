import {
  API_KEY_STORAGE_KEY, STORAGE_KEY, MAX_MESSAGE, MAX_HISTORY, ChatError,
  readState, saveState, readRememberedKey, persistKey, sendCompletion, listModels, exportConversation,
} from './core.mjs';
import { createChatView } from './immersive.mjs?v=20261028-r6';

const $ = id => document.getElementById(id);
let storage;
try { storage = window.localStorage; } catch { /* Memory-only mode is usable. */ }
const state = readState(storage);
let apiKey = readRememberedKey(storage);
let catalog = [];
let persona = null;
let activeRequest = null;
let loadSequence = 0;
const drafts = new Map();
let retryAvailable = false;
const view = createChatView();

$('api-key').value = apiKey;
$('remember-key').checked = !!apiKey;
$('model-id').value = state.model;
$('remember-history').checked = state.rememberHistory;

function save() { return saveState(storage, state); }
function setError(message = '') { $('chat-error').textContent = message; $('chat-error').hidden = !message; }
function messages() { return state.conversations[state.selected] ||= []; }
function updateReady() {
  const busy = !!activeRequest;
  $('send').disabled = busy || !persona || !apiKey || !state.model || !currentDraft().trim();
  $('message').disabled = !persona || busy;
  $('stop').hidden = !busy;
  $('persona-select').disabled = busy || !catalog.length;
  $('persona-search').disabled = busy;
  for (const id of ['clear-conversation', 'save-personality', 'reset-personality']) $(id).disabled = busy || !persona;
  $('connection-state').textContent = apiKey && state.model ? '設定済み' : '未設定';
  $('active-model').textContent = state.model || 'モデル未設定';
  $('retry').hidden = busy || !retryAvailable || !apiKey || !state.model;
  view.update({ busy, connected: !!apiKey && !!state.model, typing: !!currentDraft().trim() });
}

function currentDraft() { return $('message').value; }
function renderMessage(message, incomplete = false) {
  const node = document.createElement('article');
  node.className = `chat-message ${message.role}${incomplete ? ' incomplete' : ''}`;
  const speaker = document.createElement('p');
  speaker.className = 'speaker';
  speaker.textContent = message.role === 'user' ? 'あなた' : persona.name;
  const body = document.createElement('p');
  body.className = 'message-text';
  body.textContent = message.content;
  node.append(speaker, body);
  $('transcript').append(node);
  return { node, body };
}

function renderConversation() {
  $('transcript').replaceChildren();
  if (!messages().length) {
    const empty = document.createElement('p');
    empty.className = 'empty-chat'; empty.textContent = '今日は何を話そう？'; $('transcript').append(empty);
  } else messages().forEach(m => renderMessage(m));
  $('transcript').scrollTop = $('transcript').scrollHeight;
  view.conversationRendered();
}

function fillSelect() {
  const term = $('persona-search').value.trim().toLocaleLowerCase();
  const filtered = catalog.filter(p => `${p.name} ${p.id}`.toLocaleLowerCase().includes(term));
  $('persona-select').replaceChildren();
  for (const p of filtered) {
    const option = document.createElement('option');
    option.value = p.id; option.textContent = `${p.emoji} ${p.name}`; option.selected = p.id === state.selected;
    $('persona-select').append(option);
  }
  // Filtering must never silently change the active conversation.
  if (!filtered.some(p => p.id === state.selected)) $('persona-select').selectedIndex = -1;
  $('persona-count').textContent = `${filtered.length}人 / ${catalog.length}人`;
}

async function selectPersona(id) {
  if (!catalog.some(p => p.id === id) || activeRequest) return;
  drafts.set(state.selected, currentDraft());
  const sequence = ++loadSequence;
  persona = null; state.selected = id; retryAvailable = false;
  $('conversation-title').textContent = '読み込み中…';
  $('transcript').replaceChildren(); setError(); updateReady();
  try {
    const response = await fetch(`./assets/chat/personas/${id}.json`, { credentials: 'omit', cache: 'no-cache' });
    if (!response.ok) throw new Error('profile');
    const data = await response.json();
    if (sequence !== loadSequence) return;
    if (data.id !== id || typeof data.base !== 'string') throw new Error('profile');
    persona = data;
    $('conversation-title').textContent = `${data.emoji} ${data.name}`;
    view.setPersona(id);
    $('personality').value = state.additions[id] || '';
    $('personality-status').textContent = '保存した設定は、次の送信から使うよ。';
    $('message').value = drafts.get(id) || '';
    $('chat-status').textContent = apiKey && state.model ? '話しかけてみてね。' : '接続設定を入力すると話せるよ。';
    renderConversation(); save();
    const url = new URL(location.href); url.searchParams.set('persona', id); history.replaceState(null, '', url);
  } catch {
    if (sequence === loadSequence) setError('この住人を読み込めなかった。別の住人を選ぶか、ページを再読み込みしてね。');
  } finally { if (sequence === loadSequence) updateReady(); }
}

$('persona-search').addEventListener('input', fillSelect);
$('persona-select').addEventListener('change', () => { void selectPersona($('persona-select').value); });
$('message').addEventListener('input', updateReady);
$('message').addEventListener('keydown', event => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.isComposing) {
    event.preventDefault(); if (!$('send').disabled) $('message-form').requestSubmit();
  }
});

$('toggle-key').addEventListener('click', () => {
  const show = $('api-key').type === 'password';
  $('api-key').type = show ? 'text' : 'password'; $('toggle-key').textContent = show ? '隠す' : '表示';
  $('toggle-key').setAttribute('aria-pressed', String(show));
});
$('remember-key').addEventListener('change', () => {
  if (!$('remember-key').checked) {
    const removed = persistKey(storage, '', false);
    $('connection-message').textContent = removed ? '保存したAPIキーを削除したよ。今のページでは引き続き使えるよ。' : '保存データを削除できなかった。ブラウザのサイトデータ設定を確認してね。';
  }
});
$('connection-form').addEventListener('submit', event => {
  event.preventDefault();
  const candidate = $('api-key').value.trim();
  const model = $('model-id').value.trim();
  if (!candidate || !model || !/^[a-zA-Z0-9_.:/-]{1,200}$/.test(model)) {
    $('connection-message').textContent = 'APIキーとモデルIDを入力してね。'; return;
  }
  apiKey = candidate; state.model = model;
  const keySaved = persistKey(storage, apiKey, $('remember-key').checked);
  const settingsSaved = save();
  $('connection-message').textContent = !keySaved || !settingsSaved
    ? 'このページでは使えるよ。ブラウザへの保存はできなかった。'
    : $('remember-key').checked ? 'APIキーをこのブラウザに保存したよ。' : 'このページでAPIキーを使うよ。保存はしていないよ。';
  $('api-key').type = 'password'; $('toggle-key').textContent = '表示'; $('toggle-key').setAttribute('aria-pressed', 'false');
  $('chat-status').textContent = '話しかけてみてね。'; setError(); updateReady();
  view.connectionApplied();
});
$('forget-key').addEventListener('click', () => {
  activeRequest?.abort(); apiKey = ''; $('api-key').value = ''; $('remember-key').checked = false;
  const removed = persistKey(storage, '', false);
  setError();
  $('connection-message').textContent = removed ? 'APIキーを消したよ。' : 'キーの使用を止めたよ。保存データはブラウザのサイトデータ設定から削除してね。';
  $('chat-status').textContent = '接続設定にAPIキーを入力してね。'; updateReady();
});
$('load-models').addEventListener('click', async () => {
  $('load-models').disabled = true; $('model-note').textContent = 'OpenRouterからモデル一覧を取得しているよ。';
  try {
    const models = await listModels({ signal: AbortSignal.timeout(20000) });
    $('model-options').replaceChildren();
    for (const model of models) {
      const option = document.createElement('option'); option.value = model.id; option.label = model.name; $('model-options').append(option);
    }
    $('model-note').textContent = `${models.length}件取得したよ。モデル欄に名前やIDを入力して選んでね。`;
  } catch { $('model-note').textContent = '一覧を取得できなかった。モデルIDを直接入力しても使えるよ。'; }
  finally { $('load-models').disabled = false; }
});

$('personality').addEventListener('input', () => { $('personality-status').textContent = '未保存。保存すると次の送信から反映するよ。'; });
$('save-personality').addEventListener('click', () => {
  state.additions[state.selected] = $('personality').value.trim();
  $('personality-status').textContent = save() ? 'この人格の追加設定を保存したよ。次の送信から使うよ。' : 'このページでは反映できるよ。ブラウザへの保存はできなかった。';
});
$('reset-personality').addEventListener('click', () => {
  delete state.additions[state.selected]; $('personality').value = '';
  $('personality-status').textContent = save() ? '追加設定を空にしたよ。' : 'このページの追加設定を空にしたよ。保存データは更新できなかった。';
});
$('remember-history').addEventListener('change', () => {
  state.rememberHistory = $('remember-history').checked;
  $('chat-status').textContent = save() ? state.rememberHistory ? 'このブラウザに会話を保存するよ。' : '保存した履歴を削除したよ。今のページでは会話を続けられるよ。' : 'ブラウザの保存データを更新できなかった。';
});
$('clear-conversation').addEventListener('click', () => {
  if (!persona || !messages().length || !window.confirm(`${persona.name}との会話を消す？`)) return;
  state.conversations[state.selected] = []; retryAvailable = false; save(); renderConversation(); setError(); updateReady();
  $('chat-status').textContent = '会話を消したよ。';
});
$('export-conversation').addEventListener('click', () => {
  if (!persona) return;
  const data = exportConversation(state.selected, messages(), state.additions[state.selected]);
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `waddy-chat-${state.selected}.json`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
});

async function send(retry = false) {
  if (activeRequest || !persona || !apiKey || !state.model) return;
  if ($('personality').value.trim() !== (state.additions[state.selected] || '')) {
    setError('追加設定が未保存だよ。保存するか、元の内容に戻してから送ってね。'); return;
  }
  const text = currentDraft().trim();
  if (!retry && (!text || text.length > MAX_MESSAGE)) return;
  if (retry && (messages().at(-1)?.role !== 'user' || !retryAvailable)) return;
  if (!retry) {
    messages().push({ role: 'user', content: text });
    state.conversations[state.selected] = messages().slice(-MAX_HISTORY);
    $('message').value = ''; drafts.delete(state.selected); save();
  }
  retryAvailable = false; setError(); renderConversation();
  const pending = renderMessage({ role: 'assistant', content: '' }, true);
  view.startReply(pending.node);
  const request = new AbortController(); activeRequest = request;
  const timeout = setTimeout(() => request.abort(new DOMException('timeout', 'TimeoutError')), 120000);
  $('chat-status').textContent = `${persona.name}の返事を待っているよ。`; updateReady();
  try {
    const answer = await sendCompletion({ apiKey, model: state.model, persona, addition: state.additions[state.selected], history: messages(), signal: request.signal,
      onText: text => { pending.body.textContent = text; view.replyPulse(); view.transcriptChanged(); },
      onModel: model => { $('active-model').textContent = model; },
    });
    messages().push({ role: 'assistant', content: answer });
    state.conversations[state.selected] = messages().slice(-MAX_HISTORY); save(); pending.node.classList.remove('incomplete');
    $('chat-status').textContent = '返事が届いたよ。';
  } catch (error) {
    // Partial replies remain visibly marked, but never enter the next request or saved history.
    if (!pending.body.textContent) pending.node.remove();
    retryAvailable = true;
    if (request.signal.aborted) {
      $('chat-status').textContent = request.signal.reason?.name === 'TimeoutError' ? '返事を待つ時間が長くなったので止めたよ。' : '受信を止めたよ。';
    } else {
      setError(error instanceof ChatError ? error.message : '返事を受け取れなかった。もう一度送ってね。');
      $('chat-status').textContent = '送信できなかった会話は、もう一度送れるよ。';
    }
  } finally { clearTimeout(timeout); activeRequest = null; updateReady(); view.replyFinished(); }
}
$('message-form').addEventListener('submit', event => { event.preventDefault(); void send(); });
$('retry').addEventListener('click', () => { void send(true); });
$('stop').addEventListener('click', () => activeRequest?.abort());

// Revoking key/history persistence in another tab takes effect here as well.
window.addEventListener('storage', event => {
  if (event.key === API_KEY_STORAGE_KEY) {
    activeRequest?.abort(); apiKey = readRememberedKey(storage); $('api-key').value = apiKey; $('remember-key').checked = !!apiKey; updateReady();
  }
  if (event.key === STORAGE_KEY && readState(storage).rememberHistory === false) state.rememberHistory = $('remember-history').checked = false;
});

try {
  const response = await fetch('./assets/chat/catalog.json', { credentials: 'omit' });
  if (!response.ok) throw new Error('catalog');
  catalog = await response.json();
  if (!Array.isArray(catalog) || !catalog.length) throw new Error('catalog');
  const requested = new URL(location.href).searchParams.get('persona');
  const selected = catalog.some(p => p.id === requested) ? requested : catalog.some(p => p.id === state.selected) ? state.selected : 'hina';
  state.selected = selected; fillSelect(); await selectPersona(selected);
} catch { setError('住人の一覧を読み込めなかった。ページを再読み込みしてね。'); }
updateReady();
