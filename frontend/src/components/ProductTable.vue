<script setup>
defineProps({
  products: {
    type: Array,
    required: true
  }
});

defineEmits(['edit', 'delete']);
</script>

<template>
  <p v-if="products.length === 0">No products.</p>
  <table v-else>
    <thead>
      <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Cost</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="p in products" :key="p.id">
        <td>{{ p.id }}</td>
        <td>{{ p.name }}</td>
        <td>{{ p.cost }}</td>
        <td class="actions">
          <button @click="$emit('edit', p)">Edit</button>
          <button @click="$emit('delete', p.id)">Delete</button>
        </td>
      </tr>
    </tbody>
  </table>
</template>
