import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import Decimal from 'break_infinity.js'
import { useCoreStore } from './coreStore'
import { useMachineStore } from './machineStore'

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

export const useFarmStore = defineStore('farm', () => {
  // References to other stores
  const coreStore = useCoreStore()
  const machineStore = useMachineStore()

  // Farm state
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

  // Calculate production for each farm
  const calculateProduction = (farmId: number): Decimal => {
    const farm = farms.value[farmId]

    if (farmId === 0) {
      // First farm produces its base production per owned farm
      return farm.baseProduction.mul(farm.totalOwned)
    } else if (farmId === 1) {
      // Farm 2 production is boosted by the Farm 2 Enhancer
      return farm.baseProduction.mul(farm.totalOwned).mul(machineStore.farm2Multiplier)
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

    if (coreStore.removeSeeds(cost)) {
      farm.manuallyPurchased = farm.manuallyPurchased.add(1)
      farm.totalOwned = farm.totalOwned.add(1)
      farm.owned = true

      // Force an immediate update of the production display
      const _ = calculateProduction(farmId)

      return true
    }

    return false
  }

  // Process farm production during a tick
  const processFarmProduction = () => {
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
          // Apply farm1 multiplier to seed production
          const farm1Multiplier = coreStore.multipliers['farm1'] || 1
          const boostedProduction = production.mul(farm1Multiplier)
          coreStore.addSeeds(boostedProduction)
        }
      }
    }
  }

  // Calculate total seeds produced per tick
  const calculateTotalSeedsPerTick = (): Decimal => {
    // Get farm1 multiplier from core store
    const farm1Multiplier = coreStore.multipliers['farm1'] || 1

    // First farm produces seeds directly
    const farm = farms.value[0]
    if (!farm.owned || farm.totalOwned.lte(0)) {
      return new Decimal(0)
    }

    const production = calculateProduction(0)
    // Apply farm1 multiplier to seed production
    return production.mul(farm1Multiplier)
  }

  return {
    farms,
    calculateProduction,
    calculateFarmCost,
    buyFarm,
    processFarmProduction,
    calculateTotalSeedsPerTick,
  }
})
