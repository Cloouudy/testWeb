<script setup>
import { ref, onMounted } from 'vue'

const statusText = ref('Načítám status...')

onMounted(async () => {
  try {
    // Upravte port podle toho, na jakém portu vám běží backend (např. 3001)
    const response = await fetch('http://localhost:3001/api/v1/health')
    const data = await response.json()
    
    // Převede např. "ok" na "OK" a zobrazí požadovaný formát
    statusText.value = `${data.status.toUpperCase()}`
  } catch (error) {
    statusText.value = 'Chyba připojení'
  }
})
</script>

<template>
  <main>
    <h1>Think different Academy</h1>
    <h1>Status: {{ statusText }}</h1>
  </main>
</template>