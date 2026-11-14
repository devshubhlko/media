# Antigravity Video Studio

A complete, functional, lightweight, personal-use cloud-based video generator built with **Vue.js 3**, **Node.js**, **Express.js**, and **FFmpeg**.

---

## 🎯 Project Overview

Antigravity Video Studio is a streamlined, single-user video creation application designed to turn scripts, audio tracks, subtitles, and image assets into polished MP4 videos with synchronized audio, visual scene transitions, and hardcoded captions.

- **No login, authentication, or database required.**
- **Real server-side rendering pipeline** with real-time FFmpeg progress streaming via Server-Sent Events (SSE).
- **Interactive multi-track timeline** that keeps audio, subtitle cues, and image slots in sync.
- **Support for Hindi scripts and captions** (Devanagari UTF-8), customizable caption styling, and multiple aspect ratios (16:9 widescreen, 9:16 vertical reels/shorts, 1:1 square).

---

## 🏗️ Architecture & Technology Stack

```
Frontend (Vue 3 + Vite)  <─── SSE / REST ───>  Backend (Express + FFmpeg)
     │                                                    │
     ├── Live HTML5 Preview Player                        ├── Audio Analysis (FFprobe)
     ├── Fixed Timeline Manager                           ├── Subtitle Parser (SRT/VTT/BTT)
     ├── Drag & Drop Slots                                ├── ASS Subtitle Generator
     └── Caption & Export Controls                        ├── Single-Job Queue Lock
                                                          └── Multi-Input Video Renderer
```

### Frontend
- **Framework:** Vue.js 3 (Composition API)
- **Build Tool:** Vite
- **Icons:** Lucide Icons (`lucide-vue-next`)
- **Styling:** Custom dark-theme responsive UI with multi-track scrubber, aspect ratio containers, and mobile adaptiveness.
- **Player:** Synchronized HTML5 preview engine coordinating audio playback with frame swapping and caption overlays.

### Backend
- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js
- **Video Engine:** FFmpeg & FFprobe (auto-detected from system PATH, environment variable, or pre-bundled cross-platform installers `@ffmpeg-installer/ffmpeg` and `@ffprobe-installer/ffprobe`)
- **File Uploads:** Multer with memory/disk streaming
- **Progress Tracking:** Server-Sent Events (SSE) streaming real-time frame/second progress
- **Queue:** Lightweight single-process job lock avoiding excessive CPU load
- **Storage:** Automatic background temporary file cleanup with configurable TTL

---

## 📁 Project Structure

```
media/
├── backend/
│   ├── src/
│   │   ├── config.js              # Environment settings, FFmpeg/FFprobe paths, TTL
│   │   ├── server.js              # Express app, static serving, health check
│   │   ├── routes/
│   │   │   ├── upload.js          # Script, audio, subtitle, and image upload endpoints
│   │   │   └── export.js          # Video export trigger, SSE progress, download
│   │   ├── services/
│   │   │   ├── ffmpegService.js   # FFmpeg rendering pipeline & FFprobe audio probing
│   │   │   ├── subtitleParser.js  # SRT, VTT, and BTT parsers + ASS subtitle generator
│   │   │   ├── jobQueue.js        # Single-worker job queue with SSE broadcasting
│   │   │   └── cleanupService.js  # Automatic temporary file cleanup (TTL based)
│   │   └── utils/
│   │       ├── logger.js          # Structured console logger
│   │       └── validator.js       # Payload & slot validation
│   ├── temp/
│   │   ├── uploads/               # Temporary directory for uploaded assets
│   │   └── exports/               # Temporary directory for rendered MP4 files
│   ├── .env.example
│   ├── package.json
│   ├── test_pipeline.js           # Integration test for the rendering pipeline
│   └── test_api_endpoints.js      # End-to-end HTTP API test suite
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TopBar.vue            # Navigation, status chips, reset, export
│   │   │   ├── LeftPanel.vue         # Script, audio, subtitle, and image slots
│   │   │   ├── CenterPreview.vue     # Synchronized preview canvas player
│   │   │   ├── BottomTimeline.vue    # Interactive multi-track timeline
│   │   │   ├── RightPanel.vue        # Export settings & caption styling
│   │   │   ├── ImageSlotItem.vue     # Individual scene slot card
│   │   │   ├── ExportModal.vue       # Real-time progress modal & download
│   │   │   └── NotificationToast.vue # Toast notifications
│   │   ├── composables/
│   │   │   ├── useTimeline.js        # Reactive timeline & project state
│   │   │   ├── usePlayer.js          # Synchronized audio/video playback engine
│   │   │   └── useExport.js          # Export lifecycle and SSE listener
│   │   ├── services/
│   │   │   └── api.js                # Frontend API client
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── style.css
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example
│   └── package.json
├── package.json
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ (tested on Node.js v22.17.0)
- FFmpeg and FFprobe (bundled packages are included automatically; system binaries are also supported)

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```
The backend starts on `http://localhost:5000`. Verify health:
```bash
curl http://localhost:5000/api/health
```

