<script setup>
import { ref, onMounted } from 'vue'

const teamInfo = ref({ team_name: 'Načítám...', members: 'Načítám...' })
const status = ref('Načítám...')

onMounted(async () => {
  try {
    // pozadavek GET 
    const response = await fetch ('/api/v1/health');
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
  <main style="padding: 20px;">
    <h1>Think different Academy</h1>
    <p>Status: {{ status }}</p>
  </main>

  <!-- Patička s údaji načtenými z databáze -->
  <footer style="margin-top: 50px; border-top: 1px solid #ccc; padding-top: 10px;">
    <p><strong>Název týmu:</strong> {{ teamInfo.team_name }}</p>
    <p><strong>Členové:</strong> {{ teamInfo.members }}</p>
  </footer>
</template>