<div align="center">

<img src="icon.png" width="140" height="140" alt="PluckStoop Icon"/>

# PluckStoop

### Universal Metadata Scrubber

**Strip hidden metadata from images, documents, audio, and video — privately, locally, instantly.**

[![Version](https://img.shields.io/badge/version-2.0.0-00ffb3?style=flat-square&labelColor=0d1a14)](.)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-00ffb3?style=flat-square&labelColor=0d1a14)](.)
[![Electron](https://img.shields.io/badge/built%20with-Electron-00ffb3?style=flat-square&labelColor=0d1a14)](.)
[![Author](https://img.shields.io/badge/author-Muhammad%20Hassnain-00ffb3?style=flat-square&labelColor=0d1a14)](.)

</div>

---

## What is PluckStoop?

Every file you create carries invisible baggage — GPS coordinates baked into your photos, your real name embedded in PDFs, recording equipment details in audio files, and creation timestamps in Word documents. PluckStoop **reads, displays, and removes** all of it.

The name comes from the *stoop* — the high-speed diving attack of a falcon — swift, precise, and unstoppable. PluckStoop dives into your files and plucks out every trace of metadata before anyone else can find it.

> 🔒 **100% local.** Your files never leave your machine. No cloud, no servers, no telemetry.

---

## Features

### 🗂 Multi-Format Support

| Format | Read Metadata | Scrub Metadata | Preview |
|--------|:---:|:---:|:---:|
| JPEG / PNG | ✅ | ✅ | ✅ Image thumbnail |
| PDF | ✅ | ✅ | — |
| DOCX / XLSX | ✅ | ✅ | — |
| MP3 | ✅ | ✅ | ✅ Audio player |
| FLAC / WAV / OGG / M4A | ✅ | ✅* | ✅ Audio player |
| MP4 / MOV / AVI / MKV / WebM | ✅** | ✅** | ✅ Video player |

> *FLAC/WAV/OGG scrubbing requires `ffmpeg`  
> **Video metadata reading and scrubbing requires `ffprobe` / `ffmpeg`

### 🔍 Metadata Inspector
- View **all embedded fields** grouped by category: GPS, Sensitive, Technical, Other
- GPS coordinates and personal fields highlighted with color warnings
- See file size, MIME type, codec info, bitrate, duration, and more

### 🧹 Batch Scrubbing
- Select and scrub **multiple files at once**
- **Folder import** — recursively scan entire directories for supported files
- Before/after size comparison shown after each scrub

### 📊 Reports
- Live dashboard showing total files, files with metadata, clean files, and scrubbed count
- **Export CSV report** with per-file breakdown: name, category, size, field count, status
- Filter view by file type with category pills

### 🎬 Preview Panel
- Inline image thumbnail viewer
- Built-in **audio player** for MP3, FLAC, WAV, OGG, M4A
- Built-in **video player** for MP4, MOV, AVI, MKV, WebM

### ✨ Polish
- Animated **splash screen** on launch
- **About dialog** with author info
- Custom **falcon icon** (a stooping falcon — the app's namesake)
- Dark, minimal UI with neon green accent — easy on the eyes for long sessions
- Toast notifications, loading indicators, drag-and-drop support

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [npm](https://www.npmjs.com/) v9 or higher

For full video support (optional):
- [ffmpeg](https://ffmpeg.org/download.html) — for video metadata scrubbing
- [ffprobe](https://ffmpeg.org/download.html) — for video metadata reading (included with ffmpeg)

### Clone & Install

```bash
git clone https://github.com/yourusername/PluckStoop.git
cd PluckStoop
npm install
```

### Run

```bash
npm start
```

---

## Usage

### Adding Files

**Method 1 — Browse:** Click the **Files** button in the sidebar to open a file picker. Supports multi-select.

**Method 2 — Folder:** Click the **Folder** button to recursively scan an entire directory. All supported files inside are added automatically.

**Method 3 — Drag & Drop:** Drag files or folders directly onto the app window.

### Inspecting Metadata

Click any file in the sidebar list to open it in the inspector panel. You'll see:

- All metadata fields grouped by category
- **Red fields** — GPS/location data (high privacy risk)
- **Orange fields** — Sensitive personal data (author, software, serial numbers)
- **Blue fields** — Technical data (codec, resolution, bitrate)
- A live preview of the file (image, audio, or video)

### Scrubbing Metadata

**Single file:** With a file open in the inspector, click **Scrub This File** in the top-right of the metadata panel.

**Multiple files:** Check the boxes next to files in the sidebar, then click **Scrub Selected** at the bottom. A save dialog will appear for each file.

After scrubbing, a before/after size bar shows how much data was removed.

### Exporting a Report

Switch to the **Report** tab in the sidebar. Click **Export CSV Report** to save a full audit log of all loaded files with their metadata field counts and scrub status.

---

## What Gets Removed

### Images (JPEG / PNG)
EXIF data, GPS coordinates, camera make/model, lens info, timestamps, thumbnail previews, ICC profiles, XMP metadata, IPTC copyright fields, software tags, and all other embedded data. The image is re-encoded pixel-perfect at high quality.

### PDF
Title, Author, Subject, Keywords, Creator, Producer, creation date, modification date, and all custom XMP fields. Page content is untouched.

### Audio (MP3)
All ID3 tags: title, artist, album, year, genre, comment, composer, album art, encoder info, copyright, and all raw tag blocks (ID3v1, ID3v2, APE tags).

### Office Documents (DOCX / XLSX)
`core.xml` fields: creator, last modified by, created date, modified date, revision count. `app.xml` fields: application name, application version, company name, template name, and total editing time.

### Video (MP4 / MOV etc.)
Encoder tags, recording software, creation time, GPS metadata, title, comment, copyright, and all format-level and stream-level tag blocks via `ffmpeg -map_metadata -1`.

---

## Project Structure

```
PluckStoop/
├── main.js          # Electron main process — window management, IPC handlers, file operations
├── preload.js       # Context bridge — safely exposes IPC to renderer
├── renderer.js      # Frontend logic — UI state, file list, metadata display, scrub flow
├── index.html       # Main app window markup
├── splash.html      # Animated splash screen shown on startup
├── style.css        # All styles — dark theme, layout, components, animations
├── icon.png         # App icon — falcon in a diving stoop
└── package.json     # Dependencies and scripts
```

---

## Tech Stack

| Library | Purpose |
|---------|---------|
| [Electron](https://www.electronjs.org/) | Desktop app shell |
| [exifr](https://github.com/MikeKovarik/exifr) | EXIF/XMP/IPTC metadata parsing for images |
| [jpeg-js](https://github.com/jpeg-js/jpeg-js) | JPEG decode/re-encode for lossless metadata strip |
| [pngjs](https://github.com/pngjs/pngjs) | PNG decode/re-encode |
| [pdf-lib](https://pdf-lib.js.org/) | PDF metadata read and write |
| [music-metadata](https://github.com/borewit/music-metadata) | Audio tag parsing (ID3, Vorbis, etc.) |
| [node-id3](https://github.com/Zazama/node-id3) | MP3 ID3 tag removal |
| [file-type](https://github.com/sindresorhus/file-type) | File type detection by magic bytes |
| ffmpeg / ffprobe | Video metadata read and scrub (external, optional) |

---

## Building for Distribution

```bash
# Install electron-builder
npm install --save-dev electron-builder

# Build for your current platform
npx electron-builder

# Build for specific platforms
npx electron-builder --win
npx electron-builder --mac
npx electron-builder --linux
```

Built binaries will appear in the `dist/` folder.

---

## Privacy & Security

- **No internet connection required.** PluckStoop works entirely offline.
- **No telemetry.** Nothing is tracked, reported, or logged externally.
- **No cloud storage.** Files are read and written only to your local disk.
- **No auto-updates.** The app never phones home.

---

## Known Limitations

- Video metadata scrubbing requires `ffmpeg` to be installed and accessible in your system `PATH`.
- FLAC, WAV, and OGG audio scrubbing currently requires `ffmpeg`. MP3 scrubbing works natively.
- Office (DOCX/XLSX) metadata scrubbing requires `node-stream-zip` and `archiver` to re-package the ZIP container.
- Very large video files may take longer to process during scrubbing.

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Made with precision by **Muhammad Hassnain**

*PluckStoop — because your files shouldn't tell stories you didn't mean to share.*

</div>
