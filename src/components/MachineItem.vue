<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMachineStore } from '@/stores/machineStore'
import { useCoreStore } from '@/stores/coreStore'
import { useSeasonStore } from '@/stores/seasonStore'
import HoldButton from './HoldButton.vue'
import type { Machine, MachineUpgrade } from '@/stores/machineStore'
import { formatDecimal } from '@/utils/formatting'
import Decimal from 'break_infinity.js'

const props = defineProps<{
  machine: Machine
}>()

const machineStore = useMachineStore()
const coreStore = useCoreStore()
const seasonStore = useSeasonStore()

// Modal state
const showModal = ref(false)

// Create a reactive property that depends on totalManualPurchases
const currentPurchases = computed(() => machineStore.totalManualPurchases)

// Get current seeds
const currentSeeds = computed(() => coreStore.seeds)

// Get machine leveling reduction multiplier
const machineLevelingReduction = computed(() => {
  const reductionKey = props.machine.levelingType === 'ticks'
    ? `machine${props.machine.id}TickReduction`
    : `machine${props.machine.id}PurchaseReduction`

  const multiplier = seasonStore.prestigeMultipliers[reductionKey]
  if (multiplier && multiplier.lt(1)) {
    // Convert to percentage reduction (e.g., 0.7 -> 30% reduction)
    return (1 - multiplier.toNumber()) * 100
  }
  return 0
})

// Calculate ticks needed for next level
const getTicksForNextLevel = (machineId: number) => {
  return machineStore.getTicksForNextLevel(machineId)
}

// Purchase an upgrade
const purchaseUpgrade = (machineId: number, upgradeId: number) => {
  if (props.machine.points < 1) return
  machineStore.purchaseMachineUpgrade(machineId, upgradeId)
}

// Unlock a machine
const unlockMachine = (machineId: number) => {
  machineStore.unlockMachine(machineId)
  // Close modal after unlocking
  showModal.value = false
}

// Format a number with commas
const formatNumber = (num: number | Decimal): string => {
  if (typeof num === 'number') {
    num = new Decimal(num)
  }

  return formatDecimal(num)
}

// Calculate progress percentage for next level
const getLevelProgress = computed(() => {
  const machine = props.machine
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
    return Math.min(100, (machine.totalTicksForCurrentLevel.div(ticksNeeded).toNumber() * 100))
  }
})

// Get auto-level progress text for a machine
const autoLevelProgressText = computed(() => {
  const machine = props.machine
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
      remaining: formatNumber(Math.max(0, new Decimal(ticksNeeded).minus(machine.totalTicksForCurrentLevel).toNumber())),
      unit: machine.levelingUnit
    }
  }
})

// Check if player has enough seeds to unlock a machine
const canUnlockMachine = computed(() => {
  const machine = props.machine
  if (!machine || machine.unlocked || !machine.unlockCost) return false
  return currentSeeds.value.gte(machine.unlockCost)
})

// Check if an upgrade is unlocked
const isUpgradeUnlocked = (upgradeId: number): boolean => {
  return machineStore.isUpgradeUnlocked(props.machine, upgradeId)
}

// Get detailed effects for an upgrade
const getDetailedEffects = (upgrade: MachineUpgrade): string[] => {
  if (upgrade.level === 0 || !upgrade.effects || upgrade.effects.length === 0) {
    return []
  }

  // Create context object for effect descriptions
  const context = { machine: props.machine }

  // Get descriptions from all effects
  return upgrade.effects.map(effect =>
    effect.getDescription(upgrade.level, context)
  )
}

// Open modal with machine details
const openModal = () => {
  showModal.value = true
}

// Close modal
const closeModal = () => {
  showModal.value = false
}
</script>

