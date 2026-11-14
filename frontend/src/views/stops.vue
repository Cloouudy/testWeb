<template>
  <div class="min-h-screen bg-gray-50 font-dosis text-tdaDark p-6">
    <div class="max-w-5xl mx-auto">
      <!-- Hlavička dle brandu -->
      <header class="mb-10 text-center">
        <h1 class="text-4xl font-bold text-tdaBlue mb-2">Seznam zastávek</h1>
        <p class="text-lg text-gray-600">Prozkoumejte jednotlivá zastavení na vaší cestě za poznáním.</p>
      </header>

      <!-- Načítání / Error stav -->
      <div v-if="loading" class="text-center py-12 text-xl text-tdaBlue">
        Načítám zastávky...
      </div>

      <!-- Pokud systém neeviduje žádnou zastávku -->
      <div v-else-if="stops.length === 0" class="bg-white rounded-xl shadow-md p-8 text-center border-2 border-tdaBlue/20">
        <div class="text-5xl mb-4">💡</div>
        <h2 class="text-2xl font-semibold mb-2">Zatím zde nejsou žádné zastávky</h2>
        <p class="text-gray-500">V systémech se nenašly žádné evidované zastávky. Zkuste to prosím později.</p>
      </div>

      <!-- Seznam zastávek -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <router-link
          v-for="stop in stops"
          :key="stop.id"
          :to="`/stops/${stop.id}`"
          class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300 flex flex-col group"
        >
          <div class="h-48 overflow-hidden bg-gray-200 relative">
            <img 
              :src="stop.image_url" 
              :alt="stop.name" 
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              @error="handleImageError"
            />
            <div class="absolute inset-0 bg-tdaBlue/10 group-hover:bg-transparent transition-colors"></div>
          </div>
          <div class="p-5 flex-1 flex flex-col justify-between">
            <h3 class="text-2xl font-bold text-tdaBlue group-hover:text-tdaBlueDark transition-colors">
              {{ stop.name }}
            </h3>
            <span class="mt-4 inline-flex items-center text-sm font-semibold text-tdaBlue bg-tdaBlue/10 px-3 py-1.5 rounded-lg w-fit group-hover:bg-tdaBlue group-hover:text-white transition-colors">
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
    const res = await fetch('/api/v1/stops') // Upravte podle vašeho API endpointu
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
  // Náhradní obrázek, pokud by image_url selhal
  e.target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500'
}

onMounted(() => {
  fetchStops()
})
</script>