const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let splashWindow;

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 460,
    height: 320,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    webPreferences: { contextIsolation: true },
    icon: path.join(__dirname, 'icon.png'),
  });
  splashWindow.loadFile('splash.html');
  splashWindow.once('ready-to-show', () => splashWindow.show());
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 650,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#080c10',
    show: false,
    icon: path.join(__dirname, 'icon.png'),
  });
  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }
      mainWindow.show();
      mainWindow.focus();
    }, 3200);
  });
}

app.whenReady().then(() => { createSplash(); createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

function getCategory(ext) {
  if (/^(jpg|jpeg|png)$/i.test(ext)) return 'image';
  if (/^pdf$/i.test(ext)) return 'pdf';
  if (/^(docx|xlsx)$/i.test(ext)) return 'office';
  if (/^(mp3|flac|wav|ogg|m4a)$/i.test(ext)) return 'audio';
  if (/^(mp4|mov|avi|mkv|webm)$/i.test(ext)) return 'video';
  return 'unknown';
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2,'0')}`;
}

// Select files
ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'All Supported', extensions: ['jpg','jpeg','png','pdf','docx','xlsx','mp3','flac','wav','ogg','m4a','mp4','mov','avi','mkv','webm'] },
      { name: 'Images', extensions: ['jpg','jpeg','png'] },
      { name: 'Documents', extensions: ['pdf','docx','xlsx'] },
      { name: 'Audio', extensions: ['mp3','flac','wav','ogg','m4a'] },
      { name: 'Video', extensions: ['mp4','mov','avi','mkv','webm'] },
    ],
  });
  return result.canceled ? [] : result.filePaths;
});

// Select folder
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (result.canceled) return [];
  const dir = result.filePaths[0];
  const EXTS = /\.(jpg|jpeg|png|pdf|docx|xlsx|mp3|flac|wav|ogg|m4a|mp4|mov|avi|mkv|webm)$/i;
  const files = [];
  function walk(d) {
    try {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (EXTS.test(entry.name)) files.push(full);
      }
    } catch {}
  }
  walk(dir);
  return files;
});

// Read metadata
ipcMain.handle('read-metadata', async (event, filePath) => {
  const ext = path.extname(filePath).replace('.','').toLowerCase();
  const cat = getCategory(ext);
  let stats;
  try { stats = fs.statSync(filePath); } catch { return { category: cat, metadata: {}, fileSize: 0, error: 'File not found' }; }

  try {
    if (cat === 'image') {
      const exifr = require('exifr');
      const { fileTypeFromFile } = await import('file-type');
      const type = await fileTypeFromFile(filePath);
      const metadata = await exifr.parse(filePath, { tiff: true, exif: true, gps: true, iptc: true, xmp: true }) || {};
      return { category: cat, metadata, fileSize: stats.size, mimeType: type?.mime || 'image/jpeg' };
    }

    if (cat === 'pdf') {
      const { PDFDocument } = require('pdf-lib');
      const buf = fs.readFileSync(filePath);
      const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
      const metadata = {};
      try {
        const info = pdf.context.lookup(pdf.context.trailerInfo.Info);
        if (info && info.dict) {
          for (const [k, v] of info.dict.entries()) {
            try { metadata[k.toString().replace('/', '')] = v.toString().replace(/[()]/g,'').substring(0,200); } catch {}
          }
        }
      } catch {}
      metadata['Pages'] = pdf.getPageCount();
      return { category: cat, metadata, fileSize: stats.size, mimeType: 'application/pdf' };
    }

    if (cat === 'office') {
      const metadata = {};
      try {
        const StreamZip = require('node-stream-zip');
        await new Promise((resolve) => {
          const zip = new StreamZip({ file: filePath, storeEntries: true });
          zip.on('ready', () => {
            for (const entry of ['docProps/core.xml', 'docProps/app.xml']) {
              if (zip.entry(entry)) {
                const data = zip.entryDataSync(entry).toString('utf8');
                const fields = data.match(/<([^/:>\s]+:[^>\s]+)[^>]*>([^<]+)</g) || [];
                for (const f of fields) {
                  const m = f.match(/<[^:]+:([^>\s]+)[^>]*>([^<]+)</);
                  if (m && m[2].trim() && m[1] !== 'Properties') metadata[m[1]] = m[2].trim();
                }
              }
            }
            zip.close();
            resolve();
          });
          zip.on('error', resolve);
        });
      } catch {}
      const mimeType = ext === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      return { category: cat, metadata, fileSize: stats.size, mimeType };
    }

    if (cat === 'audio') {
      const mm = await import('music-metadata');
      const meta = await mm.parseFile(filePath, { skipCovers: true });
      const metadata = {};
      const t = meta.common;
      if (t.title) metadata['Title'] = t.title;
      if (t.artist) metadata['Artist'] = t.artist;
      if (t.albumartist) metadata['AlbumArtist'] = t.albumartist;
      if (t.album) metadata['Album'] = t.album;
      if (t.year) metadata['Year'] = String(t.year);
      if (t.genre?.length) metadata['Genre'] = t.genre.join(', ');
      if (t.comment?.length) metadata['Comment'] = t.comment.map(c => c.text || String(c)).join('; ').substring(0,300);
      if (t.composer?.length) metadata['Composer'] = t.composer.join(', ');
      if (t.copyright) metadata['Copyright'] = t.copyright;
      if (t.encodedby) metadata['EncodedBy'] = t.encodedby;
      if (t.encodersettings) metadata['EncoderSettings'] = t.encodersettings;
      if (meta.format.bitrate) metadata['Bitrate'] = Math.round(meta.format.bitrate / 1000) + ' kbps';
      if (meta.format.sampleRate) metadata['SampleRate'] = meta.format.sampleRate + ' Hz';
      if (meta.format.duration) metadata['Duration'] = formatDuration(meta.format.duration);
      if (meta.format.codec) metadata['Codec'] = meta.format.codec;
      if (meta.format.numberOfChannels) metadata['Channels'] = meta.format.numberOfChannels;
      return { category: cat, metadata, fileSize: stats.size, mimeType: `audio/${ext}` };
    }

    if (cat === 'video') {
      const metadata = {};
      const { execSync } = require('child_process');
      try {
        const out = execSync(`ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`, { timeout: 8000 }).toString();
        const data = JSON.parse(out);
        if (data.format?.tags) Object.assign(metadata, data.format.tags);
        if (data.format?.duration) metadata['Duration'] = formatDuration(parseFloat(data.format.duration));
        if (data.format?.bit_rate) metadata['BitRate'] = Math.round(data.format.bit_rate / 1000) + ' kbps';
        if (data.format?.format_long_name) metadata['Format'] = data.format.format_long_name;
        const vid = data.streams?.find(s => s.codec_type === 'video');
        if (vid) {
          metadata['VideoCodec'] = vid.codec_name;
          if (vid.width && vid.height) metadata['Resolution'] = `${vid.width}x${vid.height}`;
          if (vid.r_frame_rate) metadata['FrameRate'] = vid.r_frame_rate;
          if (vid.tags) Object.assign(metadata, vid.tags);
        }
        const aud = data.streams?.find(s => s.codec_type === 'audio');
        if (aud) {
          metadata['AudioCodec'] = aud.codec_name;
          if (aud.channels) metadata['AudioChannels'] = aud.channels;
          if (aud.sample_rate) metadata['AudioSampleRate'] = aud.sample_rate + ' Hz';
        }
      } catch {
        metadata['Note'] = 'Install ffprobe for full video metadata reading';
      }
      return { category: cat, metadata, fileSize: stats.size, mimeType: `video/${ext}` };
    }

    return { category: 'unknown', metadata: {}, fileSize: stats.size };
  } catch (err) {
    return { category: cat, metadata: {}, fileSize: stats.size, error: err.message };
  }
});

// Scrub metadata
ipcMain.handle('scrub-metadata', async (event, filePaths) => {
  const { fileTypeFromFile } = await import('file-type');
  const results = [];

  for (const filePath of filePaths) {
    const ext = path.extname(filePath).replace('.','').toLowerCase();
    const cat = getCategory(ext);
    const baseName = path.basename(filePath, path.extname(filePath));
    const dir = path.dirname(filePath);

    try {
      const origBuffer = fs.readFileSync(filePath);
      let cleanBuffer;

      if (cat === 'image') {
        const type = await fileTypeFromFile(filePath);
        if (type?.mime === 'image/jpeg') {
          const jpeg = require('jpeg-js');
          const decoded = jpeg.decode(origBuffer, { useTArray: true });
          cleanBuffer = Buffer.from(jpeg.encode({ data: decoded.data, width: decoded.width, height: decoded.height }, 95).data);
        } else {
          const { PNG } = require('pngjs');
          const png = PNG.sync.read(origBuffer);
          cleanBuffer = PNG.sync.write(png, { filterType: 4 });
        }
      } else if (cat === 'pdf') {
        const { PDFDocument } = require('pdf-lib');
        const pdf = await PDFDocument.load(origBuffer, { ignoreEncryption: true });
        pdf.setTitle(''); pdf.setAuthor(''); pdf.setSubject('');
        pdf.setKeywords([]); pdf.setProducer(''); pdf.setCreator('');
        pdf.setCreationDate(new Date(0)); pdf.setModificationDate(new Date(0));
        cleanBuffer = Buffer.from(await pdf.save());
      } else if (cat === 'audio' && /^mp3$/i.test(ext)) {
        const NodeID3 = require('node-id3');
        cleanBuffer = NodeID3.removeTagsFromBuffer(origBuffer) || origBuffer;
      } else if (cat === 'video') {
        const { execSync } = require('child_process');
        const os = require('os');
        try {
          const tmpOut = path.join(os.tmpdir(), `ps_vid_${Date.now()}.${ext}`);
          execSync(`ffmpeg -i "${filePath}" -map_metadata -1 -c:v copy -c:a copy "${tmpOut}" -y`, { timeout: 60000 });
          cleanBuffer = fs.readFileSync(tmpOut);
          fs.unlinkSync(tmpOut);
        } catch {
          results.push({ filePath, success: false, error: 'ffmpeg required for video scrubbing. Please install ffmpeg.' });
          continue;
        }
      } else {
        // office and other audio — treat as pass-through for now, notify user
        cleanBuffer = origBuffer;
      }

      const saveResult = await dialog.showSaveDialog(mainWindow, {
        defaultPath: path.join(dir, `${baseName}_clean.${ext}`),
        filters: [{ name: 'File', extensions: [ext] }],
      });

      if (saveResult.canceled) { results.push({ filePath, success: false, error: 'Cancelled' }); continue; }

      fs.writeFileSync(saveResult.filePath, cleanBuffer);
      results.push({ filePath, success: true, savedPath: saveResult.filePath, oldSize: origBuffer.length, newSize: cleanBuffer.length });
    } catch (err) {
      results.push({ filePath, success: false, error: err.message });
    }
  }
  return results;
});

// Export CSV report
ipcMain.handle('export-report', async (event, reportData) => {
  const saveResult = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `PluckStoop_Report_${new Date().toISOString().split('T')[0]}.csv`,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (saveResult.canceled) return { success: false };
  let csv = 'File,Path,Category,Size (bytes),Fields Found,Status\n';
  for (const row of reportData) {
    csv += `"${(row.name||'').replace(/"/g,'""')}","${(row.path||'').replace(/"/g,'""')}","${row.category}","${row.size}","${row.fieldCount}","${row.status}"\n`;
  }
  fs.writeFileSync(saveResult.filePath, csv, 'utf8');
  return { success: true, savedPath: saveResult.filePath };
});

// Get preview
ipcMain.handle('get-preview', async (event, filePath) => {
  const ext = path.extname(filePath).replace('.','').toLowerCase();
  const cat = getCategory(ext);
  if (cat === 'image') {
    try {
      const buf = fs.readFileSync(filePath);
      const mime = (ext === 'jpg' || ext === 'jpeg') ? 'jpeg' : 'png';
      return { type: 'image', data: `data:image/${mime};base64,${buf.toString('base64')}` };
    } catch { return { type: 'none' }; }
  }
  if (cat === 'audio') return { type: 'audio', filePath };
  if (cat === 'video') return { type: 'video', filePath };
  return { type: 'none' };
});

// Open file in system
ipcMain.handle('open-file', async (event, filePath) => { await shell.openPath(filePath); });
