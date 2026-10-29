(() => {
  'use strict';
  const OWNER = 'vectorrboom';
  const REPO = 'vectorrboom.io';
  const BRANCH = 'main';
  const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
  const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/`;
  const SESSION_MS = 60 * 60 * 1000;
  const MAX_FILE_BYTES = 20 * 1024 * 1024;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const categories = ['misc', 'event', 'portraits', 'pets', 'pre-wedding', 'kids-babies'];
  const categoryAliases = {
    misc: ['misc', 'creative', 'other', 'others'], event: ['event', 'events'],
    portraits: ['portrait', 'portraits'], pets: ['pet', 'pets'],
    'pre-wedding': ['pre-wedding', 'prewedding', 'pre_wedding', 'wedding'],
    'kids-babies': ['kids-babies', 'kids_babies', 'kids', 'babies', 'baby', 'children', 'child']
  };
  const imageExt = /\.(jpe?g|png|webp|gif|avif|bmp)$/i;
  const videoExt = /\.(mp4|mov|webm|m4v)$/i;
  let allMedia = [];
  let activeFilter = 'all';
  let activeMediaType = 'image';
  let selectedFiles = [];
  let token = '';
  let sessionExpiresAt = 0;
  let gridLocked = true;
  let gridColumns = 5;
  let layoutOrder = [];
  let layoutSizes = {};
  let draggedPath = '';
  let resizeState = null;
  let lightboxIndex = 0;
  let previousFocus = null;
  let toastTimeout;

  const formatBytes = bytes => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  const titleFromPath = path => path.split('/').pop().replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const safePathName = name => name.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 150) || `upload-${Date.now()}`;
  const isMediaPath = path => imageExt.test(path) || videoExt.test(path);
  function categoryFromPath(path) {
    const parts = path.toLowerCase().split('/');
    for (const part of parts) for (const [category, aliases] of Object.entries(categoryAliases)) if (aliases.includes(part)) return category;
    return 'misc';
  }
  function toast(message) {
    const el = $('#toast'); el.textContent = message; el.classList.add('show');
    clearTimeout(toastTimeout); toastTimeout = setTimeout(() => el.classList.remove('show'), 3000);
  }
  function showModal(id) {
    const modal = $('#' + id); if (!modal) return; modal.hidden = false; document.body.style.overflow = 'hidden';
    const focusable = modal.querySelector('input,button,select'); setTimeout(() => focusable?.focus(), 20);
  }
  function hideModal(id) {
    const modal = $('#' + id); if (modal) modal.hidden = true;
    if ($$('.modal-backdrop:not([hidden])').length === 0 && !$('#lightbox').classList.contains('open')) document.body.style.overflow = '';
  }
  function currentSessionValid() { return Boolean(token && Date.now() < sessionExpiresAt); }
  function setGridLocked(locked) {
    gridLocked = locked;
    $('#gridEditor').hidden = locked;
    $('#photoGrid').classList.toggle('grid-editing', !locked);
    $('#gridLockStatus').textContent = locked ? 'Gallery locked' : 'Grid editing enabled';
    $('#lockGridButton').innerHTML = locked ? '<span aria-hidden="true">♙</span> Unlock Grid' : '<span aria-hidden="true">♙</span> Lock Grid';
    $$('.photo-item', $('#photoGrid')).forEach(card => { card.draggable = !locked; card.setAttribute('aria-grabbed', 'false'); });
  }
  function clearSession() {
    token = ''; sessionExpiresAt = 0; $('#githubToken').value = ''; $('#tokenStatus').textContent = '';
    $('#sessionPill').textContent = 'Locked';
    setGridLocked(true);
  }
  function requireSession() {
    if (currentSessionValid()) return true;
    clearSession(); showModal('tokenModal'); return false;
  }
  async function githubFetch(url, options = {}, accessToken = token) {
    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/vnd.github+json'); headers.set('X-GitHub-Api-Version', '2022-11-28');
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    return fetch(url, { ...options, headers });
  }
  async function validateToken(value) {
    const status = $('#tokenStatus'); const button = $('#validateTokenButton');
    status.className = 'inline-status'; status.textContent = ''; button.disabled = true; button.textContent = 'Please wait…';
    try {
      const userResponse = await githubFetch('https://api.github.com/user', {}, value);
      if (!userResponse.ok) throw new Error('Unable to continue. Please try again.');
      const user = await userResponse.json();
      const repoResponse = await githubFetch(API, {}, value);
      if (!repoResponse.ok) {
        throw new Error('Unable to continue. Please try again.');
      }
      const repo = await repoResponse.json();
      if (repo.full_name?.toLowerCase() !== `${OWNER}/${REPO}`.toLowerCase()) throw new Error('Unable to continue. Please try again.');
      if (repo.permissions && repo.permissions.push !== true && repo.permissions.admin !== true) throw new Error('Unable to continue. Please try again.');
      // GitHub may omit the permissions object in some responses; the actual write is still checked by GitHub at upload time.
      token = value; sessionExpiresAt = Date.now() + SESSION_MS; status.className = 'inline-status success';
      status.textContent = ''; 
      $('#sessionPill').textContent = 'Unlocked · 60 min';
      setGridLocked(false);
      $('#githubToken').value = '';
      setTimeout(() => { hideModal('tokenModal'); showModal('uploaderModal'); }, 650);
      return true;
    } catch (error) {
      status.className = 'inline-status error'; status.textContent = 'Unable to continue. Please try again.';
      token = ''; sessionExpiresAt = 0; return false;
    } finally { button.disabled = false; button.textContent = 'Continue'; }
  }
  async function loadGallery() {
    const grid = $('#photoGrid'); const status = $('#galleryStatus');
    try {
      const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`, { headers: { Accept: 'application/vnd.github+json' } });
      if (!response.ok) throw new Error(`Gallery API returned ${response.status}`);
      const data = await response.json();
      const paths = (data.tree || []).filter(item => item.type === 'blob' && isMediaPath(item.path) && /^(asset\/img\/|asset\/video\/|img\/)/i.test(item.path));
      allMedia = paths.map(item => ({ path: item.path, url: RAW + item.path.split('/').map(encodeURIComponent).join('/'), category: categoryFromPath(item.path), type: videoExt.test(item.path) ? 'video' : 'image', title: titleFromPath(item.path) })).filter(item => item.type === 'image' || item.type === 'video');
      allMedia.sort((a, b) => a.path.localeCompare(b.path));
      try {
        const layoutResponse = await fetch(`${RAW}asset/grid-layout.json?ts=${Date.now()}`, { cache: 'no-store' });
        if (layoutResponse.ok) { const layout = await layoutResponse.json(); if (Array.isArray(layout.order)) layoutOrder = layout.order; if (Number.isInteger(layout.columns)) gridColumns = Math.min(8, Math.max(2, layout.columns)); if (layout.sizes && typeof layout.sizes === 'object') layoutSizes = layout.sizes; }
      } catch (_) { /* first visit: use the default layout */ }
      $('#gridColumns').value = String(gridColumns);
      $('#photoGrid').style.setProperty('--grid-columns', gridColumns);
      renderGallery();
      status.textContent = `${allMedia.length} media file${allMedia.length === 1 ? '' : 's'} in the portfolio`;
      if (data.truncated) status.textContent += ' · Some repository files may not be listed by GitHub’s tree response.';
    } catch (error) {
      grid.innerHTML = '<div class="loading-card">The gallery could not connect to GitHub. Please refresh or check that the repository is public.</div>';
      status.textContent = 'Could not load the live gallery. Upload controls may still work after token validation.';
    }
  }
  function visibleMedia() { return allMedia.filter(item => (activeFilter === 'all' || item.category === activeFilter) && item.type === 'image'); }
  function updateCounts() {
    $('#count-all').textContent = allMedia.filter(x => x.type === 'image').length;
    for (const category of categories) $(`#count-${category}`).textContent = allMedia.filter(x => x.type === 'image' && x.category === category).length;
  }
  function renderGallery() {
    const grid = $('#photoGrid'); grid.replaceChildren(); updateCounts();
    let items = visibleMedia();
    if (layoutOrder.length) { const rank = new Map(layoutOrder.map((path, index) => [path, index])); items.sort((a, b) => (rank.get(a.path) ?? 999999) - (rank.get(b.path) ?? 999999) || a.path.localeCompare(b.path)); }
    $('#emptyState').hidden = items.length > 0;
    if (!items.length) { grid.hidden = true; return; }
    grid.hidden = false;
    for (const item of items) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'photo-item'; button.setAttribute('aria-label', `View ${item.title}`); button.draggable = !gridLocked; button.dataset.path = item.path; button.setAttribute('aria-grabbed', 'false');
      const savedSize = layoutSizes[item.path] || { cols: 1, rows: 2 };
      button.style.setProperty('--item-cols', String(Math.max(1, Math.min(gridColumns, Number(savedSize.cols) || 1))));
      button.style.setProperty('--item-rows', String(Math.max(1, Math.min(8, Number(savedSize.rows) || 2))));
      const img = document.createElement('img'); img.src = item.url; img.alt = `${item.title} — Vectorrboom photography`; img.loading = 'lazy'; img.decoding = 'async';
      img.addEventListener('error', () => button.remove(), { once: true });
      const label = document.createElement('span'); label.className = 'photo-label'; label.textContent = item.title;
      button.append(img, label);
      const resizeHandle = document.createElement('span'); resizeHandle.className = 'resize-handle'; resizeHandle.setAttribute('role', 'button'); resizeHandle.setAttribute('tabindex', '0'); resizeHandle.setAttribute('aria-label', `Resize ${item.title}`); resizeHandle.title = 'Drag to resize this photo';
      resizeHandle.addEventListener('pointerdown', event => startResize(event, button, item.path));
      resizeHandle.addEventListener('click', event => event.stopPropagation());
      resizeHandle.addEventListener('keydown', event => { if (gridLocked || !['ArrowRight','ArrowLeft','ArrowUp','ArrowDown'].includes(event.key)) return; event.preventDefault(); event.stopPropagation(); const current = layoutSizes[item.path] || { cols: 1, rows: 2 }; const maxCols = getVisibleColumnCount(); const next = { cols: Math.max(1, Math.min(maxCols, current.cols + (event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0))), rows: Math.max(1, Math.min(8, current.rows + (event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0))) }; layoutSizes[item.path] = next; button.style.setProperty('--item-cols', next.cols); button.style.setProperty('--item-rows', next.rows); toast('Photo size changed. Save layout to publish it.'); });
      button.append(resizeHandle);
      button.addEventListener('click', event => { if (event.target.closest('.resize-handle')) return; if (gridLocked) openLightbox(item); });
      button.addEventListener('dragstart', event => { if (gridLocked) { event.preventDefault(); return; } draggedPath = item.path; button.classList.add('dragging'); button.setAttribute('aria-grabbed', 'true'); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', item.path); });
      button.addEventListener('dragend', () => { button.classList.remove('dragging'); button.setAttribute('aria-grabbed', 'false'); $$('.photo-item').forEach(card => card.classList.remove('drop-target')); });
      button.addEventListener('dragover', event => { if (gridLocked || !draggedPath || draggedPath === item.path) return; event.preventDefault(); event.dataTransfer.dropEffect = 'move'; button.classList.add('drop-target'); });
      button.addEventListener('dragleave', () => button.classList.remove('drop-target'));
      button.addEventListener('drop', event => { if (gridLocked || !draggedPath || draggedPath === item.path) return; event.preventDefault(); button.classList.remove('drop-target'); const from = allMedia.findIndex(x => x.path === draggedPath); const to = allMedia.findIndex(x => x.path === item.path); if (from < 0 || to < 0) return; const [moved] = allMedia.splice(from, 1); allMedia.splice(to, 0, moved); layoutOrder = allMedia.map(x => x.path); renderGallery(); toast('Photo order changed. Save layout to publish it.'); });
      grid.append(button);
    }
  }
  function getVisibleColumnCount() {
    const template = getComputedStyle($('#photoGrid')).gridTemplateColumns;
    return Math.max(1, template.split(' ').filter(Boolean).length);
  }
  function startResize(event, card, path) {
    if (gridLocked || !currentSessionValid()) return;
    event.preventDefault(); event.stopPropagation();
    const rect = card.getBoundingClientRect();
    resizeState = { card, path, startX: event.clientX, startY: event.clientY, startWidth: rect.width, startHeight: rect.height, original: layoutSizes[path] || { cols: 1, rows: 2 }, moved: false };
    card.classList.add('resizing');
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch (_) {}
    const onMove = moveEvent => {
      if (!resizeState) return;
      const gridStyle = getComputedStyle($('#photoGrid'));
      const gap = parseFloat(gridStyle.columnGap) || 0;
      const rowGap = parseFloat(gridStyle.rowGap) || 0;
      const cellWidth = (parseFloat(gridStyle.width) - gap * (getVisibleColumnCount() - 1)) / getVisibleColumnCount();
      const rowHeight = parseFloat(gridStyle.gridAutoRows) || 72;
      const cols = Math.max(1, Math.min(getVisibleColumnCount(), Math.round((resizeState.startWidth + moveEvent.clientX - resizeState.startX + gap) / (cellWidth + gap))));
      const rows = Math.max(1, Math.min(8, Math.round((resizeState.startHeight + moveEvent.clientY - resizeState.startY + rowGap) / (rowHeight + rowGap))));
      resizeState.moved = true;
      layoutSizes[path] = { cols, rows };
      card.style.setProperty('--item-cols', cols); card.style.setProperty('--item-rows', rows);
    };
    const finish = () => {
      if (!resizeState) return;
      const didMove = resizeState.moved;
      resizeState.card.classList.remove('resizing');
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', finish); window.removeEventListener('pointercancel', finish);
      resizeState = null;
      if (didMove) toast('Photo resized. Save layout to publish it.');
    };
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', finish, { once: true }); window.addEventListener('pointercancel', finish, { once: true });
  }

  function openLightbox(item) {
    const visible = visibleMedia(); lightboxIndex = visible.findIndex(x => x.path === item.path); if (lightboxIndex < 0) return;
    previousFocus = document.activeElement; $('#lightbox').classList.add('open'); $('#lightbox').setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; showLightboxItem(); $('#closeLightbox').focus();
  }
  function showLightboxItem() {
    const visible = visibleMedia(); if (!visible.length) return; lightboxIndex = (lightboxIndex + visible.length) % visible.length;
    const item = visible[lightboxIndex]; $('#lightboxImage').src = item.url; $('#lightboxImage').alt = item.title; $('#lightboxCaption').textContent = `${item.title} · ${item.category}`;
  }
  function closeLightbox() { $('#lightbox').classList.remove('open'); $('#lightbox').setAttribute('aria-hidden', 'true'); $('#lightboxImage').removeAttribute('src'); if ($$('.modal-backdrop:not([hidden])').length === 0) document.body.style.overflow = ''; previousFocus?.focus?.(); }
  function setMediaType(type) {
    activeMediaType = type; $$('.media-switch button').forEach(button => button.classList.toggle('selected', button.dataset.media === type));
    $('#fileInput').accept = type === 'image' ? 'image/jpeg,image/png,image/webp,image/gif,image/avif' : 'video/mp4,video/quicktime,video/webm,video/x-m4v';
    $('#fileHelp').textContent = type === 'image' ? 'JPG, PNG, WebP, GIF, AVIF · max 20 MB per file' : 'MP4, MOV, WebM · max 20 MB per file';
    selectedFiles = []; renderSelectedFiles(); $('#uploadNotice').textContent = '';
  }
  function validateFile(file) {
    if (file.size > MAX_FILE_BYTES) return `“${file.name}” is larger than 20 MB.`;
    const allowed = activeMediaType === 'image' ? imageExt.test(file.name) && file.type.startsWith('image/') : videoExt.test(file.name) && file.type.startsWith('video/');
    if (!allowed) return `“${file.name}” does not look like a supported ${activeMediaType} file.`;
    return '';
  }
  function addFiles(files) {
    const notice = $('#uploadNotice'); const rejected = [];
    for (const file of [...files]) {
      const error = validateFile(file); if (error) { rejected.push(error); continue; }
      if (selectedFiles.some(item => item.file.name === file.name && item.file.size === file.size)) continue;
      selectedFiles.push({ file, id: `${file.name}-${file.size}-${Math.random().toString(16).slice(2)}`, status: 'Ready', progress: 0 });
    }
    notice.className = 'upload-notice' + (rejected.length ? ' error' : ''); notice.textContent = rejected.join(' ');
    renderSelectedFiles();
  }
  function renderSelectedFiles() {
    const container = $('#selectedFiles'); container.replaceChildren();
    for (const item of selectedFiles) {
      const row = document.createElement('div'); row.className = 'file-row';
      const thumb = document.createElement(item.file.type.startsWith('image/') ? 'img' : 'div'); thumb.className = 'file-thumb';
      if (thumb.tagName === 'IMG') { thumb.src = URL.createObjectURL(item.file); thumb.alt = ''; } else thumb.textContent = '▶';
      const info = document.createElement('div'); info.className = 'file-info';
      const name = document.createElement('span'); name.className = 'file-name'; name.textContent = item.file.name;
      const size = document.createElement('span'); size.className = 'file-size'; size.textContent = `${formatBytes(item.file.size)} · ${item.status}`;
      info.append(name, size);
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'file-remove'; remove.textContent = '×'; remove.setAttribute('aria-label', `Remove ${item.file.name}`); remove.disabled = item.status === 'Uploading';
      remove.addEventListener('click', () => { selectedFiles = selectedFiles.filter(x => x.id !== item.id); renderSelectedFiles(); });
      row.append(thumb, info, remove);
      if (item.status === 'Uploading' || item.status === 'Uploaded') { const bar = document.createElement('div'); bar.className = 'file-progress'; const fill = document.createElement('span'); fill.style.width = `${item.progress}%`; bar.append(fill); row.append(bar); }
      if (item.status === 'Uploaded') size.classList.add('done'); container.append(row);
    }
    $('#startUpload').disabled = !selectedFiles.length || selectedFiles.every(x => x.status === 'Uploaded') || !currentSessionValid();
  }
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
      reader.onload = () => { const result = String(reader.result || ''); resolve(result.slice(result.indexOf(',') + 1)); }; reader.readAsDataURL(file);
    });
  }
  function xhrPut(url, payload, accessToken, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest(); xhr.open('PUT', url); xhr.setRequestHeader('Accept', 'application/vnd.github+json'); xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`); xhr.setRequestHeader('X-GitHub-Api-Version', '2022-11-28'); xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.upload.addEventListener('progress', event => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)); });
      xhr.onload = () => { let data = {}; try { data = JSON.parse(xhr.responseText); } catch (_) {} if (xhr.status >= 200 && xhr.status < 300) resolve(data); else reject(new Error(data.message || `GitHub upload failed (HTTP ${xhr.status}).`)); };
      xhr.onerror = () => reject(new Error('Network error while uploading to GitHub. Check your connection and try again.'));
      xhr.ontimeout = () => reject(new Error('Upload timed out. Try a smaller file or a more stable connection.')); xhr.timeout = 180000; xhr.send(JSON.stringify(payload));
    });
  }
  async function uploadOne(item, category, index, total) {
    if (!currentSessionValid()) throw new Error('Your one-hour session expired. Validate the token again.');
    const file = item.file; const folder = activeMediaType === 'image' ? 'asset/img' : 'asset/video';
    const path = `${folder}/${category}/${safePathName(file.name)}`;
    const statusEl = $('#uploadNotice'); item.status = 'Preparing'; item.progress = 0; renderSelectedFiles();
    const encoded = await fileToBase64(file);
    const existingResponse = await githubFetch(`${API}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${BRANCH}`);
    let sha;
    if (existingResponse.ok) {
      const existing = await existingResponse.json(); sha = existing.sha;
      if (!window.confirm(`${path} already exists. Replace it?`)) { item.status = 'Skipped'; item.progress = 0; renderSelectedFiles(); return false; }
    } else if (existingResponse.status !== 404) {
      const err = await existingResponse.json().catch(() => ({})); throw new Error(err.message || `Could not check whether ${file.name} already exists.`);
    }
    item.status = 'Uploading'; renderSelectedFiles();
    const payload = { message: `${sha ? 'Update' : 'Add'} ${activeMediaType}: ${file.name}`, content: encoded, branch: BRANCH };
    if (sha) payload.sha = sha;
    await xhrPut(`${API}/contents/${path.split('/').map(encodeURIComponent).join('/')}`, payload, token, percent => {
      item.progress = percent; item.status = 'Uploading';
      const row = $$('.file-row').find(el => el.querySelector('.file-name')?.textContent === file.name);
      const fill = row?.querySelector('.file-progress span'); if (fill) fill.style.width = `${percent}%`;
      const size = row?.querySelector('.file-size'); if (size) size.textContent = `${formatBytes(file.size)} · Uploading ${percent}%`;
    });
    item.status = 'Uploaded'; item.progress = 100; renderSelectedFiles();
    statusEl.className = 'upload-notice success'; statusEl.textContent = `Uploaded ${index} of ${total}: ${file.name}`;
    return true;
  }
  async function startUpload() {
    if (!requireSession()) return;
    const category = $('#uploadCategory').value;
    const pending = selectedFiles.filter(item => item.status !== 'Uploaded' && item.status !== 'Skipped');
    if (!pending.length) return;
    $('#startUpload').disabled = true; $('#clearFiles').disabled = true; $('#uploadNotice').className = 'upload-notice';
    let completed = 0; let failures = [];
    for (const item of pending) {
      try { if (await uploadOne(item, category, ++completed, pending.length)) toast(`Uploaded ${item.file.name}`); }
      catch (error) { item.status = 'Failed'; failures.push(`${item.file.name}: ${error.message}`); renderSelectedFiles(); }
    }
    $('#clearFiles').disabled = false; renderSelectedFiles();
    if (failures.length) { $('#uploadNotice').className = 'upload-notice error'; $('#uploadNotice').textContent = failures.join(' · '); }
    else { $('#uploadNotice').className = 'upload-notice success'; $('#uploadNotice').textContent = 'Upload queue finished. GitHub Pages may take a few minutes to publish the changes.'; }
    await loadGallery();
  }

  async function saveGridLayout() {
    if (!requireSession()) return;
    gridColumns = Math.min(8, Math.max(2, Number($('#gridColumns').value) || 5));
    $('#photoGrid').style.setProperty('--grid-columns', gridColumns);
    const status = $('#gridLockStatus');
    status.textContent = 'Saving layout…';

    // Persist only image cards that actually belong to this gallery. Read the
    // current DOM order so drag-and-drop is reflected in the saved JSON.
    const validImagePaths = new Set(allMedia.filter(item => item.type === 'image').map(item => item.path));
    const currentGridOrder = $$('.photo-item', $('#photoGrid'))
      .map(card => card.dataset.path)
      .filter(path => validImagePaths.has(path));
    const alreadyIncluded = new Set(currentGridOrder);
    const remainingImages = allMedia
      .filter(item => item.type === 'image' && !alreadyIncluded.has(item.path))
      .map(item => item.path);
    layoutOrder = [...currentGridOrder, ...remainingImages];

    // Discard size entries for deleted files and normalize dimensions.
    const cleanSizes = {};
    for (const [path, size] of Object.entries(layoutSizes || {})) {
      if (!validImagePaths.has(path) || !size || typeof size !== 'object') continue;
      cleanSizes[path] = {
        cols: Math.max(1, Math.min(gridColumns, Number(size.cols) || 1)),
        rows: Math.max(1, Math.min(8, Number(size.rows) || 2))
      };
    }
    layoutSizes = cleanSizes;

    const path = 'asset/grid-layout.json';
    const url = `${API}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
    const content = JSON.stringify({
      version: 1,
      columns: gridColumns,
      order: layoutOrder,
      sizes: layoutSizes,
      updatedAt: new Date().toISOString()
    }, null, 2);
    const encodedContent = btoa(unescape(encodeURIComponent(content)));

    try {
      // GitHub can reject a write if the file changed after its SHA was read
      // (for example, another tab or commit updated the layout). Re-fetch the
      // latest SHA and retry a few times rather than leaving the user stuck.
      let lastError = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        if (!currentSessionValid()) throw new Error('Session expired. Please unlock the editor again.');
        const existingResponse = await githubFetch(`${url}?ref=${BRANCH}&ts=${Date.now()}`);
        let sha;
        if (existingResponse.ok) {
          const existing = await existingResponse.json();
          sha = existing.sha;
          if (!sha) throw new Error('Could not read the current layout version.');
        } else if (existingResponse.status !== 404) {
          const data = await existingResponse.json().catch(() => ({}));
          throw new Error(data.message || `Could not check the current layout (HTTP ${existingResponse.status}).`);
        }

        const payload = {
          message: `Update portfolio grid layout (attempt ${attempt})`,
          content: encodedContent,
          branch: BRANCH
        };
        if (sha) payload.sha = sha;
        const response = await githubFetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          status.textContent = 'Layout saved to GitHub';
          toast('Grid layout saved. It will appear for all visitors after GitHub Pages updates.');
          return;
        }

        const data = await response.json().catch(() => ({}));
        lastError = new Error(data.message || `Could not save layout (HTTP ${response.status}).`);
        const conflict = response.status === 409 || response.status === 422 || /does not match|sha|conflict/i.test(lastError.message);
        if (!conflict || attempt === 3) throw lastError;
        status.textContent = `Refreshing layout version (${attempt}/3)…`;
        await new Promise(resolve => setTimeout(resolve, 350 * attempt));
      }
      throw lastError || new Error('Could not save the layout. Please try again.');
    } catch (error) {
      status.textContent = 'Layout not saved';
      const message = /does not match|sha|conflict/i.test(error.message || '')
        ? 'The layout changed on GitHub while saving. Please click Save Layout once more.'
        : (error.message || 'Could not save the grid layout.');
      toast(message);
    }
  }

  // Gallery filters.
  $$('#filters [data-filter]').forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter; $$('#filters [data-filter]').forEach(b => b.classList.toggle('active', b === button)); renderGallery();
  }));
  $('#openUploader').addEventListener('click', () => { if (requireSession()) showModal('uploaderModal'); });
  $('#lockGridButton').addEventListener('click', () => {
    if (currentSessionValid() && !gridLocked) { setGridLocked(true); toast('Grid editing locked.'); }
    else if (currentSessionValid() && gridLocked) { setGridLocked(false); toast('Grid editing unlocked. Drag photos or change columns, then save.'); }
    else { showModal('tokenModal'); }
  });
  $('#gridColumns').addEventListener('change', () => { gridColumns = Number($('#gridColumns').value) || 5; $('#photoGrid').style.setProperty('--grid-columns', gridColumns); });
  $('#saveGridLayout').addEventListener('click', saveGridLayout);
  $('#tokenForm').addEventListener('submit', async event => { event.preventDefault(); const value = $('#githubToken').value.trim(); if (!value) return; await validateToken(value); });
  $('#toggleTokenVisibility').addEventListener('click', () => { const input = $('#githubToken'); input.type = input.type === 'password' ? 'text' : 'password'; $('#toggleTokenVisibility').setAttribute('aria-label', input.type === 'password' ? 'Show token' : 'Hide token'); });
  $$('[data-close-modal]').forEach(button => button.addEventListener('click', () => hideModal(button.dataset.closeModal)));
  $$('.modal-backdrop').forEach(backdrop => backdrop.addEventListener('click', event => { if (event.target === backdrop) hideModal(backdrop.id); }));
  $$('.media-switch button').forEach(button => button.addEventListener('click', () => setMediaType(button.dataset.media)));
  $('#browseFiles').addEventListener('click', () => $('#fileInput').click());
  $('#dropZone').addEventListener('click', event => { if (!event.target.closest('button')) $('#fileInput').click(); });
  $('#dropZone').addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); $('#fileInput').click(); } });
  $('#fileInput').addEventListener('change', event => { addFiles(event.target.files); event.target.value = ''; });
  const drop = $('#dropZone');
  ['dragenter', 'dragover'].forEach(name => drop.addEventListener(name, event => { event.preventDefault(); drop.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach(name => drop.addEventListener(name, event => { event.preventDefault(); drop.classList.remove('dragover'); }));
  drop.addEventListener('drop', event => addFiles(event.dataTransfer.files));
  $('#clearFiles').addEventListener('click', () => { selectedFiles = []; renderSelectedFiles(); $('#uploadNotice').textContent = ''; });
  $('#startUpload').addEventListener('click', startUpload);
  $('#closeLightbox').addEventListener('click', closeLightbox);
  $('#prevPhoto').addEventListener('click', () => { lightboxIndex--; showLightboxItem(); });
  $('#nextPhoto').addEventListener('click', () => { lightboxIndex++; showLightboxItem(); });
  $('#lightbox').addEventListener('click', event => { if (event.target === $('#lightbox')) closeLightbox(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { if ($('#lightbox').classList.contains('open')) closeLightbox(); else $$('.modal-backdrop:not([hidden])').forEach(m => hideModal(m.id)); }
    if ($('#lightbox').classList.contains('open') && event.key === 'ArrowLeft') { lightboxIndex--; showLightboxItem(); }
    if ($('#lightbox').classList.contains('open') && event.key === 'ArrowRight') { lightboxIndex++; showLightboxItem(); }
  });
  $('#backToTop').addEventListener('click', event => { event.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  $('#year').textContent = new Date().getFullYear();
  setInterval(() => { if (token && Date.now() >= sessionExpiresAt) { clearSession(); toast('Your one-hour editor session expired.'); } }, 15000);
  loadGallery();
})();
