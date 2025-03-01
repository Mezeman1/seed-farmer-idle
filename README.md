# Seed Farmer - A Tick-Based Idle Game

A farming-themed idle game built with Vue 3, TypeScript, and Tailwind CSS where you grow your seed empire through strategic automation and prestige mechanics.

## Core Mechanics

### Tick-Based Progression

- The game operates on a "tick" system, where each tick represents a growth cycle
- Resources are generated automatically at each tick
- Tick duration can be adjusted in debug mode

### Farms

- Purchase different types of farms to generate seeds automatically
- Each farm has a base production rate and cost that scales with purchases
- Farms can be upgraded to increase their efficiency

### Machines

- Unlock machines that provide automation and multipliers
- Machines level up based on specific conditions (purchases or ticks)
- Each machine has unique upgrades that enhance different aspects of gameplay

### Seasons & Prestige

- Complete harvests to earn prestige points
- Start a new season when enough harvests are completed
- Spend prestige points in the Prestige Shop to unlock permanent upgrades
- Each new season provides increased multipliers but resets progress

### Offline Progress

- The game tracks time while you're away
- When you return, you'll receive resources based on your offline time
- Offline progress can be adjusted in settings

### Dark Mode Support

- Full dark mode support across all components
- Theme preference is saved and applied on load
- Toggle between light and dark mode in the settings panel

## Technical Features

- **Vue 3** with Composition API and TypeScript
- **Pinia** for state management with modular stores
- **Tailwind CSS** for styling with dark mode support
- **Decimal.js** for precise number handling
- **LocalStorage** for game persistence

## Development

### Project Setup

```bash
npm install
```

### Compile and Hot-Reload for Development

```bash
npm run dev
```

### Type-Check, Compile and Minify for Production

```bash
npm run build
```

### Run Unit Tests

```bash
npm run test:unit
```

### Run End-to-End Tests

```bash
npm run test:e2e
```

### Lint with ESLint

```bash
npm run lint
```
