<template>
  <div class="min-h-screen bg-gray-50 font-dosis text-tdaDark p-6">
    <div class="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
      <div v-if="loading" class="text-center py-16 text-xl text-tdaBlue">
        Načítám detail zastávky...
      </div>

      <div v-else-if="!stop" class="text-center py-16">
        <h2 class="text-2xl font-bold text-red-500 mb-4">Zastávka nebyla nalezena</h2>
        <router-link to="/stops" class="text-tdaBlue underline font-semibold">Zpět na seznam zastávek</router-link>
      </div>

      <div v-else>
        <div class="h-72 w-full relative">
          <img :src="stop.image_url" :alt="stop.name" class="w-full h-full object-cover" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
            <h1 class="text-4xl font-bold text-white">{{ stop.name }}</h1>
          </div>
        </div>

        <div class="p-8">
          <router-link to="/stops" class="inline-block mb-6 text-tdaBlue font-semibold hover:underline">
            ← Zpět na přehled zastávek
          </router-link>

          <div class="prose max-w-none text-gray-700 text-lg">
            <h3 class="text-2xl font-bold text-tdaDark mb-3">O zastávce</h3>
            <p>{{ stop.description || 'Pro tuto zastávku zatím není vyplněn podrobnější popis.' }}</p>
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

onMounted(async () => {
  try {
    const id = route.params.id
    const res = await fetch(`/api/v1/stops/${id}`)
    if (!res.ok) throw new Error('Zastávku se nepodařilo načíst')
    stop.value = await res.json()
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
})
</script>