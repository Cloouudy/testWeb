<template>
  <div class="w-full min-h-screen bg-gray-50 font-['Dosis'] text-[#1A1A1A] px-6 py-8 md:px-12">
    <div class="w-full">
      <!-- Hlavička s oficiálním logem / ikonou -->
      <header class="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-6">
        <div class="flex items-center gap-4">
          <div class="bg-[#0070BB] p-3 rounded-2xl shadow-md flex items-center justify-center">
            <img :src="activitiesIcon" alt="Logo aktivity" class="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 class="text-4xl md:text-5xl font-bold text-[#0070BB] mb-1">Seznam zastávek</h1>
            <p class="text-xl text-gray-600">Prozkoumejte jednotlivá zastavení na vaší cestě za poznáním.</p>
          </div>
        </div>
      </header>

      <!-- VYHLEDÁVÁNÍ A TRYCHTÝŘOVÉ FILTRY -->
      <div v-if="!loading && stops.length > 0" class="bg-white rounded-2xl shadow-md p-6 mb-8 border border-gray-100">
        <div class="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between pb-6 border-b border-gray-100">
          <div class="w-full lg:w-96">
            <label for="stop-search" class="block text-sm font-bold text-[#1A1A1A] mb-1.5">
              Vyhledat podle názvu
            </label>
            <div class="relative flex items-center">
              <input
                id="stop-search"
                v-model="searchQuery"
                type="text"
                placeholder="Např. Turing..."
                class="w-full pl-4 pr-16 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-base text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:border-[#0070BB] focus:bg-white transition-all"
              />
              <button
                v-if="searchQuery"
                @click="searchQuery = ''"
                class="absolute right-3 text-xs font-bold text-gray-400 hover:text-[#0070BB]"
              >
                ✕ Zrušit
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between w-full lg:w-auto gap-4">
            <span class="text-base font-semibold text-gray-700">
              Nalezeno: <strong class="text-[#0070BB] text-lg">{{ filteredStops.length }}</strong> z {{ stops.length }}
            </span>
            <button
              v-if="hasActiveFilters"
              @click="resetFilters"
              class="px-4 py-2 bg-gray-100 hover:bg-[#0070BB] hover:text-white text-gray-700 font-bold rounded-xl text-sm transition-colors cursor-pointer"
            >
              Resetovat filtry ↺
            </button>
          </div>
        </div>

        <!-- Trychtýřové checkboxy -->
        <div class="pt-6">
          <span class="block text-sm font-bold text-[#1A1A1A] mb-3">Filtrovat podle vybavení:</span>
          <div class="flex flex-wrap gap-3">
            <label class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-all select-none"
                   :class="filters.wheelchair ? 'bg-[#0070BB]/10 border-[#0070BB] text-[#0070BB] font-bold' : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'">
              <input type="checkbox" v-model="filters.wheelchair" class="hidden" />
              <span>♿ Bezbariérová</span>
            </label>

            <label class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-all select-none"
                   :class="filters.shelter ? 'bg-[#0070BB]/10 border-[#0070BB] text-[#0070BB] font-bold' : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'">
              <input type="checkbox" v-model="filters.shelter" class="hidden" />
              <span>🏠 S přístřeškem</span>
            </label>

            <label class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-all select-none"
                   :class="filters.ticketMachine ? 'bg-[#0070BB]/10 border-[#0070BB] text-[#0070BB] font-bold' : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'">
              <input type="checkbox" v-model="filters.ticketMachine" class="hidden" />
              <span>🎫 Jízdenkový automat</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Načítání -->
      <div v-if="loading" class="text-center py-16 text-2xl font-semibold text-[#0070BB]">
        Načítám zastávky...
      </div>

      <!-- Prázdný stav -->
      <div v-else-if="stops.length === 0" class="w-full bg-white rounded-2xl shadow-md p-12 text-center border-2 border-[#0070BB]/20">
        <h2 class="text-2xl font-bold mb-2">Zatím zde nejsou žádné zastávky</h2>
        <p class="text-gray-500 text-lg">V systému se nenašly žádné evidované zastávky.</p>
      </div>

      <!-- Seznam zastávek (karty) -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        <router-link
          v-for="stop in filteredStops"
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

          <div class="p-5 flex-1 flex flex-col justify-between">
            <h3 class="text-xl font-bold text-[#0070BB] group-hover:text-[#0257A5] transition-colors line-clamp-1">
              {{ stop.name }}
            </h3>

            <span class="mt-4 inline-flex items-center justify-center text-sm font-semibold text-[#0070BB] bg-[#0070BB]/10 py-2 rounded-lg w-full group-hover:bg-[#0070BB] group-hover:text-white transition-colors">
              Detail zastávky →
            </span>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
// Použití bezpečné relativní cesty ze složky views (z src/views do src/assets/icons)
import activitiesIcon from '../assets/icons/activities-white.svg'

const stops = ref([])
const loading = ref(true)
const searchQuery = ref('')

const filters = reactive({
  wheelchair: false,
  shelter: false,
  ticketMachine: false,
})

const hasActiveFilters = computed(() => {
  return searchQuery.value.trim() !== '' || Object.values(filters).some(val => val === true)
})

const resetFilters = () => {
  searchQuery.value = ''
  filters.wheelchair = false
  filters.shelter = false
  filters.ticketMachine = false
}

const normalizeText = (text) => {
  if (!text) return ''
  return String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const filteredStops = computed(() => {
  return stops.value.filter((stop) => {
    if (filters.wheelchair && !stop.wheelchair_accessible) return false
    if (filters.shelter && !stop.has_shelter) return false
    if (filters.ticketMachine && !stop.has_ticket_machine) return false

    const query = normalizeText(searchQuery.value.trim())
    if (query) {
      const nameMatch = normalizeText(stop.name).includes(query)
      if (!nameMatch) return false
    }

    return true
  })
})

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