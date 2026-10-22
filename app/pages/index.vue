<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center px-6">
    <div class="text-center max-w-sm w-full">

      <!-- Bismillah -->
      <p
        class="text-emerald-600 text-lg mb-8 leading-relaxed"
        dir="rtl"
        lang="ar"
      >
        بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
      </p>

      <!-- App icon -->
      <div class="w-24 h-24 bg-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-200">
        <svg class="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      </div>

      <!-- App name -->
      <h1 class="text-4xl font-bold text-gray-800 mb-2 tracking-tight">e-Quran</h1>
      <p class="text-gray-500 mb-8">Personal Quran Tracker</p>

      <!-- Description -->
      <p class="text-gray-600 text-sm leading-relaxed mb-10">
        Pantau bacaan Al-Qur'an harianmu, set target, dan bangun kebiasaan yang konsisten.
      </p>

      <!-- Install section -->
      <div class="space-y-3">

        <!-- Already installed -->
        <div
          v-if="isInstalled"
          class="inline-flex items-center gap-2 bg-green-100 text-green-700 px-5 py-2.5 rounded-full text-sm font-medium"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          App sudah terinstall
        </div>

        <!-- Android Chrome: install button -->
        <button
          v-else-if="canInstall"
          class="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-6 py-3 rounded-full text-sm font-semibold shadow-lg shadow-green-200 transition-colors"
          @click="install"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Install App
        </button>

        <!-- iOS Safari: manual instruction -->
        <div
          v-else-if="isIOS"
          class="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-left"
        >
          <p class="text-blue-700 text-sm font-medium mb-1">Install di iPhone / iPad</p>
          <p class="text-blue-600 text-sm">
            Tap
            <span class="inline-flex items-center gap-0.5 font-medium">
              <!-- Share icon -->
              <svg class="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </span>
            → <span class="font-medium">Add to Home Screen</span>
          </p>
        </div>

        <!-- Fallback: manual via browser menu -->
        <div
          v-else
          class="inline-flex items-center gap-2 bg-gray-100 text-gray-500 px-5 py-2.5 rounded-full text-sm"
        >
          <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Sedang dalam pengembangan
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { canInstall, isIOS, isInstalled, install } = useInstallPWA()
</script>
