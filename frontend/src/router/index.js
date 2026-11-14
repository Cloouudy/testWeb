import { createRouter, createWebHistory } from 'vue-router'
import StopsView from '../views/stops.vue'
import StopDetailView from '../views/StopDetailView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/stops' // Volitelné: přesměruje úvodní stránku rovnou na /stops (nebo sem dejte svůj úvodní komponent)
    },
    {
      path: '/stops',
      name: 'stops',
      component: StopsView
    },
    {
      path: '/stops/:id',
      name: 'stop-detail',
      component: StopDetailView
    }
  ]
})

export default router