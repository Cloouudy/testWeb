<script setup>
import { ref, onMounted } from 'vue'

const status = ref('Načítám...')

onMounted(async () => {
  try {
    const response = await fetch ('/api/v1/health');
    const data = await response.json();

    status.value = data.status.toUpperCase();


  } catch (error) {
    statusText.value = 'CHYBA'
  }
});

</script>

<template>
  <main>
    <h1>Think different Academy</h1>
    <p>Status: {{ status }}</p>
  </main>
</template>