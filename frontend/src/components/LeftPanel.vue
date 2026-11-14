<template>
  <aside class="w-full flex flex-col bg-white dark:bg-gray-900/70 h-full overflow-hidden transition-colors">
    <!-- Panel Navigation Tabs -->
    <div class="flex items-center border-b border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-gray-950/60 p-1 gap-1 shrink-0">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="[
          'flex-1 py-1.5 px-2 text-xs font-medium rounded transition-all flex items-center justify-center gap-1.5 relative',
          activeTab === tab.id
            ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-white shadow-xs font-semibold'
            : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200 hover:bg-slate-200/50 dark:hover:bg-gray-900/50'
        ]"
      >
        <component :is="tab.icon" class="w-3.5 h-3.5" />
        <span>{{ tab.label }}</span>
        <!-- Dot indicator if loaded -->
        <span
          v-if="tab.isLoaded"
          class="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-1 right-1"
        ></span>
      </button>
    </div>

    <!-- Tab Content Body -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- 1. IMAGE SLOTS TAB (Default) -->
      <div v-show="activeTab === 'slots'" class="space-y-4">
        <!-- Subtitle Sentence Sync Banner inside Slots Tab -->
        <div v-if="subtitleSentenceCount > 0" class="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 text-xs">
          <div>
            <div class="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
              <span><strong>{{ subtitleSentenceCount }} Sentences</strong></span>
            </div>
            <div class="text-[10px] text-slate-500 dark:text-gray-400">
              Detected via "." ya "|" ya "।"
            </div>
          </div>
          <button
            @click="createSlotsFromSubtitleSentences()"
            class="btn btn-primary text-xs py-1 px-2.5 shadow-xs font-semibold"
            title="Create image slots matching subtitle sentences"
          >
          Set Slots
          </button>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <!-- Add Slot Button -->
            <button
              @click="addSlot"
              :disabled="limitSlotsToSentences && subtitleSentenceCount > 0 && slots.length >= subtitleSentenceCount"
              class="btn btn-primary text-xs py-1 px-2.5 flex items-center gap-1 shadow-xs font-semibold"
              title="Add Image Slot (Distributes within audio duration)"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>Add Slot</span>
            </button>

            <button
              @click="$refs.batchImagesRef.click()"
              class="btn btn-secondary text-xs py-1 px-2 flex items-center gap-1"
              title="Batch upload images (Distributed within audio duration)"
            >
              <Images class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Batch</span>
            </button>
          </div>

          <div class="text-[11px] font-mono text-slate-500 dark:text-gray-400 flex items-center gap-1">
            <span v-if="audioFile" class="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>Audio: {{ audioFile.duration.toFixed(1) }}s</span>
            </span>
            <span v-else class="text-slate-400">Total: {{ totalTimelineDuration.toFixed(1) }}s</span>
          </div>

          <input
            ref="batchImagesRef"
            type="file"
            multiple
            accept="image/*"
            class="hidden"
            style="display: none;"
            @change="handleBatchImages"
          />
        </div>

        <!-- Slots List -->
        <div v-if="slots.length > 0" class="space-y-2.5">
          <ImageSlotItem
            v-for="slot in slots"
            :key="slot.id"
            :slot-data="slot"
            :is-active="currentSlotId === slot.id"
            @assign-image="onAssignImage"
            @remove-image="removeImageFromSlot"
            @delete-slot="removeSlot"
          />
        </div>

        <div v-else class="text-center py-8 text-slate-400 dark:text-gray-500 text-xs border border-dashed border-slate-300 dark:border-gray-800 rounded-lg p-4">
          <Film class="w-8 h-8 mx-auto mb-2 text-slate-400 dark:text-gray-600" />
          <p>No image slots yet.</p>
          <p class="text-[11px] mt-1 text-slate-500 dark:text-gray-500">
            Upload audio or subtitles to auto-create slots, or click Add.
          </p>
        </div>
      </div>

      <!-- 2. MUSIC TAB -->
      <div v-show="activeTab === 'audio'" class="space-y-3">
        <div class="space-y-1.5">
          <div class="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-gray-950 p-1 rounded-lg border border-slate-200 dark:border-gray-800">
            <!-- 1. Upload Option -->
            <button
              type="button"
              @click="musicSource = 'upload'"
              :class="[
                'py-1.5 px-2 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-all',
                musicSource === 'upload'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200'
              ]"
            >
              <Upload class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Upload</span>
            </button>

            <!-- 2. Speechify TTS Option -->
            <button
              type="button"
              @click="musicSource = 'speechify'"
              :class="[
                'py-1.5 px-2 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-all',
                musicSource === 'speechify'
                  ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-300 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200'
              ]"
            >
              <Mic class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Speechify</span>
            </button>

            <!-- 3. Edge TTS Option -->
            <button
              type="button"
              @click="musicSource = 'edge'"
              :class="[
                'py-1.5 px-2 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-all',
                musicSource === 'edge'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-300 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200'
              ]"
            >
              <Volume2 class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Edge</span>
            </button>
          </div>
        </div>

        <!-- 1. UPLOAD OPTION -->
        <div v-show="musicSource === 'upload'" class="space-y-3">
          <div
            class="dropzone flex flex-col items-center justify-center gap-2 border-slate-300 dark:border-gray-800 bg-slate-50/50 dark:bg-black/10 cursor-pointer p-4 rounded-lg border-2 border-dashed"
            @click="$refs.audioFileRef.click()"
          >
            <Music class="w-7 h-7 text-cyan-500 dark:text-cyan-400" />
            <div class="text-xs font-medium text-slate-800 dark:text-gray-200">
              {{ audioFile && musicSource === 'upload' ? audioFile.originalName : 'Click to upload MP3 or WAV' }}
            </div>
            <p class="text-[11px] text-slate-400 dark:text-gray-400">Maintains exact timing & sample rate</p>
            <input
              ref="audioFileRef"
              type="file"
              accept="audio/mp3,audio/wav,audio/*"
              class="hidden"
              style="display: none;"
              @change="handleAudioFile"
            />
          </div>

          <!-- Active Uploaded Audio Info Card -->
          <div v-if="audioFile && musicSource === 'upload'" class="bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-lg p-3 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500 dark:text-gray-400">Duration:</span>
              <span class="font-bold text-cyan-600 dark:text-cyan-400 font-mono">{{ audioFile.duration.toFixed(2) }}s</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500 dark:text-gray-400">Format:</span>
              <span class="text-slate-700 dark:text-gray-300 uppercase font-medium">{{ audioFile.codec }} • {{ audioFile.sampleRate }}Hz</span>
            </div>
            <audio controls :src="audioFile.url" class="w-full h-8 mt-1"></audio>
           
          </div>
        </div>

        <!-- 2. SPEECHIFY TTS INTERFACE -->
        <div v-show="musicSource === 'speechify'" class="space-y-3">
          <!-- Voice Selector -->
          <div>
            <label class="block text-[11px] font-semibold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Select Voice:
            </label>
            <select
              v-model="speechifyVoice"
              :disabled="isGeneratingSpeechify"
              class="w-full bg-slate-50 dark:bg-gray-900 border border-slate-300 dark:border-gray-700 text-slate-800 dark:text-gray-200 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="rajiv">Rajiv (rajiv)</option>
              <option value="shlok">Shlok (shlok)</option>
              <option value="kathan">Kathan (kathan)</option>
              <option value="vinti">Vinti (vinti)</option>
              <option value="mihika">Mihika (mihika)</option>
            </select>
          </div>

          <!-- Text Input Area -->
          <div class="space-y-1">
            <div class="flex items-center justify-between text-[11px]">
              <label class="font-semibold text-slate-700 dark:text-gray-300 uppercase tracking-wider">
                Text Input:
              </label>
              <div class="flex items-center gap-2">
                <span class="text-slate-400 dark:text-gray-500 font-mono text-[10px]">
                  {{ speechifyText.length }} chars
                </span>
                <button
                  type="button"
                  @click="speechifyText = sampleHindiScript"
                  :disabled="isGeneratingSpeechify"
                  class="text-purple-600 dark:text-purple-400 hover:underline text-[10px] font-medium"
                >
                  Sample
                </button>
                <button
                  type="button"
                  @click="speechifyText = ''"
                  :disabled="isGeneratingSpeechify"
                  class="text-rose-600 dark:text-rose-400 hover:underline text-[10px] font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
            <textarea
              v-model="speechifyText"
              :disabled="isGeneratingSpeechify"
              rows="5"
              placeholder="यहाँ अपनी स्क्रिप्ट टाइप या पेस्ट करें... (Auto-chunked for long text)..."
              class="w-full bg-slate-50 dark:bg-gray-900 border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-gray-100 rounded-lg p-2.5 text-xs font-hindi focus:ring-2 focus:ring-purple-500 focus:outline-none leading-relaxed resize-y"
            ></textarea>
          </div>

          <!-- Live Progress Bar -->
          <div v-if="isGeneratingSpeechify" class="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-lg p-2.5 space-y-1.5">
            <div class="flex items-center justify-between text-[11px] font-medium text-purple-900 dark:text-purple-200">
              <span class="flex items-center gap-1.5">
                <RefreshCw class="w-3 h-3 animate-spin text-purple-600 dark:text-purple-400" />
                {{ speechifyProgress.message || 'Generating Speechify voice...' }}
              </span>
              <span class="font-bold text-purple-700 dark:text-purple-300 font-mono">{{ speechifyProgress.percent }}%</span>
            </div>
            <div class="w-full bg-slate-200 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
              <div
                class="h-full bg-purple-600 rounded-full transition-all duration-300"
                :style="{ width: speechifyProgress.percent + '%' }"
              ></div>
            </div>
            <div v-if="speechifyProgress.total > 1" class="text-[10px] text-purple-600 dark:text-purple-400 flex justify-between">
              <span>Part: {{ speechifyProgress.current }} / {{ speechifyProgress.total }}</span>
              <span>Sequential Chunking & Subtitles</span>
            </div>
          </div>

          <!-- "Get Voice" Button -->
          <button
            type="button"
            @click="handleGetVoiceSpeechify"
            :disabled="isGeneratingSpeechify || !speechifyText.trim()"
            class="w-full py-2 px-3 text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-xs bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw v-if="isGeneratingSpeechify" class="w-3.5 h-3.5 animate-spin" />
            <Mic v-else class="w-3.5 h-3.5" />
            <span>{{ isGeneratingSpeechify ? 'Generating Voice...' : 'Get Voice' }}</span>
          </button>

          <!-- Current Speechify Generated Audio & Files Card -->
          <div v-if="speechifyResult" class="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/50 rounded-lg p-3 space-y-2.5">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-purple-800 dark:text-purple-300">
                Speechify ({{ speechifyResult.voice }})
              </span>
              <span class="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                {{ speechifyResult.audio.duration.toFixed(1) }}s
              </span>
            </div>

            <!-- Mini Audio Player -->
            <audio controls :src="speechifyResult.audio.url" class="w-full h-8"></audio>

            <!-- Download Assets Row -->
            <div class="flex items-center gap-1.5 pt-1">
              <a
                :href="speechifyResult.audio.url"
                :download="speechifyResult.audio.filename"
                class="btn btn-secondary flex-1 py-1 px-2 text-[11px] text-center flex items-center justify-center gap-1 font-medium"
                title="Download complete MP3 file"
              >
                <Download class="w-3 h-3 text-cyan-600" />
                <span>MP3</span>
              </a>
              <a
                :href="speechifyResult.srt.url"
                :download="speechifyResult.srt.filename"
                class="btn btn-secondary flex-1 py-1 px-2 text-[11px] text-center flex items-center justify-center gap-1 font-medium"
                title="Download synchronized SRT subtitles"
              >
                <Download class="w-3 h-3 text-amber-600" />
                <span>SRT</span>
              </a>
              <a
                :href="speechifyResult.vtt.url"
                :download="speechifyResult.vtt.filename"
                class="btn btn-secondary flex-1 py-1 px-2 text-[11px] text-center flex items-center justify-center gap-1 font-medium"
                title="Download WebVTT subtitles"
              >
                <Download class="w-3 h-3 text-indigo-600" />
                <span>VTT</span>
              </a>
            </div>

            <!-- Fit slots button -->
           
          </div>
        </div>

        <!-- 3. EDGE TTS INTERFACE -->
        <div v-show="musicSource === 'edge'" class="space-y-3">
          <!-- Voice Selector -->
          <div>
            <label class="block text-[11px] font-semibold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Select Voice:
            </label>
            <select
              v-model="edgeVoice"
              :disabled="isGeneratingEdge"
              class="w-full bg-slate-50 dark:bg-gray-900 border border-slate-300 dark:border-gray-700 text-slate-800 dark:text-gray-200 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="hi-IN-SwaraNeural">Swara – Female</option>
              <option value="hi-IN-MadhurNeural">Madhur – Male</option>
              <option value="hi-IN-AaravNeural">Aarav – Male</option>
            </select>
          </div>

          <!-- Text Input Area -->
          <div class="space-y-1">
            <div class="flex items-center justify-between text-[11px]">
              <label class="font-semibold text-slate-700 dark:text-gray-300 uppercase tracking-wider">
                Text Input:
              </label>
              <div class="flex items-center gap-2">
                <span class="text-slate-400 dark:text-gray-500 font-mono text-[10px]">
                  {{ edgeText.length }} chars
                </span>
                <button
                  type="button"
                  @click="edgeText = sampleHindiScript"
                  :disabled="isGeneratingEdge"
                  class="text-blue-600 dark:text-blue-400 hover:underline text-[10px] font-medium"
                >
                  Sample
                </button>
                <button
                  type="button"
                  @click="edgeText = ''"
                  :disabled="isGeneratingEdge"
                  class="text-rose-600 dark:text-rose-400 hover:underline text-[10px] font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
            <textarea
              v-model="edgeText"
              :disabled="isGeneratingEdge"
              rows="5"
              placeholder="यहाँ अपनी स्क्रिप्ट टाइप या पेस्ट करें... (Auto-chunked for long text)..."
              class="w-full bg-slate-50 dark:bg-gray-900 border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-gray-100 rounded-lg p-2.5 text-xs font-hindi focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed resize-y"
            ></textarea>
          </div>

          <!-- Live Progress Bar -->
          <div v-if="isGeneratingEdge" class="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-lg p-2.5 space-y-1.5">
            <div class="flex items-center justify-between text-[11px] font-medium text-blue-900 dark:text-blue-200">
              <span class="flex items-center gap-1.5">
                <RefreshCw class="w-3 h-3 animate-spin text-blue-600 dark:text-blue-400" />
                {{ edgeProgress.message || 'Generating Edge TTS voice...' }}
              </span>
              <span class="font-bold text-blue-700 dark:text-blue-300 font-mono">{{ edgeProgress.percent }}%</span>
            </div>
            <div class="w-full bg-slate-200 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
              <div
                class="h-full bg-blue-600 rounded-full transition-all duration-300"
                :style="{ width: edgeProgress.percent + '%' }"
              ></div>
            </div>
            <div v-if="edgeProgress.total > 1" class="text-[10px] text-blue-600 dark:text-blue-400 flex justify-between">
              <span>Part: {{ edgeProgress.current }} / {{ edgeProgress.total }}</span>
              <span>Sequential Chunking & Subtitles</span>
            </div>
          </div>

          <!-- "Get Voice" Button -->
          <button
            type="button"
            @click="handleGetVoiceEdge"
            :disabled="isGeneratingEdge || !edgeText.trim()"
            class="w-full py-2 px-3 text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-xs bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw v-if="isGeneratingEdge" class="w-3.5 h-3.5 animate-spin" />
            <Volume2 v-else class="w-3.5 h-3.5" />
            <span>{{ isGeneratingEdge ? 'Generating Voice...' : 'Get Voice' }}</span>
          </button>

          <!-- Current Edge Generated Audio & Files Card -->
          <div v-if="edgeResult" class="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-3 space-y-2.5">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-blue-800 dark:text-blue-300">
                Edge TTS ({{ formatEdgeVoiceName(edgeResult.voice) }})
              </span>
              <span class="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                {{ edgeResult.audio.duration.toFixed(1) }}s
              </span>
            </div>

            <!-- Mini Audio Player -->
            <audio controls :src="edgeResult.audio.url" class="w-full h-8"></audio>

            <!-- Download Assets Row -->
            <div class="flex items-center gap-1.5 pt-1">
              <a
                :href="edgeResult.audio.url"
                :download="edgeResult.audio.filename"
                class="btn btn-secondary flex-1 py-1 px-2 text-[11px] text-center flex items-center justify-center gap-1 font-medium"
                title="Download complete MP3 file"
              >
                <Download class="w-3 h-3 text-cyan-600" />
                <span>MP3</span>
              </a>
              <a
                :href="edgeResult.srt.url"
                :download="edgeResult.srt.filename"
                class="btn btn-secondary flex-1 py-1 px-2 text-[11px] text-center flex items-center justify-center gap-1 font-medium"
                title="Download synchronized SRT subtitles"
              > 
                <Download class="w-3 h-3 text-amber-600" />
                <span>SRT</span>
              </a>
              <a
                :href="edgeResult.vtt.url"
                :download="edgeResult.vtt.filename"
                class="btn btn-secondary flex-1 py-1 px-2 text-[11px] text-center flex items-center justify-center gap-1 font-medium"
                title="Download WebVTT subtitles"
              >
                <Download class="w-3 h-3 text-indigo-600" />
                <span>VTT</span>
              </a>
            </div>
          </div>
        </div> 
      </div>

      <!-- 3. SUBTITLES TAB -->
      <div v-show="activeTab === 'subtitles'" class="space-y-3">
        <!-- Subtitles Upload Dropzone -->
        <div
          class="dropzone flex flex-col items-center justify-center gap-2 border-slate-300 dark:border-gray-800 bg-slate-50/50 dark:bg-black/10 cursor-pointer p-4 rounded-lg border-2 border-dashed"
          @click="$refs.subtitleFileRef.click()"
        >
          <Subtitles class="w-7 h-7 text-amber-500 dark:text-amber-400" />
          <div class="text-xs font-medium text-slate-800 dark:text-gray-200">
            {{ subtitleFile ? subtitleFile.originalName : 'Click to upload SRT, VTT, or BTT' }}
          </div>
          <p class="text-[11px] text-slate-400 dark:text-gray-400">SRT, VTT, or BTT timed files</p>
          <input
            ref="subtitleFileRef"
            type="file"
            accept=".srt,.vtt,.btt"
            class="hidden"
            style="display: none;"
            @change="handleSubtitleFile"
          />
        </div>

        <!-- Sync & Sentence End Detection Actions -->
        <div v-if="subtitleSegments.length > 0" class="space-y-3">
          <!-- Summary Header Banner -->
          <div class="bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 p-3 rounded-lg space-y-2.5">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>{{ subtitleSegments.length }} Subtitle Cues Active</span>
                </div>
                <div class="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                  Real SRT cues will show as captions in video. Sentence ends (".", "|", "।") set image slots.
                </div>
              </div>
            </div>

            <!-- Create Slots Options -->
            <div class="flex flex-col gap-1.5 pt-1">
              <button
                @click="createSlotsFromSubtitleSentences()"
                class="btn btn-primary w-full text-xs py-2 flex items-center justify-center gap-1.5 shadow-xs font-semibold"
                title="Create image slots matching detected subtitle sentences"
              >
                <Sparkles class="w-3.5 h-3.5" /> 
                <span>Image Slots Via Sentences</span>
              </button>
            </div>
          </div>

          <!-- View Mode Toggle: Real SRT Cues vs Sentence Image Slots -->
          <div class="flex items-center gap-1 bg-slate-100 dark:bg-gray-950 p-1 rounded-lg border border-slate-200 dark:border-gray-800 text-xs">
            <button
              type="button"
              @click="subsViewMode = 'cues'"
              :class="[
                'flex-1 py-1.5 px-2 rounded-md font-medium text-center transition-all flex items-center justify-center gap-1.5',
                subsViewMode === 'cues'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              ]"
            >
              <Subtitles class="w-3 h-3 text-indigo-500" />
              <span>Real ({{ subtitleSegments.length }})</span>
            </button>
            <button
              type="button"
              @click="subsViewMode = 'sentences'"
              :class="[
                'flex-1 py-1.5 px-2 rounded-md font-medium text-center transition-all flex items-center justify-center gap-1.5',
                subsViewMode === 'sentences'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              ]"
            >
              <Film class="w-3 h-3 text-cyan-500" />
              <span>Sentence ({{ subtitleSentenceCount }})</span>
            </button>
          </div>

          <!-- 1. Real SRT Cues View -->
          <div v-show="subsViewMode === 'cues'" class="space-y-1.5">
            <div class="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              <div
                v-for="cue in subtitleSegments"
                :key="cue.id || cue.index"
                class="p-2 rounded bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-xs flex gap-2 items-start hover:border-slate-300 dark:hover:border-gray-700 transition-colors"
              >
                <div class="shrink-0 font-mono text-[10px]">
                  <span class="font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    #{{ cue.index }}
                  </span>
                  <div class="text-[9px] text-slate-400 dark:text-gray-500 mt-1">
                    {{ formatTimeShort(cue.startTime) }} - {{ formatTimeShort(cue.endTime) }}
                  </div>
                </div>
                <div
                  :style="{ fontFamily: `'${captionSettings.fontFamily}', 'Noto Sans Devanagari', sans-serif` }"
                  class="text-slate-800 dark:text-gray-200 font-medium leading-relaxed flex-1"
                >
                  {{ cue.text }}
                </div>
              </div>
            </div>
          </div>

          <!-- 2. Sentence Breakdown Preview for Image Slots -->
          <div v-show="subsViewMode === 'sentences'" class="space-y-1.5">
            <div class="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              <div
                v-for="sent in detectedSubtitleSentences"
                :key="sent.sentenceIndex"
                class="p-2 rounded bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-xs flex gap-2 items-start"
              >
                <div class="shrink-0 font-mono text-[10px]">
                  <span class="font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                    Scene #{{ sent.sentenceIndex }}
                  </span>
                  <div class="text-[9px] text-slate-400 dark:text-gray-500 mt-1">
                    {{ formatTimeShort(sent.startTime) }} - {{ formatTimeShort(sent.endTime) }}
                  </div>
                </div>
                <div
                  :style="{ fontFamily: `'${captionSettings.fontFamily}', 'Noto Sans Devanagari', sans-serif` }"
                  class="text-slate-800 dark:text-gray-200 font-medium leading-relaxed flex-1"
                >
                  {{ sent.text }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue';
import {
  Minus,
  Music,
  Subtitles,
  Film,
  Plus,
  Images,
  Sparkles,
  Upload,
  Mic,
  Volume2,
  RefreshCw,
  Download
} from 'lucide-vue-next';
import ImageSlotItem from './ImageSlotItem.vue';
import { useTimeline } from '../composables/useTimeline.js';
import {
  uploadAudioFile,
  uploadSubtitleFile,
  uploadImagesBatch,
  generateTtsStream
} from '../services/api.js';

const props = defineProps({
  currentSlotId: {
    type: String,
    default: null
  }
});

const {
  detectedSubtitleSentences,
  subtitleSentenceCount,
  limitSlotsToSentences,
  audioFile,
  subtitleFile,
  subtitleSegments,
  captionSettings,
  slots,
  totalTimelineDuration,
  addNotification,
  setAudio,
  setSubtitles,
  populateSlotsFromSubtitles,
  fitSlotsToDuration,
  createSlotsFromSubtitleSentences,
  assignImageToSlot,
  removeImageFromSlot,
  addSlot,
  removeSlot,
  removeLastSlot,
  assignBatchImages
} = useTimeline();

const activeTab = ref('slots');
const subsViewMode = ref('cues'); // 'cues' | 'sentences'

function formatTimeShort(sec) {
  const s = Math.floor(sec || 0);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  const ms = Math.floor(((sec || 0) % 1) * 10);
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}.${ms}`;
}

// Tabs header: Slots, Music, Subs
const tabs = computed(() => [
  { id: 'slots', label: 'Slots', icon: Film, isLoaded: slots.value.length > 0 },
  { id: 'audio', label: 'Music', icon: Music, isLoaded: Boolean(audioFile.value) },
  { id: 'subtitles', label: 'Subs', icon: Subtitles, isLoaded: subtitleSegments.value.length > 0 }
]);

// "Get Music / Voice Via" sub-source: 'upload' | 'speechify' | 'edge'
const musicSource = ref('upload');

// Sample Hindi script for testing TTS
const sampleHindiScript = `छोटे-से स्टेशन पर पीली रोशनी धूल में घुलकर सुनहरी हो रही थी। रामू चाय की केतली को स्टोव पर रखकर खिड़की के बाहर देखने लगा। तीस साल से वह इसी स्टेशन पर चाय बेच रहा था। उसे पता था कौन-सी गाड़ी कितनी देर रुकेगी और कौन-सा मुसाफिर बिना चाय पिए चला जाएगा।`;

// Speechify State
const speechifyVoice = ref('mihika');
const speechifyText = ref('');
const isGeneratingSpeechify = ref(false);
const speechifyProgress = ref({ percent: 0, current: 0, total: 0, message: '' });
const speechifyResult = ref(null);

// Edge TTS State
const edgeVoice = ref('hi-IN-SwaraNeural');
const edgeText = ref('');
const isGeneratingEdge = ref(false);
const edgeProgress = ref({ percent: 0, current: 0, total: 0, message: '' });
const edgeResult = ref(null);

function formatEdgeVoiceName(voiceId) {
  const map = {
    'hi-IN-SwaraNeural': 'Swara – Female',
    'hi-IN-MadhurNeural': 'Madhur – Male',
    'hi-IN-AaravNeural': 'Aarav – Male'
  };
  return map[voiceId] || voiceId;
}

// Generate Speechify Voice
async function handleGetVoiceSpeechify() {
  const text = speechifyText.value.trim();
  if (!text || isGeneratingSpeechify.value) return;

  isGeneratingSpeechify.value = true;
  speechifyProgress.value = { percent: 5, current: 1, total: 1, message: 'Contacting Speechify TTS...' };

  try {
    await generateTtsStream({
      service: 'speechify',
      text,
      voice: speechifyVoice.value,
      onStart: (d) => {
        speechifyProgress.value = { percent: 10, current: 1, total: d.totalChunks || 1, message: `Starting ${d.totalChunks} chunk(s)...` };
      },
      onProgress: (p) => {
        speechifyProgress.value = { percent: p.percent || 50, current: p.current, total: p.total, message: p.message };
      },
      onComplete: (res) => {
        isGeneratingSpeechify.value = false;
        speechifyResult.value = res;
        // Automatically make usable in project
        setAudio(res.audio);
        setSubtitles(
          { filename: res.srt.filename, originalName: res.srt.originalName, format: 'SRT', count: res.srt.count },
          res.srt.segments
        );
        addNotification('success', `Speechify voice generated (${res.audio.duration.toFixed(1)}s) & applied to project!`);
      },
      onError: (err) => {
        isGeneratingSpeechify.value = false;
        addNotification('danger', `Speechify TTS failed: ${err.message}`);
      }
    });
  } catch (err) {
    isGeneratingSpeechify.value = false;
    addNotification('danger', `Speechify TTS failed: ${err.message}`);
  }
}
 
// Generate Edge TTS Voice
async function handleGetVoiceEdge() {
  const text = edgeText.value.trim();
  if (!text || isGeneratingEdge.value) return;

  isGeneratingEdge.value = true;
  edgeProgress.value = { percent: 5, current: 1, total: 1, message: 'Contacting Edge TTS...' };

  try {
    await generateTtsStream({
      service: 'edge',
      text,
      voice: edgeVoice.value,
      onStart: (d) => {
        edgeProgress.value = { percent: 10, current: 1, total: d.totalChunks || 1, message: `Starting ${d.totalChunks} chunk(s)...` };
      },
      onProgress: (p) => {
        edgeProgress.value = { percent: p.percent || 50, current: p.current, total: p.total, message: p.message };
      },
      onComplete: (res) => {
        isGeneratingEdge.value = false;
        edgeResult.value = res;
        // Automatically make usable in project
        setAudio(res.audio);
        setSubtitles(
          { filename: res.srt.filename, originalName: res.srt.originalName, format: 'SRT', count: res.srt.count },
          res.srt.segments
        );
        addNotification('success', `Edge TTS voice generated (${res.audio.duration.toFixed(1)}s) & applied to project!`);
      },
      onError: (err) => {
        isGeneratingEdge.value = false;
        addNotification('danger', `Edge TTS failed: ${err.message}`);
      }
    });
  } catch (err) {
    isGeneratingEdge.value = false;
    addNotification('danger', `Edge TTS failed: ${err.message}`);
  }
}

// Existing Upload Handlers
async function handleAudioFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const res = await uploadAudioFile(file);
    setAudio(res);
    addNotification('success', `Audio "${res.originalName}" loaded (${res.duration.toFixed(1)}s).`);
  } catch (err) {
    addNotification('danger', `Failed to upload audio: ${err.message}`);
  }
}

async function handleSubtitleFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const res = await uploadSubtitleFile(file);
    setSubtitles(
      { filename: res.filename, originalName: res.originalName, format: res.format, count: res.count },
      res.segments
    );
    addNotification('success', `Subtitles loaded: ${res.count} segments (${res.format}).`);
  } catch (err) {
    addNotification('danger', `Failed to parse subtitles: ${err.message}`);
  }
}

async function handleBatchImages(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  try {
    const res = await uploadImagesBatch(files);
    if (res.images && res.images.length > 0) {
      assignBatchImages(res.images);
    }
  } catch (err) {
    addNotification('danger', `Batch images upload failed: ${err.message}`);
  }
}

function onAssignImage({ slotId, imageData }) {
  assignImageToSlot(slotId, imageData);
}
</script>
