<script setup lang="ts">
import { useMachineStore } from '@/stores/machineStore'
import { computed } from 'vue'
import HoldButton from './HoldButton.vue'

const machineStore = useMachineStore()

// Create a reactive property that depends on totalManualPurchases
const currentPurchases = computed(() => machineStore.totalManualPurchases)

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

// Format a number with commas
const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US')
}

// Calculate the effect of an upgrade at its current level
const getUpgradeEffect = (machineId: number, upgradeId: number) => {
    const machine = machineStore.machines.find(m => m.id === machineId)
    if (!machine) return '0%'

    const upgrade = machine.upgrades.find(u => u.id === upgradeId)
    if (!upgrade) return '0%'

    // For the seed boost upgrade, show as percentage
    if (upgrade.name === 'Seed Boost') {
        return `+${upgrade.level * 10}%`
    }

    return upgrade.level.toString()
}

// Calculate progress percentage for next level
const getLevelProgress = (machineId: number) => {
    const machine = machineStore.machines.find(m => m.id === machineId)
    if (!machine) return 0

    if (machineId === 1) {
        // For Farm 2 Enhancer, show progress based on purchases
        const nextLevel = machine.level + 1
        const purchasesNeeded = nextLevel * 10
        const currentPurchasesValue = currentPurchases.value
        return Math.min(100, (currentPurchasesValue / purchasesNeeded) * 100)
    } else {
        // For other machines, show progress based on ticks
        const ticksNeeded = getTicksForNextLevel(machineId)
        return Math.min(100, (machine.totalTicksForCurrentLevel / ticksNeeded) * 100)
    }
}

// Check if machine has enough points for an upgrade
const canAffordUpgrade = (machineId: number) => {
    const machine = machineStore.machines.find(m => m.id === machineId)
    return machine ? machine.points >= 1 : false
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
                        <p v-if="machine.id === 1" class="text-sm text-blue-600 mt-1">
                            Levels up every 10 manual farm purchases. Currently at {{ currentPurchases
                            }} purchases.
                        </p>
                    </div>

                    <!-- Auto-Level Info -->
                    <div class="text-right">
                        <p class="text-sm text-gray-700">Progress to Level {{ machine.level + 1 }}</p>
                        <p class="text-sm font-medium" v-if="machine.id === 1">
                            {{ formatNumber(currentPurchases) }}/{{
                                formatNumber((machine.level + 1) * 10) }} purchases
                        </p>
                        <p class="text-sm font-medium" v-else>
                            {{ formatNumber(machine.totalTicksForCurrentLevel) }}/{{
                                formatNumber(getTicksForNextLevel(machine.id)) }} ticks
                        </p>
                    </div>
                </div>

                <!-- Progress Bar -->
                <div class="w-full bg-gray-200 rounded-full h-4 mb-4">
                    <div class="bg-green-600 h-4 rounded-full" :style="{ width: `${getLevelProgress(machine.id)}%` }">
                    </div>
                </div>

                <div class="mb-4">
                    <div class="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Available Points: {{ formatNumber(machine.points) }}</span>
                        <span v-if="machine.id === 1">Auto-levels at {{ formatNumber((machine.level + 1) * 10) }}
                            purchases ({{ formatNumber(Math.max(0, (machine.level + 1) * 10 - currentPurchases.value))
                            }} more)</span>
                        <span v-else>Auto-levels at {{ formatNumber(getTicksForNextLevel(machine.id)) }} ticks</span>
                    </div>
                </div>

                <!-- Upgrades Section -->
                <div class="mt-6">
                    <h4 class="font-semibold text-lg mb-3 border-b pb-2">Upgrades</h4>

                    <div class="space-y-4">
                        <div v-for="upgrade in machine.upgrades" :key="upgrade.id"
                            class="bg-gray-50 p-3 rounded border">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h5 class="font-medium">{{ upgrade.name }} (Level {{ upgrade.level }})</h5>
                                    <p class="text-sm text-gray-600">{{ upgrade.description }}</p>
                                    <p class="text-sm text-green-700 font-medium">Current effect: {{
                                        getUpgradeEffect(machine.id, upgrade.id) }}</p>
                                </div>

                                <HoldButton @click="() => purchaseUpgrade(machine.id, upgrade.id)"
                                    :disabled="machine.points < 1" variant="secondary" size="sm">
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
