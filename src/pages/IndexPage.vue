<script setup lang="ts">
import { ref } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import FarmsList from '@/components/FarmsList.vue'
import { useSeoMeta } from '@unhead/vue'

// SEO meta tags
useSeoMeta({
  title: 'Seed Farmer - A Tick-Based Idle Game',
  description: 'Grow your seed farm empire in this addictive idle game. Purchase farms, upgrade your production, and watch your seeds multiply!',
  ogTitle: 'Seed Farmer - A Tick-Based Idle Game',
  ogDescription: 'Grow your seed farm empire in this addictive idle game. Purchase farms, upgrade your production, and watch your seeds multiply!',
  ogType: 'website',
  ogImage: '/pwa-512x512.png',
  twitterTitle: 'Seed Farmer - A Tick-Based Idle Game',
  twitterDescription: 'Grow your seed farm empire in this addictive idle game. Purchase farms, upgrade your production, and watch your seeds multiply!',
  twitterCard: 'summary',
})
</script>

<template>
  <MainLayout>
    <FarmsList />
  </MainLayout>
</template>
