// Farm configuration - single source of truth for farm definitions
import Decimal from 'break_infinity.js'

export interface FarmConfig {
  id: number
  name: string
  emoji: string
  baseCost: number
  baseProduction: number
  // Cost formula parameters
  costMultiplier: number
  costBase: number
  costLinear: number
  costThreshold1: number
  costThreshold2?: number
  costScalingFactor1: number
  costScalingFactor2?: number
  // What this farm produces
  producesResource: 'seeds' | 'farm'
  producesFarmId?: number
  // Auto-buyer configuration
  autoBuyerConfig: {
    id: number
    baseCost: number
    costScaling: number
  }
}

// Define all farms in the game
export const FARMS: FarmConfig[] = [
  {
    id: 0,
    name: 'Farm 1',
    emoji: '🌱',
    baseCost: 3,
    baseProduction: 100,
    costMultiplier: 3,
    costBase: 1.065,
    costLinear: 0.004,
    costThreshold1: 999,
    costScalingFactor1: 1000,
    producesResource: 'seeds',
    autoBuyerConfig: {
      id: 5, // Keep existing IDs for backward compatibility
      baseCost: 5,
      costScaling: 2,
    },
  },
  {
    id: 1,
    name: 'Farm 2',
    emoji: '🌱',
    baseCost: 2000,
    baseProduction: 1,
    costMultiplier: 2000,
    costBase: 2.9,
    costLinear: 0.3,
    costThreshold1: 199,
    costScalingFactor1: 500,
    producesResource: 'farm',
    producesFarmId: 0,
    autoBuyerConfig: {
      id: 6,
      baseCost: 10,
      costScaling: 2.5,
    },
  },
  {
    id: 2,
    name: 'Farm 3',
    emoji: '🌱',
    baseCost: 1e8,
    baseProduction: 1,
    costMultiplier: 1e8,
    costBase: 20,
    costLinear: 10,
    costThreshold1: 99,
    costScalingFactor1: 1000 / 3,
    producesResource: 'farm',
    producesFarmId: 1,
    autoBuyerConfig: {
      id: 7,
      baseCost: 20,
      costScaling: 3,
    },
  },
  {
    id: 3,
    name: 'Farm 4',
    emoji: '🌱',
    baseCost: 4e18,
    baseProduction: 1,
    costMultiplier: 4e18,
    costBase: 50,
    costLinear: 30,
    costThreshold1: 74,
    costScalingFactor1: 200,
    producesResource: 'farm',
    producesFarmId: 2,
    autoBuyerConfig: {
      id: 8,
      baseCost: 40,
      costScaling: 4,
    },
  },
  // To add a new farm, just add a new entry here
  {
    id: 4,
    name: 'Farm 5',
    emoji: '🌱',
    baseCost: 1e32,
    baseProduction: 1,
    costMultiplier: 1e32,
    costBase: 100,
    costLinear: 50,
    costThreshold1: 50,
    costScalingFactor1: 150,
    producesResource: 'farm',
    producesFarmId: 3,
    autoBuyerConfig: {
      id: 10, // Next available ID
      baseCost: 80,
      costScaling: 5,
    }
  }
]

// Helper function to get the highest farm ID
export const getMaxFarmId = (): number => {
  return Math.max(...FARMS.map(farm => farm.id))
}

// Helper function to get all auto-buyer IDs
export const getAutoBuyerIds = (): number[] => {
  return FARMS.map(farm => farm.autoBuyerConfig.id)
}

// Helper function to generate auto-buyer upgrade
export const generateAutoBuyerUpgrade = (farm: FarmConfig) => {
  return {
    id: farm.autoBuyerConfig.id,
    name: `${farm.name} Auto-Buyer`,
    description: `Automatically purchases ${farm.name} every tick based on level`,
    baseCost: farm.autoBuyerConfig.baseCost,
    costScaling: farm.autoBuyerConfig.costScaling,
    maxLevel: null,
    effects: [
      {
        type: 'auto_farm',
        farmIndex: farm.id,
        getPurchaseAmount: (level: number) => level,
        apply: (level: number, context: any) => {
          if (level <= 0) return
          context.autoBuyers[`farm${farm.id}`] = level
        },
        getDescription: (level: number) => `Auto-buys ${level} ${farm.name} per tick`,
      },
    ],
    getEffectDisplay: (level: number, context: any) => {
      if (level === 0) return 'No effect yet'
      return `Automatically purchases ${level} ${farm.name} per tick`
    },
  }
}
