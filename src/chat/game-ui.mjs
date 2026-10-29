import { portraitUrl } from './portraits.mjs?v=20261030-cute1';
/** Visual-novel navigation; character prompts and credentials never enter this module. */
export function createGameUI() {
  const $ = id => document.getElementById(id);
  const title = $('vn-title'), select = $('persona-select'), gallery = $('vn-residents');
  let titleReturnFocus;
  const portraitPath = portraitUrl;
  function openTitle() {
    if (title.open) return;
    titleReturnFocus = document.activeElement;
    title.showModal();
    $('vn-resume').focus();
  }
  function closeTitle() { title.close(); titleReturnFocus?.focus(); }
  $('vn-title-open').addEventListener('click', openTitle);
  $('vn-resume').addEventListener('click', () => { closeTitle(); if (!document.body.classList.contains('chat-immersive')) $('immersive-toggle').click(); });
  for (const [button, target] of [['vn-choose','open-residents'],['vn-config','open-settings']]) {
    $(button).addEventListener('click', () => {
      closeTitle();
      if (!document.body.classList.contains('chat-immersive')) $('immersive-toggle').click();
      $(target).click();
    });
  }
  title.addEventListener('close', () => titleReturnFocus?.focus());
  let gallerySignature;
  function showPreview(id, name) {
    $('vn-preview-name').textContent = name || '住人を選んでね';
    $('vn-preview-art').hidden = !id;
    if (id) $('vn-preview-art').src = portraitPath(id);
    $('vn-preview-state').textContent = id === (document.body.dataset.soulCharacter || select.value) ? 'いま、いっしょにいる' : 'タップして、おしゃべり';
  }
  function renderGallery() {
    const options = Array.from(select.options);
    const current = document.body.dataset.soulCharacter || select.value;
    const signature = String(select.disabled) + current + options.map(option => option.value).join('|');
    if (signature === gallerySignature) return;
    gallerySignature = signature;
    const fragment = document.createDocumentFragment();
    const focusId = options.some(option => option.value === current) ? current : options[0]?.value;
    for (const option of options) {
      const name = option.textContent.replace(/^\S+\s/, '');
      const card = document.createElement('button');
      card.type = 'button'; card.className = 'vn-resident'; card.dataset.persona = option.value;
      card.setAttribute('aria-pressed', String(option.value === current));
      card.setAttribute('aria-label', name + 'と話す');
      card.tabIndex = option.value === focusId ? 0 : -1;
      card.disabled = select.disabled;
      const image = document.createElement('img'); image.src = portraitPath(option.value);
      image.alt = ''; image.loading = 'lazy'; image.decoding = 'async';
      const label = document.createElement('strong'); label.textContent = name;
      const caption = document.createElement('small'); caption.textContent = option.value === current ? 'いま話している' : 'おしゃべりする';
      card.append(image,label,caption);
      card.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') showPreview(option.value,name); });
      card.addEventListener('focus', () => showPreview(option.value,name));
      card.addEventListener('click', () => {
        if (select.disabled) return;
        if (option.value !== document.body.dataset.soulCharacter) {
          select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles:true }));
        }
        if ($('chat-drawer').open) $('drawer-close').click();
      });
      fragment.append(card);
    }
    gallery.replaceChildren(fragment);
    $('vn-no-residents').hidden = options.length > 0;
    $('vn-resident-count').textContent = options.length + '人';
    const selected = options.find(option => option.value === current) || options[0];
    showPreview(selected?.value,selected?.textContent.replace(/^\S+\s/, ''));
    select.classList.add('vn-native-select');
    updateGalleryEdges();
  }
  function updateGalleryEdges() {
    gallery.dataset.atEnd = String(gallery.scrollHeight - gallery.scrollTop - gallery.clientHeight < 8);
  }
  gallery.addEventListener('scroll',updateGalleryEdges,{passive:true});
  new ResizeObserver(updateGalleryEdges).observe(gallery);
  gallery.addEventListener('keydown', event => {
    const cards = Array.from(gallery.querySelectorAll('button'));
    const current = cards.indexOf(document.activeElement);
    if (current < 0 || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const columns = getComputedStyle(gallery).gridTemplateColumns.split(/\s+/).length;
    const delta = {ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[event.key];
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? cards.length-1 : Math.max(0,Math.min(cards.length-1,current+delta));
    cards.forEach((card,index) => card.tabIndex = index === next ? 0 : -1);
    cards[next].focus({preventScroll:true});
    cards[next].scrollIntoView({block:'nearest',behavior:'instant'});
  });
  const observer = new MutationObserver(renderGallery);
  observer.observe(select,{childList:true,attributes:true,attributeFilter:['disabled']});
  select.addEventListener('change',renderGallery);
  document.addEventListener('chat:panel-open', event => {
    if (event.detail !== 'residents') return;
    requestAnimationFrame(() => {
      gallery.querySelector('[aria-pressed=true]')?.scrollIntoView({block:'nearest',behavior:'instant'});
      updateGalleryEdges();
    });
  });
  renderGallery();
  function syncPersona() {
    $('vn-title-persona').textContent = $('conversation-title').textContent.replace(/^\S+\s/, '');
    const image = $('settings-persona-art');
    if (image.getAttribute('src')) $('vn-menu-portrait').src = image.src;
  }
  new MutationObserver(syncPersona).observe($('conversation-title'), { childList: true, characterData: true, subtree: true });
  new MutationObserver(syncPersona).observe($('settings-persona-art'), { attributes: true, attributeFilter: ['src'] });
  syncPersona();
  function hideInterface(hidden) {
    document.body.dataset.vnHidden = String(hidden);
    $('vn-hide-ui').setAttribute('aria-pressed', String(hidden));
    (hidden ? $('vn-show-ui') : $('vn-hide-ui')).focus();
  }
  $('vn-hide-ui').addEventListener('click', () => hideInterface(true));
  $('vn-show-ui').addEventListener('click', () => hideInterface(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && title.open) { event.stopImmediatePropagation(); return; }
    if (event.key === 'Escape' && document.body.dataset.vnHidden === 'true') {
      event.preventDefault(); event.stopImmediatePropagation(); hideInterface(false);
    }
  }, true);
  new MutationObserver(() => {
    if (!document.body.classList.contains('chat-immersive')) document.body.dataset.vnHidden = 'false';
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  const url = new URL(location.href);
  if (url.searchParams.get('screen') === 'title' || (!url.searchParams.has('persona') && !url.searchParams.has('mode'))) openTitle();
}
