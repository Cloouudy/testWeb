<template>
  <div class="w-full min-h-screen bg-gray-50 font-['Dosis'] text-[#1A1A1A] px-6 py-8 md:px-12">
    <div class="w-full">
      <!-- Hlavička -->
      <header class="mb-8">
        <h1 class="text-4xl md:text-5xl font-bold text-[#0070BB] mb-2">Seznam zastávek</h1>
        <p class="text-xl text-gray-600">Prozkoumejte jednotlivá zastavení, filtrujte podle vybavení a vlastností.</p>
      </header>

      <!-- TRYCHTÝŘOVÝ FILTR A VYHLEDÁVÁNÍ -->
      <div v-if="!loading && stops.length > 0" class="bg-white rounded-2xl shadow-md p-6 mb-8 border border-gray-100">
        <div class="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between pb-6 border-b border-gray-100">
          <!-- Textové vyhledávání -->
          <div class="w-full lg:w-96">
            <label for="stop-search" class="block text-sm font-bold text-[#1A1A1A] mb-1.5">
              Vyhledat podle názvu či linky
            </label>
            <div class="relative flex items-center">
              <span class="absolute left-3.5 text-[#0070BB] pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.35z" />
                </svg>
              </span>
              <input
                id="stop-search"
                v-model="searchQuery"
                type="text"
                placeholder="Např. Turing, linka A..."
                class="w-full pl-11 pr-16 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-base text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:border-[#0070BB] focus:bg-white transition-all"
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

          <!-- Počítadlo a tlačítko pro reset filtrů -->
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

        <!-- Trychtýřové zaklikávací filtry (Vlastnosti zastávky) -->
        <div class="pt-6">
          <span class="block text-sm font-bold text-[#1A1A1A] mb-3">Filtrovat podle vybavení (trychtýř):</span>
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
                   :class="filters.bench ? 'bg-[#0070BB]/10 border-[#0070BB] text-[#0070BB] font-bold' : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'">
              <input type="checkbox" v-model="filters.bench" class="hidden" />
              <span>🪑 S lavičkou</span>
            </label>

            <label class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-all select-none"
                   :class="filters.ticketMachine ? 'bg-[#0070BB]/10 border-[#0070BB] text-[#0070BB] font-bold' : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'">
              <input type="checkbox" v-model="filters.ticketMachine" class="hidden" />
              <span>🎫 Jízdenkový automat</span>
            </label>

            <label class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-all select-none"
                   :class="filters.transfer ? 'bg-[#0070BB]/10 border-[#0070BB] text-[#0070BB] font-bold' : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'">
              <input type="checkbox" v-model="filters.transfer" class="hidden" />
              <span>🔄 Přestupní uzly</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Načítání -->
      <div v-if="loading" class="text-center py-16 text-2xl font-semibold text-[#0070BB]">
        Načítám zastávky...
      </div>

      <!-- Prázdný stav: Žádné zastávky v DB -->
      <div v-else-if="stops.length === 0" class="w-full bg-white rounded-2xl shadow-md p-12 text-center border-2 border-[#0070BB]/20">
        <div class="text-5xl mb-4">💡</div>
        <h2 class="text-2xl font-bold mb-2">Zatím zde nejsou žádné zastávky</h2>
        <p class="text-gray-500 text-lg">V systému se nenašly žádné evidované zastávky.</p>
      </div>

      <!-- Prázdný stav po filtrování -->
      <div v-else-if="filteredStops.length === 0" class="w-full bg-white rounded-2xl shadow-md p-12 text-center border-2 border-[#0070BB]/20">
        <div class="text-5xl mb-4">🔍</div>
        <h2 class="text-2xl font-bold text-[#1A1A1A] mb-2">Žádná zastávka neodpovídá zvoleným filtrům</h2>
        <p class="text-gray-600 text-lg mb-6">Zkuste zmírnit kritéria vyhledávání nebo resetovat filtry.</p>
        <button
          @click="resetFilters"
          class="px-6 py-3 bg-[#0070BB] hover:bg-[#0257A5] text-white font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
        >
          Zobrazit všechny zastávky
        </button>
      </div>

      <!-- Seznam zastávek (5 karet vedle sebe na velkém monitoru) -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        <router-link
          v-for="stop in filteredStops"
          :key="stop.id"
          :to="`/stops/${stop.id}`"
          class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group"
        >
          <!-- Obrázek -->
          <div class="h-40 overflow-hidden bg-gray-200 relative">
            <img 
              :src="stop.image_url" 
              :alt="stop.name" 
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              @error="handleImageError"
            />
            <span v-if="stop.is_transfer" class="absolute top-2 right-2 bg-[#0070BB] text-white text-xs font-bold px-2 py-1 rounded-md shadow">
              Přestupní
            </span>
          </div>

          <!-- Obsah karty s popisem a vlastnostmi -->
          <div class="p-4 flex-1 flex flex-col justify-between">
            <div>
              <h3 class="text-lg font-bold text-[#0070BB] group-hover:text-[#0257A5] transition-colors line-clamp-1">
                {{ stop.name }}
              </h3>
              
              <p v-if="stop.stop_lines" class="text-xs font-semibold text-gray-500 mt-0.5">
                Linky: <span class="text-gray-700">{{ stop.stop_lines }}</span>
              </p>

              <!-- Seznam vlastností (popisek na kartě) -->
              <div class="mt-3 space-y-1 text-xs border-t border-gray-100 pt-2.5 text-gray-600">
                <div class="flex justify-between items-center">
                  <span>Bezbariérové:</span>
                  <span :class="stop.wheelchair_accessible ? 'text-green-600 font-bold' : 'text-gray-400'">
                    {{ stop.wheelchair_accessible ? 'Ano' : 'Ne' }}
                  </span>
                </div>
                <div class="flex justify-between items-center">
                  <span>Přístřešek:</span>
                  <span :class="stop.has_shelter ? 'text-green-600 font-bold' : 'text-gray-400'">
                    {{ stop.has_shelter ? 'Ano' : 'Ne' }}
                  </span>
                </div>
                <div class="flex justify-between items-center">
                  <span>Lavička:</span>
                  <span :class="stop.has_bench ? 'text-green-600 font-bold' : 'text-gray-400'">
                    {{ stop.has_bench ? 'Ano' : 'Ne' }}
                  </span>
                </div>
                <div class="flex justify-between items-center">
                  <span>Automat na jízdenky:</span>
                  <span :class="stop.has_ticket_machine ? 'text-green-600 font-bold' : 'text-gray-400'">
                    {{ stop.has_ticket_machine ? 'Ano' : 'Ne' }}
                  </span>
                </div>
              </div>
            </div>

            <span class="mt-4 inline-flex items-center justify-center text-xs font-semibold text-[#0070BB] bg-[#0070BB]/10 py-1.5 rounded-lg w-full group-hover:bg-[#0070BB] group-hover:text-white transition-colors">
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

