import { ref } from 'vue';
import { useTimeline } from './useTimeline.js';
import { usePlayer } from './usePlayer.js';
import { startExport, cancelJob, createProgressEventSource, getDownloadUrl } from '../services/api.js';
import { captureCanvasSnapshot } from '../utils/captureCanvas.js';

const RESOLUTION_MAP = {
  '16:9': {
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 }
  },
  '9:16': {
    '720p': { width: 720, height: 1280 },
    '1080p': { width: 1080, height: 1920 }
  },
  '1:1': {
    '720p': { width: 720, height: 720 },
    '1080p': { width: 1080, height: 1080 }
  }
};

/**
 * Computes timeline slices based on slots and subtitle cue timestamps.
 * Guarantees each visual state (image + subtitle) is captured as a distinct frame.
 */
function computeTimelineSlices(totalDuration, slotsList, subtitleSegmentsList, captionsOn) {
  const boundaries = new Set();
  boundaries.add(0);
  const dur = Math.max(0.1, Number(totalDuration) || 0);
  boundaries.add(dur);

  if (slotsList && slotsList.length > 0) {
    for (const slot of slotsList) {
      const s = Number(slot.startTime) || 0;
      const e = Number(slot.endTime) || 0;
      if (s >= 0 && s < dur) boundaries.add(s);
      if (e > 0 && e <= dur) boundaries.add(e);
    }
  }

  if (captionsOn && subtitleSegmentsList && subtitleSegmentsList.length > 0) {
    for (const seg of subtitleSegmentsList) {
      const s = Number(seg.startTime) || 0;
      const e = Number(seg.endTime) || 0;
      if (s >= 0 && s < dur) boundaries.add(s);
      if (e > 0 && e <= dur) boundaries.add(e);
    }
  }

  const sorted = Array.from(boundaries).sort((a, b) => a - b);
  const slices = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const tStart = sorted[i];
    const tEnd = sorted[i + 1];
    const sliceDur = tEnd - tStart;
    if (sliceDur >= 0.04) {
      slices.push({
        startTime: tStart,
        endTime: tEnd,
        duration: sliceDur,
        midTime: tStart + sliceDur / 2
      });
    }
  }

  if (slices.length === 0) {
    slices.push({
      startTime: 0,
      endTime: dur,
      duration: dur,
      midTime: dur / 2
    });
  }

  return slices;
}

