<script setup lang="ts">
import MainLayout from '@/layouts/MainLayout.vue'
import MachinesList from '@/components/MachinesList.vue'
import { useSeoMeta } from '@unhead/vue'

// SEO meta tags
useSeoMeta({
  title: 'Machines - Seed Farmer',
  description: 'Discover and purchase powerful machines to automate your seed farming operations in Seed Farmer.',
  ogTitle: 'Machines - Seed Farmer',
  ogDescription: 'Discover and purchase powerful machines to automate your seed farming operations in Seed Farmer.',
  ogType: 'website',
  ogImage: '/pwa-512x512.png',
  twitterTitle: 'Machines - Seed Farmer',
  twitterDescription: 'Discover and purchase powerful machines to automate your seed farming operations in Seed Farmer.',
  twitterCard: 'summary',
})
</script>

<template>
  <MainLayout>
    <MachinesList />
  </MainLayout>
</template>