const stops = ref([])
const loading = ref(true)
const searchQuery = ref('')

// Trychtýřové filtry
const filters = reactive({
  wheelchair: false,
  shelter: false,
  bench: false,
  ticketMachine: false,
  transfer: false,
})

const hasActiveFilters = computed(() => {
  return searchQuery.value.trim() !== '' || Object.values(filters).some(val => val === true)
})

const resetFilters = () => {
  searchQuery.value = ''
  filters.wheelchair = false
  filters.shelter = false
  filters.bench = false
  filters.ticketMachine = false
  filters.transfer = false
}

// Normalizace textu pro vyhledávání bez diakritiky
const normalizeText = (text) => {
  if (!text) return ''
  return String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// Filtrování kombinující trychtýřové checkboxy i textové hledání
const filteredStops = computed(() => {
  return stops.value.filter((stop) => {
    // 1. Trychtýřové filtry (musí splňovat všechny zaškrtnuté)
    if (filters.wheelchair && !stop.wheelchair_accessible) return false
    if (filters.shelter && !stop.has_shelter) return false
    if (filters.bench && !stop.has_bench) return false
    if (filters.ticketMachine && !stop.has_ticket_machine) return false
    if (filters.transfer && !stop.is_transfer) return false

    // 2. Textové vyhledávání (název nebo linky)
    const query = normalizeText(searchQuery.value.trim())
    if (query) {
      const nameMatch = normalizeText(stop.name).includes(query)
      const linesMatch = normalizeText(stop.stop_lines).includes(query)
      if (!nameMatch && !linesMatch) return false
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