// ── State ─────────────────────────────────────────────────
let files = [];
let activeFile = null;
let currentFilter = 'all';

// ── DOM refs ──────────────────────────────────────────────
const fileList = document.getElementById('fileList');
const fileCount = document.getElementById('fileCount');
const dropZone = document.getElementById('dropZone');
const btnAdd = document.getElementById('btnAdd');
const btnFolder = document.getElementById('btnFolder');
const btnClearAll = document.getElementById('btnClearAll');
const btnScrub = document.getElementById('btnScrub');
const scrubLabel = document.getElementById('scrubLabel');
const chkSelectAll = document.getElementById('chkSelectAll');
const emptyState = document.getElementById('emptyState');
const fileView = document.getElementById('fileView');
const mainTitle = document.getElementById('mainTitle');
const topbarActions = document.getElementById('topbarActions');
const catBadge = document.getElementById('catBadge');
const sizeBadge = document.getElementById('sizeBadge');
const btnOpenFile = document.getElementById('btnOpenFile');
const metaPills = document.getElementById('metaPills');
const metaContent = document.getElementById('metaContent');
const btnScrubSingle = document.getElementById('btnScrubSingle');
const previewImg = document.getElementById('previewImg');
const audioPreview = document.getElementById('audioPreview');
const audioPlayer = document.getElementById('audioPlayer');
const videoPreview = document.getElementById('videoPreview');
const previewPlaceholder = document.getElementById('previewPlaceholder');
const fileTypeIcon = document.getElementById('fileTypeIcon');
const fileTypeLabel = document.getElementById('fileTypeLabel');
const beforeAfterBadge = document.getElementById('beforeAfterBadge');
const baFill = document.getElementById('baFill');
const baPct = document.getElementById('baPct');
const toasts = document.getElementById('toasts');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const statTotal = document.getElementById('statTotal');
const statDirty = document.getElementById('statDirty');
const statClean = document.getElementById('statClean');
const statScrubbed = document.getElementById('statScrubbed');
const reportList = document.getElementById('reportList');
const btnExport = document.getElementById('btnExport');

// ── Tabs ──────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    tab.classList.add('active');
    document.getElementById('tab' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1)).classList.remove('hidden');
    if (tab.dataset.tab === 'report') updateReport();
  });
});

// ── Filter pills ──────────────────────────────────────────
document.querySelectorAll('.filter-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentFilter = pill.dataset.filter;
    applyFilter();
  });
});

function applyFilter() {
  document.querySelectorAll('.file-item').forEach(item => {
    const cat = item.dataset.category;
    item.classList.toggle('filtered-out', currentFilter !== 'all' && cat !== currentFilter);
  });
}

