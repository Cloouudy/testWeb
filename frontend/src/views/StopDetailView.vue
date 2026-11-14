<template>
  <div class="w-full min-h-screen bg-gray-50 font-['Dosis'] text-[#1A1A1A] px-6 py-8 md:px-12">
    <div class="max-w-4xl mx-auto">
      <!-- Tlačítko zpět na seznam -->
      <router-link to="/stops" class="inline-flex items-center gap-2 mb-6 text-[#0070BB] font-bold hover:underline">
        ← Zpět na přehled zastávek
      </router-link>

      <!-- Načítání -->
      <div v-if="loading" class="text-center py-16 text-2xl font-semibold text-[#0070BB]">
        Načítám detail zastávky...
      </div>

      <!-- Chybová zpráva / Neexistující zastávka -->
      <div v-else-if="error || !stop" class="bg-white rounded-2xl shadow-md p-12 text-center border border-gray-100">
        <div class="text-5xl mb-4">⚠️</div>
        <h2 class="text-2xl font-bold text-red-600 mb-2">Zastávku se nepodařilo načíst</h2>
        <p class="text-gray-600 mb-6">
          {{ error || 'Požadovaná zastávka v systému neexistuje nebo server neodpovídá.' }}
        </p>
        <router-link to="/stops" class="inline-block px-6 py-3 bg-[#0070BB] hover:bg-[#0257A5] text-white font-bold rounded-xl shadow-sm transition-colors">
          Zpět na seznam zastávek
        </router-link>
      </div>

      <!-- Detail zastávky -->
      <div v-else class="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        <!-- Obrázek a hlavička -->
        <div class="h-80 w-full relative bg-gray-200">
          <img :src="stop.image_url" :alt="stop.name" class="w-full h-full object-cover" @error="handleImageError" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-8">
            <div>
              <span v-if="stop.is_transfer" class="inline-block bg-[#0070BB] text-white text-xs font-bold px-3 py-1 rounded-md mb-2 shadow">
                Přestupní uzel
              </span>
              <h1 class="text-4xl md:text-5xl font-bold text-white">{{ stop.name }}</h1>
            </div>
          </div>
        </div>

        <!-- Informace a parametry -->
        <div class="p-8">
          <h3 class="text-2xl font-bold text-[#1A1A1A] mb-6 border-b border-gray-100 pb-3">
            Informace a vybavení zastávky
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <!-- Linky -->
            <div class="bg-gray-50 p-5 rounded-xl border border-gray-100 flex items-center justify-between">
              <span class="font-semibold text-gray-600">Obsluhované linky:</span>
              <span class="font-bold text-[#0070BB] text-lg">{{ stop.stop_lines || 'Neuvedeno' }}</span>
            </div>

            <!-- Přestupní -->
            <div class="bg-gray-50 p-5 rounded-xl border border-gray-100 flex items-center justify-between">
              <span class="font-semibold text-gray-600">Přestupní zastávka:</span>
              <span :class="stop.is_transfer ? 'text-green-600 font-bold' : 'text-gray-500 font-semibold'">
                {{ stop.is_transfer ? 'Ano' : 'Ne' }}
              </span>
            </div>
          </div>

          <!-- Vybavení v mřížce (Bezbariérovost, Přístřešek, Automat na jízdenky) -->
          <h4 class="text-lg font-bold text-[#1A1A1A] mb-4">Vybavení</h4>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <!-- Bezbariérová -->
            <div class="p-4 rounded-xl border flex flex-col items-center text-center transition-all"
                 :class="stop.wheelchair_accessible ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-500'">
              <span class="text-2xl mb-1">♿</span>
              <span class="text-sm font-semibold">Bezbariérová</span>
              <span class="font-bold mt-1">{{ stop.wheelchair_accessible ? 'Ano' : 'Ne' }}</span>
            </div>

            <!-- Přístřešek -->
            <div class="p-4 rounded-xl border flex flex-col items-center text-center transition-all"
                 :class="stop.has_shelter ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-500'">
              <span class="text-2xl mb-1">🏠</span>
              <span class="text-sm font-semibold">Přístřešek</span>
              <span class="font-bold mt-1">{{ stop.has_shelter ? 'Ano' : 'Ne' }}</span>
            </div>

            <!-- Jízdenkový automat -->
            <div class="p-4 rounded-xl border flex flex-col items-center text-center transition-all"
                 :class="stop.has_ticket_machine ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-500'">
              <span class="text-2xl mb-1">🎫</span>
              <span class="text-sm font-semibold">Automat na jízdenky</span>
              <span class="font-bold mt-1">{{ stop.has_ticket_machine ? 'Ano' : 'Ne' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const stop = ref(null)
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  try {
    const id = route.params.id
    const res = await fetch(`/api/v1/stops/${id}`)
    
    if (!res.ok) {
      throw new Error(res.status === 404 ? 'Zastávka nebyla nalezena.' : 'Chyba při komunikaci se serverem.')
    }
    
    stop.value = await res.json()
  } catch (err) {
    console.error(err)
    error.value = err.message || 'Nepodařilo se načíst data o zastávce.'
  } finally {
    loading.value = false
  }
})

const handleImageError = (e) => {
  e.target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500'
}
</script>