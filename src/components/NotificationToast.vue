<template>
  <!-- Toast Container: Responsive positioning so mobile sits cleanly above bottom navigation without clipping -->
  <div
    class="fixed z-50 pointer-events-none flex flex-col gap-2.5 transition-all
           bottom-6 right-6 sm:w-96 max-w-full"
  >
    <transition-group name="toast">
      <div
        v-for="item in notifications"
        :key="item.id"
        :class="[
          'pointer-events-auto relative overflow-hidden rounded-xl shadow-xl border bg-white/98 text-slate-800 p-3.5 flex items-start gap-3 backdrop-blur-md transition-all select-none',
          item.type === 'success' ? 'border-emerald-200 border-l-4 border-l-emerald-500 shadow-emerald-500/10' :
          item.type === 'danger' ? 'border-rose-200 border-l-4 border-l-rose-500 shadow-rose-500/10' :
          item.type === 'warning' ? 'border-amber-200 border-l-4 border-l-amber-500 shadow-amber-500/10' :
          'border-indigo-200 border-l-4 border-l-indigo-500 shadow-indigo-500/10'
        ]"
      >
        <!-- Status Icon -->
        <div class="shrink-0 mt-0.5">
          <CheckCircle2 v-if="item.type === 'success'" class="w-4 h-4 text-emerald-600" />
          <AlertCircle v-else-if="item.type === 'danger'" class="w-4 h-4 text-rose-600" />
          <AlertTriangle v-else-if="item.type === 'warning'" class="w-4 h-4 text-amber-600" />
          <Info v-else class="w-4 h-4 text-indigo-600" />
        </div>

        <!-- Message Content -->
        <div class="flex-1 min-w-0 pr-1">
          <p class="text-xs font-semibold text-slate-800 leading-snug break-words">
            {{ item.message }}
          </p>
        </div>

        <!-- Cut / Close (X) Button to dismiss immediately -->
        <button
          type="button"
          @click="removeNotification(item.id)"
          class="shrink-0 p-1 -mr-1 -mt-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
          title="Dismiss immediately"
          aria-label="Close"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-vue-next';
import { usePostState } from '../composables/usePostState.js';

const { notifications, removeNotification } = usePostState();
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.96);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.94);
}
</style>
