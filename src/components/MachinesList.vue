<script setup lang="ts">
import { useMachineStore } from '@/stores/machineStore'
import { useCoreStore } from '@/stores/coreStore'
import { computed } from 'vue'
import HoldButton from './HoldButton.vue'
import type { Machine, MachineUpgrade, UpgradeEffect } from '@/stores/machineStore'

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
      <h2 class="text-2xl font-bold text-center md:text-left">Your Machines</h2>
    </div>

    <div class="grid grid-cols-1 gap-6">
      <!-- Machine Card -->
      <div v-for="machine in machineStore.machines" :key="machine.id" class="bg-white rounded-lg shadow-md p-4">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="text-xl font-bold text-green-800">{{ machine.name }} (Level {{ machine.level }})</h3>
            <p class="text-gray-600">{{ machine.description }}</p>
            <p v-if="getLevelUpDescription(machine)" class="text-sm text-blue-600 mt-1">
              {{ getLevelUpDescription(machine) }}
            </p>
          </div>

          <!-- Unlock Button (for locked machines) -->
          <div v-if="!machine.unlocked" class="text-right">
            <p class="text-sm text-gray-700 mb-2">Unlock Cost: {{ formatNumber(machine.unlockCost || 0) }} seeds</p>
            <HoldButton @click="() => unlockMachine(machine.id)" :disabled="!canUnlockMachine(machine)"
              variant="primary" size="sm">
              Unlock Machine
            </HoldButton>
          </div>

          <!-- Auto-Level Info (for unlocked machines) -->
          <div v-else class="text-right">
            <p class="text-sm text-gray-700">Progress to Level {{ machine.level + 1 }}</p>
            <p class="text-sm font-medium">
              {{ getAutoLevelProgressText(machine).current }}/{{ getAutoLevelProgressText(machine).target }}
              {{ getAutoLevelProgressText(machine).unit }}
            </p>
          </div>
        </div>

        <!-- Progress Bar (only for unlocked machines) -->
        <div v-if="machine.unlocked" class="w-full bg-gray-200 rounded-full h-4 mb-4">
          <div class="bg-green-600 h-4 rounded-full" :style="{ width: `${getLevelProgress(machine)}%` }">
          </div>
        </div>

        <!-- Locked Status (for locked machines) -->
        <div v-else class="w-full bg-gray-200 rounded-full h-4 mb-4 flex items-center justify-center">
          <div class="text-xs text-gray-600 font-medium">Locked</div>
        </div>

        <div v-if="machine.unlocked" class="mb-4">
          <div class="flex justify-between text-sm text-gray-600 mb-1">
            <span>Available Points: {{ formatNumber(machine.points) }}</span>
            <span>Auto-levels at {{ getAutoLevelProgressText(machine).target }} {{
              getAutoLevelProgressText(machine).unit }}
              ({{ getAutoLevelProgressText(machine).remaining }} more)</span>
          </div>
        </div>

        <!-- Upgrades Section (only for unlocked machines) -->
        <div v-if="machine.unlocked" class="mt-6">
          <h4 class="font-semibold text-lg mb-3 border-b pb-2">Upgrades</h4>

          <div class="space-y-4">
            <div v-for="upgrade in machine.upgrades" :key="upgrade.id" class="p-3 rounded border" :class="[
              isUpgradeUnlocked(machine, upgrade.id) ? 'bg-gray-50' : 'bg-gray-100 opacity-80',
            ]">
              <div class="flex justify-between items-start">
                <div>
                  <h5 class="font-medium">{{ upgrade.name }} (Level {{ upgrade.level }})</h5>
                  <p class="text-sm text-gray-600">{{ upgrade.description }}</p>

                  <!-- Unlock condition -->
                  <p v-if="!isUpgradeUnlocked(machine, upgrade.id) && upgrade.unlockCondition"
                    class="text-sm text-orange-600 font-medium mt-1">
                    Locked: {{ upgrade.unlockCondition.description }}
                  </p>

                  <p v-else class="text-sm text-green-700 font-medium">
                    Current effect: {{ upgrade.getEffectDisplay(upgrade.level, { machine }) }}
                  </p>

                  <!-- Detailed effects -->
                  <div v-if="upgrade.level > 0 && upgrade.effects.length > 1" class="mt-1">
                    <p v-for="(effect, index) in getDetailedEffects(upgrade, machine)" :key="index"
                      class="text-xs text-blue-600 ml-2">• {{ effect }}</p>
                  </div>
                </div>

                <HoldButton @click="() => purchaseUpgrade(machine.id, upgrade.id)"
                  :disabled="machine.points < 1 || !isUpgradeUnlocked(machine, upgrade.id)" variant="secondary"
                  size="sm">
                  Upgrade (1 pt)
                </HoldButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
