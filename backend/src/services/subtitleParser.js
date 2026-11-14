import fs from 'fs';
import path from 'path';

/**
 * Converts timestamp string "HH:MM:SS,mmm" or "HH:MM:SS.mmm" or "MM:SS.mmm" to seconds (float)
 */
export function timeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const cleaned = timeStr.trim().replace(',', '.');
  const parts = cleaned.split(':');
  
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]) || 0;
    const seconds = parseFloat(parts[1]) || 0;
    return minutes * 60 + seconds;
  } else if (parts.length === 1) {
    return parseFloat(parts[0]) || 0;
  }
  return 0;
}

/**
 * Converts seconds float into ASS timestamp format: "H:MM:SS.cc"
 */
export function secondsToAssTime(seconds) {
  const sec = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.floor((sec % 1) * 100);

  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  const cc = String(cs).padStart(2, '0');
  return `${h}:${mm}:${ss}.${cc}`;
}

/**
 * Converts standard hex color "#RRGGBB" or "#AARRGGBB" to ASS color "&HAABBGGRR"
 */
export function hexToAssColor(hex, alpha = '00') {
  if (!hex) return `&H${alpha}FFFFFF&`;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length === 6) {
    const r = clean.substring(0, 2);
    const g = clean.substring(2, 4);
    const b = clean.substring(4, 6);
    return `&H${alpha}${b}${g}${r}&`;
  }
  return `&H${alpha}FFFFFF&`;
}

/**
 * Parses SRT content
 */
export function parseSrt(content) {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.trim().split(/\n\s*\n/);
  const segments = [];

  for (let i = 0; i < blocks.length; i++) {
    const lines = blocks[i].trim().split('\n');
    if (lines.length < 2) continue;

    let timeLineIndex = 0;
    if (/^\d+$/.test(lines[0].trim()) && lines.length >= 2) {
      timeLineIndex = 1;
    }

    const timeLine = lines[timeLineIndex];
    const match = timeLine.match(/(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})/);
    if (!match) continue;

    const startSeconds = timeToSeconds(match[1]);
    const endSeconds = timeToSeconds(match[2]);
    const textLines = lines.slice(timeLineIndex + 1).map(l => l.trim()).filter(Boolean);
    const text = textLines.join('\n');

    if (endSeconds > startSeconds && text) {
      segments.push({
        id: `seg_${segments.length + 1}`,
        index: segments.length + 1,
        startTime: parseFloat(startSeconds.toFixed(3)),
        endTime: parseFloat(endSeconds.toFixed(3)),
        duration: parseFloat((endSeconds - startSeconds).toFixed(3)),
        text
      });
    }
  }

  return segments;
}

/**
 * Parses WebVTT content
 */
export function parseVtt(content) {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Strip WEBVTT header and cues
  const lines = normalized.split('\n');
  const segments = [];
  let i = 0;

  // skip header
  while (i < lines.length && (lines[i].startsWith('WEBVTT') || lines[i].startsWith('NOTE') || !lines[i].trim())) {
    i++;
  }

  let currentCue = null;
  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (currentCue && currentCue.text) {
        segments.push(currentCue);
        currentCue = null;
      }
      continue;
    }

    const timeMatch = line.match(/((?:\d{1,2}:)?\d{2}:\d{2}[\.]\d{1,3})\s*-->\s*((?:\d{1,2}:)?\d{2}:\d{2}[\.]\d{1,3})/);
    if (timeMatch) {
      if (currentCue && currentCue.text) {
        segments.push(currentCue);
      }
      const startSec = timeToSeconds(timeMatch[1]);
      const endSec = timeToSeconds(timeMatch[2]);
      currentCue = {
        id: `seg_${segments.length + 1}`,
        index: segments.length + 1,
        startTime: parseFloat(startSec.toFixed(3)),
        endTime: parseFloat(endSec.toFixed(3)),
        duration: parseFloat((endSec - startSec).toFixed(3)),
        text: ''
      };
    } else if (currentCue) {
      currentCue.text = currentCue.text ? `${currentCue.text}\n${line}` : line;
    }
  }

  if (currentCue && currentCue.text) {
    segments.push(currentCue);
  }

  return segments;
}

/**
 * Parses BTT or structured json / delimited text
 */
