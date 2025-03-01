<script setup lang="ts">
import { useMachineStore } from '@/stores/machineStore'
import { useCoreStore } from '@/stores/coreStore'
import { computed } from 'vue'
import HoldButton from './HoldButton.vue'
import type { Machine, MachineUpgrade, UpgradeEffect } from '@/stores/machineStore'
import MachineItem from './MachineItem.vue'

const machineStore = useMachineStore()
const coreStore = useCoreStore()

// Create a reactive property that depends on totalManualPurchases
const currentPurchases = computed(() => machineStore.totalManualPurchases)

// Get current seeds
const currentSeeds = computed(() => coreStore.seeds)

// Calculate ticks needed for next level
const getTicksForNextLevel = (machineId: number) => {
  const machine = machineStore.machines.find(m => m.id === machineId)
  if (!machine) return 0

  return machineStore.getTicksForNextLevel(machineId)
}

// Purchase an upgrade
const purchaseUpgrade = (machineId: number, upgradeId: number) => {
  const machine = machineStore.machines.find(m => m.id === machineId)
  if (!machine || machine.points < 1) return

  machineStore.purchaseMachineUpgrade(machineId, upgradeId)
}

// Unlock a machine
const unlockMachine = (machineId: number) => {
  machineStore.unlockMachine(machineId)
}

// Format a number with commas
const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US')
}

// Calculate progress percentage for next level
const getLevelProgress = (machine: Machine | undefined) => {
  if (!machine || !machine.unlocked) return 0

  if (machine.levelingType === 'purchases') {
    // For purchase-based machines, show progress based on purchases
    const nextLevel = machine.level + 1
    const purchasesNeeded = machine.levelingMultiplier * nextLevel
    const currentPurchasesValue = currentPurchases.value
    return Math.min(100, (currentPurchasesValue / purchasesNeeded) * 100)
  } else {
    // For tick-based machines, show progress based on ticks
    const ticksNeeded = getTicksForNextLevel(machine.id)
    return Math.min(100, (machine.totalTicksForCurrentLevel / ticksNeeded) * 100)
  }
}

// Get auto-level progress text for a machine
const getAutoLevelProgressText = (machine: Machine | undefined) => {
  if (!machine || !machine.unlocked) {
    return {
      current: '0',
      target: '0',
      remaining: '0',
      unit: 'ticks'
    }
  }

  if (machine.levelingType === 'purchases') {
    // For purchase-based machines
    const nextLevel = machine.level + 1
    const purchasesNeeded = machine.levelingMultiplier * nextLevel
    const remaining = Math.max(0, purchasesNeeded - currentPurchases.value)

    return {
      current: formatNumber(currentPurchases.value),
      target: formatNumber(purchasesNeeded),
      remaining: formatNumber(remaining),
      unit: machine.levelingUnit
    }
  } else {
    // For tick-based machines
    const ticksNeeded = getTicksForNextLevel(machine.id)

    return {
      current: formatNumber(machine.totalTicksForCurrentLevel),
      target: formatNumber(ticksNeeded),
      remaining: formatNumber(Math.max(0, ticksNeeded - machine.totalTicksForCurrentLevel)),
      unit: machine.levelingUnit
    }
  }
}

// Get machine level up description
const getLevelUpDescription = (machine: Machine | undefined) => {
  if (!machine || !machine.unlocked) return ''

  if (machine.levelingType === 'purchases') {
    return `Levels up every ${machine.levelingMultiplier} manual farm purchases. Currently at ${formatNumber(currentPurchases.value)} purchases.`
  }
  return ''
}

// Check if player has enough seeds to unlock a machine
const canUnlockMachine = (machine: Machine | undefined): boolean => {
  if (!machine || machine.unlocked || !machine.unlockCost) return false
  return currentSeeds.value.gte(machine.unlockCost)
}

// Check if an upgrade is unlocked
const isUpgradeUnlocked = (machine: Machine, upgradeId: number): boolean => {
  return machineStore.isUpgradeUnlocked(machine, upgradeId)
}

// Get detailed effects for an upgrade
const getDetailedEffects = (upgrade: MachineUpgrade, machine: Machine): string[] => {
  if (upgrade.level === 0 || !upgrade.effects || upgrade.effects.length === 0) {
    return []
  }

  // Create context object for effect descriptions
  const context = { machine }

  // Get descriptions from all effects
  return upgrade.effects.map(effect =>
    effect.getDescription(upgrade.level, context)
  )
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 pb-24">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-amber-900 flex items-center">
        <span class="mr-2">🔧</span> Your Machines
      </h2>
    </div>

    <div class="grid grid-cols-1 gap-6">
      <!-- Machine Cards -->
      <MachineItem v-for="machine in machineStore.machines" :key="machine.id" :machine="machine" />

      <!-- Empty state when no machines are available -->
      <div v-if="machineStore.machines.length === 0"
        class="bg-amber-50 rounded-lg shadow-sm p-8 border border-amber-200 text-center">
        <p class="text-amber-800 text-lg">No machines available yet. Keep growing your farm!</p>
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
