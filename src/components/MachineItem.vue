<script setup lang="ts">
import { computed } from 'vue'
import { useMachineStore } from '@/stores/machineStore'
import { useCoreStore } from '@/stores/coreStore'
import HoldButton from './HoldButton.vue'
import type { Machine, MachineUpgrade } from '@/stores/machineStore'

const props = defineProps<{
    machine: Machine
}>()

const machineStore = useMachineStore()
const coreStore = useCoreStore()

// Create a reactive property that depends on totalManualPurchases
const currentPurchases = computed(() => machineStore.totalManualPurchases)

// Get current seeds
const currentSeeds = computed(() => coreStore.seeds)

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
}

// Format a number with commas
const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US')
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
        return Math.min(100, (machine.totalTicksForCurrentLevel / ticksNeeded) * 100)
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
            remaining: formatNumber(Math.max(0, ticksNeeded - machine.totalTicksForCurrentLevel)),
            unit: machine.levelingUnit
        }
    }
})

// Get machine level up description
const levelUpDescription = computed(() => {
    const machine = props.machine
    if (!machine || !machine.unlocked) return ''

    if (machine.levelingType === 'purchases') {
        return `Levels up every ${machine.levelingMultiplier} manual farm purchases. Currently at ${formatNumber(currentPurchases.value)} purchases.`
    }
    return ''
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
</script>

<template>
    <div
        class="bg-amber-50 dark:bg-amber-900/30 rounded-lg shadow-sm p-5 border border-amber-200 dark:border-amber-700 transition-all duration-200 hover:translate-y-[-2px]">
        <div class="flex justify-between items-start mb-4">
            <div>
                <h3 class="text-xl font-bold text-amber-900 dark:text-amber-200 flex items-center">
                    <span class="mr-2">⚙️</span>{{ machine.name }}
                    <span
                        class="ml-2 bg-green-100 dark:bg-green-800/50 text-green-800 dark:text-green-200 text-sm px-2 py-0.5 rounded-full">Level
                        {{
                            machine.level }}</span>
                </h3>
                <p class="text-amber-800 dark:text-amber-300 mt-1">{{ machine.description }}</p>
                <p v-if="levelUpDescription" class="text-sm text-green-700 dark:text-green-300 mt-1 font-medium">
                    {{ levelUpDescription }}
                </p>
            </div>

            <!-- Unlock Button (for locked machines) -->
            <div v-if="!machine.unlocked" class="text-right">
                <p class="text-sm text-amber-800 dark:text-amber-300 mb-2">Unlock Cost: {{
                    formatNumber(machine.unlockCost || 0) }} seeds
                </p>
                <HoldButton @click="() => unlockMachine(machine.id)" :disabled="!canUnlockMachine" variant="primary"
                    size="sm" class="bg-green-600 hover:bg-green-700 text-white transition-colors">
                    <span class="flex items-center">
                        <span class="mr-1">🔓</span> Unlock Machine
                    </span>
                </HoldButton>
            </div>

            <!-- Auto-Level Info (for unlocked machines) -->
            <div v-else class="text-right">
                <p class="text-sm text-amber-800 dark:text-amber-300">Progress to Level {{ machine.level + 1 }}</p>
                <p class="text-sm font-medium text-green-700 dark:text-green-300">
                    {{ autoLevelProgressText.current }}/{{ autoLevelProgressText.target }}
                    {{ autoLevelProgressText.unit }}
                </p>
            </div>
        </div>

        <!-- Progress Bar (only for unlocked machines) -->
        <div v-if="machine.unlocked"
            class="w-full bg-amber-100 dark:bg-amber-800/50 rounded-full h-3 mb-4 overflow-hidden">
            <div class="bg-gradient-to-r from-green-600 to-green-500 dark:from-green-500 dark:to-green-400 h-3 rounded-full transition-all duration-300"
                :style="{ width: `${getLevelProgress}%` }">
            </div>
        </div>

        <!-- Locked Status (for locked machines) -->
        <div v-else
            class="w-full bg-amber-100 dark:bg-amber-800/50 rounded-full h-3 mb-4 flex items-center justify-center overflow-hidden">
            <div class="text-xs text-amber-800 dark:text-amber-200 font-medium">Locked</div>
        </div>

        <div v-if="machine.unlocked" class="mb-4">
            <div class="flex justify-between text-sm mb-1">
                <span class="text-green-700 dark:text-green-300 font-medium">Available Points: {{
                    formatNumber(machine.points) }}</span>
                <span class="text-amber-800 dark:text-amber-300">
                    Auto-levels at {{ autoLevelProgressText.target }} {{ autoLevelProgressText.unit }}
                    <span class="text-green-700 dark:text-green-300">({{ autoLevelProgressText.remaining }} more)</span>
                </span>
            </div>
        </div>

        <!-- Upgrades Section (only for unlocked machines) -->
        <div v-if="machine.unlocked" class="mt-6">
            <h4
                class="font-semibold text-lg mb-3 border-b border-amber-200 dark:border-amber-700 pb-2 text-amber-900 dark:text-amber-200">
                Upgrades</h4>

            <div class="space-y-4">
                <div v-for="upgrade in machine.upgrades" :key="upgrade.id"
                    class="p-3 rounded-md border transition-colors" :class="[
                        isUpgradeUnlocked(upgrade.id)
                            ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 hover:bg-amber-100/50 dark:hover:bg-amber-800/50'
                            : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-80'
                    ]">
                    <div class="flex justify-between items-start">
                        <div>
                            <h5 class="font-medium text-amber-900 dark:text-amber-200 flex items-center">
                                {{ upgrade.name }}
                                <span
                                    class="ml-2 bg-amber-100 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 text-xs px-2 py-0.5 rounded-full">Level
                                    {{
                                        upgrade.level }}</span>
                            </h5>
                            <p class="text-sm text-amber-800 dark:text-amber-300 mt-1">{{ upgrade.description }}</p>

                            <!-- Unlock condition -->
                            <p v-if="!isUpgradeUnlocked(upgrade.id) && upgrade.unlockCondition"
                                class="text-sm text-orange-600 dark:text-orange-400 font-medium mt-2 flex items-center">
                                <span class="mr-1">🔒</span> {{ upgrade.unlockCondition.description }}
                            </p>

                            <p v-else class="text-sm text-green-700 dark:text-green-300 font-medium mt-2">
                                Current effect: {{ upgrade.getEffectDisplay(upgrade.level, { machine }) }}
                            </p>

                            <!-- Detailed effects -->
                            <div v-if="upgrade.level > 0 && upgrade.effects.length > 1"
                                class="mt-2 bg-amber-100/50 dark:bg-amber-800/30 p-2 rounded-md">
                                <p v-for="(effect, index) in getDetailedEffects(upgrade)" :key="index"
                                    class="text-xs text-amber-800 dark:text-amber-300 ml-2 flex items-start">
                                    <span class="mr-1 mt-0.5">•</span> {{ effect }}
                                </p>
                            </div>
                        </div>

                        <HoldButton @click="() => purchaseUpgrade(machine.id, upgrade.id)"
                            :disabled="machine.points < 1 || !isUpgradeUnlocked(upgrade.id)" variant="secondary"
                            size="sm"
                            class="bg-amber-200 hover:bg-amber-300 dark:bg-amber-700 dark:hover:bg-amber-600 text-amber-900 dark:text-amber-100 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400 transition-colors">
                            <span class="flex items-center">
                                <span class="mr-1">⬆️</span> Upgrade (1 pt)
                            </span>
                        </HoldButton>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