export function parseBtt(content) {
  const trimmed = content.trim();

  // 1. Try parsing JSON
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const data = JSON.parse(trimmed);
      const items = Array.isArray(data) ? data : (data.segments || data.subtitles || data.cues || []);
      const segments = [];

      items.forEach((item, idx) => {
        const start = typeof item.start === 'number' ? item.start : timeToSeconds(item.start || item.startTime);
        const end = typeof item.end === 'number' ? item.end : timeToSeconds(item.end || item.endTime);
        const text = item.text || item.content || item.line || '';

        if (end > start && text) {
          segments.push({
            id: `seg_${idx + 1}`,
            index: idx + 1,
            startTime: parseFloat(start.toFixed(3)),
            endTime: parseFloat(end.toFixed(3)),
            duration: parseFloat((end - start).toFixed(3)),
            text: text.trim()
          });
        }
      });

      if (segments.length > 0) return segments;
    } catch (err) {
      // not valid JSON, proceed to line-based parsing
    }
  }

  // 2. Try timestamp-based line parsing: [00:01.00] text or 00:00:01 \t 00:00:04 \t text
  const lines = trimmed.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const segments = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Pattern: 00:01.00 -> 00:04.00 | text
    const arrowMatch = line.match(/((?:\d{1,2}:)?\d{2}:\d{2}[,\.]\d{1,3})\s*(?:-->|->|,|\t)\s*((?:\d{1,2}:)?\d{2}:\d{2}[,\.]\d{1,3})(?:[:\t|,]\s*|\s+)(.*)/);
    if (arrowMatch) {
      const start = timeToSeconds(arrowMatch[1]);
      const end = timeToSeconds(arrowMatch[2]);
      const text = arrowMatch[3] ? arrowMatch[3].trim() : '';
      if (end > start && text) {
        segments.push({
          id: `seg_${segments.length + 1}`,
          index: segments.length + 1,
          startTime: parseFloat(start.toFixed(3)),
          endTime: parseFloat(end.toFixed(3)),
          duration: parseFloat((end - start).toFixed(3)),
          text
        });
        continue;
      }
    }

    // Pattern: [00:01.50] Text line
    const lrcMatch = line.match(/^\[((?:\d{1,2}:)?\d{2}:\d{2}[,\.]\d{1,3})\](.*)/);
    if (lrcMatch) {
      const start = timeToSeconds(lrcMatch[1]);
      const text = lrcMatch[2].trim();
      if (text) {
        segments.push({
          id: `seg_${segments.length + 1}`,
          index: segments.length + 1,
          startTime: parseFloat(start.toFixed(3)),
          endTime: 0, // will resolve end time from next item or default duration
          duration: 3,
          text
        });
      }
    }
  }

  // If LRC style with only start times, resolve endTime from subsequent segment
  for (let j = 0; j < segments.length; j++) {
    if (segments[j].endTime === 0) {
      if (j < segments.length - 1) {
        segments[j].endTime = segments[j + 1].startTime;
      } else {
        segments[j].endTime = segments[j].startTime + 3;
      }
      segments[j].duration = parseFloat((segments[j].endTime - segments[j].startTime).toFixed(3));
    }
  }

  return segments;
}

/**
 * Universal Subtitle Parser: detects format from extension/content
 */
