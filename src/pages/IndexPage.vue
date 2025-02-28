<script setup lang="ts">
import GameHeader from '@/components/GameHeader.vue'
import FarmsList from '@/components/FarmsList.vue'
</script>

<template>
  <div class="min-h-screen bg-green-50">
    <GameHeader />

    <main class="pb-20">
      <FarmsList />
    </main>

    <footer class="fixed bottom-0 w-full bg-green-800 text-white p-4 text-center text-sm">
      Seed Farmer - A Tick-Based Idle Game
    </footer>
  </div>
</template>
