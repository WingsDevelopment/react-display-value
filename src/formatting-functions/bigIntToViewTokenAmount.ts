import { formatUnits } from "viem"

export const UNDEFINED_VIEW_VALUE = "-"

/**
 * Input shape for bigint-based token amounts coming from fetch layers.
 *
 * Use this to carry raw on-chain values (base units) and minimal token metadata
 * into the formatter. Precision is derived from `decimals`.
 */
export interface FetchBigInt {
  /**
   * On-chain/base units amount.
   * Accepts bigint, decimal string, or number-like.
   * @example 1234567n        // e.g., 1.234567 USDC (6 dp)
   * @example "987000000000"  // decimal string
   */
  bigIntValue?: bigint | string | number | null
  /**
   * Optional asset symbol (pass-through, not used for formatting).
   * @example "USDC"
   */
  symbol?: string | null
  /**
   * Token decimals (e.g., 6 for USDC, 18 for ETH).
   * Determines the human value via `formatUnits(bigint, decimals)`.
   * @example 6
   */
  decimals?: number | null
}

/**
 * Final display shape for UI consumption.
 *
 * Notes:
 * - `viewValue` never includes a currency symbol — append it in UI if needed.
 * - `compact` is **always** compact notation (Intl “compact”), independent of `viewValue`.
 * - `belowMin` is true only when a `minDisplay` threshold is provided and the
 *   absolute value is non-zero but below that threshold. UI may render a sentinel like `"<"`
 *   when `belowMin === true`.
 */
export interface ViewBigInt {
  /** Exact human string from `formatUnits` (no grouping, as produced by viem). */
  originalValue?: string | undefined
  /**
   * Chosen standard display string (no symbol).
   * - Fixed-decimals mode when `config.decimals` is provided
   * - Otherwise, magnitude rules (tiny / <10 / <1M / compact)
   */
  viewValue: string
  /**
   * Always-compact display string (no symbol), using `compactDecimals`.
   * @example "1.23K", "4M", "-9.9B", "0"
   */
  compact: string
  /** Original bigint value (normalized to bigint if provided). */
  bigIntValue?: bigint | undefined
  /** Asset symbol (pass-through). */
  symbol?: string | null
  /** Token decimals (pass-through). */
  decimals?: number | null

  /**
   * True only when `minDisplay` is provided AND `0 < |value| < minDisplay`.
   * If `minDisplay` is `undefined`, this is always `false`.
   */
  belowMin: boolean

  /**
   * True when `maxDisplay` is provided AND |value| > maxDisplay.
   * UI can render this as `">$100"`.
   */
  aboveMax: boolean

  /**
   * Sign of the (rounded) value, kept separate from `viewValue`
   * so UI can do `sign + symbol + viewValue` or `symbol + sign + viewValue`.
   * @example "-" // for negatives
   * @example "" // for zero/positives
   */
  sign?: string
}

/**
 * Formatting configuration for {@link formatBigIntToViewTokenAmount}.
 */
export interface FormatConfig {
  /**
   * Locale for grouping/decimal separators.
   * @default "en-US"
   * @example "de-DE"
   */
  locale?: string

  /**
   * Force fixed fraction digits in *viewValue* (standard notation).
   * Overrides the magnitude rules.
   * @example { decimals: 4 } // "1,234.5678"
   */
  decimals?: number

  /**
   * Placeholder used when value or decimals are missing.
   * @default "-"
   */
  placeholder?: string

  /**
   * Maximum fraction digits when |value| < 10, with **no grouping**.
   * @default 6
   * @example 6 // "0.123456"
   */
  singleDigitDecimals?: number

  /**
   * Maximum fraction digits when 10 ≤ |value| < 1,000,000, with **grouping**.
   * @default 2
   * @example 2 // "12,345.68"
   */
  twoDigitDecimals?: number

  /**
   * Fraction digits for **compact** outputs (both the large-band case and the `compact` field).
   * @default 2
   * @example 0 // "1M"
   */
  compactDecimals?: number

