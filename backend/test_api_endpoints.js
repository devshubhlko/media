import fs from 'fs';
import path from 'path';

async function testApi() {
  console.log('--- TESTING HTTP API ENDPOINTS ---');
  const baseUrl = 'http://localhost:5000';
  const assetDir = path.resolve('temp', 'test_assets');

  // 1. Health
  console.log('\n[API 1] Testing /api/health:');
  const healthRes = await fetch(`${baseUrl}/api/health`);
  const health = await healthRes.json();
  console.log('Health:', health.status, 'FFmpeg available:', health.ffmpeg.available);

  // 2. Upload Script
  console.log('\n[API 2] Testing /api/upload/script:');
  const scriptBlob = new Blob([fs.readFileSync(path.join(assetDir, 'sample_hindi_script.txt'))], { type: 'text/plain' });
  const scriptForm = new FormData();
  scriptForm.append('scriptFile', scriptBlob, 'sample_hindi_script.txt');

  const scriptRes = await fetch(`${baseUrl}/api/upload/script`, {
    method: 'POST',
    body: scriptForm
  });
  const scriptData = await scriptRes.json();
  console.log(`✓ Script uploaded: ${scriptData.wordCount} words, text length=${scriptData.text.length}`);

  // 3. Upload Audio
  console.log('\n[API 3] Testing /api/upload/audio:');
  const audioBlob = new Blob([fs.readFileSync(path.join(assetDir, 'test_audio.mp3'))], { type: 'audio/mp3' });
  const audioForm = new FormData();
  audioForm.append('audioFile', audioBlob, 'test_audio.mp3');

  const audioRes = await fetch(`${baseUrl}/api/upload/audio`, {
    method: 'POST',
    body: audioForm
  });
  const audioData = await audioRes.json();
  console.log(`✓ Audio uploaded: duration=${audioData.duration}s, path=${audioData.path}`);

  // 4. Upload Subtitles
  console.log('\n[API 4] Testing /api/upload/subtitles:');
  const subBlob = new Blob([fs.readFileSync(path.join(assetDir, 'sample_subtitles.srt'))], { type: 'text/plain' });
  const subForm = new FormData();
  subForm.append('subtitleFile', subBlob, 'sample_subtitles.srt');

  const subRes = await fetch(`${baseUrl}/api/upload/subtitles`, {
    method: 'POST',
    body: subForm
  });
  const subData = await subRes.json();
  console.log(`✓ Subtitles uploaded: ${subData.count} cues, format=${subData.format}`);

  // 5. Upload Image
  console.log('\n[API 5] Testing /api/upload/image:');
  const imgBlob = new Blob([fs.readFileSync(path.join(assetDir, 'scene_1.png'))], { type: 'image/png' });
  const imgForm = new FormData();
  imgForm.append('imageFile', imgBlob, 'scene_1.png');

  const imgRes = await fetch(`${baseUrl}/api/upload/image`, {
    method: 'POST',
    body: imgForm
  });
  const imgData = await imgRes.json();
  console.log(`✓ Image uploaded: ${imgData.filename}, path=${imgData.path}`);

  // 6. Start Export via API
  console.log('\n[API 6] Testing /api/export:');
  const exportPayload = {
    timeline: {
      slots: [
        {
          id: 's1',
          sceneNumber: 1,
          startTime: 0,
          endTime: 5.0,
          duration: 5.0,
          imagePath: imgData.path
        },
        {
          id: 's2',
          sceneNumber: 2,
          startTime: 5.0,
          endTime: 10.0,
          duration: 5.0,
          imagePath: imgData.path
        }
      ]
    },
    audio: {
      path: audioData.path,
      duration: audioData.duration
    },
    captionsEnabled: true,
    subtitleSegments: subData.segments,
    captionSettings: {
      fontSize: 26,
      fontColor: '#FFFFFF',
      outlineColor: '#000000',
      outlineWidth: 2,
      position: 'bottom',
      background: 'box'
    },
    exportSettings: {
      aspectRatio: '16:9',
      resolution: '720p',
      fps: 30
    }
  };

  const exportRes = await fetch(`${baseUrl}/api/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(exportPayload)
  });
  const exportData = await exportRes.json();
  console.log(`✓ Export Job Queued: jobId=${exportData.jobId}, status=${exportData.status}`);

  // 7. Poll status until completed
  console.log('\n[API 7] Monitoring Job Status:');
  let isDone = false;
  while (!isDone) {
    await new Promise(r => setTimeout(r, 600));
    const statusRes = await fetch(`${baseUrl}/api/export/${exportData.jobId}/status`);
    const statusData = await statusRes.json();
    process.stdout.write(`\rStatus: ${statusData.status} | Progress: ${statusData.progress.percent}%`);
    if (statusData.status === 'completed') {
      isDone = true;
      console.log('\n✓ Job Completed! Result:', statusData.result);
    } else if (statusData.status === 'failed') {
      throw new Error(`Job failed: ${statusData.error}`);
    }
  }

  // 8. Download check
  console.log('\n[API 8] Verifying /api/export/:jobId/download:');
  const downloadRes = await fetch(`${baseUrl}/api/export/${exportData.jobId}/download`);
  const buffer = await downloadRes.arrayBuffer();
  console.log(`✓ Downloaded MP4 stream size: ${(buffer.byteLength / 1024).toFixed(1)} KB`);

  console.log('\n=============================================');
  console.log('ALL API ENDPOINTS VALIDATED SUCCESSFULLY!');
  console.log('=============================================');
}

testApi().catch(err => {
  console.error('\nAPI TEST FAILED:', err);
  process.exit(1);
});