### 2. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
The frontend starts on `http://localhost:5173`. Open your browser at `http://localhost:5173`.

---

## 🎬 How to Use

1. **Script Upload / Input:**
   - Upload a `.txt` file containing your Hindi reference script or paste it directly in the textarea. The script is kept intact without automated modifications.
2. **Audio Upload:**
   - Upload an MP3 or WAV audio track. FFprobe analyzes the duration, sample rate, and codec. The timeline synchronizes directly with this audio.
3. **Subtitles (Optional):**
   - Upload an `.srt`, `.vtt`, or `.btt` file.
   - Click **"Sync Slots"** to automatically partition your image timeline to match each subtitle cue's exact start and end times.
4. **Image Slots:**
   - Drag and drop images onto individual slots, or use the **"Batch"** button to upload multiple images at once.
   - Each image remains locked to its specific slot and duration.
   - Replace or remove images anytime without altering timeline duration.
5. **Preview Player:**
   - Press **Play (Spacebar / button)** to watch the synchronized preview.
   - Use the scrubber or bottom timeline to seek.
   - Toggle between **16:9**, **9:16**, and **1:1** aspect ratios to preview framing.
6. **Export MP4:**
   - Configure Resolution (720p, 1080p), FPS (24, 30, 60), and Caption styles (Font Size, Font Color, Outline, Position, Background Box).
   - Click **"Export MP4"** &rarr; **"Start Rendering"**.
   - Watch the real-time progress bar powered by Server-Sent Events (SSE).
   - Download the generated MP4 file.

---

## ⚙️ Configuration & Environment Variables

### Backend (`backend/.env`)
| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Port for Express server |
| `CLIENT_ORIGIN` | `*` | Allowed CORS origins (e.g. `http://localhost:5173` or your frontend domain) |
| `FILE_TTL_MINUTES` | `60` | Auto-cleanup lifetime for temporary uploads and exports (minutes) |
| `FFMPEG_PATH` | *(Auto-detected)* | Path to custom FFmpeg binary if preferred over bundled |
| `FFPROBE_PATH` | *(Auto-detected)* | Path to custom FFprobe binary if preferred over bundled |

### Frontend (`frontend/.env`)
| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000` | URL to the backend API |

---

## 🧪 Automated Testing

Both the FFmpeg rendering pipeline and the HTTP API endpoints can be tested independently:

```bash
# 1. Test FFmpeg pipeline (subtitle parsing, audio probe, 16:9 render with captions, 9:16 vertical render)
cd backend
node test_pipeline.js

# 2. Test HTTP API endpoints (uploads, queuing, SSE monitoring, download)
node test_api_endpoints.js
```

---

## 🌐 Deployment Instructions

### Frontend Deployment (GitHub Pages / Vercel / Netlify)
1. In `frontend/.env.production`, set:
   ```env
   VITE_API_URL=https://your-backend-domain.com
   ```
2. Build the static bundle:
   ```bash
   cd frontend
   npm run build
   ```
3. Deploy the `frontend/dist` directory to your static hosting provider (e.g., GitHub Pages, Cloudflare Pages, Vercel, or Netlify).

### 🚀 Deploying to Render (Render.com)

You can deploy the entire full-stack app (Backend + Frontend + FFmpeg) to **Render.com** as a single Web Service using Docker:

#### Method 1: Automatic Blueprint (Recommended)
1. In your [Render Dashboard](https://dashboard.render.com), click **New +** → **Blueprint**.
2. Connect your GitHub repository: `https://github.com/devshubhlko/ai-video`.
3. Render will automatically detect `render.yaml` and configure the Docker Web Service.
4. Click **Apply**. Render will build the container, install FFmpeg + HarfBuzz + Fonts, build the frontend, and launch the studio!

#### Method 2: Manual Web Service
1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your GitHub repo (`devshubhlko/ai-video`).
3. Select **Docker** as the Environment / Runtime.
4. Set Region (e.g. Oregon or Frankfurt) and Plan (Free or Starter).
5. Click **Create Web Service**.
6. Once deployed, open your Render URL (e.g., `https://ai-video.onrender.com`). Both the Vue 3 Studio UI and video rendering engine run automatically!

---

## 🛡️ Error Handling & Guarantees

- **Audio Timing Integrity:** Audio is never clipped or resampled unnecessarily; video length locks strictly to the image timeline and audio duration.
- **Zero Black Frames:** Each slot is rendered with `-loop 1 -t <dur>` scaled and padded with `setsar=1` so image transitions are seamless.
- **Resource Protection:** Only one active rendering job runs at a time to prevent CPU throttling on personal servers.
- **Auto Cleanup:** All temporary uploads and exports expire automatically according to `FILE_TTL_MINUTES`.
