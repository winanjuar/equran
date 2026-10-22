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

      <!-- Status badge -->
      <div class="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
        <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        Sedang dalam pengembangan
      </div>

    </div>
  </div>
</template>
