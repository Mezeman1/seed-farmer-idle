<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps({
  // Button text
  label: {
    type: String,
    required: false,
    default: ''
  },
  // Whether the button is disabled
  disabled: {
    type: Boolean,
    default: false
  },
  // Button variant (primary, secondary, etc.)
  variant: {
    type: String,
    default: 'primary'
  },
  // Button size (sm, md, lg)
  size: {
    type: String,
    default: 'md'
  },
  // Full width button
  fullWidth: {
    type: Boolean,
    default: false
  },
  // Initial delay between auto-clicks (ms)
  initialDelay: {
    type: Number,
    default: 300
  },
  // Minimum delay between auto-clicks (ms)
  minDelay: {
    type: Number,
    default: 5
  },
  // Rate at which the delay decreases (0-1)
  speedupRate: {
    type: Number,
    default: 0.9
  }
})

const emit = defineEmits(['click', 'hold-start', 'hold-end'])

// Auto-click variables
const holdInterval = ref<number | null>(null)
const clickCount = ref(0)
const currentDelay = ref(props.initialDelay)

// Computed classes based on variant and size
const buttonClasses = computed(() => {
  const classes = ['rounded font-medium transition-colors duration-200 select-none']

  // Size classes
  if (props.size === 'sm') {
    classes.push('px-2 py-1 text-sm')
  } else if (props.size === 'lg') {
    classes.push('px-6 py-3 text-lg')
  } else {
    classes.push('px-4 py-2') // Default medium size
  }

  // Width classes
  if (props.fullWidth) {
    classes.push('w-full')
  }

  // Variant and state classes
  if (props.disabled) {
    classes.push('bg-gray-300 text-gray-500 cursor-not-allowed')
  } else {
    if (props.variant === 'primary') {
      classes.push('bg-green-600 hover:bg-green-700 text-white')
    } else if (props.variant === 'secondary') {
      classes.push('bg-blue-600 hover:bg-blue-700 text-white')
    } else if (props.variant === 'danger') {
      classes.push('bg-red-600 hover:bg-red-700 text-white')
    } else if (props.variant === 'warning') {
      classes.push('bg-yellow-600 hover:bg-yellow-700 text-white')
    } else if (props.variant === 'outline') {
      classes.push('bg-transparent border border-green-600 text-green-600 hover:bg-green-50')
    }
  }

  return classes.join(' ')
})

// Handle click event
const handleClick = () => {
  if (!props.disabled) {
    emit('click')
  }
}

// Start auto-clicking when button is held down
const startHold = () => {
  if (props.disabled) return

  // First immediate click
  handleClick()

  // Reset click count and delay
  clickCount.value = 0
  currentDelay.value = props.initialDelay

  // Clear any existing interval
  stopHold()

  // Emit hold start event
  emit('hold-start')

  // Set up the interval for repeated clicks
  scheduleNextClick()
}

// Schedule the next click with the current delay
const scheduleNextClick = () => {
  holdInterval.value = window.setTimeout(() => {
    if (props.disabled) {
      stopHold()
      return
    }

    // Perform the click
    handleClick()
    clickCount.value++

    // Calculate new delay
    if (clickCount.value % 3 === 0) {
      currentDelay.value = Math.max(
        props.minDelay,
        currentDelay.value * props.speedupRate
      )
    }

    // Schedule the next click
    scheduleNextClick()
  }, currentDelay.value)
}

// Stop auto-clicking when button is released or mouse leaves
const stopHold = () => {
  if (holdInterval.value !== null) {
    clearTimeout(holdInterval.value)
    holdInterval.value = null
    emit('hold-end')
  }
}
</script>

<template>
  <button :class="buttonClasses" :disabled="disabled" @mousedown="startHold" @mouseup="stopHold" @mouseleave="stopHold"
    @touchstart.prevent="startHold" @touchend.prevent="stopHold" @touchcancel.prevent="stopHold">
    <slot>{{ label }}</slot>
  </button>
</template>
