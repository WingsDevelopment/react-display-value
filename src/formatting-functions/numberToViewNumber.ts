/**
 * Options for {@link formatNumberToViewNumber}.
 */
export type FormatPriceNewOptions = {
  /**
   * Locale for grouping and decimal separators.
   * @default "en-US"
   * @example "de-DE"
   */
  locale?: string

  /**
   * Fraction digits for the **standard** (non-compact) view.
   * The input is rounded to this precision before comparisons/render.
   * @default 2
   * @example 2 // "1,234.57"
   */
  standardDecimals?: number

  /**
   * Fraction digits for **compact** notation (both `viewValue` when compact
   * and the always-compact `compact` field).
   * @default 2
   * @example 0 // "1M"
   */
  compactDecimals?: number

  /**
   * Threshold at/above which `viewValue` switches to compact notation.
   * Values below this threshold render in standard notation.
   * @default 1_000_000
   * @example 1_000_000
   */
  compactThreshold?: number

  /**
   * Display floor for tiny values (after rounding to `standardDecimals`).
   * If `abs(rounded) < minDisplay`, `belowMin = true` and `viewValue`
   * is the floor value (UI can render `"<$0.01"` etc.).
   * @default 0.01
   * @example 0.000001
   */
  minDisplay?: number

  /**
   * Optional upper display cap for UI to render e.g. ">$100".
   * This is only surfaced as a formatted string on the result;
   * function itself does NOT clamp the rendered value.
   * @example 100
   */
  maxDisplay?: number
}

/**
 * Result of {@link formatNumberToViewNumber}.
 */
export type ViewNumber = {
  /**
   * True when `abs(rounded) < minDisplay` (and input is non-zero).
   * Use this to render sentinel UI like `"<$0.01"`.
   */
  belowMin?: boolean

  /**
   * True when `maxDisplay` provided and `abs(rounded) > maxDisplay`.
   * Use this to render sentinel UI like `">$100"`.
   */
  aboveMax?: boolean

  /**
   * Echo of the provided `symbol`. Never embedded into `viewValue` or `compact`.
   * @example "$"
   */
  symbol?: string

  /**
   * Exact original input preserved as a string (before rounding/format).
   * If input was not a finite number, this is returned for both `viewValue` and `compact`.
   * @example "1234.5"
   */
  originalValue?: string

  /**
   * Exact original input preserved as a string (before rounding/format).
   * If input was not a finite number, this is returned for both `viewValue` and `compact`.
   * @example 1234.5
   */
  originalValueNumber?: number

  /**
   * Always-compact numeric string (never includes the currency symbol).
   * Uses `compactDecimals` precision.
   * @example "1.23K", "4M", "0"
   */
  compact?: string

  /**
   * Chosen display numeric string (never includes the currency symbol).
   * - If `belowMin` → equals the `minDisplay` formatted (e.g., "0.01")
   * - Else if `abs(rounded) >= compactThreshold` → compact notation
   * - Else → standard notation using `standardDecimals`
   * Includes a leading "-" for negative values.
   * @example "1,234.57", "1.23M", "0.01", "-12.30"
   */
  viewValue?: string

  /**
   * Sign of the (rounded) value, kept separate from `viewValue`
   * so UI can do `sign + symbol + viewValue` or `symbol + sign + viewValue`.
   * @example "-" // for negatives
   * @example "" // for zero/positives
   */
  sign?: string

  decimals?: number
}

