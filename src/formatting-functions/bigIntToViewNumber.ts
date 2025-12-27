import { formatUnits } from "viem"
import {
  FormatPriceNewOptions,
  ViewNumber,
  formatNumberToViewNumber,
} from "./numberToViewNumber.js"

/**
 * Convert a base-units USD amount (e.g., 8-decimals oracle value) to a human-readable string,
 * then format it for UI via {@link formatNumberToViewNumber}.
 *
 * Workflow:
 * 1) Coerce `input` to `bigint`.
 * 2) `formatUnits(input, decimals)` → human string (e.g., "1234.5678").
 * 3) Pass that into `formatNumberToViewNumber` to produce `viewValue`, `compact`, etc.
 *
 * Notes:
 * - `decimals` is **required** (throws if undefined). Typical USD price feeds use **8**.
 * - `input` must be base units (bigint or bigint-like string).
 * - `symbol` is returned separately (default "$") and is **not** embedded in numeric strings.
 *
 * @param input     Base-units integer (e.g., "wei-style" USD with 8 decimals), bigint or bigint-like string.
 * @param decimals  Decimal places in `input` (e.g., **8** for many USD oracles). **Required.**
 * @param symbol    Currency symbol to echo in the result (default: "$").
 * @param opts      Options forwarded to {@link formatNumberToViewNumber}.
 *
 * @returns {@link FormatPriceNewResult} plus the `decimals` used:
 * ```ts
 * {
 *   belowMin: boolean;     // true if |value| < minDisplay (UI should render "<$0.01", etc.)
 *   symbol: string;        // echo of `symbol`
 *   originalValue: string; // exact human string from formatUnits
 *   compact: string;       // always-compact numeric string (no symbol)
 *   viewValue: string;     // chosen display numeric string (no symbol)
 *   decimals: number;      // echo of `decimals`
 * }
 * ```
 *
 * @throws {Error} If `decimals` is undefined.
 * @throws {Error} If `input` cannot be coerced to bigint.
 *
 * @example
 * // Common case: USD with 8 decimals (e.g., price feed)
 * // 123_456_789 base units @ 8 dp → 1_234.56789 USD
 * formatBigIntToViewNumber(123_456_789n, 8, "$")
 * // => {
 * //   belowMin: false,
 * //   symbol: "$",
 * //   originalValue: "1234.56789",
 * //   compact: "1.23K",            // always compact string
 * //   viewValue: "1,234.57",       // standard with grouping (abs < 1,000,000)
 * //   decimals: 8
 * // }
 *
 * @example
 * // Tiny USD amount (below default minDisplay of 0.000001)
 * // 500 base units @ 8 dp → 0.000005 USD
 * formatBigIntToViewNumber("500", 8, "$")
 * // => {
 * //   belowMin: true,
 * //   symbol: "$",
 * //   originalValue: "0.000005",
 * //   compact: "0",                 // compact for tiny values
 * //   viewValue: "0.000001",        // UI can render "<$0.000001"
 * //   decimals: 8
 * // }
 *
 * @example
 * // Large USD amount (compact threshold reached for viewValue)
 * // 12_345_678_900_000 base units @ 8 dp → 123,456.789 USD  (not compact yet)
 * formatBigIntToViewNumber(12_345_678_900_000n, 8, "$")
 * // => viewValue: "123,456.79", compact: "123.46K"
 *
 * @example
 * // Crossing 1,000,000 → compact viewValue
 * // 100_000_000_000_000 base units @ 8 dp → 1,000,000.00000000 USD
 * formatBigIntToViewNumber(100_000_000_000_000n, 8, "$")
 * // => viewValue: "1.00M", compact: "1.00M"
 */
export function formatBigIntToViewNumber(
  input: bigint | string,
  decimals: number | undefined,
  symbol = "$",
  opts: FormatPriceNewOptions = {}
): ViewNumber | undefined {
  if (decimals == null || input == null) {
    return undefined
  }

  let base: bigint
  try {
    base = typeof input === "bigint" ? input : BigInt(input)
  } catch {
    throw new Error("formatBigIntToViewNumber: `input` must be a bigint or bigint-like string")
  }

  // Human-readable string from base units (e.g., "1234.5678")
  const human = formatUnits(base, decimals)

  // Delegate to numeric formatter (keeps symbol separate from strings)
  const res = formatNumberToViewNumber(human, symbol, opts)

  return {
    ...res,
    decimals,
  }
}
