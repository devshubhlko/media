import { ref } from 'vue';
import { useTimeline } from './useTimeline.js';
import { startExport, cancelJob, createProgressEventSource, getDownloadUrl } from '../services/api.js';

export function useExport() {
  const {
    slots,
    audioFile,
    captionsEnabled,
    subtitleSegments,
    captionSettings,
    exportSettings,
    addNotification
  } = useTimeline();

  const isModalOpen = ref(false);
  const exportStatus = ref('idle'); // idle | submitting | rendering | completed | failed
  const progressPercent = ref(0);
  const currentTimeRendered = ref(0);
  const totalDurationRendered = ref(0);
  const renderSpeed = ref('1x');
  const renderFps = ref(0);
  const downloadLink = ref('');
  const errorMessage = ref('');
  const currentJobId = ref(null);

  let eventSource = null;

  function openExportModal() {
    // Preliminary validation before opening modal
    if (!audioFile.value) {
      addNotification('danger', 'Audio file is required for video export.');
      return;
    }

    if (slots.value.length === 0) {
      addNotification('danger', 'Please add at least one scene slot.');
      return;
    }

    const unassigned = slots.value.filter(s => !s.imagePath);
    if (unassigned.length > 0) {
      addNotification('danger', `Please assign images to all scenes (${unassigned.length} scenes missing images).`);
      return;
    }

    isModalOpen.value = true;
    exportStatus.value = 'idle';
    progressPercent.value = 0;
    errorMessage.value = '';
    downloadLink.value = '';
  }

  function closeModal() {
    if (exportStatus.value === 'rendering') {
      const confirmCancel = confirm('A video is currently rendering. Are you sure you want to close and cancel?');
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
    try {
      exportStatus.value = 'submitting';
      errorMessage.value = '';
      progressPercent.value = 0;

      const payload = {
        timeline: {
          slots: slots.value.map(s => ({
            id: s.id,
            sceneNumber: s.sceneNumber,
            startTime: s.startTime,
            endTime: s.endTime,
            duration: s.duration,
            imagePath: s.imagePath
          }))
        },
        audio: {
          path: audioFile.value.path,
          duration: audioFile.value.duration
        },
        captionsEnabled: captionsEnabled.value,
        subtitleSegments: captionsEnabled.value ? subtitleSegments.value : [],
        captionSettings: captionSettings.value,
        exportSettings: exportSettings.value
      };

      const res = await startExport(payload);
      currentJobId.value = res.jobId;
      exportStatus.value = 'rendering';

      // Connect to SSE
      cleanupEventSource();
      eventSource = createProgressEventSource(res.jobId);

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          handleSseEvent(parsed);
        } catch (err) {
          console.error('Failed to parse SSE data:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.warn('SSE connection error:', err);
      };
    } catch (err) {
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
  }

  return {
    isModalOpen,
    exportStatus,
    progressPercent,
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
