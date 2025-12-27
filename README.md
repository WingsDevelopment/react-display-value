# react-display-value

UI helpers for **displaying token amounts, USD values, percentages, and formatted numbers** in React. Ship consistent, production-ready number displays without re-solving formatting edge cases.

- **Drop-in components**: `<DisplayValue />`, `<DisplayTokenAmount />`, `<DisplayTokenValue />`, `<DisplayPercentage />`
- **Formatting utilities**: bigints, numbers, percentages, token amounts
- **React Query friendly**: accepts query state directly for effortless loading/error handling
- **Great for per-value fetches**: ideal when individual cells/values are fetched separately and must gracefully handle loading/error/success; still flexible for other patterns
- **UX baked in**: truncation + tooltip, loading states, error states, min/max sentinel values, compact rules
- **Composable**: swap tooltip/loader/truncate/error primitives with your own design system

---

## Table of Contents

- [Installation](#installation)
- [Why This Library](#why-this-library)
- [Quick Start](#quick-start)
- [Playground](#playground)
- [Examples](#examples)
- [Components](#components)
  - [DisplayValue](#DisplayValue)
  - [DisplayTokenAmount](#displaytokenamount)
  - [DisplayTokenValue](#displaytokenvalue)
  - [DisplayPercentage](#displaypercentage)
- [Formatting Functions](#formatting-functions)
  - [formatBigIntToViewTokenAmount](#formatbiginttoviewtokenamount)
  - [formatBigIntToViewNumber](#formatbiginttoviewnumber)
  - [formatNumberToViewNumber](#formatnumbertoviewnumber)
  - [formatPercentToViewPercent](#formatpercenttoviewpercent)
- [Truncation & Tooltips](#truncation--tooltips)
- [Injecting Custom Primitives](#injecting-custom-primitives)
- [API Exports](#api-exports)
- [Types (common)](#types-common)
- [Contributing](#contributing)
- [License](#license)

---

## Installation

```bash
npm install react-display-value
```

Peer deps:

```tsx
"peerDependencies": {
    "clsx": "^2.0.0",
    "react": "^17.0.0 || ^18.0.0 || ^19.0.0",
    "react-dom": "^17.0.0 || ^18.0.0 || ^19.0.0",
    "tailwind-merge": "^3.0.0",
    "viem": "^2.0.0"
  },
```

---

## Tailwind Setup (required for default styles)

This library ships Tailwind utility class names in the components. Your Tailwind build must scan the package files so those classes are generated.

Tailwind v4 (global CSS):

```css
@source "../node_modules/react-display-value/**/*.{js,ts,jsx,tsx}";
```

Tailwind v3 (tailwind.config):

```js
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/react-display-value/**/*.{js,ts,jsx,tsx}",
  ],
}
```

If you do not want to include library styles, override the primitives (tooltip/loader/truncate/error) and className props with your own components/CSS.

---

## Why This Library

Displaying numbers in finance/crypto UIs is tricky: huge/small magnitudes, token decimals, compact vs grouped output, `<`/`>` sentinel UX, loading/empty/error states, locale differences, and accessible truncation. This library centralizes those concerns into:

- Reusable components for consistent UI
- Robust formatters you can use standalone

---

## Quick Start

```tsx
import {
  DisplayTokenValue,
  DisplayTokenAmount,
  DisplayPercentage,
  formatBigIntToViewTokenAmount,
} from "react-display-value"

export function PositionRow({
  priceUsd,
  tokenAmountBig,
  tokenSymbol,
  tokenDecimals,
}: {
  priceUsd: number
  tokenAmountBig: bigint
  tokenSymbol: string
  tokenDecimals: number
}) {
  const amt = formatBigIntToViewTokenAmount(
    { bigIntValue: tokenAmountBig, symbol: tokenSymbol, decimals: tokenDecimals },
    { minDisplay: 0.000001 }
  )

  return (
    <div className="flex items-center gap-3">
      <DisplayTokenAmount viewValue={amt.viewValue} symbol={tokenSymbol} />
      <DisplayTokenValue viewValue={priceUsd.toLocaleString()} />
      <DisplayPercentage viewValue="12.34" />
    </div>
  )
}
```

## Playground

Try the interactive CodeSandbox:

[Open playground →](https://codesandbox.io/p/devbox/react-typescript-tailwind-playground-forked-6fwqc2?workspaceId=ws_H7quvJvec4oBuBRJyarKm5)

## Examples

### Example — React Query Integration (handles loading/error/success out of the box)

```tsx
import { useQuery } from "@tanstack/react-query"
import { DisplayTokenValue } from "react-display-value"

function PriceCell({ tokenId }: { tokenId: string }) {
  const { data, ...restQueryState } = useQuery({
    queryKey: ["price", tokenId],
    queryFn: () => fetch(`/api/price/${tokenId}`).then((r) => r.json()),
  })

  return (
    <DisplayTokenValue
      // spread the query response so loading/error states are handled automatically
      {...restQueryState}
      {...data}
      // everything is customizable: swap the loader/tooltip/truncate components, tweak widths, etc.
    />
  )
}
```

Why it works so well:

- `DisplayTokenValue` understands `isLoading`, `isError`, and `error` from React Query (or any source), rendering skeletons/spinners or error tooltips automatically.
- Skeletons use the component’s typography height, so they align with surrounding text.
- You can override any primitive (tooltip, loader, truncate, error icon) to match your design system.

### Example Set 1 — Token Value ($ 1,234.56, symbol before)

```tsx
import { formatBigIntToViewNumber } from "react-display-value"

// Example: price oracle returns bigint 123456789 with 8 decimals = 1.23456789
const out = formatBigIntToViewNumber(
  123_456_789n,
  8,
  "$",
  { standardDecimals: 2 }
)

// out.viewValue   → "1.23"
// out.compact     → "1.23"
// out.symbol      → "$"
// out.belowMin    → false
// out.aboveMax    → false
// out.sign        → "" (positive)
// out.decimals    → 8

// UI renders:
<span class="inline-flex items-center">
  <span class="inline">
    <span class="group relative inline-flex items-baseline focus:outline-none" tabindex="-1">
      <span class="truncate" style="max-width: 6ch;">$</span>
    </span>
  </span>
  <span class="inline tabular-nums">1.23</span>
</span>
```

### Example Set 2 — Token Value with Indicator < (from Story “$ before with indicator”)

```tsx
import { formatNumberToViewNumber } from "react-display-value"

const out = formatNumberToViewNumber(0.0, "$")

// out.viewValue   → "0.00"
// out.symbol      → "$"
// out.sign        → ""
// out.belowMin?   → false

// UI:
<span class="inline-flex items-center">
  <span class="inline-flex items-center">&lt;</span>
  <span class="inline">
    <span class="group relative inline-flex items-baseline focus:outline-none" tabindex="-1">
      <span class="truncate" style="max-width: 8ch;">$</span>
    </span>
  </span>
  <span class="inline tabular-nums">0.00</span>
</span>
```

### Example Set 3 — Token Amount (987.654 USDC, symbol after)

```tsx
import { formatBigIntToViewTokenAmount } from "react-display-value"

const out = formatBigIntToViewTokenAmount(
  { bigIntValue: 987654000n, decimals: 3, symbol: "USDC" }
)

// out.viewValue  → "987.654"
// out.compact    → "987.65"
// out.symbol     → "USDC"
// out.sign       → ""
// out.belowMin   → false

// UI:
<span class="inline-flex items-center">
  <span class="inline tabular-nums">987.654</span>
  <span class="inline ml-0.5">
    <span class="group relative inline-flex items-baseline focus:outline-none">
      <span class="truncate" style="max-width: 8ch;">USDC</span>
    </span>
  </span>
</span>
```

### Example Set 4 — Token Amount with Long Symbol (truncation + tooltip)

```tsx
const out = formatBigIntToViewTokenAmount(
  { bigIntValue: 12_345n, decimals: 0, symbol: "SUPERLONGTOKEN-2025" }
)

// out.viewValue → "12,345"
// out.symbol    → "SUPERLONGTOKEN-2025"
// out.compact   → "12.3K"

// UI:
<span class="inline-flex items-center">
  <span class="inline tabular-nums">12,345</span>
  <span class="inline ml-0.5">
    <span class="group relative inline-flex items-baseline focus:outline-none" tabindex="0" aria-label="SUPERLONGTOKEN-2025">
      <span class="truncate" style="max-width: 8ch;">SUPERLON…</span>
      <span role="tooltip"
            class="pointer-events-none absolute -top-[5px] -left-2 z-[99999]
                   rounded-md border border-background-500 bg-background-600
                   px-2 py-1 whitespace-pre shadow-[var(--tooltip-shadow)]
                   opacity-0 transition-opacity duration-100
                   group-focus-within:opacity-100 group-hover:opacity-100">
          SUPERLONGTOKEN-2025
      </span>
    </span>
  </span>
</span>
```

### Example Set 5 — Percentage (9.54%)

```tsx
import { formatPercentToViewPercent } from "react-display-value"

const out = formatPercentToViewPercent(0.0954)

// out.viewValue → "9.54"
// out.symbol    → "%"
// out.compact   → "9.54"
// out.sign      → ""

// UI rendered:
<span class="inline-flex items-center">
  <span class="inline tabular-nums">9.54</span>
  <span class="inline">
    <span class="group relative inline-flex items-baseline focus:outline-none">
      <span class="truncate" style="max-width: 8ch;">%</span>
    </span>
  </span>
</span>
```

### Example Set 6 — Percentage With Indicator + Prefix (from PercentagePlayground)

```tsx
const out = formatPercentToViewPercent(0.0954)

// out.viewValue → "9.54"
// out.symbol    → "%"

// UI:
<span class="inline-flex items-center">
  <span class="inline-flex items-center">=</span>
  <span class="inline-flex items-center">&lt;</span>
  <span class="inline tabular-nums">9.54</span>
  <span class="inline">
    <span class="group relative inline-flex items-baseline focus:outline-none">
      <span class="truncate" style="max-width: 8ch;">%</span>
    </span>
  </span>
</span>
```

### Example Set 7 — Error State (matches Storybook error examples)

```tsx
// No formatter needed — DisplayValue handles this state.

<DisplayTokenValue isError errorMessage="Price service unavailable" />

// UI:
<span class="inline-flex items-center align-middle">
  <span class="inline-flex items-center leading-none" data-slot="tooltip-trigger">
    <svg class="lucide lucide-octagon-alert inline-block h-[1em] w-[1em] text-red-700" />
  </span>
</span>
```

### Example Set 8 — Loading Skeleton (width auto-inferred from typography)

```tsx
// when using typography = { variant: "body1" }

<DisplayTokenValue isLoading />

// UI:
<span class="inline-flex items-center">
  <span data-slot="skeleton"
        aria-hidden="true"
        class="inline-flex items-center justify-center align-middle"
        style="width: 70px; height: 1em;">
    <span class="h-full w-full animate-pulse rounded bg-background-600"
          style="transform: translateY(15%);"></span>
  </span>
</span>
```

---

## Components

All components share the same UX props (loading, error, skeletons, truncation). They wrap the same engine (`DisplayValue`).

**DisplayValue**

```tsx
import { DisplayValue } from "react-display-value"
;<DisplayValue viewValue="1,234.56" symbol="$" symbolPosition="before" />
```

Features: prefix/indicator (`<`/`>` or custom), symbol before/after, truncation with tooltip, skeleton or spinner, error icon with tooltip, replaceable primitives.

**DisplayTokenAmount** – token amounts (symbol after value).

```tsx
<DisplayTokenAmount viewValue="12.345" symbol="ETH" />
```

**DisplayTokenValue** – currency values (symbol before value).

```tsx
<DisplayTokenValue viewValue="1,234.56" symbol="$" />
```

**DisplayPercentage** – appends `%`.

```tsx
<DisplayPercentage viewValue="8.75" />
```

---

## Formatting Functions

All formatters keep symbols separate so you control placement/spacing.

**formatBigIntToViewTokenAmount**

```tsx
import { formatBigIntToViewTokenAmount } from "react-display-value"

const out = formatBigIntToViewTokenAmount(
  { bigIntValue: 1234567n, symbol: "USDC", decimals: 6 },
  { minDisplay: 0.000001, compactDecimals: 2 }
)
// out.viewValue    → "1.23"
// out.compact      → "1.23"
// out.symbol       → "USDC"
// out.bigIntValue  → "1234567n"
// out.decimals     → 6
// out.belowMin     → false  (display component, if true render this '>' by default)
// out.aboveMax     → false  (display component, if true render this '>' by default)
// out.sign         → "" | "-"

// UI renders:
<span class="inline-flex items-center">
    <span class="inline">123.46</span>
    <span class="inline items-center ml-0.5">USDC</span>
</span>
```

Behaviors: fixed-decimal mode or magnitude rules, compact for large values, tiny floor (`belowMin`), upper cap (`aboveMax`), always returns `compact`.

**formatBigIntToViewNumber**

```tsx
const price = formatBigIntToViewNumber(123_456_789n, 8, "$")
// price.viewValue → "1,234.57"
// price.compact   → "1.23K"
```

**formatNumberToViewNumber**

```tsx
const v = formatNumberToViewNumber(1234.567, "$", {
  compactThreshold: 1_000_000,
  standardDecimals: 2,
})
// v.viewValue → "1,234.57"
// v.compact   → "1.23K"
```

**formatPercentToViewPercent**

```tsx
const p = formatPercentToViewPercent(0.123456)
// p.viewValue → "12.35" (UI adds "%")
```

---

## Truncation & Tooltips

`<Truncate />` copies computed text styles for a pixel-perfect overlay and renders a portal tooltip near the trigger—useful for long symbols like `SUPERLONGTOKEN-2025`.

```tsx
import { Truncate } from "react-display-value"
;<Truncate text="SUPERLONGTOKEN-2025" maxChars={8} />
```

---

## Injecting Custom Primitives

Swap tooltip/loader/error/truncate with your own components:

```tsx
<DisplayValue
  viewValue="1,234.56"
  symbol="$"
  TooltipComponent={({ trigger, message }) => <MyTooltip content={message}>{trigger}</MyTooltip>}
  LoaderComponent={() => <MySpinner size="sm" />}
  ErrorIconComponent={() => <MyErrorIcon />}
  TruncateComponent={({ text, maxChars, className }) => (
    <MyTruncate text={text} maxChars={maxChars} className={className} />
  )}
/>
```

---

## API Exports

```ts
// Components
export * from "./components/DisplayValue.js"
export * from "./components/DisplayTokenAmount.js"
export * from "./components/DisplayTokenValue.js"
export * from "./components/DisplayPercentage.js"

// Formatting
export * from "./formatting-functions/index.js"
export * from "./bigIntToViewNumber.js"
export * from "./bigIntToViewTokenAmount.js"
export * from "./numberToViewNumber.js"
export * from "./numberToViewPercentage.js"

// Types & utils
export * from "./types/QueryResponse.js"
export * from "./utils/tailwind.js" // cn() helper
```

---

## Types (common)

```ts
export type SymbolPosition = "before" | "after"

export interface QueryResponse {
  isLoading?: boolean
  isError?: boolean
  isFetched?: boolean
  isPending?: boolean
  errorMessage?: string
  error?: any
}

export interface DisplayValueProps extends QueryResponse {
  viewValue?: string | null
  fallbackViewValue?: string | null
  symbol?: string | null
  symbolPosition?: SymbolPosition
  sign?: string
  belowMin?: boolean
  aboveMax?: boolean
  indicator?: React.ReactNode | string
  prefix?: React.ReactNode | string
  loaderSkeleton?: boolean
  skeletonWidth?: number | string
  skeletonClassNameWrapper?: string
  skeletonClassName?: string
  emptyCell?: React.ReactNode
  emptyCellClassName?: string
  containerClassName?: string
  valueClassName?: string
  symbolClassName?: string
  truncateClassName?: string
  indicatorClassName?: string
  prefixClassName?: string
  symbolMaxChars?: number
  TooltipComponent?: React.ComponentType<{ trigger: React.ReactNode; message: string }>
  TruncateComponent?: React.ComponentType<{ text: string; maxChars: number; className?: string }>
  InlineSkeletonComponent?: React.ComponentType<{
    width?: number | string
    classNameWrapper?: string
    className?: string
  }>
  LoaderComponent?: React.ComponentType
  ErrorIconComponent?: React.ComponentType
}
```

---

## Contributing

PRs and issues welcome. Please keep components headless-friendly, maintain the separation of symbol vs numeric strings, and ensure truncation/tooltip accessibility.

---

## License

Unlicense — public domain. Use, modify, and distribute freely. See http://unlicense.org/