  /**
   * Optional tiny sentinel floor:
   * - If provided and `0 < |value| < minDisplay`, then:
   *    - `belowMin = true`
   *    - `viewValue` is the formatted floor value (no "<")
   * - If **undefined** (default): `belowMin` is always `false` and no floor is applied.
   *
   * UI may prepend "<" when `belowMin === true`.
   *
   * @default undefined
   * @example 0.000001
   */
  minDisplay?: number

  /**
   * Optional tiny sentinel floor:
   * - If provided and `0 < |value| < minDisplay`, then:
   *    - `belowMin = true`
   *    - `viewValue` is the formatted floor value (no "<")
   * - If **undefined** (default): `belowMin` is always `false` and no floor is applied.
   *
   * UI may prepend "<" when `belowMin === true`.
   *
   * @default undefined
   * @example 0.000001
   */
  maxDisplay?: number
}

/**
 * Build a compact number string.
 * - Always uses Intl "compact" notation.
 * - Returns uppercase suffix (e.g., "1.23M").
 *
 * @param n        Number to format (already human value, not base units)
 * @param locale   BCP-47 locale (e.g., "en-US")
 * @param decimals Fraction digits (min/max)
 * @returns e.g., "1.23K", "4M", "-9.9B"
 */
function formatCompact(n: number, locale: string, decimals = 2): string {
  const sign = n < 0 ? "-" : ""
  const core = new Intl.NumberFormat(locale, {
    notation: "compact",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
  })
    .format(Math.abs(n))
    .toUpperCase()
  return `${sign}${core}`
}

/**
 * Format a number according to magnitude rules (standard view):
 *
 * - If `minDisplay` is provided and `0 < |n| < minDisplay`:
 *     return the min as the display value (no "<"), and set `belowMin = true`
 * - If `|n| < 10`:
 *     show up to `singleDigitDecimals` (no grouping)
 * - If `|n| < 1,000,000`:
 *     show up to `twoDigitDecimals` (with grouping)
 * - Else:
 *     show compact with `compactDecimals` (uppercase suffix)
 *
 * @returns `{ viewValue, belowMin }`
 */
function formatViewValueByMagnitude(
  n: number,
  locale: string,
  opts: {
    singleDigitDecimals: number
    twoDigitDecimals: number
    compactDecimals: number
    minDisplay?: number | undefined
    maxDisplay?: number | undefined
  }
): { viewValue: string; belowMin: boolean; aboveMax: boolean; sign: string } {
  const { singleDigitDecimals, twoDigitDecimals, compactDecimals, minDisplay, maxDisplay } = opts

  const abs = Math.abs(n)
  const sign = n < 0 ? "-" : ""
  const hasMin = typeof minDisplay === "number" && Number.isFinite(minDisplay)
  const hasMax = typeof maxDisplay === "number" && Number.isFinite(maxDisplay)

  // tiny floor (if provided)
  if (hasMin && abs > 0 && abs < (minDisplay as number)) {
    const floor = (minDisplay as number).toLocaleString(locale, {
      minimumFractionDigits: singleDigitDecimals,
      maximumFractionDigits: singleDigitDecimals,
      useGrouping: false,
    })
    return {
      viewValue: `${sign}${floor}`,
      belowMin: true,
      aboveMax: false,
      sign,
    }
  }

  if (hasMax && abs > (maxDisplay as number)) {
    const ceil = (maxDisplay as number).toLocaleString(locale, {
      notation: "standard",
      minimumFractionDigits: 0,
      maximumFractionDigits: twoDigitDecimals,
      useGrouping: true,
    })
    return { viewValue: ceil, belowMin: false, aboveMax: true, sign }
  }

  // |n| < 10 → up to singleDigitDecimals, no grouping
  if (abs < 10) {
    const s = new Intl.NumberFormat(locale, {
      notation: "standard",
      minimumFractionDigits: 0,
      maximumFractionDigits: singleDigitDecimals,
      useGrouping: false,
    }).format(abs)
    return { viewValue: `${sign}${s}`, belowMin: false, aboveMax: false, sign }
  }

  // |n| < 1,000,000 → grouping + up to twoDigitDecimals
  if (abs < 1_000_000) {
    const s = new Intl.NumberFormat(locale, {
      notation: "standard",
      minimumFractionDigits: 0,
      maximumFractionDigits: twoDigitDecimals,
      useGrouping: true,
    }).format(abs)
    return { viewValue: `${sign}${s}`, belowMin: false, aboveMax: false, sign }
  }

  // Otherwise → compact with compactDecimals
  const compact = new Intl.NumberFormat(locale, {
    notation: "compact",
    minimumFractionDigits: compactDecimals,
    maximumFractionDigits: compactDecimals,
    useGrouping: true,
  })
    .format(abs)
    .toUpperCase()

  return {
    viewValue: `${sign}${compact}`,
    belowMin: false,
    aboveMax: false,
    sign,
  }
}