// ── Helpers ───────────────────────────────────────────────
function formatBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024*1024) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/(1024*1024)).toFixed(2)} MB`;
}

function getExt(p) { return p.split('.').pop().toLowerCase(); }

function getCategory(ext) {
  if (/^(jpg|jpeg|png)$/.test(ext)) return 'image';
  if (/^pdf$/.test(ext)) return 'pdf';
  if (/^(docx|xlsx)$/.test(ext)) return 'office';
  if (/^(mp3|flac|wav|ogg|m4a)$/.test(ext)) return 'audio';
  if (/^(mp4|mov|avi|mkv|webm)$/.test(ext)) return 'video';
  return 'unknown';
}

const CAT_ICON = { image:'🖼', pdf:'📄', office:'📊', audio:'🎵', video:'🎬', unknown:'📁' };
const CAT_COLOR = { image:'image', pdf:'pdf', office:'office', audio:'audio', video:'video', unknown:'' };

const GPS_KEYS = new Set(['GPSLatitude','GPSLongitude','GPSLatitudeRef','GPSLongitudeRef','GPSAltitude','GPSAltitudeRef','GPSTimestamp','GPSDateStamp','GPSSpeed','GPSTrack','GPSImgDirection']);
const SENSITIVE_KEYS = new Set(['Author','Artist','Copyright','Creator','Owner','Software','HostComputer','SerialNumber','CameraOwnerName','BodySerialNumber','LensSerialNumber','encodedby','EncodedBy','Artist','Comment']);

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  toasts.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(10px)'; el.style.transition = 'all 0.2s'; setTimeout(() => el.remove(), 200); }, 3000);
}

function showLoading(text = 'Processing…') { loadingText.textContent = text; loadingOverlay.style.display = 'flex'; }
function hideLoading() { loadingOverlay.style.display = 'none'; }

// ── Add files ─────────────────────────────────────────────
async function addFilePaths(paths) {
  const newPaths = paths.filter(p => !files.find(f => f.path === p));
  if (!newPaths.length && paths.length) { toast('Files already in list', 'warn'); return; }

  for (const p of newPaths) {
    const name = p.split(/[/\\]/).pop();
    const ext = getExt(name);
    const cat = getCategory(ext);
    files.push({ path: p, name, ext, cat, selected: false, status: 'loading', metaCount: undefined, meta: null, fileSize: 0, scrubResult: null });
  }
  renderFileList();

  // Load metadata for new files
  for (const f of files.filter(x => x.status === 'loading')) {
    try {
      const result = await window.pluck.readMetadata(f.path);
      f.meta = result.metadata || {};
      f.fileSize = result.fileSize || 0;
      f.mimeType = result.mimeType || '';
      f.metaCount = Object.keys(f.meta).length;
      f.status = f.metaCount > 0 ? 'dirty' : 'clean';
    } catch {
      f.meta = {}; f.metaCount = 0; f.status = 'clean';
    }
    renderFileListItem(f);
    if (activeFile === f) showMeta(f);
  }
  updateStats();
}

btnAdd.addEventListener('click', async () => {
  const paths = await window.pluck.selectFiles();
  if (paths.length) addFilePaths(paths);
});

btnFolder.addEventListener('click', async () => {
  showLoading('Scanning folder…');
  const paths = await window.pluck.selectFolder();
  hideLoading();
  if (paths.length) { addFilePaths(paths); toast(`Found ${paths.length} files`, 'success'); }
  else toast('No supported files found', 'warn');
});

btnClearAll.addEventListener('click', () => {
  files = []; activeFile = null;
  renderFileList(); showEmpty(); updateStats();
});

// ── Render file list ──────────────────────────────────────
function renderFileList() {
  fileList.innerHTML = '';
  files.forEach(f => {
    const li = buildFileItem(f);
    fileList.appendChild(li);
  });
  fileCount.textContent = `${files.length} file${files.length !== 1 ? 's' : ''}`;
  updateScrubButton();
  applyFilter();
}

function buildFileItem(f) {
  const li = document.createElement('li');
  li.className = `file-item${f === activeFile ? ' active' : ''}${f.selected ? ' selected' : ''}`;
  li.dataset.category = f.cat;
  li.innerHTML = `
    <div class="fi-check"></div>
    <div class="fi-icon">${CAT_ICON[f.cat] || '📁'}</div>
    <div class="fi-body">
      <div class="fi-name" title="${f.name}">${f.name}</div>
      <div class="fi-sub">${f.metaCount !== undefined ? (f.metaCount > 0 ? `${f.metaCount} fields · ${formatBytes(f.fileSize)}` : `clean · ${formatBytes(f.fileSize)}`) : 'scanning…'}</div>
    </div>
    <div class="fi-dot ${f.status}"></div>
  `;
  li.querySelector('.fi-check').addEventListener('click', e => { e.stopPropagation(); f.selected = !f.selected; li.classList.toggle('selected', f.selected); updateScrubButton(); });
  li.addEventListener('click', () => { activeFile = f; renderFileList(); showMeta(f); loadPreview(f); });
  return li;
}

function renderFileListItem(f) {
  const existing = [...fileList.querySelectorAll('.file-item')].find(li => li.dataset && fileList.children[files.indexOf(f)] === li);
  const idx = files.indexOf(f);
  const li = buildFileItem(f);
  if (fileList.children[idx]) {
    fileList.replaceChild(li, fileList.children[idx]);
  } else {
    fileList.appendChild(li);
  }
  applyFilter();
}

function updateScrubButton() {
  const sel = files.filter(f => f.selected);
  btnScrub.disabled = sel.length === 0;
  scrubLabel.textContent = sel.length > 0 ? `Scrub ${sel.length} File${sel.length > 1 ? 's' : ''}` : 'Scrub Selected';
}

// ── Select all ────────────────────────────────────────────
chkSelectAll.addEventListener('change', () => {
  const visibleFiles = files.filter((f, i) => {
    const li = fileList.children[i];
    return li && !li.classList.contains('filtered-out');
  });
  visibleFiles.forEach(f => f.selected = chkSelectAll.checked);
  renderFileList();
});

// ── Show metadata ─────────────────────────────────────────
function showEmpty() {
  emptyState.style.display = 'flex';
  fileView.style.display = 'none';
  mainTitle.innerHTML = '<span class="title-hint">Select a file to inspect metadata</span>';
  topbarActions.style.display = 'none';
}

function showMeta(f) {
  emptyState.style.display = 'none';
  fileView.style.display = 'grid';
  mainTitle.textContent = f.name;
  topbarActions.style.display = 'flex';
  catBadge.textContent = f.ext.toUpperCase();
  catBadge.className = `badge ${CAT_COLOR[f.cat]}`;
  sizeBadge.textContent = f.fileSize ? formatBytes(f.fileSize) : '—';
  btnOpenFile.onclick = () => window.pluck.openFile(f.path);
  btnScrubSingle.onclick = () => scrubFiles([f]);

  // Meta pills
  metaPills.innerHTML = '';
  if (f.status === 'loading') {
    metaContent.innerHTML = `<div class="meta-loading"><div class="shimmer" style="width:70%"></div><div class="shimmer" style="width:55%"></div><div class="shimmer" style="width:80%"></div></div>`;
    return;
  }

  const meta = f.meta || {};
  const keys = Object.keys(meta);

  if (keys.length === 0) {
    metaContent.innerHTML = `<div class="no-meta"><strong>✓ Clean File</strong><span>No metadata found in this file.</span></div>`;
    metaPills.innerHTML = '';
    return;
  }

  // Group keys
  const groups = { GPS: [], Sensitive: [], Technical: [], Other: [] };
  keys.forEach(k => {
    if (GPS_KEYS.has(k) || k.startsWith('GPS')) groups.GPS.push(k);
    else if (SENSITIVE_KEYS.has(k)) groups.Sensitive.push(k);
    else if (['Make','Model','LensModel','FocalLength','ExposureTime','FNumber','ISO','Flash','WhiteBalance','Codec','BitRate','Duration','SampleRate','Bitrate','Pages','VideoCodec','AudioCodec','Resolution','FrameRate','Channels'].includes(k)) groups.Technical.push(k);
    else groups.Other.push(k);
  });

  const pillDefs = [
    { label: 'GPS', keys: groups.GPS, color: '#ff4455', dot: '#ff4455' },
    { label: 'Sensitive', keys: groups.Sensitive, color: '#ffaa33', dot: '#ffaa33' },
    { label: 'Technical', keys: groups.Technical, color: '#33aaff', dot: '#33aaff' },
    { label: 'Other', keys: groups.Other, color: '#7a9080', dot: '#556060' },
  ];

  pillDefs.filter(p => p.keys.length).forEach(p => {
    const pill = document.createElement('div');
    pill.className = 'meta-pill';
    pill.innerHTML = `<div class="mp-dot" style="background:${p.dot}"></div>${p.label} <strong style="color:${p.color}">${p.keys.length}</strong>`;
    metaPills.appendChild(pill);
  });

  metaContent.innerHTML = '';
  pillDefs.filter(p => p.keys.length).forEach(p => {
    const section = document.createElement('div');
    section.className = 'meta-section';
    const title = document.createElement('div');
    title.className = 'meta-section-title';
    title.textContent = p.label;
    section.appendChild(title);
    p.keys.forEach(k => {
      const row = document.createElement('div');
      row.className = 'meta-row';
      let val = meta[k];
      if (val instanceof Object && !Array.isArray(val)) { try { val = JSON.stringify(val); } catch { val = String(val); } }
      if (Array.isArray(val)) val = val.join(', ');
      const cls = GPS_KEYS.has(k) ? 'mv gps' : SENSITIVE_KEYS.has(k) ? 'mv sensitive' : 'mv';
      row.innerHTML = `<div class="mk">${k}</div><div class="${cls}">${String(val).substring(0,300)}</div>`;
      section.appendChild(row);
    });
    metaContent.appendChild(section);
  });
}

// ── Preview ───────────────────────────────────────────────
async function loadPreview(f) {
  previewImg.style.display = 'none';
  audioPreview.style.display = 'none';
  videoPreview.style.display = 'none';
  previewPlaceholder.style.display = 'flex';
  beforeAfterBadge.style.display = 'none';
  fileTypeIcon.textContent = CAT_ICON[f.cat] || '📁';
  fileTypeLabel.textContent = f.ext.toUpperCase();

  try {
    const preview = await window.pluck.getPreview(f.path);
    if (preview.type === 'image') {
      previewPlaceholder.style.display = 'none';
      previewImg.src = preview.data;
      previewImg.style.display = 'block';
    } else if (preview.type === 'audio') {
      previewPlaceholder.style.display = 'none';
      audioPreview.style.display = 'flex';
      audioPlayer.src = `file://${preview.filePath}`;
    } else if (preview.type === 'video') {
      previewPlaceholder.style.display = 'none';
      videoPreview.src = `file://${preview.filePath}`;
      videoPreview.style.display = 'block';
    }
  } catch {}

  // Show before/after if scrubbed
  if (f.scrubResult && f.scrubResult.oldSize && f.scrubResult.newSize) {
    const pct = Math.max(0, Math.min(100, (f.scrubResult.newSize / f.scrubResult.oldSize) * 100));
    beforeAfterBadge.style.display = 'flex';
    baFill.style.width = pct + '%';
    const saved = f.scrubResult.oldSize - f.scrubResult.newSize;
    baPct.textContent = saved > 0 ? `-${formatBytes(saved)}` : 'same size';
  }
}

