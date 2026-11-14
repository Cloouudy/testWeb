<template>
  <div class="w-full min-h-screen bg-gray-50 font-['Dosis'] text-[#1A1A1A] px-6 py-8 md:px-12">
    <div class="w-full">
      <!-- Hlavička dle brand manuálu -->
      <header class="mb-10">
        <h1 class="text-4xl md:text-5xl font-bold text-[#0070BB] mb-2">Seznam zastávek</h1>
        <p class="text-xl text-gray-600">Prozkoumejte jednotlivá zastavení na vaší cestě za poznáním.</p>
      </header>

      <!-- Načítání -->
      <div v-if="loading" class="text-center py-16 text-2xl font-semibold text-[#0070BB]">
        Načítám zastávky...
      </div>

      <!-- Prázdný stav -->
      <div v-else-if="stops.length === 0" class="w-full bg-white rounded-2xl shadow-md p-12 text-center border-2 border-[#0070BB]/20">
        <div class="text-5xl mb-4">💡</div>
        <h2 class="text-2xl font-bold mb-2">Zatím zde nejsou žádné zastávky</h2>
        <p class="text-gray-500 text-lg">V systému se nenašly žádné evidované zastávky. Zkuste to prosím později.</p>
      </div>

      <!-- Seznam zastávek: 1 na mobilu, 2 na tabletu, 3 na menším notebooku, 5 na široké obrazovce -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        <router-link
          v-for="stop in stops"
          :key="stop.id"
          :to="`/stops/${stop.id}`"
          class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group"
        >
          <div class="h-44 overflow-hidden bg-gray-200 relative">
            <img 
              :src="stop.image_url" 
              :alt="stop.name" 
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              @error="handleImageError"
            />
          </div>
          <div class="p-4 flex-1 flex flex-col justify-between">
            <h3 class="text-xl font-bold text-[#0070BB] group-hover:text-[#0257A5] transition-colors line-clamp-2">
              {{ stop.name }}
            </h3>
            <span class="mt-4 inline-flex items-center text-sm font-semibold text-[#0070BB] bg-[#0070BB]/10 px-3 py-1.5 rounded-lg w-fit group-hover:bg-[#0070BB] group-hover:text-white transition-colors">
              Detail zastávky →
            </span>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const stops = ref([])
const loading = ref(true)

const fetchStops = async () => {
  try {
    const res = await fetch('/api/v1/stops')
    if (!res.ok) throw new Error('Chyba při načítání dat')
    stops.value = await res.json()
  } catch (err) {
    console.error(err)
    stops.value = []
  } finally {
    loading.value = false
  }
}

const handleImageError = (e) => {
  e.target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500'
}

onMounted(() => {
  fetchStops()
})
</script>