/**
 * Convert an on-chain bigint amount to a UI-friendly set of strings.
 *
 * ### What it does
 * 1) Uses `viem`’s `formatUnits(bigint, decimals)` to compute the exact human value (`originalValue`).
 * 2) Produces:
 *    - `viewValue`: standard display following either:
 *        a) **Fixed-decimals mode** (if `config.decimals` provided), or
 *        b) **Magnitude rules**:
 *           - If `minDisplay` provided and `0 < |value| < minDisplay`:
 *               `belowMin = true` and `viewValue` is the formatted floor (no "<")
 *           - Else if `|value| < 10`:
 *               up to `singleDigitDecimals` (no grouping)
 *           - Else if `|value| < 1,000,000`:
 *               up to `twoDigitDecimals` (with grouping)
 *           - Else:
 *               compact with `compactDecimals`
 *    - `compact`: always compact (Intl “compact”) with `compactDecimals`
 *    - `belowMin`: tiny-value flag (only true when `minDisplay` is provided)
 *
 * ### Notable behaviors
 * - If `data.bigIntValue` **or** `data.decimals` is missing → returns placeholders; `symbol/decimals` pass through.
 * - If the human value cannot be represented as a finite JS number → falls back to `originalValue` for all views.
 * - `0` is rendered as `"0"` (never belowMin).
 *
 * ### Examples
 * ```ts
 * // Basic (USDC-like: 1_234_567 base units @ 6 dp)
 * bigIntToViewTokenAmount(
 *   { bigIntValue: 1234567n, symbol: "USDC", decimals: 6 }
 * )
 * // => {
 * //   originalValue: "1.234567",
 * //   viewValue: "1.234567", // |value| < 10 → up to 6 decimals
 * //   compact: "1.23",
 * //   belowMin: false,
 * //   ...
 * // }
 *
 * // Tiny values with floor (minDisplay provided)
 * bigIntToViewTokenAmount(
 *   { bigIntValue: 5n, symbol: "USDC", decimals: 9 },       // 0.000000005
 *   { minDisplay: 0.000001, singleDigitDecimals: 6 }
 * )
 * // => {
 * //   viewValue: "0.000001",  // floor applied (no "<" here)
 * //   compact: "0",
 * //   belowMin: true          // UI can render "<" prefix when true
 * // }
 *
 * // Tiny values without floor (minDisplay omitted)
 * bigIntToViewTokenAmount(
 *   { bigIntValue: 5n, symbol: "USDC", decimals: 9 },       // 0.000000005
 *   { singleDigitDecimals: 6 }                              // minDisplay undefined
 * )
 * // => {
 * //   viewValue: "0.000000",  // regular magnitude rules (no floor)
 * //   belowMin: false
 * // }
 *
 * // Large values (compact band)
 * bigIntToViewTokenAmount(
 *   { bigIntValue: 123456789000000n, symbol: "ETH", decimals: 6 }
 * )
 * // => {
 * //   originalValue: "123456789000.000",
 * //   viewValue: "123.46B",
 * //   compact: "123.46B",
 * //   belowMin: false
 * // }
 *
 * // Forcing fixed decimals (e.g., 4) regardless of magnitude
 * bigIntToViewTokenAmount(
 *   { bigIntValue: 12345n, symbol: "FOO", decimals: 3 },
 *   { decimals: 4 }
 * )
 * // => {
 * //   originalValue: "12.345",
 * //   viewValue: "12.3450", // fixed 4 decimals
 * //   compact: "12.35"
 * // }
 * ```
 *
 * @param data   Source bigint + token metadata
 * @param config Formatting config (locale, per-band decimals, optional tiny floor)
 * @returns ViewBigInt ready for UI
 */
