import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useCoreStore } from './coreStore'
import { useFarmStore } from './farmStore'
import { useMachineStore } from './machineStore'
import { useSeasonStore } from './seasonStore'

// Debug settings (would normally be in .env)
const DEBUG_TICK_DURATION = 2 // seconds per tick when in debug mode

export const useTickStore = defineStore('tick', () => {
  // References to other stores
  const coreStore = useCoreStore()
  const farmStore = useFarmStore()
  const machineStore = useMachineStore()

  // We'll initialize the seasonStore lazily to avoid circular dependencies
  let _seasonStore: ReturnType<typeof useSeasonStore> | null = null

  // Getter for seasonStore to avoid circular dependencies
  const getSeasonStore = () => {
    if (!_seasonStore) {
      _seasonStore = useSeasonStore()
    }
    return _seasonStore
  }

  // Tick timer
  const tickDuration = ref<number>(coreStore.isDebugMode ? DEBUG_TICK_DURATION : 10) // seconds per tick
  const timeUntilNextTick = ref<number>(tickDuration.value) // seconds until next tick
  const lastTickTime = ref<number>(Date.now())

  // Computed property for tick progress percentage (0-100)
  const tickProgress = computed(() => {
    // Convert remaining time to percentage (100% when time is 0, 0% when time is tickDuration)
    return 100 - (timeUntilNextTick.value / tickDuration.value) * 100
  })

  // Computed property for seconds remaining until next tick
  const secondsUntilNextTick = computed(() => {
    return timeUntilNextTick.value
  })

  // Process a game tick
  const processTick = () => {
    // Increment tick counter in core store
    coreStore.incrementTickCounter()

    // Update machine points based on ticks
    machineStore.tick()

    // Process auto-buyers from season store
    const seasonStore = getSeasonStore()
    seasonStore.processAutoBuyers()

    // Process farm production
    farmStore.processFarmProduction()

    // Check for harvest completions
    seasonStore.checkHarvests()
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
    console.log('Setting tick duration to', seconds)
    if (seconds > 0) {
      tickDuration.value = seconds
      // Reset the timer with the new duration
      timeUntilNextTick.value = seconds
    }
  }

  // Force a tick (for debug purposes)
  const forceTick = () => {
    processTick()
    timeUntilNextTick.value = tickDuration.value
  }

  return {
    tickDuration,
    timeUntilNextTick,
    tickProgress,
    secondsUntilNextTick,
    processTick,
    updateTickTimer,
    setTickDuration,
    forceTick,
  }
})
