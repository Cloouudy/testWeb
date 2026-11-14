<template>
  <div class="w-full min-h-screen bg-gray-50 font-['Dosis'] text-[#1A1A1A] px-6 py-8 md:px-12">
    <div class="w-full">
      <!-- Hlavička a vyhledávací lišta dle brand manuálu -->
      <header class="mb-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <h1 class="text-4xl md:text-5xl font-bold text-[#0070BB] mb-2">Seznam zastávek</h1>
          <p class="text-xl text-gray-600">Prozkoumejte jednotlivá zastavení na vaší cestě za poznáním.</p>
        </div>

        <!-- Vyhledávací pole (zobrazí se, pokud systém eviduje nějaké zastávky) -->
        <div v-if="!loading && stops.length > 0" class="w-full lg:w-[440px]">
          <label for="stop-search" class="block text-sm font-semibold text-[#1A1A1A] mb-1.5">
            Vyhledat zastávku podle názvu nebo vlastností
          </label>
          <div class="relative flex items-center">
            <!-- Ikona lupy -->
            <span class="absolute left-3.5 text-[#0070BB] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.35z" />
              </svg>
            </span>

            <input
              id="stop-search"
              v-model="searchQuery"
              type="text"
              placeholder="Např. Turing, park, bezbariérový..."
              class="w-full pl-11 pr-24 py-3 bg-white border-2 border-[#0070BB]/30 rounded-xl text-base text-[#1A1A1A] placeholder-gray-400 shadow-sm focus:outline-none focus:border-[#0070BB] focus:ring-4 focus:ring-[#91F5AD]/40 transition-all"
            />

            <!-- Tlačítko pro rychlé vymazání dotazu -->
            <button
              v-if="searchQuery.trim().length > 0"
              type="button"
              @click="clearSearch"
              class="absolute right-2 px-3 py-1.5 text-sm font-bold text-[#0070BB] bg-[#0070BB]/10 hover:bg-[#0070BB] hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Zrušit vyhledávání"
            >
              Zrušit ✕
            </button>
          </div>

          <!-- Počítadlo výsledků při aktivním hledání -->
          <div v-if="searchQuery.trim().length > 0" class="mt-2 text-sm text-gray-600 flex items-center justify-between">
            <span>
              Nalezeno: <strong class="text-[#0070BB]">{{ filteredStops.length }}</strong> z {{ stops.length }} zastávek
            </span>
          </div>
        </div>
      </header>

      <!-- Načítání -->
      <div v-if="loading" class="text-center py-16 text-2xl font-semibold text-[#0070BB]">
        Načítám zastávky...
      </div>

      <!-- Prázdný stav: Systém neeviduje vůbec žádné zastávky -->
      <div v-else-if="stops.length === 0" class="w-full bg-white rounded-2xl shadow-md p-12 text-center border-2 border-[#0070BB]/20">
        <div class="text-5xl mb-4">💡</div>
        <h2 class="text-2xl font-bold mb-2">Zatím zde nejsou žádné zastávky</h2>
        <p class="text-gray-500 text-lg">V systému se nenašly žádné evidované zastávky. Zkuste to prosím později.</p>
      </div>

      <!-- Prázdný stav vyhledávání: Žádná zastávka neodpovídá dotazu -->
      <div v-else-if="filteredStops.length === 0" class="w-full bg-white rounded-2xl shadow-md p-12 text-center border-2 border-[#0070BB]/20">
        <div class="text-5xl mb-4">🔍</div>
        <h2 class="text-2xl font-bold text-[#1A1A1A] mb-2">Žádná zastávka neodpovídá vašemu hledání</h2>
        <p class="text-gray-600 text-lg mb-6">
          Pro dotaz <span class="font-bold text-[#0070BB]">„{{ searchQuery }}“</span> jsme nenašli žádnou shodu v názvu ani vlastnostech zastávek.
        </p>
        <button
          type="button"
          @click="clearSearch"
          class="inline-flex items-center gap-2 px-6 py-3 bg-[#0070BB] hover:bg-[#0257A5] text-white font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
        >
          Zobrazit všechny zastávky ({{ stops.length }})
        </button>
      </div>

      <!-- Seznam zastávek: 1 na mobilu, 2 na tabletu, 3 na menším notebooku, 5 na široké obrazovce -->
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
          <div class="p-4 flex-1 flex flex-col justify-between">
            <div>
              <h3 class="text-xl font-bold text-[#0070BB] group-hover:text-[#0257A5] transition-colors line-clamp-2">
                {{ stop.name }}
              </h3>
              <!-- Krátká ukázka vlastností/popisu, pokud je k dispozici -->
              <p v-if="stop.description" class="mt-1.5 text-sm text-gray-500 line-clamp-2">
                {{ stop.description }}
              </p>
            </div>
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
import { ref, computed, onMounted } from 'vue'

const stops = ref([])
const loading = ref(true)
const searchQuery = ref('')

// Pomocná funkce pro odstranění diakritiky a sjednocení velikosti písmen
const normalizeText = (text) => {
  if (!text) return ''
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

// Reaktivní filtrování podle názvu i všech textových vlastností zastávky
const filteredStops = computed(() => {
  const query = normalizeText(searchQuery.value.trim())
  if (!query) return stops.value

  // Rozdělení na slova umožňuje hledat i víceslovné kombinace (např. "park wifi")
  const terms = query.split(/\s+/)

  return stops.value.filter((stop) => {
    // Sesbíráme všechny hodnoty vlastností zastávky (kromě image_url), aby šlo hledat i podle popisů, tagů, lokace apod.
    const searchableContent = Object.entries(stop)
      .filter(([key, val]) => key !== 'image_url' && val !== null && val !== undefined)
      .map(([, val]) => (Array.isArray(val) ? val.join(' ') : typeof val === 'object' ? JSON.stringify(val) : String(val)))
      .join(' ')

    const normalizedStopText = normalizeText(searchableContent)
    return terms.every((term) => normalizedStopText.includes(term))
  })
})

const clearSearch = () => {
  searchQuery.value = ''
}

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