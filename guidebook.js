/* No library or network call is needed to read the guidebook.
   Source of truth: the four static articles in index.html. */
(() => {
  'use strict';
  const book = document.querySelector('.menu__book');
  const stage = document.getElementById('addon-stage');
  if (!book || !stage || stage.classList.contains('menu__stage--live')) return;
  const cards = [...stage.querySelectorAll('.menu__sheet')];
  const tabs = [...book.querySelectorAll('.menu__tab')];
  const prev = book.querySelector('.menu__prev');
  const next = book.querySelector('.menu__next');
  const position = book.querySelector('.guide__position');
  if (cards.length !== 4 || tabs.length !== cards.length || !prev || !next) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 900px)');
  const fine = matchMedia('(pointer: fine)');
  const DURATION = 850;
  const photos = [
    ['assets/table-mountain.jpg', 'Table Mountain across the bay at sunrise.', 'The city and the coast', '33°57′S · 18°24′E'],
    ['assets/winelands.jpg', 'A Cape Dutch homestead beneath a spreading tree in the Winelands.', 'Wider, and slower', '33°54′S · 19°07′E'],
    ['assets/peninsula.jpg', 'The Cape Peninsula dropping into the Atlantic Ocean.', 'The whole thing', '34°21′S · 18°29′E']
  ];
  const scene = document.createElement('div');
  scene.className = 'guide__scene';
  stage.before(scene);
  const canvas = document.createElement('div');
  canvas.className = 'guide__canvas';
  scene.append(canvas);
  canvas.append(stage);

  function textNode(tag, cls, value) {
    const node = document.createElement(tag);
    node.className = cls;
    node.textContent = value;
    return node;
  }
  const leaves = cards.map((card, i) => {
    const leaf = document.createElement('div');
    leaf.className = 'guide__leaf';
    card.classList.add('guide__face', 'guide__front');
    leaf.append(card);
    if (i > 0) {
      const foot = document.createElement('div');
      foot.className = 'guide__page-foot';
      foot.append(textNode('span', '', 'Unscripted Travel'));
      const enquire = textNode('a', '', 'Enquire about this journey');
      enquire.href = '#enquire';
      enquire.addEventListener('click', () => {
        const about = document.getElementById('about');
        if (about && !about.value.trim()) about.value = 'I’m interested in ' + card.querySelector('.menu__tour').textContent + '.';
      });
      foot.append(enquire);
      card.append(foot);
    }
    if (photos[i]) {
      const back = document.createElement('div');
      back.className = 'guide__face guide__back';
      back.append(textNode('p', 'guide__back-label', 'Unscripted Travel / Cape Town'));
      const figure = document.createElement('figure');
      figure.className = 'guide__photo';
      const image = document.createElement('img');
      image.src = photos[i][0]; image.alt = photos[i][1]; image.loading = 'lazy'; image.decoding = 'async';
      image.width = 500; image.height = 600;
      const caption = textNode('figcaption', '', photos[i][2]);
      caption.append(textNode('span', '', photos[i][3]));
      figure.append(image, caption);
      back.append(figure);
      leaf.append(back);
    }
    stage.append(leaf);
    return leaf;
  });

  let current = Math.max(0, cards.findIndex(card => '#' + card.id === location.hash));
  let target = current;
  let turning = false;
  let turnTimer = 0;
  let drag = null;
  let suppressClickUntil = 0;
  let sizingPending = false;
  let bookHeight = 580;
  let displayScale = 1;
  const pager = book.querySelector('.menu__pager');
  const pricing = book.querySelector('.guide__pricing');
  const gesture = book.querySelector('.guide__gesture');
  const label = i => i === 0 ? 'Front cover' : 'Page ' + i + ' of 3';

  const mobileTools = document.createElement('div');
  mobileTools.className = 'guide__mobile-tools';
  const mobilePosition = textNode('span', '', 'Front cover');
  mobilePosition.setAttribute('aria-live','polite');
  const readButton = textNode('button', '', 'Read this page');
  readButton.type = 'button';
  mobileTools.append(mobilePosition, readButton);
  scene.after(mobileTools);
  const reader = document.createElement('dialog');
  reader.className = 'guide__reader';
  reader.setAttribute('aria-labelledby','guide-reader-title');
  const readerHeader = document.createElement('div');
  readerHeader.className = 'guide__reader-header';
  const closeReader = textNode('button', '', 'Close');
  closeReader.type = 'button';
  readerHeader.append(textNode('p', '', 'Unscripted Travel Guide Book'),closeReader);
  const readerContent = document.createElement('div');
  readerContent.className = 'guide__reader-content';
  reader.append(readerHeader,readerContent);
  document.body.append(reader);
  // The reading view's tick boxes are the book's own: ticking a copy ticks the
  // row it was made from, which keeps the enquiry form in step as well.
  function readableRows(rows) {
    const copy = rows.cloneNode(true);
    const originals = [...rows.querySelectorAll('.menu__tick')];
    copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    copy.querySelectorAll('.menu__tick').forEach((tick, i) => {
      const original = originals[i];
      if (!original) return;
      tick.checked = original.checked;
      tick.removeAttribute('aria-labelledby');
      tick.removeAttribute('aria-describedby');
      const name = tick.closest('.menu__row')?.querySelector('.menu__name');
      if (name) tick.setAttribute('aria-label', name.textContent);
      tick.addEventListener('change', () => {
        original.checked = tick.checked;
        original.dispatchEvent(new Event('change', {bubbles:true}));
      });
    });
    return copy;
  }
  readButton.addEventListener('click', () => {
    if (current === 0 || turning || typeof reader.showModal !== 'function') return;
    const title = textNode('h2', '', cards[current].querySelector('.menu__tour').textContent);
    title.id = 'guide-reader-title';
    readerContent.replaceChildren(
      cards[current].querySelector('.menu__len').cloneNode(true),
      title,
      readableRows(cards[current].querySelector('.menu__rows')),
      textNode('p', '', pricing.textContent)
    );
    const enquire = textNode('a', 'guide__reader-enquire', 'Enquire about this journey');
    enquire.href = '#enquire';
    enquire.addEventListener('click', () => {
      reader.close();
      const about = document.getElementById('about');
      if (about && !about.value.trim()) about.value = 'I’m interested in ' + title.textContent + '.';
    });
    readerContent.append(enquire);
    reader.showModal();
    reader.scrollTop = 0;
  });
  closeReader.addEventListener('click', () => reader.close());
  reader.addEventListener('click', event => { if (event.target === reader) reader.close(); });

  book.classList.add('is-enhanced');
  stage.classList.add('menu__stage--live', 'guide--instant');
  stage.setAttribute('role', 'group');
  stage.setAttribute('aria-roledescription', 'interactive guidebook');
  stage.setAttribute('aria-label', 'Unscripted Travel Guide Book. Use left and right arrow keys to turn pages.');
  stage.tabIndex = 0;
  book.querySelector('.menu__pager').hidden = false;
  book.querySelector('.guide__gesture').hidden = false;

  function update() {
    const held = document.activeElement;
    // Desktop navigation stays beneath the book; mobile uses the pages themselves.
    if (pricing.nextElementSibling !== pager) pricing.after(pager);
    stage.classList.toggle('is-closed', current === 0);
    leaves.forEach((leaf, i) => {
      leaf.classList.toggle('is-turned', i < current);
      leaf.style.zIndex = String(i < current ? i + 1 : leaves.length * 2 - i);
      const front = cards[i];
      front.inert = i !== current;
      front.setAttribute('aria-hidden', String(i !== current));
      const back = leaf.querySelector('.guide__back');
      if (back) {
        const active = i === current - 1;
        back.inert = !active;
        back.setAttribute('aria-hidden', String(!active));
      }
      if (i === current) tabs[i].setAttribute('aria-current', 'page');
      else tabs[i].removeAttribute('aria-current');
    });
    prev.disabled = current === 0;
    next.disabled = current === cards.length - 1;
    if ((held === prev && prev.disabled) || (held === next && next.disabled)) stage.focus({preventScroll:true});
    next.innerHTML = (current === 0 ? 'Open book' : 'Next') + ' <span class="menu__arrow" aria-hidden="true">›</span>';
    next.setAttribute('aria-label', current === 0 ? 'Open the guidebook' : 'Next page');
    position.textContent = label(current);
    mobilePosition.textContent = label(current);
    readButton.hidden = current === 0 || typeof reader.showModal !== 'function';
    readButton.disabled = turning;
    // On the closed cover there is nothing to tick yet, so say how to open it.
    gesture.textContent = current === 0
      ? (narrow.matches ? 'Tap the book to open it · swipe to turn' : 'Click the cover to open the book, then drag a page or use the arrows.')
      : (narrow.matches ? 'Swipe to turn · tap to tick · pinch to zoom' : 'Drag a page, swipe, or use the arrows to turn. Click an extra to tick it.');
  }

  function fitSpread(page = current) {
    if (!narrow.matches) {
      displayScale = 1;
      canvas.style.removeProperty('--spread-scale');
      scene.style.removeProperty('height');
      return;
    }
    // A 1000px desktop canvas preserves both halves and their typesetting.
    // The closed cover is half that width, so it gets the full phone width.
    const available = Math.max(1, scene.clientWidth - 28);
    displayScale = Math.min(1, available / (page === 0 ? 500 : 1000));
    canvas.style.setProperty('--spread-scale', String(displayScale));
    scene.style.height = Math.ceil(bookHeight * displayScale + 40) + 'px';
  }

  function size() {
    if (turning || drag) { sizingPending = true; return; }
    sizingPending = false;
    stage.classList.add('guide--measure');
    const height = Math.ceil(Math.max(...[...stage.querySelectorAll('.guide__face')].map(face => face.scrollHeight))) + 2;
    stage.classList.remove('guide--measure');
    stage.style.height = height + 'px';
    bookHeight = height;
    fitSpread();
  }

  function syncHash() {
    // replaceState preserves the visitor's scroll position and avoids flooding Back.
    try { history.replaceState(null, '', '#' + cards[current].id); } catch (_) { /* file:// previews can restrict History. */ }
  }

  function finish(leaf, destination) {
    clearTimeout(turnTimer);
    leaf.classList.remove('is-turning');
    leaf.style.removeProperty('transform');
    leaf.style.removeProperty('transition');
    current = destination;
    turning = false;
    stage.removeAttribute('aria-busy');
    update();
    syncHash();
    if (sizingPending || narrow.matches) size();
    if (target !== current) turn();
  }

  function turn() {
    if (turning || target === current) return;
    if (reduce.matches) {
      stage.classList.add('guide--instant');
      current = target; update(); syncHash(); size();
      requestAnimationFrame(() => stage.classList.remove('guide--instant'));
      return;
    }
    turning = true;
    stage.setAttribute('aria-busy', 'true');
    const forward = target > current;
    const destination = current + (forward ? 1 : -1);
    fitSpread(destination);
    const leaf = leaves[forward ? current : destination];
    readButton.disabled = true;
    leaf.classList.add('is-turning');
    leaf.style.zIndex = '20';
    if (current === 0 || destination === 0) stage.classList.toggle('is-closed', destination === 0);
    // Commit the current (possibly dragged) angle before animating to the next face.
    void leaf.offsetWidth;
    leaf.style.removeProperty('transition');
    leaf.style.transform = forward ? 'rotateY(-180deg)' : 'rotateY(0deg)';
    turnTimer = setTimeout(() => finish(leaf, destination), DURATION + 40);
  }

  function bringPageIntoView() {
    if (narrow.matches && target !== current && scene.getBoundingClientRect().top < -24) {
      scene.scrollIntoView({block:'start', behavior:reduce.matches ? 'auto' : 'smooth'});
    }
  }

  function goTo(index) {
    if (drag) cancelDrag();
    target = Math.max(0, Math.min(cards.length - 1, index));
    bringPageIntoView();
    // A focused cover link must not become stranded in an inert face.
    if (cards.some(card => card.contains(document.activeElement))) stage.focus({preventScroll:true});
    turn();
  }

  tabs.forEach((tab, i) => tab.addEventListener('click', event => { event.preventDefault(); goTo(i); }));
  book.querySelector('.guide__open').addEventListener('click', event => { event.preventDefault(); goTo(1); });
  prev.addEventListener('click', () => goTo(target - 1));
  next.addEventListener('click', () => goTo(target + 1));
  book.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    const destinations = {ArrowRight:target + 1, PageDown:target + 1, ArrowLeft:target - 1, PageUp:target - 1, Home:0, End:cards.length - 1};
    if (event.key in destinations) { event.preventDefault(); goTo(destinations[event.key]); }
  });
  addEventListener('hashchange', () => {
    const index = cards.findIndex(card => '#' + card.id === location.hash);
    if (index >= 0) goTo(index);
  });

  function resetTilt() {
    stage.style.removeProperty('--book-rx');
    stage.style.removeProperty('--book-ry');
  }
  let tiltFrame = 0;
  stage.addEventListener('pointermove', event => {
    if (drag) {
      if (event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.active && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { cancelDrag(); return; }
      if (!drag.active && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        const forward = dx < 0;
        if ((forward && current === cards.length - 1) || (!forward && current === 0)) { cancelDrag(); return; }
        drag.active = true;
        drag.forward = forward;
        drag.leaf = leaves[forward ? current : current - 1];
        drag.leaf.classList.add('is-turning');
        drag.leaf.style.transition = 'none';
        drag.leaf.style.zIndex = '20';
        try { stage.setPointerCapture(event.pointerId); } catch (_) {}
      }
      if (drag.active && !reduce.matches) {
        const progress = Math.max(0, Math.min(1, dx * (drag.forward ? -1 : 1) / drag.width));
        drag.leaf.style.transform = 'rotateY(' + (drag.forward ? -progress * 155 : -180 + progress * 155) + 'deg)';
      }
      return;
    }
    if (current !== 0 || turning || narrow.matches || reduce.matches || !fine.matches || tiltFrame) return;
    tiltFrame = requestAnimationFrame(() => {
      tiltFrame = 0;
      if (drag || turning || current !== 0) return;
      const rect = scene.getBoundingClientRect();
      stage.style.setProperty('--book-rx', ((.5 - (event.clientY - rect.top) / rect.height) * 3).toFixed(2) + 'deg');
      stage.style.setProperty('--book-ry', (((event.clientX - rect.left) / rect.width - .5) * 5).toFixed(2) + 'deg');
    });
  }, {passive:true});
  stage.addEventListener('pointerleave', () => { resetTilt(); if (drag && !drag.active) cancelDrag(); });
  stage.addEventListener('pointerdown', event => {
    // A second finger belongs to native pinch zoom, never to a page turn.
    if (!event.isPrimary) { cancelDrag(); suppressClickUntil = Date.now() + 500; return; }
    if (turning || drag || !event.isPrimary || event.button !== 0 || event.target.closest('a,button,input,textarea')) return;
    resetTilt();
    // Pointer coordinates are screen pixels, so account for the fitted canvas.
    drag = {id:event.pointerId, x:event.clientX, y:event.clientY, width:leaves[0].offsetWidth * displayScale, active:false};
  });
  function cancelDrag() {
    if (!drag) return;
    const previous = drag;
    drag = null;
    if (stage.hasPointerCapture(previous.id)) stage.releasePointerCapture(previous.id);
    if (previous.leaf) {
      previous.leaf.classList.remove('is-turning');
      previous.leaf.style.removeProperty('transition');
      previous.leaf.style.removeProperty('transform');
    }
    update();
    if (sizingPending) size();
  }
  stage.addEventListener('pointerup', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const ended = drag;
    const dx = event.clientX - ended.x;
    const dy = event.clientY - ended.y;
    if (!ended.active) { cancelDrag(); return; }
    suppressClickUntil = Date.now() + 350;
    const commit = Math.abs(dx) > Math.min(75, ended.width * .16) && Math.abs(dx) > Math.abs(dy) * 1.25 && (dx < 0) === ended.forward;
    if (!commit) { cancelDrag(); return; }
    drag = null;
    if (stage.hasPointerCapture(ended.id)) stage.releasePointerCapture(ended.id);
    target = current + (ended.forward ? 1 : -1);
    bringPageIntoView();
    if (reduce.matches) {
      ended.leaf.style.removeProperty('transition'); ended.leaf.style.removeProperty('transform'); ended.leaf.classList.remove('is-turning');
    }
    turn();
  });
  stage.addEventListener('pointercancel', cancelDrag);
  // A touch pointer is implicitly captured by whatever it landed on, so taking
  // capture for the book fires a lost event for that first capture — a handover,
  // not a loss. Only a pointer the book no longer holds ends the drag; treating
  // the handover as a loss cancelled every swipe that began on a page.
  stage.addEventListener('lostpointercapture', event => {
    if (drag && !stage.hasPointerCapture(event.pointerId)) cancelDrag();
  });
  stage.addEventListener('click', event => {
    if (Date.now() < suppressClickUntil) { event.preventDefault(); return; }
    // A label is an extra's tick box: ticking one never turns the page.
    if (turning || event.target.closest('a,button,label')) return;
    if (current === 0) { goTo(1); return; }
    if (narrow.matches) {
      const face = event.target.closest('.guide__face');
      if (face?.classList.contains('guide__back')) goTo(current - 1);
      else if (face?.classList.contains('guide__front')) goTo(current + 1);
    }
  });

  update();
  scene.classList.add('guide--instant');
  size();
  requestAnimationFrame(() => { stage.classList.remove('guide--instant'); scene.classList.remove('guide--instant'); });
  if (document.fonts) document.fonts.ready.then(size);
  let resizeTimer;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { size(); if (!turning && !drag) update(); }, 120); }, {passive:true});
  stage.querySelectorAll('img').forEach(img => img.addEventListener('load', size));
  if ('ResizeObserver' in window) {
    let lastWidth = 0;
    new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      if (width > 0 && width !== lastWidth) { lastWidth = width; size(); }
    }).observe(scene);
  }

  // The separate editor may preview text changes. It has no live-site write API.
  addEventListener('message', event => {
    if (window.parent === window || event.source !== window.parent || event.origin !== location.origin || event.data?.type !== 'unscripted-guide-preview') return;
    const fields = event.data.fields;
    if (!Array.isArray(fields) || fields.length > 80) return;
    const allowed = editableFields();
    for (const field of fields) {
      if (typeof field?.key !== 'string' || typeof field.value !== 'string' || field.value.length > 800) continue;
      // Keys are emitted only by the editor and resolved against an explicit allowlist.
      const node = allowed.get(field.key);
      if (node) node.textContent = field.value;
    }
    cards.slice(1).forEach((card,i) => {
      tabs[i+1].textContent = card.querySelector('.menu__tour').textContent;
      const caption = leaves[i].querySelector('figcaption');
      if (caption) caption.firstChild.textContent = card.querySelector('.menu__tour').textContent;
    });
    size();
    if (Number.isInteger(event.data.page)) goTo(event.data.page);
  });
  function editableFields() {
    const result = new Map();
    ['title','edition','tagline','pricing','intro'].forEach(key => result.set(key, document.querySelector('[data-guide-' + key + ']')));
    cards.slice(1).forEach((card,i) => {
      result.set('journey.' + i + '.title', card.querySelector('.menu__tour'));
      result.set('journey.' + i + '.duration', card.querySelector('.menu__len'));
      card.querySelectorAll('.menu__row').forEach((row,j) => {
        ['name','note','price'].forEach(key => result.set('journey.' + i + '.item.' + j + '.' + key, row.querySelector('.menu__' + key)));
      });
    });
    return result;
  }
})();
