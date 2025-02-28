import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import Decimal from 'break_infinity.js'

// Debug settings (would normally be in .env)
const DEBUG_MODE = true
const DEBUG_TICK_DURATION = 2 // seconds per tick when in debug mode

export interface Farm {
  id: number
  name: string
  manuallyPurchased: Decimal
  totalOwned: Decimal
  baseCost: Decimal
  baseProduction: Decimal
  owned: boolean
}

export const useGameStore = defineStore('game', () => {
  // Game state
  const seeds = ref<Decimal>(new Decimal(0))
  const farms = ref<Farm[]>([
    {
      id: 0,
      name: 'Farm 1',
      manuallyPurchased: new Decimal(1),
      totalOwned: new Decimal(1),
      baseCost: new Decimal(10), // Base cost for Farm 1
      baseProduction: new Decimal(100), // Produces 100 seeds per tick
      owned: true, // First farm is already owned
    },
    {
      id: 1,
      name: 'Farm 2',
      manuallyPurchased: new Decimal(0),
      totalOwned: new Decimal(0),
      baseCost: new Decimal(100), // Base cost for Farm 2
      baseProduction: new Decimal(1), // Produces 1 Farm 1 per tick
      owned: false,
    },
    {
      id: 2,
      name: 'Farm 3',
      manuallyPurchased: new Decimal(0),
      totalOwned: new Decimal(0),
      baseCost: new Decimal(1000), // Base cost for Farm 3
      baseProduction: new Decimal(1), // Produces 1 Farm 2 per tick
      owned: false,
    },
    {
      id: 3,
      name: 'Farm 4',
      manuallyPurchased: new Decimal(0),
      totalOwned: new Decimal(0),
      baseCost: new Decimal(10000), // Base cost for Farm 4
      baseProduction: new Decimal(1), // Produces 1 Farm 3 per tick
      owned: false,
    },
  ])

  // Debug settings
  const isDebugMode = ref<boolean>(DEBUG_MODE)

  // Tick timer
  const tickDuration = ref<number>(isDebugMode.value ? DEBUG_TICK_DURATION : 10) // seconds per tick
  const timeUntilNextTick = ref<number>(tickDuration.value) // seconds until next tick
  const lastTickTime = ref<number>(Date.now())

  // Computed properties
  const formattedSeeds = computed(() => {
    return seeds.value.toString()
  })

  // Computed property for tick progress percentage (0-100)
  const tickProgress = computed(() => {
    // Convert remaining time to percentage (100% when time is 0, 0% when time is tickDuration)
    return 100 - (timeUntilNextTick.value / tickDuration.value) * 100
  })

  // Computed property for seconds remaining until next tick
  const secondsUntilNextTick = computed(() => {
    return Math.ceil(timeUntilNextTick.value)
  })

  // Calculate production for each farm
  const calculateProduction = (farmId: number): Decimal => {
    const farm = farms.value[farmId]

    if (farmId === 0) {
      // First farm produces its base production per owned farm
      return farm.baseProduction.mul(farm.totalOwned)
    } else {
      // Other farms produce based on the previous farm's production
      return farm.baseProduction.mul(farm.totalOwned)
    }
  }

  // Calculate cost to buy a farm using the formula c = a^b
  // where a is the base cost and b is the number of manually purchased farms
  const calculateFarmCost = (farmId: number): Decimal => {
    const farm = farms.value[farmId]

    // Using the formula c = a^b
    // a = base cost
    // b = number of manually purchased farms (including the one being purchased)
    const nextPurchaseNumber = farm.manuallyPurchased.add(1)
    return farm.baseCost.pow(nextPurchaseNumber)
  }

  // Buy a farm
  const buyFarm = (farmId: number): boolean => {
    const farm = farms.value[farmId]
    const cost = calculateFarmCost(farmId)

    if (seeds.value.gte(cost)) {
      seeds.value = seeds.value.sub(cost)
      farm.manuallyPurchased = farm.manuallyPurchased.add(1)
      farm.totalOwned = farm.totalOwned.add(1)
      farm.owned = true
      return true
    }

    return false
  }

  // Process a game tick
  const processTick = () => {
    // Process farms in reverse order (higher tiers first)
    // This ensures that production from higher tier farms is added to lower tier farms
    // before calculating seed production
    for (let i = farms.value.length - 1; i >= 0; i--) {
      const farm = farms.value[i]

      if (farm.owned && farm.totalOwned.gt(0)) {
        if (i > 0) {
          // Higher tier farms produce lower tier farms
          const previousFarm = farms.value[i - 1]
          const production = calculateProduction(i)
          previousFarm.totalOwned = previousFarm.totalOwned.add(production)
        } else {
          // First farm produces seeds
          const production = calculateProduction(i)
          seeds.value = seeds.value.add(production)
        }
      }
    }
  }

  // Update tick timer
  const updateTickTimer = () => {
    const now = Date.now()
    const elapsed = (now - lastTickTime.value) / 1000

    timeUntilNextTick.value -= elapsed

    if (timeUntilNextTick.value <= 0) {
      processTick()
      timeUntilNextTick.value = tickDuration.value
    }

    lastTickTime.value = now
  }

  // Set tick duration (for debug purposes)
  const setTickDuration = (seconds: number) => {
    if (seconds > 0) {
      tickDuration.value = seconds
      // Reset the timer with the new duration
      timeUntilNextTick.value = seconds
    }
  }

  // Toggle debug mode
  const toggleDebugMode = () => {
    isDebugMode.value = !isDebugMode.value
  }

  return {
    seeds,
    farms,
    tickProgress,
    tickDuration,
    timeUntilNextTick,
    secondsUntilNextTick,
    isDebugMode,
    formattedSeeds,
    calculateProduction,
    calculateFarmCost,
    buyFarm,
    processTick,
    updateTickTimer,
    setTickDuration,
    toggleDebugMode,
  }
})
