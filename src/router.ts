import { createRouter, createWebHistory } from 'vue-router'

import IndexPage from '@/pages/IndexPage.vue'
import MachinesPage from '@/pages/MachinesPage.vue'
import SeasonsPage from '@/pages/SeasonsPage.vue'

const routes = [
  {
    path: '/',
    component: IndexPage,
    meta: {
      title: 'Seed Farmer - A Tick-Based Idle Game',
    },
  },
  {
    path: '/machines',
    component: MachinesPage,
    meta: {
      title: 'Machines - Seed Farmer',
    },
  },
  {
    path: '/seasons',
    component: SeasonsPage,
    meta: {
      title: 'Seasons - Seed Farmer',
    },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
