import { defineStore } from 'pinia'
import { ref, computed, watch, onMounted } from 'vue'
import Decimal from 'break_infinity.js'
import { useCoreStore } from './coreStore'
import { useFarmStore } from './farmStore'

export interface MachineUpgrade {
  id: number
  name: string
  description: string
  cost: number
  level: number
  maxLevel?: number
  effect: (level: number) => number
}

export interface Machine {
  id: number
  name: string
  description: string
  points: number
  totalTicksForCurrentLevel: number
  level: number
  unlocked: boolean
  upgrades: MachineUpgrade[]
}

export const useMachineStore = defineStore('machine', () => {
  // Reference to core store
  const coreStore = useCoreStore()
  const farmStore = useFarmStore()

  // Machines state
  const machines = ref<Machine[]>([
    {
      id: 0,
      name: 'Seed Processor',
      description: 'Processes seeds to increase production efficiency',
      points: 0,
      totalTicksForCurrentLevel: 0,
      level: 1,
      unlocked: true,
      upgrades: [
        {
          id: 0,
          name: 'Seed Boost',
          description: 'Increases seed generation by 10% per level',
          cost: 1, // Always costs 1 point
          level: 0,
          effect: level => 1 + level * 0.1, // 10% increase per level
        },
      ],
    },
    {
      id: 1,
      name: 'Farm 2 Enhancer',
      description: 'Enhances Farm 2 production based on manual purchases',
      points: 0,
      totalTicksForCurrentLevel: 0,
      level: 1,
      unlocked: true,
      upgrades: [
        {
          id: 0,
          name: 'Farm 2 Boost',
          description: 'Increases Farm 2 production by 15% per level',
          cost: 1,
          level: 0,
          effect: level => 1 + level * 0.15, // 15% increase per level
        },
      ],
    },
  ])

  // Track total manual purchases
  const totalManualPurchases = ref<number>(0)

  // Calculate total manual purchases from all farms
  const calculateTotalManualPurchases = () => {
    let total = 0
    farmStore.farms.forEach(farm => {
      total += farm.manuallyPurchased.toNumber()
    })
    return total
  }

  // Initialize total manual purchases
  onMounted(() => {
    totalManualPurchases.value = calculateTotalManualPurchases()
    updateFarm2EnhancerLevel()
  })

  // Update Farm 2 Enhancer level based on total purchases
  const updateFarm2EnhancerLevel = () => {
    const farm2Enhancer = machines.value.find(m => m.id === 1)
    if (farm2Enhancer) {
      // Level up every 10 purchases
      const newLevel = Math.floor(totalManualPurchases.value / 10) + 1

      if (newLevel > farm2Enhancer.level) {
        const pointsToAdd = newLevel - farm2Enhancer.level
        farm2Enhancer.level = newLevel
        farm2Enhancer.points += pointsToAdd
      }
    }
  }

  // Watch for changes in farm purchases
  watch(
    () => farmStore.farms?.map(farm => farm.manuallyPurchased.toString()),
    (newValues, oldValues) => {
      // Recalculate total manual purchases
      totalManualPurchases.value = calculateTotalManualPurchases()

      // Update Farm 2 Enhancer level
      updateFarm2EnhancerLevel()

      // Force computed properties to update by accessing them
      const _ = machineMultiplier.value
      const __ = farm2Multiplier.value
    }
  )

  // Machine multiplier for seed production
  const machineMultiplier = computed(() => {
    let multiplier = 1

    // Apply seed boost upgrade effect from the first machine
    if (machines.value.length > 0 && machines.value[0].unlocked) {
      const seedBoostUpgrade = machines.value[0].upgrades[0]
      multiplier *= seedBoostUpgrade.effect(seedBoostUpgrade.level)
    }

    // Update the core store's machine multiplier
    coreStore.updateMultiplier('farm1', multiplier)

    return multiplier
  })

  // Farm 2 multiplier
  const farm2Multiplier = computed(() => {
    let multiplier = 1

    // Apply Farm 2 boost upgrade effect
    if (machines.value.length > 1 && machines.value[1].unlocked) {
      const farm2BoostUpgrade = machines.value[1].upgrades[0]
      multiplier *= farm2BoostUpgrade.effect(farm2BoostUpgrade.level)
    }

    // Update the core store's farm2 multiplier
    coreStore.updateMultiplier('farm2', multiplier)

    return multiplier
  })

  // Update machine points based on ticks
  const updateMachinePoints = () => {
    machines.value.forEach(machine => {
      // Skip the Farm 2 Enhancer as it levels up based on purchases
      if (machine.id === 1) return

      if (machine.unlocked) {
        machine.totalTicksForCurrentLevel++

        // Auto level up when enough ticks are accumulated
        const ticksNeeded = Math.floor(10 * Math.pow(1.4, machine.level - 1))
        if (machine.totalTicksForCurrentLevel >= ticksNeeded) {
          machine.totalTicksForCurrentLevel = 0 // Reset ticks for current level
          machine.level++
          machine.points++ // Give one point per level up
        }
      }
    })
  }

  // Level up a machine (kept for compatibility, but machines now auto-level)
  const levelUpMachine = (machineId: number) => {
    const machine = machines.value.find(m => m.id === machineId)
    if (!machine) return false

    // Skip the Farm 2 Enhancer as it levels up based on purchases
    if (machineId === 1) return false

    // This function is now just a fallback, as machines auto-level
    // Calculate ticks needed for next level (1.4x per level)
    const ticksNeeded = Math.floor(10 * Math.pow(1.4, machine.level - 1))

    if (machine.totalTicksForCurrentLevel >= ticksNeeded) {
      machine.totalTicksForCurrentLevel = 0 // Reset ticks for current level
      machine.level++
      machine.points++ // Give one point per level up
      return true
    }

    return false
  }

  // Purchase a machine upgrade
  const purchaseMachineUpgrade = (machineId: number, upgradeId: number) => {
    const machine = machines.value.find(m => m.id === machineId)
    if (!machine) return false

    const upgrade = machine.upgrades.find(u => u.id === upgradeId)
    if (!upgrade) return false

    // Check if at max level
    if (upgrade.maxLevel && upgrade.level >= upgrade.maxLevel) return false

    // Check if enough points (always costs 1 point)
    if (machine.points >= 1) {
      machine.points -= 1
      upgrade.level++
      return true
    }

    return false
  }

  // Calculate ticks needed for next level
  const getTicksForNextLevel = (machineId: number): number => {
    const machine = machines.value.find(m => m.id === machineId)
    if (!machine) return 0

    // For Farm 2 Enhancer, show purchases needed instead of ticks
    if (machineId === 1) {
      const nextLevel = machine.level + 1
      const purchasesNeeded = nextLevel * 10
      return Math.max(0, purchasesNeeded - totalManualPurchases.value)
    }

    return Math.floor(10 * Math.pow(1.4, machine.level - 1))
  }

  return {
    machines,
    machineMultiplier,
    farm2Multiplier,
    totalManualPurchases,
    updateMachinePoints,
    levelUpMachine,
    purchaseMachineUpgrade,
    getTicksForNextLevel,
  }
})
