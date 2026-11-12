<script setup>
import { ref, onMounted } from 'vue'

const statusText = ref('Načítám status...')

onMounted(async () => {
try {
    const response = await fetch('/api/v1/health');
    const data = await response.json();
    // Převede "ok" z JSONu na "OK"
    status.value = data.status.toUpperCase();
  } catch (error) {
    status.value = 'Chyba připojení';
    console.error(error);
  }
});
</script>

<template>
  <main>
    <h1>Think different Academy</h1>
    <h1>Status: {{ statusText }}</h1>
  </main>
</template>