export function formatBigIntToViewTokenAmount(
  data?: FetchBigInt,
  config: FormatConfig = {}
): ViewBigInt | undefined {
  const {
    placeholder = UNDEFINED_VIEW_VALUE,
    locale = "en-US",
    decimals: fixedDec,
    singleDigitDecimals = 6,
    twoDigitDecimals = 2,
    compactDecimals = 2,
    minDisplay,
    maxDisplay,
  } = config

  // missing value or decimals → placeholders; still pass through symbol/decimals
  if (data?.bigIntValue == null || data.decimals == null) {
    return undefined
  }

  // normalize inputs
  const tokenDecimals = data.decimals
  const symbol = data.symbol ?? null
  const bigIntValue =
    typeof data.bigIntValue === "bigint" ? data.bigIntValue : BigInt(String(data.bigIntValue))

  // exact human string from viem
  const raw = formatUnits(bigIntValue, tokenDecimals)
  const num = Number(raw)

  // If not finite in JS number (extremely large/precise), fall back to raw strings.
  if (!Number.isFinite(num)) {
    return {
      originalValue: raw,
      viewValue: raw,
      compact: raw,
      bigIntValue,
      symbol,
      decimals: tokenDecimals,
      belowMin: false,
      aboveMax: false,
    }
  }

  // zero
  if (num === 0) {
    const nfCompact = new Intl.NumberFormat(locale, {
      notation: "compact",
      minimumFractionDigits: compactDecimals,
      maximumFractionDigits: compactDecimals,
      useGrouping: true,
    })
    return {
      originalValue: raw,
      viewValue: "0.00",
      compact: nfCompact.format(0),
      bigIntValue,
      symbol,
      decimals: tokenDecimals,
      belowMin: false,
      aboveMax: false,
    }
  }

  // viewValue: fixed decimals or magnitude rules
  let viewValue: string
  let belowMin = false
  let sign = num < 0 ? "-" : ""
  let aboveMax = false

  if (typeof fixedDec === "number") {
    const sign = num < 0 ? "-" : ""
    const abs = Math.abs(num)
    const std = new Intl.NumberFormat(locale, {
      notation: "standard",
      minimumFractionDigits: fixedDec,
      maximumFractionDigits: fixedDec,
      useGrouping: true,
    }).format(abs)
    viewValue = `${sign}${std}`
    if (typeof minDisplay === "number" && Number.isFinite(minDisplay)) {
      belowMin = abs > 0 && abs < minDisplay
      if (belowMin) {
        // mirror flooring for parity with magnitude path
        const floor = (minDisplay as number).toLocaleString(locale, {
          minimumFractionDigits: singleDigitDecimals,
          maximumFractionDigits: singleDigitDecimals,
          useGrouping: false,
        })
        viewValue = `${sign}${floor}`
      }
    }
  } else {
    const res = formatViewValueByMagnitude(num, locale, {
      singleDigitDecimals,
      twoDigitDecimals,
      compactDecimals,
      minDisplay: minDisplay,
      maxDisplay: maxDisplay,
    })
    viewValue = res.viewValue
    belowMin = res.belowMin
    aboveMax = res.aboveMax
    sign = res.sign
  }

  const compact = formatCompact(num, locale, compactDecimals)

  return {
    originalValue: raw,
    viewValue,
    compact,
    bigIntValue,
    symbol,
    decimals: tokenDecimals,
    belowMin,
    aboveMax,
    sign,
  }
}
