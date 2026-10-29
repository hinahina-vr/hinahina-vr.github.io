import {
  API_KEY_STORAGE_KEY, STORAGE_KEY, MAX_MESSAGE, MAX_HISTORY, ChatError,
  readState, saveState, readRememberedKey, persistKey, sendCompletion, listModels, exportConversation,
} from './core.mjs';
import { createGameUI } from './game-ui.mjs?v=20261030-groups1';
import { createChatView } from './immersive.mjs?v=20261030-cute1';
import { DEMO_CHOICES, demoGreeting, streamDemo } from './demo.mjs?v=20261030-demo3';

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
const demoConversations = Object.create(null);
let retryAvailable = false;
const view = createChatView();
createGameUI();

$('api-key').value = apiKey;
$('remember-key').checked = !!apiKey;
$('model-id').value = state.model;
$('remember-history').checked = state.rememberHistory;

function save() { return saveState(storage, state); }
function setError(message = '') { $('chat-error').textContent = message; $('chat-error').hidden = !message; }
function isDemo() { return !apiKey; }
function messages() { return (isDemo() ? demoConversations : state.conversations)[state.selected] ||= []; }
function replaceMessages(items) { (isDemo() ? demoConversations : state.conversations)[state.selected] = items; }
function connectionChanged() {
  activeRequest?.abort(); activeRequest = null; retryAvailable = false;
  if (persona) renderConversation();
  updateReady();
}
function updateReady() {
  const busy = !!activeRequest;
  const demo = isDemo();
  $('send').disabled = busy || !persona || (!demo && !state.model) || !currentDraft().trim();
  $('message').disabled = !persona || busy;
  $('stop').hidden = !busy;
  $('persona-select').disabled = busy || !catalog.length;
  $('persona-search').disabled = busy;
  for (const id of ['clear-conversation', 'save-personality', 'reset-personality']) $(id).disabled = busy || !persona;
  $('connection-state').textContent = demo ? 'おためし' : state.model ? '設定済み' : '未設定';
  $('active-model').textContent = demo ? 'キーなし · 用意したセリフでおためし' : state.model || 'モデル未設定';
  $('demo-notice').hidden = !demo;
  $('clear-conversation').textContent = demo ? 'おためしの会話を消す' : '会話を消す';
  $('export-conversation').textContent = demo ? 'おためしの会話を書き出す' : '会話を書き出す';
  document.body.dataset.chatDemo = String(demo);
  $('retry').hidden = busy || !retryAvailable || (!demo && !state.model);
  view.update({ busy, connected: !!apiKey && !!state.model, typing: !!currentDraft().trim() });
}

function currentDraft() { return $('message').value; }
function renderMessage(message, incomplete = false, demo = isDemo()) {
  const node = document.createElement('article');
  node.className = `chat-message ${message.role}${incomplete ? ' incomplete' : ''}`;
  if (demo && message.role === 'assistant') node.classList.add('demo-reply');
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
  // Saved conversations stay readable after a key is removed or expires from memory.
  if (isDemo()) (state.conversations[state.selected] || []).forEach(m => renderMessage(m, false, false));
  if (!messages().length) {
    if (isDemo()) {
      const greeting = renderMessage({ role: 'assistant', content: demoGreeting(persona.id) });
      greeting.node.dataset.demoGreeting = 'true';
      const choices = document.createElement('div'); choices.className = 'demo-choices'; choices.setAttribute('aria-label', 'おためしの話題');
      for (const text of DEMO_CHOICES) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = text;
        button.addEventListener('click', () => { if (activeRequest) return; $('message').value = text; updateReady(); void send(); });
        choices.append(button);
      }
      $('transcript').append(choices);
    } else {
      const empty = document.createElement('p');
      empty.className = 'empty-chat'; empty.textContent = '今日は何を話そう？'; $('transcript').append(empty);
    }
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
  for (const link of document.querySelectorAll('.resident-diary-link')) { link.hidden = true; link.removeAttribute('href'); }
  $('conversation-title').textContent = '読み込み中…';
  $('transcript').replaceChildren(); setError(); updateReady();
  try {
    const response = await fetch(`./assets/chat/personas/${id}.json`, { credentials: 'omit', cache: 'no-cache' });
    if (!response.ok) throw new Error('profile');
    const data = await response.json();
    if (sequence !== loadSequence) return;
    if (data.id !== id || typeof data.base !== 'string') throw new Error('profile');
    persona = data;
    for (const link of document.querySelectorAll('.resident-diary-link')) {
      link.href = './diary-' + data.id + '.html';
      link.setAttribute('aria-label', data.name + 'の日記を開く（別タブ）');
      link.hidden = false;
    }
    $('conversation-title').textContent = `${data.emoji} ${data.name}`;
    view.setPersona(id);
    $('personality').value = state.additions[id] || '';
    $('personality-status').textContent = '保存した設定は、次の送信から使うよ。';
    $('message').value = drafts.get(id) || '';
    $('chat-status').textContent = isDemo() ? 'キーなしでは用意したセリフで返すよ。自由な会話にはAPIキーが必要だよ。' : '話しかけてみてね。';
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
  $('chat-status').textContent = '接続したよ。ここからは自由に話しかけてね。'; setError(); connectionChanged();
  view.connectionApplied();
});
$('forget-key').addEventListener('click', () => {
  apiKey = ''; $('api-key').value = ''; $('remember-key').checked = false;
  const removed = persistKey(storage, '', false);
  setError();
  $('connection-message').textContent = removed ? 'APIキーを消したよ。' : 'キーの使用を止めたよ。保存データはブラウザのサイトデータ設定から削除してね。';
  $('chat-status').textContent = 'おためしに戻ったよ。キーなしでも短いお話ができるよ。'; connectionChanged();
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
  $('personality-status').textContent = save() ? isDemo() ? '保存したよ。APIキーを設定して話すときに使うよ。' : 'この人格の追加設定を保存したよ。次の送信から使うよ。' : 'このページでは反映できるよ。ブラウザへの保存はできなかった。';
});
$('reset-personality').addEventListener('click', () => {
  delete state.additions[state.selected]; $('personality').value = '';
  $('personality-status').textContent = save() ? '追加設定を空にしたよ。' : 'このページの追加設定を空にしたよ。保存データは更新できなかった。';
});
$('remember-history').addEventListener('change', () => {
  state.rememberHistory = $('remember-history').checked;
  $('chat-status').textContent = save() ? state.rememberHistory ? isDemo() ? '接続後の会話を保存するよ。おためしの会話は、このページだけに残るよ。' : 'このブラウザに会話を保存するよ。' : '保存した履歴を削除したよ。今のページでは会話を続けられるよ。' : 'ブラウザの保存データを更新できなかった。';
});
$('clear-conversation').addEventListener('click', () => {
  if (!persona || !messages().length || !window.confirm(`${persona.name}との${isDemo() ? 'おためしの' : ''}会話を消す？`)) return;
  replaceMessages([]); retryAvailable = false; save(); renderConversation(); setError(); updateReady();
  $('chat-status').textContent = '会話を消したよ。';
});
$('export-conversation').addEventListener('click', () => {
  if (!persona) return;
  let data = exportConversation(state.selected, messages(), isDemo() ? '' : state.additions[state.selected]);
  if (isDemo()) data = JSON.stringify({ ...JSON.parse(data), mode: 'demo', replySource: 'preset' }, null, 2);
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `waddy-chat-${state.selected}.json`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
});