// ── Scrub ─────────────────────────────────────────────────
async function scrubFiles(targetFiles) {
  if (!targetFiles.length) return;
  showLoading(`Scrubbing ${targetFiles.length} file${targetFiles.length > 1 ? 's' : ''}…`);

  const paths = targetFiles.map(f => f.path);
  try {
    const results = await window.pluck.scrubMetadata(paths);
    let successCount = 0;
    results.forEach(r => {
      const f = files.find(x => x.path === r.filePath);
      if (!f) return;
      if (r.success) {
        f.status = 'scrubbed'; f.meta = {}; f.metaCount = 0; f.selected = false;
        f.scrubResult = { oldSize: r.oldSize, newSize: r.newSize };
        successCount++;
        toast(`✓ Scrubbed: ${f.name}`, 'success');
      } else if (r.error !== 'Cancelled') {
        toast(`✗ ${f.name}: ${r.error}`, 'error');
      }
    });
    if (successCount) toast(`${successCount} file${successCount > 1 ? 's' : ''} scrubbed successfully`, 'success');
  } catch (err) {
    toast('Scrub error: ' + err.message, 'error');
  }

  hideLoading();
  renderFileList();
  if (activeFile) { showMeta(activeFile); loadPreview(activeFile); }
  updateStats();
}

