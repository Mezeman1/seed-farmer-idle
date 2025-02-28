import Decimal from 'break_infinity.js'

/**
 * Format a Decimal number to a readable string with two decimal points for large numbers
 * @param value The Decimal value to format
 * @returns A formatted string representation
 */
export const formatDecimal = (value: Decimal): string => {
  if (value.lt(1000)) {
    return value.floor().toString()
  } else if (value.lt(1000000)) {
    return `${value.div(1000).toFixed(2)}K`
  } else if (value.lt(1000000000)) {
    return `${value.div(1000000).toFixed(2)}M`
  } else if (value.lt(1000000000000)) {
    return `${value.div(1000000000).toFixed(2)}B`
  } else {
    return value.toExponential(2)
  }
}
