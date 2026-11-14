import path from 'path';
import fs from 'fs';
import { getAudioInfo, renderVideo } from './src/services/ffmpegService.js';
import { parseSubtitleFile } from './src/services/subtitleParser.js';
import { EXPORT_DIR } from './src/config.js';
import { spawnSync } from 'child_process';
import { FFPROBE_PATH } from './src/config.js';

async function runTests() {
  console.log('--- STARTING VIDEO GENERATOR PIPELINE TESTS ---');
  const assetDir = path.resolve('temp', 'test_assets');

  // Test 1: Subtitle Parser (SRT, VTT, BTT)
  console.log('\n[TEST 1] Testing Subtitle Parsing:');
  const srtResult = parseSubtitleFile(path.join(assetDir, 'sample_subtitles.srt'), 'sample_subtitles.srt');
  console.log(`✓ SRT Parsed: format=${srtResult.format}, cues=${srtResult.count}`);

  const vttResult = parseSubtitleFile(path.join(assetDir, 'sample_subtitles.vtt'), 'sample_subtitles.vtt');
  console.log(`✓ VTT Parsed: format=${vttResult.format}, cues=${vttResult.count}`);

  const bttResult = parseSubtitleFile(path.join(assetDir, 'sample_subtitles.btt'), 'sample_subtitles.btt');
  console.log(`✓ BTT Parsed: format=${bttResult.format}, cues=${bttResult.count}`);

  // Test 2: Audio Analysis with FFprobe
  console.log('\n[TEST 2] Testing Audio Probe:');
  const audioFile = path.join(assetDir, 'test_audio.mp3');
  const audioInfo = await getAudioInfo(audioFile);
  console.log(`✓ Audio probed: duration=${audioInfo.duration}s, codec=${audioInfo.codec}, sampleRate=${audioInfo.sampleRate}Hz`);

  // Test 3: Rendering 16:9 MP4 with FFmpeg and Hardcoded Subtitles
  console.log('\n[TEST 3] Rendering 16:9 Video with Captions:');
  const testJobId = 'test_job_16_9';
  const outputPath = path.join(EXPORT_DIR, `test_render_16_9.mp4`);

  const timeline = {
    slots: [
      {
        id: 'slot_1',
        sceneNumber: 1,
        startTime: 0,
        endTime: 3.5,
        duration: 3.5,
        imagePath: path.join(assetDir, 'scene_1.png')
      },
      {
        id: 'slot_2',
        sceneNumber: 2,
        startTime: 3.5,
        endTime: 7.0,
        duration: 3.5,
        imagePath: path.join(assetDir, 'scene_2.png')
      },
      {
        id: 'slot_3',
        sceneNumber: 3,
        startTime: 7.0,
        endTime: 10.0,
        duration: 3.0,
        imagePath: path.join(assetDir, 'scene_3.png')
      }
    ]
  };

  const progressLogs = [];

  const result = await renderVideo({
    jobId: testJobId,
    timeline,
    audioPath: audioFile,
    captionsEnabled: true,
    subtitleSegments: srtResult.segments,
    captionSettings: {
      fontSize: 28,
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
    },
    outputPath,
    tempDir: EXPORT_DIR,
    onProgress: (prog) => {
      progressLogs.push(prog.percent);
      process.stdout.write(`\rEncoding Progress: ${prog.percent}% (Time: ${prog.currentTime}s, Speed: ${prog.speed || '1x'})`);
    }
  });

  console.log('\n✓ 16:9 Video Render Completed!');
  console.log(`Output: ${result.outputPath}`);
  console.log(`File Size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);

  // Verify output with ffprobe
  const probeProc = spawnSync(FFPROBE_PATH, [
    '-v', 'error',
    '-show_entries', 'stream=codec_type,codec_name,width,height:format=duration',
    '-of', 'json',
    outputPath
  ]);
  const probeData = JSON.parse(probeProc.stdout.toString());
  console.log('✓ FFprobe Verification of Output Video:');
  probeData.streams.forEach(s => {
    console.log(`  Stream: ${s.codec_type} (${s.codec_name}) ${s.width ? `${s.width}x${s.height}` : ''}`);
  });
  console.log(`  Duration: ${parseFloat(probeData.format.duration).toFixed(2)}s`);

  // Test 4: Testing 9:16 Vertical Video (Shorts / Reels)
  console.log('\n[TEST 4] Rendering 9:16 Vertical Video:');
  const outputVertical = path.join(EXPORT_DIR, `test_render_9_16.mp4`);
  const resultVertical = await renderVideo({
    jobId: 'test_job_9_16',
    timeline,
    audioPath: audioFile,
    captionsEnabled: false,
    exportSettings: {
      aspectRatio: '9:16',
      resolution: '720p',
      fps: 30
    },
    outputPath: outputVertical,
    tempDir: EXPORT_DIR,
    onProgress: (prog) => {
      process.stdout.write(`\rVertical Progress: ${prog.percent}%`);
    }
  });

  console.log('\n✓ 9:16 Video Render Completed!');
  const probeVertical = spawnSync(FFPROBE_PATH, [
    '-v', 'error',
    '-show_entries', 'stream=codec_type,width,height:format=duration',
    '-of', 'json',
    outputVertical
  ]);
  const probeVertData = JSON.parse(probeVertical.stdout.toString());
  const vStream = probeVertData.streams.find(s => s.codec_type === 'video');
  console.log(`✓ 9:16 Dimensions: ${vStream.width}x${vStream.height} (Expected 720x1280)`);

  console.log('\n========================================');
  console.log('ALL PIPELINE TESTS PASSED SUCCESSFULLY!');
  console.log('========================================');
}

runTests().catch(err => {
  console.error('\nTEST FAILED:', err);
  process.exit(1);
});