/**
 * Format a numeric value for UI:
 * - Preserves the **original input** as string (`originalValue`)
 * - Computes:
 *   - `compact`: **always** compact string (no currency symbol)
 *   - `viewValue`: standard vs compact depending on `compactThreshold`
 *     and a tiny-value floor using `minDisplay`
 * - Currency `symbol` is returned separately (never embedded in strings)
 *
 * Rounding: the input is first rounded to `standardDecimals` to determine
 * `belowMin` and to produce the standard `viewValue`. Compact strings use
 * `compactDecimals`.
 *
 * @param input   The numeric value as `number` or numeric `string`
 * @param symbol  Currency/token symbol echoed in the result (default: "$")
 * @param opts    See {@link FormatPriceNewOptions}
 *
 * @returns {@link FormatPriceNewResult}
 *
 * @example
 * // Standard formatting (< 1M)
 * formatNumberToViewNumber(1234.567, "$")
 * // → {
 * //   belowMin: false,
 * //   symbol: "$",
 * //   originalValue: "1234.567",
 * //   compact: "1.23K",
 * //   viewValue: "1,234.57"
 * // }
 *
 * @example
 * // Tiny values (below minDisplay, default 0.01)
 * formatNumberToViewNumber(0.0049, "$")
 * // → {
 * //   belowMin: true,
 * //   symbol: "$",
 * //   originalValue: "0.0049",
 * //   compact: "0",
 * //   viewValue: "0.01" // UI can render "<$0.01"
 * // }
 *
 * @example
 * // Large values (>= compactThreshold → compact viewValue)
 * formatNumberToViewNumber(1_000_000, "$")
 * // → viewValue: "1.00M", compact: "1.00M"
 *
 * @example
 * // Locale + precision overrides
 * formatNumberToViewNumber(1234.5, "€", { locale: "de-DE", standardDecimals: 3 })
 * // → viewValue: "1.234,500", compact: "1,23 Tsd."
 */
export function formatNumberToViewNumber(
  input?: number | string | null,
  symbol = "$",
  opts: FormatPriceNewOptions = {}
): ViewNumber | undefined {
  if (input == null) {
    return undefined
  }

  const {
    locale = "en-US",
    standardDecimals = 2,
    compactDecimals = 2,
    compactThreshold = 1_000_000,
    minDisplay = 0.01,
    maxDisplay,
  } = opts

  const originalValue = typeof input === "string" ? input : String(input)

  // Parse number (tolerate string input)
  const num = typeof input === "number" ? input : Number(input)
  if (!Number.isFinite(num)) {
    // fall back to showing original as-is
    return {
      belowMin: false,
      aboveMax: false,
      symbol,
      originalValue,
      compact: originalValue,
      viewValue: originalValue,
      originalValueNumber: num,
    }
  }

  // zero → "0"
  if (num === 0) {
    const nfCompact = new Intl.NumberFormat(locale, {
      notation: "compact",
      minimumFractionDigits: compactDecimals,
      maximumFractionDigits: compactDecimals,
      useGrouping: true,
    })
    return {
      belowMin: false,
      aboveMax: false,
      symbol,
      originalValue,
      compact: nfCompact.format(0),
      viewValue: "0.00",
      originalValueNumber: num,
    }
  }

  // round first (parity with old)
  const pow = 10 ** standardDecimals
  const rounded = Math.round(num * pow) / pow
  const sign = rounded < 0 ? "-" : ""
  const absRounded = Math.abs(rounded)

  const belowMin = absRounded < minDisplay

  // build formatters
  const nfStd = new Intl.NumberFormat(locale, {
    notation: "standard",
    minimumFractionDigits: standardDecimals,
    maximumFractionDigits: standardDecimals,
    useGrouping: true,
  })

  const nfCompact = new Intl.NumberFormat(locale, {
    notation: "compact",
    minimumFractionDigits: compactDecimals,
    maximumFractionDigits: compactDecimals,
    useGrouping: true,
  })

  const compact = `${nfCompact.format(Math.abs(num))}`
  const aboveMax = typeof maxDisplay === "number" ? absRounded > maxDisplay : false

  let viewValue: string
  if (belowMin) {
    const floorText = new Intl.NumberFormat(locale, {
      notation: "standard",
      minimumFractionDigits: standardDecimals,
      maximumFractionDigits: standardDecimals,
      useGrouping: true,
    }).format(minDisplay)
    viewValue = `${floorText}` // e.g. "0.01"
  } else if (aboveMax && typeof maxDisplay === "number") {
    const ceilText = new Intl.NumberFormat(locale, {
      notation: "standard",
      minimumFractionDigits: standardDecimals,
      maximumFractionDigits: standardDecimals,
      useGrouping: true,
    }).format(maxDisplay)
    viewValue = ceilText
  } else if (absRounded >= compactThreshold) {
    viewValue = `${nfCompact.format(absRounded)}`
  } else {
    viewValue = `${nfStd.format(absRounded)}`
  }

  return {
    sign,
    belowMin,
    aboveMax,
    symbol,
    originalValue,
    compact,
    viewValue,
    originalValueNumber: num,
  }
}
