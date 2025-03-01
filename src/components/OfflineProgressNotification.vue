<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'

interface NotificationProps {
    message: string
    seedsGained: string
    isVisible: boolean
    type?: 'info' | 'success' | 'warning' | 'error'
    autoClose?: boolean
    autoCloseDelay?: number
}

const props = withDefaults(defineProps<NotificationProps>(), {
    type: 'info',
    autoClose: false,
    autoCloseDelay: 10000 // 10 seconds
})

const emit = defineEmits<{
    dismiss: []
}>()

// Local state for animation
const isAnimating = ref(false)
const isShown = ref(false)

// Handle dismiss action with animation
const handleDismiss = () => {
    isAnimating.value = true
    setTimeout(() => {
        isAnimating.value = false
        emit('dismiss')
    }, 300) // Match this with the CSS transition duration
}

// Auto-close timer
let autoCloseTimer: number | null = null

// Set up auto-close if enabled
onMounted(() => {
    isShown.value = props.isVisible

    if (props.autoClose && props.isVisible) {
        autoCloseTimer = window.setTimeout(() => {
            handleDismiss()
        }, props.autoCloseDelay)
    }
})

// Computed styles based on notification type
const notificationStyles = computed(() => {
    const styles = {
        info: 'bg-blue-100 border-blue-500 text-blue-700',
        success: 'bg-green-100 border-green-500 text-green-700',
        warning: 'bg-yellow-100 border-yellow-500 text-yellow-700',
        error: 'bg-red-100 border-red-500 text-red-700'
    }

    return styles[props.type]
})
</script>

<template>
    <transition enter-active-class="transition duration-300 ease-out"
        enter-from-class="transform -translate-y-4 opacity-0" enter-to-class="transform translate-y-0 opacity-100"
        leave-active-class="transition duration-300 ease-in" leave-from-class="transform translate-y-0 opacity-100"
        leave-to-class="transform -translate-y-4 opacity-0">
        <div v-if="isVisible && !isAnimating" :class="[
            'border-l-4 p-4 mb-4 mx-4 flex justify-between rounded-r shadow-sm',
            notificationStyles
        ]">
            <div>
                <p>{{ message }}</p>
                <p v-if="seedsGained" class="mt-1 font-semibold">
                    You gained approximately {{ seedsGained }} seeds while away.
                </p>
            </div>
            <button @click="handleDismiss" class="ml-4 hover:opacity-75 self-start transition-opacity duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clip-rule="evenodd" />
                </svg>
            </button>
        </div>
    </transition>
</template>
