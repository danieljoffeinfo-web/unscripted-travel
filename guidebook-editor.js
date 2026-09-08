(() => {
  'use strict';
  const form = document.getElementById('editor-form');
  const fields = document.getElementById('fields');
  const select = document.getElementById('page-select');
  const status = document.getElementById('editor-status');
  const download = document.getElementById('download');
  const importer = document.getElementById('import');
  const preview = document.getElementById('preview');
  const retry = document.getElementById('load-retry');
  let source = null;
  let descriptors = [];
  let dirty = false;
  let debounce;

  const globals = [
    ['title', 'Cover title', 60, false],
    ['edition', 'Cover location / edition', 80, false],
    ['tagline', 'Cover closing line', 100, false],
    ['intro', 'Introduction above the book', 500, true],
    ['pricing', 'Pricing note below the book', 350, true]
  ];
  function describe(doc) {
    const list = globals.map(([key,label,max,multiline]) => ({key,label,max,multiline,page:0,node:doc.querySelector('[data-guide-' + key + ']')}));
    const cards = [...doc.querySelectorAll('#addon-stage > .menu__sheet:not(.menu__cover)')];
    if (cards.length !== 3) throw new Error('This file does not contain the three guidebook journeys.');
    cards.forEach((card,i) => {
      list.push({key:'journey.'+i+'.title',label:'Journey title',max:90,page:i+1,node:card.querySelector('.menu__tour')});
      list.push({key:'journey.'+i+'.duration',label:'Duration',max:60,page:i+1,node:card.querySelector('.menu__len')});
      const rows = [...card.querySelectorAll('.menu__row')];
      if (rows.length !== 4) throw new Error('Each journey must have four menu items.');
      rows.forEach((row,j) => {
        [['name','Experience',120,false],['note','Description',500,true],['price','Price (for example R 1 250 or On request)',60,false]].forEach(([key,label,max,multiline]) => {
          list.push({key:'journey.'+i+'.item.'+j+'.'+key,label,max,multiline,page:i+1,item:j,node:row.querySelector('.menu__'+key)});
        });
      });
    });
    if (list.some(item => !item.node)) throw new Error('Required guidebook content is missing from this file.');
    return list;
  }
  function setStatus(message, error=false) {
    status.textContent = message;
    status.toggleAttribute('data-error', error);
  }
  function updateIndex() {
    const tabs = [...source.querySelectorAll('.menu__tab')];
    for (let i=0; i<3; i++) {
      const title = descriptors.find(item => item.key === 'journey.'+i+'.title').node.textContent;
      tabs[i+1].textContent = title;
      select.options[i+1].textContent = title;
    }
  }
  function sendPreview(turnPage=false) {
    if (!source) return;
    const payload = {type:'unscripted-guide-preview',fields:descriptors.map(item => ({key:item.key,value:item.node.textContent}))};
    if (turnPage) payload.page = Number(select.value);
    preview.contentWindow.postMessage(payload, location.origin);
  }
  function renderFields() {
    fields.replaceChildren();
    const page = Number(select.value);
    let lastItem = -1;
    for (const item of descriptors.filter(item => item.page === page)) {
      if (item.item !== undefined && item.item !== lastItem) {
        const heading = document.createElement('h3');
        heading.textContent = 'Extra ' + (item.item + 1);
        fields.append(heading); lastItem = item.item;
      }
      const label = document.createElement('label');
      label.htmlFor = item.key; label.textContent = item.label;
      const input = document.createElement(item.multiline ? 'textarea' : 'input');
      input.id = item.key; input.name = item.key; input.value = item.node.textContent.trim(); input.maxLength = item.max;
      input.required = !item.key.endsWith('.note');
      if (!item.multiline) input.type = 'text';
      input.addEventListener('input', () => {
        item.node.textContent = input.value;
        dirty = true;
        updateIndex();
        setStatus('Unsaved draft. Download when you’re happy with the preview.');
        clearTimeout(debounce); debounce = setTimeout(() => sendPreview(), 160);
      });
      fields.append(label,input);
    }
  }
  async function load() {
    retry.hidden = true;
    try {
      const response = await fetch('index.html', {cache:'no-store'});
      if (!response.ok) throw new Error('The current site could not be loaded.');
      source = new DOMParser().parseFromString(await response.text(), 'text/html');
      descriptors = describe(source);
      select.querySelectorAll('option:not(:first-child)').forEach(option => option.remove());
      for (let i=0;i<3;i++) { const option=document.createElement('option'); option.value=String(i+1); select.append(option); }
      updateIndex(); renderFields();
      download.disabled = false; importer.disabled = false; form.hidden = false;
      setStatus('Current published content loaded. Nothing has been changed.');
      sendPreview(true);
    } catch (error) {
      source = null; download.disabled = true; importer.disabled = true;
      retry.hidden = false;
      setStatus(error.message + ' Open this editor from the hosted website, not by double-clicking a local file.', true);
    }
  }
  select.addEventListener('change', () => { renderFields(); sendPreview(true); });
  form.addEventListener('submit', event => event.preventDefault());
  retry.addEventListener('click', load);
  preview.addEventListener('load', () => {
    // Only the embedded preview hides other sections; the downloaded site stays intact.
    try {
      const doc = preview.contentDocument;
      const style = doc.createElement('style');
      style.textContent = 'main > section:not(#add-ons),body > footer{display:none!important}#add-ons{padding-block:35px!important}#add-ons>.wrap>.reveal{display:none!important}.menu__book{margin-top:0!important}.menu__index{margin-bottom:26px!important}.wrap{padding-inline:24px!important}.guide__scene{perspective:2200px}';
      doc.head.append(style);
      preview.contentWindow.scrollTo(0,0);
      sendPreview(true);
    } catch (_) { setStatus('The preview could not open. Your edits can still be downloaded.',true); }
  });
  download.addEventListener('click', () => {
    if (!source || !form.reportValidity()) return;
    const invalid = descriptors.find(item => (!item.key.endsWith('.note') && !item.node.textContent.trim()) || item.node.textContent.length > item.max);
    if (invalid) {
      select.value=String(invalid.page); renderFields();
      document.getElementById(invalid.key).focus();
      setStatus('Please check: '+invalid.label+'.',true); return;
    }
    updateIndex();
    // Export the untouched source document with only approved text fields changed.
    // Runtime flipbook wrappers and editor preview styles are never exported.
    const blob = new Blob(['<!doctype html>\n'+source.documentElement.outerHTML+'\n'],{type:'text/html;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href=url; anchor.download='index.html';
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    dirty=false;
    setStatus('Updated index.html downloaded. Upload it to the repository and commit to publish.');
  });
  importer.addEventListener('change', async () => {
    const file=importer.files[0]; if (!file || !source) return;
    try {
      if (file.size > 2000000) throw new Error('Choose an exported index.html smaller than 2 MB.');
      if (dirty && !confirm('Replace the unsaved edits in this tab with the saved draft?')) return;
      const doc=new DOMParser().parseFromString(await file.text(),'text/html');
      const imported=describe(doc);
      if (imported.some(item => item.node.textContent.length > item.max)) throw new Error('The draft contains a field that is too long.');
      const values=new Map(imported.map(item => [item.key,item.node.textContent]));
      // Import text only, never scripts, links, styles or arbitrary markup.
      descriptors.forEach(item => { item.node.textContent=values.get(item.key); });
      dirty=true; updateIndex(); renderFields(); sendPreview(true);
      setStatus('Saved draft opened. Check the preview and download to keep any further changes.');
    } catch(error) { setStatus(error.message,true); }
    finally { importer.value=''; }
  });
  addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue=''; } });
  load();
})();