export function parseSubtitleFile(filePath, originalFilename = '') {
  if (!fs.existsSync(filePath)) {
    throw new Error('Subtitle file not found');
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const ext = (path.extname(originalFilename || filePath) || '').toLowerCase();

  let segments = [];
  let detectedFormat = 'unknown';

  if (ext === '.srt' || content.includes('-->') && /^\d+\r?\n\d{2}:\d{2}:\d{2}/.test(content.trim())) {
    detectedFormat = 'SRT';
    segments = parseSrt(content);
  } else if (ext === '.vtt' || content.startsWith('WEBVTT') || content.includes('WEBVTT')) {
    detectedFormat = 'VTT';
    segments = parseVtt(content);
  } else if (ext === '.btt' || ext === '.json' || ext === '.lrc') {
    detectedFormat = 'BTT';
    segments = parseBtt(content);
  } else {
    // Attempt fallback heuristic parsing: SRT -> VTT -> BTT
    if (content.includes('-->')) {
      segments = parseSrt(content);
      if (segments.length === 0) segments = parseVtt(content);
      detectedFormat = 'SRT/VTT';
    } else {
      segments = parseBtt(content);
      detectedFormat = 'BTT';
    }
  }

  if (!segments || segments.length === 0) {
    throw new Error(
      `Could not parse subtitles from ${originalFilename || 'uploaded file'}. ` +
      `Supported formats: SRT ("00:00:01,000 --> 00:00:04,000"), ` +
      `VTT ("00:00:01.000 --> 00:00:04.000"), ` +
      `or BTT (JSON array of {start, end, text} or timecode lines). ` +
      `Please ensure valid timestamp formatting.`
    );
  }

  return {
    format: detectedFormat,
    count: segments.length,
    totalDuration: segments[segments.length - 1].endTime,
    segments
  };
}

/**
 * Smart Subtitle Text Auto-Wrapper:
 * Breaks long lines (e.g. Hindi Devanagari or English sentences) into balanced 2 (or more) lines.
 * Prevents captions from stretching to the far edges ("badi line ho to niche aa jaye").
 */
export function wrapSubtitleText(text, maxChars = 34) {
  if (!text) return '';
  // Normalize line endings and handle existing newlines or \N
  const rawLines = text.split(/\r?\n|\\N/);
  const resultLines = [];

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.length <= maxChars) {
      resultLines.push(trimmed);
      continue;
    }

    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length <= 1) {
      resultLines.push(trimmed);
      continue;
    }

    // If it fits nicely into 2 balanced lines (<= maxChars * 2 + 6)
    if (trimmed.length <= maxChars * 2 + 6) {
      const targetMid = trimmed.length / 2;
      let bestIdx = 1;
      let minDiff = Infinity;
      let runningLen = 0;
      for (let i = 0; i < words.length - 1; i++) {
        runningLen += words[i].length + (i > 0 ? 1 : 0);
        const diff = Math.abs(runningLen - targetMid);
        if (diff < minDiff) {
          minDiff = diff;
          bestIdx = i + 1;
        }
      }
      resultLines.push(words.slice(0, bestIdx).join(' '));
      resultLines.push(words.slice(bestIdx).join(' '));
    } else {
      let curLine = '';
      for (const w of words) {
        if (!curLine) {
          curLine = w;
        } else if ((curLine + ' ' + w).length <= maxChars) {
          curLine += ' ' + w;
        } else {
          resultLines.push(curLine);
          curLine = w;
        }
      }
      if (curLine) resultLines.push(curLine);
    }
  }

  return resultLines.join('\n');
}

/**
 * Generates ASS subtitle file for FFmpeg burning with customizable styling
 */