btnScrub.addEventListener('click', () => scrubFiles(files.filter(f => f.selected)));

// ── Report & Stats ────────────────────────────────────────
function updateStats() {
  const total = files.length;
  const dirty = files.filter(f => f.status === 'dirty').length;
  const clean = files.filter(f => f.status === 'clean').length;
  const scrubbed = files.filter(f => f.status === 'scrubbed').length;
  statTotal.textContent = total;
  statDirty.textContent = dirty;
  statClean.textContent = clean;
  statScrubbed.textContent = scrubbed;
}

function updateReport() {
  updateStats();
  reportList.innerHTML = '';
  files.forEach(f => {
    const row = document.createElement('div');
    row.className = 'report-row';
    const statusLabel = f.status === 'dirty' ? '⚠ Has metadata' : f.status === 'scrubbed' ? '✓ Scrubbed' : f.status === 'clean' ? '✓ Clean' : '…';
    row.innerHTML = `
      <div class="rr-name">${f.name}</div>
      <div class="rr-meta">${f.cat.toUpperCase()} · ${formatBytes(f.fileSize)} · ${f.metaCount !== undefined ? f.metaCount + ' fields' : 'scanning'} · ${statusLabel}</div>
    `;
    reportList.appendChild(row);
  });
}

btnExport.addEventListener('click', async () => {
  if (!files.length) { toast('No files to export', 'warn'); return; }
  const data = files.map(f => ({
    name: f.name, path: f.path, category: f.cat,
    size: f.fileSize, fieldCount: f.metaCount || 0,
    status: f.status, metadata: f.meta || {}
  }));
  const result = await window.pluck.exportReport(data);
  if (result.success) toast('Report exported: ' + result.savedPath.split(/[/\\]/).pop(), 'success');
  else toast('Export cancelled', 'warn');
});

// ── Drag & Drop ───────────────────────────────────────────
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault(); dropZone.classList.remove('drag-over');
  const VALID = /\.(jpg|jpeg|png|pdf|docx|xlsx|mp3|flac|wav|ogg|m4a|mp4|mov|avi|mkv|webm)$/i;
  const paths = Array.from(e.dataTransfer.files).map(f => f.path).filter(p => VALID.test(p));
  if (paths.length) addFilePaths(paths);
  else toast('No supported files in drop', 'warn');
});

// Also allow drop on main panel
document.querySelector('.main-panel').addEventListener('dragover', e => e.preventDefault());
document.querySelector('.main-panel').addEventListener('drop', e => {
  e.preventDefault();
  const VALID = /\.(jpg|jpeg|png|pdf|docx|xlsx|mp3|flac|wav|ogg|m4a|mp4|mov|avi|mkv|webm)$/i;
  const paths = Array.from(e.dataTransfer.files).map(f => f.path).filter(p => VALID.test(p));
  if (paths.length) addFilePaths(paths);
});

// ── Init ──────────────────────────────────────────────────
showEmpty();

// ── About Modal ────────────────────────────────────────────
const btnAbout = document.getElementById('btnAbout');
const aboutOverlay = document.getElementById('aboutOverlay');
const aboutClose = document.getElementById('aboutClose');

btnAbout.addEventListener('click', () => { aboutOverlay.style.display = 'flex'; });
aboutClose.addEventListener('click', () => { aboutOverlay.style.display = 'none'; });
aboutOverlay.addEventListener('click', (e) => { if (e.target === aboutOverlay) aboutOverlay.style.display = 'none'; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && aboutOverlay.style.display !== 'none') aboutOverlay.style.display = 'none'; });
