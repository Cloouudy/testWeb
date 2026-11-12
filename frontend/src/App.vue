<script setup>
import { ref, onMounted } from 'vue'

const statusText = ref('načítám...')

onMounted(async () => {
  try {
    // Pokud vám frontend běží přes Vite, můžete zkusit relativní cestu 
    // nebo ujistit se, že port 3001 odpovídá běžícímu backendu
    const response = await fetch('http://localhost:3001/api/v1/health')
    const data = await response.json()
    
    // Do proměnné dáme přímo hodnotu z API převedenou na velká písmena (např. "OK")
    statusText.value = data.status.toUpperCase()
  } catch (error) {
    statusText.value = 'CHYBA'
  }
})
</script>

<template>
  <main>
    <h1>Think different Academy</h1>
    <h1>Status: {{ statusText }}</h1>
  </main>
</template>