export function generateAssSubtitleFile({ segments, captionSettings, videoWidth, videoHeight, outputPath }) {
  const {
    fontSize = 48,
    fontColor = '#FFFFFF',
    outlineColor = '#000000',
    outlineWidth = 2,
    position = 'bottom', // 'bottom', 'middle', 'top', 'custom'
    customPosition = { x: 50, y: 85 },
    background = 'none', // 'none', 'box', 'shadow'
    boxColor = '#000000',
    boxOpacity = 0.7,
    animation = 'none', // 'none', 'fade', 'slide', 'karaoke', 'typewriter'
    karaokeColor = '#FACC15',
    fontFamily = 'Gotu'
  } = captionSettings || {};

  // Base reference resolution height is 720 (standard 720p base)
  // Scale font & outline proportionally to video minimum dimension so 16:9, 9:16 and 1:1 match 1:1
  const baseDim = Math.min(videoWidth, videoHeight);
  const scaleFactor = baseDim / 720;
  const scaledFontSize = Math.max(16, Math.round(fontSize * scaleFactor));

  // Outline Width: only apply if outlineWidth > 0, otherwise strictly 0
  const rawOutline = Number(outlineWidth) || 0;
  const hasOutline = rawOutline > 0;
  const scaledOutline = hasOutline ? Math.max(1, Math.round(rawOutline * scaleFactor)) : 0;

  // Determine line wrap width based on aspect ratio
  const aspect = videoWidth / videoHeight;
  let maxChars = 34;
  if (aspect < 0.8) {
    maxChars = 22; // 9:16 vertical
  } else if (aspect < 1.2) {
    maxChars = 26; // 1:1 square
  } else {
    maxChars = 34; // 16:9 landscape
  }

  // Margin L/R: 8% of video width so text never goes too close to the edges
  const marginLR = Math.round(videoWidth * 0.08);

  // Map position to ASS alignment (Numpad format):
  // 2 = bottom center, 5 = middle center, 8 = top center
  let alignment = 2;
  let marginV = Math.round(videoHeight * 0.08); // 8% margin from top/bottom
  const isCustomPos = position === 'custom';

  let customX = typeof customPosition?.x === 'number' ? customPosition.x : 50;
  let customY = typeof customPosition?.y === 'number' ? customPosition.y : 85;
  customX = Math.min(90, Math.max(10, customX));
  customY = Math.min(92, Math.max(8, customY));
  let targetX = Math.round((customX / 100) * videoWidth);
  let targetY = Math.round((customY / 100) * videoHeight);

  if (isCustomPos) {
    alignment = 5; // Middle-center anchor for absolute pixel \pos(X,Y)
    marginV = 0;
  } else if (position === 'top') {
    alignment = 8;
    marginV = Math.round(videoHeight * 0.08);
    targetX = Math.round(videoWidth / 2);
    targetY = marginV;
  } else if (position === 'middle') {
    alignment = 5;
    marginV = 0;
    targetX = Math.round(videoWidth / 2);
    targetY = Math.round(videoHeight / 2);
  } else {
    // bottom
    alignment = 2;
    marginV = Math.round(videoHeight * 0.08);
    targetX = Math.round(videoWidth / 2);
    targetY = Math.round(videoHeight - marginV);
  }

  // Colors in ASS format (&HAABBGGRR)
  const primaryColor = hexToAssColor(fontColor, '00');
  const outlineAssColor = hexToAssColor(outlineColor, '00');
  const karaokeAssHighlight = hexToAssColor(karaokeColor || '#FACC15', '00');

  // BorderStyle: 1 = outline + shadow, 3 = opaque/semi-transparent bounding box
  let borderStyle = 1;
  let shadow = 0;
  let effectiveOutlineColor = outlineAssColor;
  let effectiveBackColor = '&HFF000000&'; // fully transparent by default (Background Style: None)
  let boxPaddingOutline = scaledOutline;

  if (background === 'box') {
    borderStyle = 3;
    // In ASS BorderStyle 3, OutlineColour defines the bounding box fill color!
    const safeOpacity = Math.max(0, Math.min(1, typeof boxOpacity === 'number' ? boxOpacity : 0.7));
    const alphaHex = Math.round((1 - safeOpacity) * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
    const boxColorAss = hexToAssColor(boxColor || '#000000', alphaHex);
    effectiveOutlineColor = boxColorAss;
    effectiveBackColor = boxColorAss;
    boxPaddingOutline = Math.max(8, Math.round(14 * scaleFactor));
    shadow = 0;
  } else if (background === 'shadow') {
    borderStyle = 1;
    effectiveOutlineColor = hasOutline ? outlineAssColor : '&HFF000000&';
    effectiveBackColor = '&H80000000&';
    boxPaddingOutline = scaledOutline; // 0 if outlineWidth is 0
    shadow = Math.max(1, Math.round(2 * scaleFactor));
  } else {
    // none (default): absolutely no background box and no shadow
    borderStyle = 1;
    effectiveOutlineColor = hasOutline ? outlineAssColor : '&HFF000000&';
    effectiveBackColor = '&HFF000000&'; // 100% transparent
    boxPaddingOutline = scaledOutline; // 0 if outlineWidth is 0
    shadow = 0;
  }

  // Font: Use selected Google Hindi font (default: Gotu)
  const fontName = captionSettings.fontFamily || 'Gotu';

  let ass = `[Script Info]
Title: Antigravity Video Generator Captions
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: None
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${scaledFontSize},${primaryColor},${primaryColor},${effectiveOutlineColor},${effectiveBackColor},1,0,0,0,100,100,0,0,${borderStyle},${boxPaddingOutline},${shadow},${alignment},${marginLR},${marginLR},${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  // Calculate coordinates for slide animation (matching canvas translateY(24px) -> translateY(0))
  const slideDist = Math.round(24 * scaleFactor);
  let startY = targetY + slideDist;
  if (position === 'top') {
    startY = targetY - slideDist;
  }

  // Position tag prefix for custom position (explicit \an5 locks center anchor)
  const posTag = isCustomPos ? `\\an5\\pos(${targetX},${targetY})` : '';

  segments.forEach(seg => {
    const start = secondsToAssTime(seg.startTime);
    const end = secondsToAssTime(seg.endTime);
    const rawText = (seg.text || '')
      .replace(/\{/g, '(')
      .replace(/\}/g, ')');

    // Auto-wrap long lines into balanced 2 lines joined by \N
    const wrappedStr = wrapSubtitleText(rawText, maxChars);
    const wrappedLines = wrappedStr.split('\n').filter(Boolean);
    const cleanText = wrappedLines.join('\\N');

    if (animation === 'fade') {
      // Smooth 300ms Fade In / 150ms Fade Out (matching CSS .sub-anim-fade)
      const tag = posTag ? `{${posTag}\\fad(300,150)}` : '{\\fad(300,150)}';
      ass += `Dialogue: 0,${start},${end},Default,,0,0,0,,${tag}${cleanText}\n`;
    } else if (animation === 'slide') {
      // Smooth Slide Up animation (matching CSS .sub-anim-slide-up translateY(24px)->0)
      const moveTag = isCustomPos
        ? `{\\an5\\move(${targetX},${startY},${targetX},${targetY},0,300)\\fad(150,150)}`
        : `{\\move(${targetX},${startY},${targetX},${targetY},0,300)\\fad(150,150)}`;
      ass += `Dialogue: 0,${start},${end},Default,,0,0,0,,${moveTag}${cleanText}\n`;
    } else if (animation === 'typewriter') {
      // Word-by-word typewriter preserving multi-line breaks (\N)
      const lineWords = wrappedLines.map(l => l.split(/\s+/).filter(Boolean));
      const totalWords = lineWords.reduce((sum, words) => sum + words.length, 0);
      const prefix = posTag ? `{${posTag}}` : '';

      if (totalWords <= 1) {
        ass += `Dialogue: 0,${start},${end},Default,,0,0,0,,${prefix}${cleanText}\n`;
      } else {
        const segDur = Math.max(0.2, seg.endTime - seg.startTime);
        const step = segDur / totalWords;

        for (let i = 0; i < totalWords; i++) {
          const subStart = seg.startTime + i * step;
          const subEnd = (i === totalWords - 1) ? seg.endTime : seg.startTime + (i + 1) * step;

          let wordsRemaining = i + 1;
          const typedLines = [];
          for (const words of lineWords) {
            if (wordsRemaining <= 0) break;
            const take = Math.min(words.length, wordsRemaining);
            typedLines.push(words.slice(0, take).join(' '));
            wordsRemaining -= take;
          }
          const visible = typedLines.join('\\N');
          ass += `Dialogue: 0,${secondsToAssTime(subStart)},${secondsToAssTime(subEnd)},Default,,0,0,0,,${prefix}${visible}\n`;
        }
      }
    } else if (animation === 'karaoke') {
      // Word-by-Word Karaoke Highlight preserving multi-line breaks (\N):
      // Full multi-line sentence is visible, only currently spoken word is highlighted
      const lineWords = wrappedLines.map(l => l.split(/\s+/).filter(Boolean));
      const totalWords = lineWords.reduce((sum, words) => sum + words.length, 0);
      const prefix = posTag ? `{${posTag}}` : '';

      if (totalWords <= 1) {
        ass += `Dialogue: 0,${start},${end},Default,,0,0,0,,${prefix}{\\1c${karaokeAssHighlight}\\fscx108\\fscy108}${cleanText}{\\1c${primaryColor}\\fscx100\\fscy100}\n`;
      } else {
        const segDur = Math.max(0.1, seg.endTime - seg.startTime);
        const step = segDur / totalWords;

        for (let i = 0; i < totalWords; i++) {
          const subStart = seg.startTime + i * step;
          const subEnd = (i === totalWords - 1) ? seg.endTime : seg.startTime + (i + 1) * step;

          let globalCounter = 0;
          const renderedLines = lineWords.map(words => {
            return words.map(w => {
              const currentWordIdx = globalCounter++;
              if (currentWordIdx === i) {
                return `{\\1c${karaokeAssHighlight}\\fscx108\\fscy108}${w}{\\1c${primaryColor}\\fscx100\\fscy100}`;
              }
              return w;
            }).join(' ');
          });

          const lineContent = renderedLines.join('\\N');
          ass += `Dialogue: 0,${secondsToAssTime(subStart)},${secondsToAssTime(subEnd)},Default,,0,0,0,,${prefix}${lineContent}\n`;
        }
      }
    } else {
      // Default: None (Static)
      const prefix = posTag ? `{${posTag}}` : '';
      ass += `Dialogue: 0,${start},${end},Default,,0,0,0,,${prefix}${cleanText}\n`;
    }
  });

  fs.writeFileSync(outputPath, ass, 'utf8');
  return outputPath;
}
