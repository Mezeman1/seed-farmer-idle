// Farm configuration - single source of truth for farm definitions
import Decimal from 'break_infinity.js'

// ID Ranges for different types of upgrades:
// 0-4: Production upgrades
// 5-19: Auto-buyer upgrades
// 10-19: Speed upgrades
// 20-29: Reserved for future auto-buyers

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
      id: 20,
      baseCost: 80,
      costScaling: 5,
    },
  },
  {
    id: 5,
    name: 'Farm 6',
    emoji: '🌿',
    baseCost: 1e80,
    baseProduction: 2, // Produces 2 Farm 5s per tick
    costMultiplier: 1e80,
    costBase: 200,
    costLinear: 75,
    costThreshold1: 40,
    costScalingFactor1: 125,
    producesResource: 'farm',
    producesFarmId: 4,
    autoBuyerConfig: {
      id: 21,
      baseCost: 160,
      costScaling: 6,
    },
  },
  {
    id: 6,
    name: 'Farm 7',
    emoji: '🌳',
    baseCost: 1e150,
    baseProduction: 3, // Produces 3 Farm 6s per tick
    costMultiplier: 1e150,
    costBase: 300,
    costLinear: 100,
    costThreshold1: 30,
    costScalingFactor1: 100,
    producesResource: 'farm',
    producesFarmId: 5,
    autoBuyerConfig: {
      id: 22,
      baseCost: 320,
      costScaling: 7,
    },
  },
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
    category: 'Auto-Buyers' as 'Auto-Buyers',
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
