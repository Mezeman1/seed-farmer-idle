<script setup lang="ts">
import { useMachineStore } from '@/stores/machineStore'
import MachineItem from './MachineItem.vue'
const machineStore = useMachineStore()
</script>

<template>
  <div class="container mx-auto px-4 py-6 pb-24">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-amber-900 dark:text-amber-200 flex items-center">
        <span class="mr-2">🔧</span> Your Machines
      </h2>
    </div>

    <!-- Grid layout for machines -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Machine Cards -->
      <MachineItem v-for="machine in machineStore.machines" :key="machine.id" :machine="machine" />

      <!-- Empty state when no machines are available -->
      <div v-if="machineStore.machines.length === 0"
        class="bg-amber-50 dark:bg-amber-900/30 rounded-lg shadow-sm p-8 border border-amber-200 dark:border-amber-700 text-center">
        <p class="text-amber-800 dark:text-amber-300 text-lg">No machines available yet. Keep growing your farm!</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Add some subtle animation for when machines are added */
.grid>* {
  animation: fade-in 0.5s ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
