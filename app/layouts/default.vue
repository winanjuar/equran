<script setup lang="ts">
const route = useRoute()

interface NavItem {
  label: string
  path: string
  ariaLabel: string
}

const navItems: NavItem[] = [
  { label: 'Beranda',     path: '/',          ariaLabel: 'Beranda'     },
  { label: 'Catat',       path: '/input',      ariaLabel: 'Catat sesi'  },
  { label: 'Riwayat',     path: '/history',    ariaLabel: 'Riwayat'     },
  { label: 'Heatmap',     path: '/heatmap',    ariaLabel: 'Heatmap'     },
  { label: 'Pengaturan',  path: '/settings',   ariaLabel: 'Pengaturan'  },
]

/**
 * Returns true when the nav item's path matches the current route.
 * Beranda uses exact match; others use startsWith so nested routes
 * (e.g. /history/123) also highlight the correct tab.
 */
function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<template>
  <div class="flex flex-col min-h-screen bg-gray-50">
    <!-- ── Page content ──────────────────────────────────────────────── -->
    <!-- pb-20 reserves space so content never hides behind the nav bar -->
    <main class="flex-1 pb-20">
      <slot />
    </main>

    <!-- ── Bottom navigation bar ─────────────────────────────────────── -->
    <nav
      class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-pb"
      aria-label="Navigasi utama"
    >
      <ul class="flex items-stretch h-16 max-w-lg mx-auto">

        <!-- Beranda (Dashboard) -->
        <li class="flex-1">
          <NuxtLink
            to="/"
            class="flex flex-col items-center justify-center h-full gap-0.5 transition-colors duration-150 border-t-2"
            :class="isActive('/') ? 'text-primary-600 border-primary-600' : 'text-gray-400 border-transparent'"
            :aria-label="navItems[0].ariaLabel"
            :aria-current="isActive('/') ? 'page' : undefined"
          >
            <!-- Home icon (Heroicons outline) -->
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.75"
              stroke="currentColor"
              class="w-6 h-6"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
              />
            </svg>
            <span class="text-[10px] font-medium leading-none">Beranda</span>
          </NuxtLink>
        </li>

        <!-- Catat (Input) -->
        <li class="flex-1">
          <NuxtLink
            to="/input"
            class="flex flex-col items-center justify-center h-full gap-0.5 transition-colors duration-150 border-t-2"
            :class="isActive('/input') ? 'text-primary-600 border-primary-600' : 'text-gray-400 border-transparent'"
            :aria-label="navItems[1].ariaLabel"
            :aria-current="isActive('/input') ? 'page' : undefined"
          >
            <!-- Pencil-square icon (Heroicons outline) -->
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.75"
              stroke="currentColor"
              class="w-6 h-6"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
              />
            </svg>
            <span class="text-[10px] font-medium leading-none">Catat</span>
          </NuxtLink>
        </li>

        <!-- Riwayat (History) -->
        <li class="flex-1">
          <NuxtLink
            to="/history"
            class="flex flex-col items-center justify-center h-full gap-0.5 transition-colors duration-150 border-t-2"
            :class="isActive('/history') ? 'text-primary-600 border-primary-600' : 'text-gray-400 border-transparent'"
            :aria-label="navItems[2].ariaLabel"
            :aria-current="isActive('/history') ? 'page' : undefined"
          >
            <!-- Clock icon (Heroicons outline) -->
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.75"
              stroke="currentColor"
              class="w-6 h-6"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <span class="text-[10px] font-medium leading-none">Riwayat</span>
          </NuxtLink>
        </li>

        <!-- Heatmap -->
        <li class="flex-1">
          <NuxtLink
            to="/heatmap"
            class="flex flex-col items-center justify-center h-full gap-0.5 transition-colors duration-150 border-t-2"
            :class="isActive('/heatmap') ? 'text-primary-600 border-primary-600' : 'text-gray-400 border-transparent'"
            :aria-label="navItems[3].ariaLabel"
            :aria-current="isActive('/heatmap') ? 'page' : undefined"
          >
            <!-- Squares-2x2 icon (Heroicons outline) -->
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.75"
              stroke="currentColor"
              class="w-6 h-6"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
              />
            </svg>
            <span class="text-[10px] font-medium leading-none">Heatmap</span>
          </NuxtLink>
        </li>

        <!-- Pengaturan (Settings) -->
        <li class="flex-1">
          <NuxtLink
            to="/settings"
            class="flex flex-col items-center justify-center h-full gap-0.5 transition-colors duration-150 border-t-2"
            :class="isActive('/settings') ? 'text-primary-600 border-primary-600' : 'text-gray-400 border-transparent'"
            :aria-label="navItems[4].ariaLabel"
            :aria-current="isActive('/settings') ? 'page' : undefined"
          >
            <!-- Cog-6-tooth icon (Heroicons outline) -->
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.75"
              stroke="currentColor"
              class="w-6 h-6"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
            </svg>
            <span class="text-[10px] font-medium leading-none">Pengaturan</span>
          </NuxtLink>
        </li>

      </ul>
    </nav>
  </div>
</template>

<style scoped>
/* Respect iOS safe area for devices with a home indicator */
.safe-area-pb {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
</style>
