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
  // Cost formula parameters
  costMultiplier: number
  costBase: number
  costLinear: number
  costThreshold1: number
  costThreshold2?: number
  costScalingFactor1: number
  costScalingFactor2?: number
}

export const useGameStore = defineStore('game', () => {
  // Game state
  const seeds = ref<Decimal>(new Decimal(0))
  const tickCounter = ref<number>(0) // Counter for total ticks in current run
  const farms = ref<Farm[]>([
    {
      id: 0,
      name: 'Farm 1',
      manuallyPurchased: new Decimal(1),
      totalOwned: new Decimal(1),
      baseCost: new Decimal(3), // Base multiplier for Farm 1
      baseProduction: new Decimal(100), // Produces 100 seeds per tick
      owned: true, // First farm is already owned
      // Mk1 3*(1.065+0.004x)^(x*(1+max(x-999,0)/1000))
      costMultiplier: 3,
      costBase: 1.065,
      costLinear: 0.004,
      costThreshold1: 999,
      costScalingFactor1: 1000,
    },
    {
      id: 1,
      name: 'Farm 2',
      manuallyPurchased: new Decimal(0),
      totalOwned: new Decimal(0),
      baseCost: new Decimal(2000), // Base multiplier for Farm 2
      baseProduction: new Decimal(1), // Produces 1 Farm 1 per tick
      owned: false,
      // Mk2 2e3*(2.9+0.3x)^(x*(1+max(x-199,0)/500))
      costMultiplier: 2000,
      costBase: 2.9,
      costLinear: 0.3,
      costThreshold1: 199,
      costScalingFactor1: 500,
    },
    {
      id: 2,
      name: 'Farm 3',
      manuallyPurchased: new Decimal(0),
      totalOwned: new Decimal(0),
      baseCost: new Decimal(1e8), // Base multiplier for Farm 3
      baseProduction: new Decimal(1), // Produces 1 Farm 2 per tick
      owned: false,
      // Mk3 1e8*(20+10x)^(x*(1+max(x-99,0)/(1000/3)))
      costMultiplier: 1e8,
      costBase: 20,
      costLinear: 10,
      costThreshold1: 99,
      costScalingFactor1: 1000 / 3,
    },
    {
      id: 3,
      name: 'Farm 4',
      manuallyPurchased: new Decimal(0),
      totalOwned: new Decimal(0),
      baseCost: new Decimal(4e18), // Base multiplier for Farm 4
      baseProduction: new Decimal(1), // Produces 1 Farm 3 per tick
      owned: false,
      // Mk4 4e18*(50+30x)^(x*(1+max(x-74,0)/200))
      costMultiplier: 4e18,
      costBase: 50,
      costLinear: 30,
      costThreshold1: 74,
      costScalingFactor1: 200,
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

  // Calculate cost to buy a farm using the CIFI formulas
  const calculateFarmCost = (farmId: number): Decimal => {
    const farm = farms.value[farmId]

    // If this is the first purchase, return the base cost
    if (farm.manuallyPurchased.eq(0)) {
      return new Decimal(farm.costMultiplier)
    }

    // Get the current number of farms as a number for the formula
    const x = farm.manuallyPurchased.toNumber()

    // Calculate the scaling factor based on thresholds
    let scalingFactor = 1
    if (x > farm.costThreshold1) {
      scalingFactor = 1 + Math.max(x - farm.costThreshold1, 0) / farm.costScalingFactor1
    }

    // Calculate the exponent: x * (1 + scaling_factor)
    const exponent = x * scalingFactor

    // Calculate the base: (costBase + costLinear * x)
    const base = farm.costBase + farm.costLinear * x

    // Calculate the final cost: costMultiplier * base^exponent
    const cost = new Decimal(farm.costMultiplier).mul(new Decimal(base).pow(exponent))

    return cost
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
    // Increment tick counter
    tickCounter.value++

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

  // Reset tick counter (will be useful for prestige)
  const resetTickCounter = () => {
    tickCounter.value = 0
  }

  return {
    seeds,
    farms,
    tickCounter,
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
    resetTickCounter,
  }
})