async function send(retry = false) {
  if (activeRequest || !persona || (!isDemo() && !state.model)) return;
  const demo = isDemo();
  if (!demo && $('personality').value.trim() !== (state.additions[state.selected] || '')) {
    setError('追加設定が未保存だよ。保存するか、元の内容に戻してから送ってね。'); return;
  }
  const text = currentDraft().trim();
  if (!retry && (!text || text.length > MAX_MESSAGE)) return;
  if (retry && (messages().at(-1)?.role !== 'user' || !retryAvailable)) return;
  if (!retry) {
    messages().push({ role: 'user', content: text });
    replaceMessages(messages().slice(-MAX_HISTORY));
    $('message').value = ''; drafts.delete(state.selected); save();
  }
  retryAvailable = false; setError(); renderConversation();
  const pending = renderMessage({ role: 'assistant', content: '' }, true);
  view.startReply(pending.node);
  const request = new AbortController(); activeRequest = request;
  const timeout = setTimeout(() => request.abort(new DOMException('timeout', 'TimeoutError')), 120000);
  $('chat-status').textContent = `${persona.name}の返事を待っているよ。`; updateReady();
  try {
    const onText = text => { if (activeRequest !== request) return; pending.body.textContent = text; view.replyPulse(); view.transcriptChanged(); };
    const answer = demo
      ? await streamDemo({ id: persona.id, text: messages().at(-1).content, history: messages(), signal: request.signal, onText })
      : await sendCompletion({ apiKey, model: state.model, persona, addition: state.additions[state.selected], history: messages(), signal: request.signal, onText,
        onModel: model => { if (activeRequest === request) $('active-model').textContent = model; },
      });
    if (activeRequest !== request) return;
    messages().push({ role: 'assistant', content: answer });
    replaceMessages(messages().slice(-MAX_HISTORY)); save(); pending.node.classList.remove('incomplete');
    $('chat-status').textContent = demo ? '用意したセリフでの返事だよ。自由な会話にはAPIキーを入れてね。' : '返事が届いたよ。';
  } catch (error) {
    if (activeRequest !== request) return;
    // Partial replies remain visibly marked, but never enter the next request or saved history.
    if (!pending.body.textContent) pending.node.remove();
    retryAvailable = true;
    if (request.signal.aborted) {
      $('chat-status').textContent = request.signal.reason?.name === 'TimeoutError' ? '返事を待つ時間が長くなったので止めたよ。' : '受信を止めたよ。';
    } else {
      setError(error instanceof ChatError ? error.message : '返事を受け取れなかった。もう一度送ってね。');
      $('chat-status').textContent = '送信できなかった会話は、もう一度送れるよ。';
    }
  } finally { clearTimeout(timeout); if (activeRequest === request) { activeRequest = null; updateReady(); view.replyFinished(); } }
}
$('message-form').addEventListener('submit', event => { event.preventDefault(); void send(); });
$('retry').addEventListener('click', () => { void send(true); });
$('stop').addEventListener('click', () => activeRequest?.abort());

// Revoking key/history persistence in another tab takes effect here as well.
window.addEventListener('storage', event => {
  if (event.key === API_KEY_STORAGE_KEY) {
    apiKey = readRememberedKey(storage); $('api-key').value = apiKey; $('remember-key').checked = !!apiKey; connectionChanged();
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
