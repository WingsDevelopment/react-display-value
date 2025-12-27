/**
 * Options for {@link formatPercentToViewPercent}.
 * Mirrors {@link FormatPriceNewOptions} but applied to percentage values.
 */
export type FormatPercentOptions = {
  /**
   * Locale for grouping and decimal separators.
   * @default "en-US"
   * @example "de-DE"
   */
  locale?: string

  /**
   * Fraction digits for the **standard** (non-compact) view.
   * Rounding is applied to the PERCENT value (input × 100).
   * @default 2
   * @example 2 // "12.34"
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
   * Compared against the absolute **percent value** (input × 100).
   * @default 1_000_000
   */
  compactThreshold?: number

  /**
   * Display floor for tiny values (after rounding to `standardDecimals`)
   * in **percent units**.
   * If `abs(roundedPct) < minDisplay`, `belowMin = true` and `viewValue`
   * is the floor value (UI can render `"<1.00%"`, etc. by adding the symbol).
   * @default 0.01
   * @example 0.000001
   */
  minDisplay?: number

  /**
   * Display ceiling for large percent values (in **percent units**).
   * If `abs(roundedPct) > maxDisplay`, `aboveMax = true` and `viewValue`
   * is the ceiling value (UI can render `">100%"`, etc. by adding the symbol).
   * @example 100
   */
  maxDisplay?: number
}

/**
 * Result of {@link formatPercentToViewPercent}.
 * Symbol is always "%"; it is never embedded into the strings.
 */
export type ViewPercent = {
  /**
   * True when abs(rounded percent) < minDisplay and input is finite & non-zero.
   * Use this to render sentinel UI like `"<1.00%"` (UI adds "<" + symbol).
   */
  belowMin: boolean

  /**
   * True when abs(rounded percent) > maxDisplay (and maxDisplay provided).
   * Use this to render sentinel UI like `">100%"` (UI adds ">" + symbol).
   */
  aboveMax: boolean

  /** Always "%" (echoed for parity with the number formatter's `symbol` field). */
  symbol: string

  /**
   * Exact **percent value** (input × 100) preserved as a string before formatting.
   * If input was not finite, this is returned for both `viewValue` and `compact`.
   * @example "12.3456"
   */
  originalValue: string

  /**
   * Exact **percent value** (input × 100) preserved as a string before formatting.
   * If input was not finite, this is returned for both `viewValue` and `compact`.
   * @example 12.3456
   */
  originalValueNumber: number

  /**
   * Always-compact percent string (no "%" symbol).
   * Uses `compactDecimals` precision.
   * @example "1.23K", "4M", "0"
   */
  compact: string

  /**
   * Chosen display percent string (no "%" symbol).
   * - If `belowMin` → equals formatted `minDisplay` (e.g., "0.01")
   * - Else if `abs(roundedPct) >= compactThreshold` → compact notation
   * - Else → standard notation using `standardDecimals`
   * Includes a leading "-" for negative values.
   * @example "12.34", "1.23M", "0.01", "-0.50"
   */
  viewValue: string

  /**
   * Sign of the (rounded) percent value, kept separate from `viewValue`
   * so UI can do `sign + viewValue + symbol` or just `viewValue + symbol`.
   * @example "-" // for negatives
   * @example ""  // for zero/positives
   */
  sign: string
}

/**
 * Format a percentage for UI. Input is expected as a **ratio** (0..1),
 * and is internally converted to **percent** by multiplying by 100.
 *
 * Semantics mirror `formatNumberToViewNumber` (for dollars):
 * - `originalValue`: percent value as string (input × 100)
 * - `compact`: always compact (no symbol)
 * - `viewValue`: standard vs compact using `compactThreshold`, tiny floor via `minDisplay`
 * - `%` symbol is returned separately in `symbol`
 *
 * Rounding: the **percent** value is first rounded to `standardDecimals`
 * to determine `belowMin` and the standard `viewValue`. Compact strings
 * use `compactDecimals`.
 *
 * @param input Ratio value as `number` or numeric `string` (e.g., 0.1234 for 12.34%)
 * @param opts  See {@link FormatPercentOptions}
 * @returns {@link FormatPercentResult}
 *
 * @example
 * // 12.3456% (ratio 0.123456)
 * formatPercentToViewPercent(0.123456)
 * // → { belowMin:false, symbol:"%", originalValue:"12.3456", compact:"12.35",
 * //     viewValue:"12.35" }
 *
 * @example
 * // Tiny: 0.000049 (0.0049%)
 * formatPercentToViewPercent(0.000049)
 * // → { belowMin:true, symbol:"%", originalValue:"0.0049", compact:"0",
 * //     viewValue:"0.01" } // UI can render "<0.01%"
 *
 * @example
 * // Huge: 2,500,000% (ratio 25_000)
 * formatPercentToViewPercent(25_000, { compactDecimals: 1 })
 * // → viewValue: "2.5M", compact: "2.5M"
 */
export function formatPercentToViewPercent(
  input?: number | string | null,
  opts: FormatPercentOptions = {},
): ViewPercent {
  const {
    locale = "en-US",
    standardDecimals = 2,
    compactDecimals = 2,
    compactThreshold = 1_000_000, // in percent units
    minDisplay = 0.01, // in percent units
    maxDisplay,
  } = opts

  // Preserve original (in **percent units**) as string
  const numRaw = typeof input === "number" ? input : Number(input)
  const percent = Number.isFinite(numRaw) ? numRaw * 100 : NaN
  const originalValue = Number.isFinite(percent)
    ? String(percent)
    : typeof input === "string"
    ? input
    : String(input)

  // Non-finite → echo original everywhere
  if (!Number.isFinite(percent)) {
    return {
      belowMin: false,
      aboveMax: false,
      symbol: "%",
      originalValue,
      compact: originalValue,
      viewValue: originalValue,
      originalValueNumber: numRaw,
      sign: "",
    }
  }

  // Zero → "0"
  if (percent === 0) {
    const nfCompact = new Intl.NumberFormat(locale, {
      notation: "compact",
      minimumFractionDigits: compactDecimals,
      maximumFractionDigits: compactDecimals,
      useGrouping: true,
    })
    return {
      belowMin: false,
      aboveMax: false,
      symbol: "%",
      originalValue,
      compact: nfCompact.format(0),
      viewValue: "0.00",
      originalValueNumber: numRaw,
      sign: "",
    }
  }

  // Round (percent units) to standardDecimals for comparisons & standard view
  const pow = 10 ** standardDecimals
  const rounded = Math.round(percent * pow) / pow
  let sign = rounded < 0 ? "-" : ""
  const absRounded = Math.abs(rounded)

  const belowMin = absRounded < minDisplay
  const aboveMax =
    typeof maxDisplay === "number" && Number.isFinite(maxDisplay)
      ? absRounded > maxDisplay
      : false

  // Build formatters (percent **numbers**, no symbol)
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

  const compact = `${nfCompact.format(Math.abs(percent))}`

  let viewValue: string
  if (belowMin) {
    const floorText = new Intl.NumberFormat(locale, {
      notation: "standard",
      minimumFractionDigits: standardDecimals,
      maximumFractionDigits: standardDecimals,
      useGrouping: true,
    }).format(minDisplay)

    const originalWasNegative = percent < 0
    if (originalWasNegative && !sign) {
      sign = "-"
    }

    viewValue = `${floorText}`
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
    belowMin,
    aboveMax,
    symbol: "%",
    originalValue,
    compact,
    viewValue,
    originalValueNumber: numRaw,
    sign,
  }
}
