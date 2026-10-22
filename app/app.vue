<template>
  <div>
    <!-- Injects <link rel="manifest"> into the HTML head for PWA detection -->
    <NuxtPwaManifest />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