<template>
  <!-- Compact Machine Card (Main View) -->
  <div @click="openModal" class="bg-amber-50 dark:bg-amber-900/30 rounded-lg shadow-sm p-2 sm:p-4 border border-amber-200 dark:border-amber-700
           transition-all duration-200 hover:translate-y-[-2px] cursor-pointer">
    <!-- Machine Header -->
    <div class="flex justify-between items-start mb-2">
      <div>
        <h3 class="text-base sm:text-lg font-bold text-amber-900 dark:text-amber-200 flex items-center">
          <span class="mr-1 sm:mr-2">⚙️</span>{{ machine.name }}
          <span
            class="ml-1 sm:ml-2 bg-green-100 dark:bg-green-800/50 text-green-800 dark:text-green-200 text-xs px-1 sm:px-2 py-0.5 rounded-full">
            Lv{{ machine.level }}
          </span>
        </h3>
        <p class="text-xs sm:text-sm text-amber-800 dark:text-amber-300 mt-1 line-clamp-2">{{ machine.description }}</p>
      </div>
    </div>

    <!-- Progress Bar (only for unlocked machines) -->
    <div v-if="machine.unlocked" class="w-full bg-amber-100 dark:bg-amber-800/50 rounded-full h-2 mb-2 overflow-hidden">
      <div
        class="bg-gradient-to-r from-green-600 to-green-500 dark:from-green-500 dark:to-green-400 h-2 rounded-full transition-all duration-300"
        :style="{ width: `${getLevelProgress}%` }">
      </div>
    </div>

    <!-- Locked Status (for locked machines) -->
    <div v-else
      class="w-full bg-amber-100 dark:bg-amber-800/50 rounded-full h-2 mb-2 flex items-center justify-center overflow-hidden">
      <div class="text-xs text-amber-800 dark:text-amber-200 font-medium">Locked</div>
    </div>

    <!-- Compact Info Footer -->
    <div class="flex justify-between items-center text-xs">
      <span v-if="machine.unlocked" class="text-green-700 dark:text-green-300 font-medium">
        {{ formatNumber(machine.points) }} points
      </span>
      <span v-else class="text-amber-800 dark:text-amber-300">
        {{ formatNumber(machine.unlockCost || 0) }} seeds to unlock
      </span>

      <span class="text-blue-600 dark:text-blue-400">
        Tap for details
      </span>
    </div>
  </div>

  <!-- Modal for detailed view -->
  <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      @click.stop>
      <!-- Modal Header -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-bold text-amber-900 dark:text-amber-200 flex items-center">
            <span class="mr-2">⚙️</span>{{ machine.name }}
            <span
              class="ml-2 bg-green-100 dark:bg-green-800/50 text-green-800 dark:text-green-200 text-xs px-2 py-0.5 rounded-full">
              Level {{ machine.level }}
            </span>
          </h3>
          <button @click="closeModal"
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p class="text-sm text-amber-800 dark:text-amber-300 mt-2">{{ machine.description }}</p>
      </div>

      <!-- Modal Body -->
      <div class="p-4">
        <!-- Unlock Button (for locked machines) -->
        <div v-if="!machine.unlocked" class="mb-4">
          <p class="text-sm text-amber-800 dark:text-amber-300 mb-2">
            Unlock Cost: {{ formatNumber(machine.unlockCost || 0) }} seeds
          </p>
          <HoldButton @click="() => unlockMachine(machine.id)" :disabled="!canUnlockMachine" variant="primary"
            class="w-full bg-green-600 hover:bg-green-700 text-white transition-colors py-2 px-4">
            <span class="flex items-center justify-center">
              <span class="mr-1">🔓</span> Unlock Machine
            </span>
          </HoldButton>
        </div>

        <!-- Machine Details (for unlocked machines) -->
        <div v-if="machine.unlocked">
          <!-- Progress Info -->
          <div class="mb-4">
            <div class="flex justify-between text-sm mb-1">
              <span>Progress to Level {{ machine.level + 1 }}</span>
              <span>{{ autoLevelProgressText.current }}/{{ autoLevelProgressText.target }}
                {{ autoLevelProgressText.unit }}</span>
            </div>
            <div class="w-full bg-amber-100 dark:bg-amber-800/50 rounded-full h-2.5 mb-2 overflow-hidden">
              <div
                class="bg-gradient-to-r from-green-600 to-green-500 dark:from-green-500 dark:to-green-400 h-2.5 rounded-full transition-all duration-300"
                :style="{ width: `${getLevelProgress}%` }">
              </div>
            </div>
            <div class="flex justify-between text-xs text-amber-800 dark:text-amber-300">
              <span class="text-green-700 dark:text-green-300 font-medium">
                Available Points: {{ formatNumber(machine.points) }}
              </span>
              <span>
                <span class="text-green-700 dark:text-green-300">{{ autoLevelProgressText.remaining }} more to
                  level</span>
              </span>
            </div>
          </div>

          <!-- Machine Leveling Info -->
          <div v-if="machineLevelingReduction > 0"
            class="mb-4 text-xs text-amber-800 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-800/30 p-2 rounded">
            <p class="text-green-700 dark:text-green-300 font-medium">
              🚀 {{ machineLevelingReduction.toFixed(0) }}% faster leveling from prestige upgrades!
            </p>
          </div>

          <!-- Upgrades Section -->
          <div class="mt-4">
            <h4
              class="font-semibold text-sm mb-3 pb-1 border-b border-amber-200 dark:border-amber-700 text-amber-900 dark:text-amber-200">
              Upgrades
            </h4>

            <!-- List layout for upgrades (better for modal) -->
            <div class="space-y-3">
              <div v-for="upgrade in machine.upgrades" :key="upgrade.id" class="p-3 rounded-md border transition-colors"
                :class="[
                  isUpgradeUnlocked(upgrade.id)
                    ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700'
                    : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-80'
                ]">
                <div class="flex flex-col">
                  <div class="flex justify-between items-start">
                    <h5 class="font-medium text-sm text-amber-900 dark:text-amber-200 flex items-center">
                      {{ upgrade.name }}
                      <span
                        class="ml-1 bg-amber-100 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 text-xs px-1 py-0.5 rounded-full">
                        Lv{{ upgrade.level }}
                      </span>
                    </h5>
                  </div>

                  <p class="text-xs text-amber-800 dark:text-amber-300 mt-1">
                    {{ upgrade.description }}
                  </p>

                  <!-- Unlock condition -->
                  <p v-if="!isUpgradeUnlocked(upgrade.id) && upgrade.unlockCondition"
                    class="text-xs text-orange-600 dark:text-orange-400 font-medium flex items-center mt-2">
                    <span class="mr-1">🔒</span> {{ upgrade.unlockCondition.description }}
                  </p>

                  <p v-else class="text-xs text-green-700 dark:text-green-300 font-medium mt-2">
                    {{ upgrade.getEffectDisplay(upgrade.level, { machine }) }}
                  </p>

                  <!-- Detailed effects if any -->
                  <div v-if="upgrade.level > 0 && upgrade.effects && upgrade.effects.length > 1"
                    class="mt-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-800/30 p-2 rounded">
                    <div v-for="(effect, index) in getDetailedEffects(upgrade)" :key="index"
                      class="flex items-start mb-1 last:mb-0">
                      <span class="mr-1 mt-0.5">•</span> {{ effect }}
                    </div>
                  </div>

                  <div class="flex justify-end mt-3">
                    <HoldButton @click="() => purchaseUpgrade(machine.id, upgrade.id)"
                      :disabled="machine.points < 1 || !isUpgradeUnlocked(upgrade.id)" variant="secondary" class="bg-amber-200 hover:bg-amber-300 dark:bg-amber-700 dark:hover:bg-amber-600 text-amber-900 dark:text-amber-100
                             disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400
                             transition-colors text-sm py-1 px-3">
                      <span class="flex items-center">
                        <span class="mr-1">⬆️</span> Upgrade (1 point)
                      </span>
                    </HoldButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="p-4 border-t border-gray-200 dark:border-gray-700">
        <button @click="closeModal"
          class="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-4 rounded transition-colors">
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Add subtle hover effect */
.cursor-pointer:hover {
  transform: translateY(-1px);
}

/* Prevent body scrolling when modal is open */
:global(body.modal-open) {
  overflow: hidden;
}

/* Line clamp for truncating text */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
