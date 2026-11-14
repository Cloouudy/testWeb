<script setup>
import { ref, onMounted } from 'vue'
// Import dejte na začátek scriptu
import activitiesIcon from '../assets/icons/Think-different-Academy_LOGO_bily.svg'

const teamInfo = ref({ team_name: 'Načítám...', members: 'Načítám...' })
const status = ref('Načítám...')

onMounted(async () => {
  try {
    // pozadavek GET 
    const response = await fetch('/api/v1/health');
    const data = await response.json();

    status.value = data.status.toUpperCase();

    // data z DB
    const teamRes = await fetch('/api/v1/team')
    const teamData = await teamRes.json()
    teamInfo.value = teamData
  } catch (error) {
    status.value = 'Chyba'
    console.error("Chyba při načítání dat o týmu:", error)
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50 text-[#1A1A1A] font-['Dosis']">
    <header class="bg-[#0070BB] text-white p-4 shadow-md flex justify-between items-center">
      <div class="flex items-center gap-3">
        <img :src="activitiesIcon" alt="Logo Think different Academy" class="w-8 h-8 object-contain" />
        <h1 class="text-2xl font-bold">Think different Academy</h1>
      </div>
      
      <div class="text-sm bg-white/10 px-3 py-1 rounded-lg">
        Status: <span class="font-semibold">{{ status }}</span>
      </div>
    </header>

    <main class="flex-1">
      <router-view />
    </main>

    <footer class="mt-auto border-t border-gray-200 bg-white py-4 px-6 text-sm text-gray-600 flex justify-between items-center">
      <p><strong>Název týmu:</strong> {{ teamInfo.team_name }}</p>
      <p><strong>Členové:</strong> {{ teamInfo.members }}</p>
    </footer>
  </div>
</template>