export function useExport() {
  const {
    slots,
    audioFile,
    bgVideo,
    hasCustomAudio,
    captionsEnabled,
    subtitleSegments,
    captionSettings,
    exportSettings,
    selectedBg,
    cinematicSettings,
    addNotification
  } = useTimeline();

  const {
    currentTime,
    isPlaying,
    pause,
    previewContainerRef,
    isExportingCanvas
  } = usePlayer();

  const isModalOpen = ref(false);
  const exportStatus = ref('idle'); // idle | capturing | submitting | rendering | completed | failed
  const progressPercent = ref(0);
  const captureProgressText = ref('');
  const currentTimeRendered = ref(0);
  const totalDurationRendered = ref(0);
  const renderSpeed = ref('1x');
  const renderFps = ref(0);
  const downloadLink = ref('');
  const errorMessage = ref('');
  const currentJobId = ref(null);

  let eventSource = null;

  function openExportModal() {
    if (!audioFile.value && !bgVideo.value) {
      addNotification('danger', 'Audio file or background video is required for video export.');
      return;
    }

    const isBgActive = (selectedBg.value && selectedBg.value !== 'none') || Boolean(bgVideo.value);
    if (!isBgActive) {
      if (slots.value.length === 0) {
        addNotification('danger', 'Please upload media (image/video) or choose a Background Preset.');
        return;
      }

      const unassigned = slots.value.filter(s => !s.imagePath);
      if (unassigned.length > 0) {
        addNotification('danger', `Please assign images to all scenes (${unassigned.length} scenes missing images), or select a Background Preset.`);
        return;
      }
    }

    isModalOpen.value = true;
    exportStatus.value = 'idle';
    progressPercent.value = 0;
    captureProgressText.value = '';
    errorMessage.value = '';
    downloadLink.value = '';
  }

  function closeModal() {
    if (exportStatus.value === 'rendering' || exportStatus.value === 'capturing') {
      const confirmCancel = confirm('Video processing is in progress. Are you sure you want to cancel?');
      if (!confirmCancel) return;
      cancelRendering();
    }
    isModalOpen.value = false;
    cleanupEventSource();
  }

  function cleanupEventSource() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  }

  async function triggerExport() {
    const originalTime = currentTime.value;
    const wasPlaying = isPlaying.value;

    try {
      if (!audioFile.value && !bgVideo.value) {
        addNotification('danger', 'Audio file or background video is required for video export.');
        return;
      }

      if (wasPlaying) {
        pause();
      }

      const totalDur = audioFile.value?.duration || bgVideo.value?.duration || 10;

      // Ensure at least one timeline slot if using background preset or video
      let exportSlots = slots.value;
      if ((!exportSlots || exportSlots.length === 0) && (selectedBg.value !== 'none' || bgVideo.value)) {
        exportSlots = [{
          id: 'bg-slot-default',
          sceneNumber: 1,
          startTime: 0,
          endTime: totalDur,
          duration: totalDur,
          imagePath: null
        }];
      }

      // 1. Enter WYSIWYG frame capture mode
      exportStatus.value = 'capturing';
      errorMessage.value = '';
      progressPercent.value = 0;
      captureProgressText.value = 'Initializing high-fidelity frame capture...';
      isExportingCanvas.value = true;

      // Calculate target export resolution
      const ratio = exportSettings.value.aspectRatio || '16:9';
      const res = exportSettings.value.resolution || '720p';
      const dimensions = RESOLUTION_MAP[ratio]?.[res] || { width: 1280, height: 720 };
      const targetW = dimensions.width;
      const targetH = dimensions.height;

      let targetEl = previewContainerRef.value;
      if (!targetEl && typeof document !== 'undefined') {
        targetEl = document.querySelector('.cinematic-stage')?.parentElement || document.querySelector('.cinematic-stage');
      }
      if (!targetEl) {
        throw new Error('Canvas container element not found. Please ensure video preview is visible.');
      }

      // Compute slices
      const slices = computeTimelineSlices(
        totalDur,
        exportSlots,
        subtitleSegments.value,
        captionsEnabled.value
      );

      const frames = [];
      const durations = [];

      for (let i = 0; i < slices.length; i++) {
        const slice = slices[i];
        currentTime.value = slice.midTime;
        captureProgressText.value = `Capturing Canvas Frame ${i + 1} of ${slices.length}...`;
        progressPercent.value = Math.round(((i + 1) / slices.length) * 100);

        // Allow Vue reactivity, fonts, and DOM layout to settle
        await new Promise(r => requestAnimationFrame(r));
        await new Promise(r => setTimeout(r, 60));

        const snap = await captureCanvasSnapshot(targetEl, targetW, targetH);
        frames.push(snap);
        durations.push(slice.duration);
      }

      captureProgressText.value = 'Frames captured. Submitting to FFmpeg engine...';

      // Restore player state
      isExportingCanvas.value = false;
      currentTime.value = originalTime;

      // 2. Submit to backend
      exportStatus.value = 'submitting';
      progressPercent.value = 0;

      const payload = {
        frames,
        durations,
        timeline: {
          slots: exportSlots.map(s => ({
            id: s.id,
            sceneNumber: s.sceneNumber,
            startTime: s.startTime,
            endTime: s.endTime,
            duration: s.duration,
            imagePath: s.imagePath || null
          }))
        },
        audio: audioFile.value ? {
          path: audioFile.value.path,
          duration: audioFile.value.duration
        } : null,
        bgVideoPath: bgVideo.value?.path || null,
        hasCustomAudio: hasCustomAudio.value,
        captionsEnabled: captionsEnabled.value,
        subtitleSegments: captionsEnabled.value ? subtitleSegments.value : [],
        captionSettings: captionSettings.value,
        exportSettings: exportSettings.value,
        selectedBg: selectedBg.value || 'none',
        cinematicSettings: cinematicSettings.value
      };

      const resExport = await startExport(payload);
      currentJobId.value = resExport.jobId;
      exportStatus.value = 'rendering';

      // Connect to SSE
      cleanupEventSource();
      eventSource = createProgressEventSource(resExport.jobId);

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          handleSseEvent(parsed);
        } catch (err) {
          console.error('Failed to parse SSE data:', err);
        }
      };

      eventSource.onerror = async (err) => {
        console.warn('SSE connection error:', err);
        if (eventSource && eventSource.readyState === EventSource.CLOSED) {
          try {
            const statusRes = await fetch(`/api/export/${resExport.jobId}/status`);
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData.status === 'completed') {
                handleSseEvent({ type: 'completed', data: statusData.result });
                return;
              }
            } else if (statusRes.status === 404) {
              exportStatus.value = 'failed';
              errorMessage.value = 'Export job disconnected or cancelled. Please try exporting again.';
              cleanupEventSource();
              addNotification('danger', errorMessage.value);
            }
          } catch (e) {}
        }
      };
    } catch (err) {
      isExportingCanvas.value = false;
      currentTime.value = originalTime;
      exportStatus.value = 'failed';
      errorMessage.value = err.message || 'Export request failed';
      addNotification('danger', errorMessage.value);
    }
  }

  function handleSseEvent(payload) {
    if (!payload) return;

    if (payload.type === 'progress') {
      const data = payload.data || {};
      progressPercent.value = data.percent || 0;
      currentTimeRendered.value = data.currentTime || 0;
      totalDurationRendered.value = data.totalDuration || 0;
      if (data.speed) renderSpeed.value = data.speed;
      if (data.fps) renderFps.value = data.fps;
    } else if (payload.type === 'completed') {
      exportStatus.value = 'completed';
      progressPercent.value = 100;
      downloadLink.value = getDownloadUrl(currentJobId.value);
      cleanupEventSource();
      addNotification('success', 'MP4 video generated successfully!');
    } else if (payload.type === 'error') {
      exportStatus.value = 'failed';
      errorMessage.value = payload.data?.error || 'Rendering error occurred';
      cleanupEventSource();
      addNotification('danger', errorMessage.value);
    } else if (payload.type === 'init') {
      if (payload.status === 'completed' && payload.result) {
        exportStatus.value = 'completed';
        progressPercent.value = 100;
        downloadLink.value = getDownloadUrl(currentJobId.value);
        cleanupEventSource();
      }
    }
  }

  async function cancelRendering() {
    isExportingCanvas.value = false;
    if (currentJobId.value && exportStatus.value === 'rendering') {
      try {
        await cancelJob(currentJobId.value);
      } catch (e) {
        // ignore
      }
    }
    cleanupEventSource();
    exportStatus.value = 'idle';
    progressPercent.value = 0;
    captureProgressText.value = '';
  }

  return {
    isModalOpen,
    exportStatus,
    progressPercent,
    captureProgressText,
    currentTimeRendered,
    totalDurationRendered,
    renderSpeed,
    renderFps,
    downloadLink,
    errorMessage,
    currentJobId,
    openExportModal,
    closeModal,
    triggerExport,
    cancelRendering
  };
}
