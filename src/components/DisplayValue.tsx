import * as React from "react"
import { cn } from "../utils/tailwind.js"
import { QueryResponse } from "../types/QueryResponse.js"

import {
  DefaultEmptyCell,
  DefaultTooltip,
  DefaultTruncate,
  DefaultInlineSkeleton,
  DefaultLoader,
  DefaultErrorIcon,
} from "./defaults/DefaultComponents.js"

export type SymbolPosition = "before" | "after"

export interface DisplayValueProps extends QueryResponse {
  // data
  viewValue?: string | null
  fallbackViewValue?: string | null
  symbol?: string | null
  symbolPosition?: SymbolPosition

  sign?: string
  belowMin?: boolean
  aboveMax?: boolean

  // chunks
  indicator?: React.ReactNode | string
  prefix?: React.ReactNode | string

  // states
  isLoading?: boolean
  isPending?: boolean
  loaderSkeleton?: boolean
  skeletonWidth?: number | string
  skeletonClassNameWrapper?: string
  skeletonClassName?: string

  // error
  isError?: boolean
  error?: any
  errorMessage?: string
  displayErrorAndValue?: boolean
  errorPossition?: "before" | "after"

  // empty
  emptyCell?: React.ReactNode
  emptyCellClassName?: string

  // classes
  containerClassName?: string
  valueClassName?: string
  symbolClassName?: string
  truncateClassName?: string
  indicatorClassName?: string
  prefixClassName?: string

  // truncate config
  symbolMaxChars?: number

  /** Injectable UI primitives (components) */
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

/* -------------------- Component -------------------- */

/**
 * Span-only renderer. Order rules:
 * - If `isError && !displayErrorAndValue`: render only the error icon.
 * - If `isError && displayErrorAndValue`: render error icon before prefix or at end via `errorPossition`.
 * - Indicator is always rendered BEFORE Symbol.
 * - If symbolPosition==="before":  Prefix • Indicator • Symbol • Value
 * - If symbolPosition==="after" :  Prefix • Value • Indicator • Symbol
 */
export const DisplayValue = React.forwardRef<HTMLSpanElement, DisplayValueProps>(
  (
    {
      viewValue,
      fallbackViewValue,
      symbol,
      symbolPosition = "before",

      indicator,
      prefix,

      isError,
      error,
      errorMessage = "Could not load this value, try later 😓",
      displayErrorAndValue = false,
      errorPossition = "after",
      isLoading,
      isPending,
      loaderSkeleton = true,
      skeletonWidth = 60,
      skeletonClassNameWrapper,
      skeletonClassName,

      emptyCell = <DefaultEmptyCell />,

      containerClassName,
      valueClassName,
      symbolClassName,
      truncateClassName,
      indicatorClassName,
      prefixClassName,

      symbolMaxChars = 10,

      sign,
      belowMin,
      aboveMax,

      TooltipComponent = DefaultTooltip,
      TruncateComponent = DefaultTruncate,
      InlineSkeletonComponent = DefaultInlineSkeleton,
      LoaderComponent = DefaultLoader,
      ErrorIconComponent = DefaultErrorIcon,
    },
    ref,
  ) => {
    const isSymbolTruncated = symbolMaxChars < (symbol?.length || 0)
    const resolvedErrorMessage = String(
      (error && (error.message || error.shortMessage)) || errorMessage || "Unknown error",
    )
    const ErrorChunk = isError ? (
      <TooltipComponent
        trigger={
          <span className={cn("inline-flex items-center leading-none")}>
            <ErrorIconComponent />
          </span>
        }
        message={resolvedErrorMessage}
      />
    ) : null

    // ERROR
    if (isError && !displayErrorAndValue) {
      return (
        <span ref={ref} className={cn("inline-flex items-center align-middle", containerClassName)}>
          {ErrorChunk}
        </span>
      )
    }

    // LOADING / PENDING
    if (!isError && ((isLoading && isLoading != null) || (isPending && isPending != null))) {
      if (loaderSkeleton) {
        return (
          <span ref={ref} className={cn("inline-flex items-center", containerClassName)}>
            <InlineSkeletonComponent
              width={skeletonWidth}
              classNameWrapper={skeletonClassNameWrapper}
              className={skeletonClassName}
            />
          </span>
        )
      }
      return (
        <span
          ref={ref}
          className={cn("mt-1 inline-flex items-center", containerClassName)}
          data-cy="loader"
        >
          <LoaderComponent />
        </span>
      )
    }

    // EMPTY
    if (viewValue == null && fallbackViewValue == null) {
      if (isError && displayErrorAndValue) {
        return (
          <span ref={ref} className={cn("inline-flex items-center", containerClassName)}>
            {errorPossition === "before" && ErrorChunk}
            {emptyCell}
            {errorPossition === "after" && ErrorChunk}
          </span>
        )
      }
      return <>{emptyCell}</>
    }

    const PrefixChunk =
      prefix != null ? (
        <span className={cn("inline-flex items-center", prefixClassName)}>{prefix}</span>
      ) : null

    const effectiveIndicator =
      indicator != null ? indicator : belowMin ? "<" : aboveMax ? ">" : null

    const IndicatorChunk =
      effectiveIndicator != null ? (
        <span className={cn("inline-flex items-center", indicatorClassName)}>
          {effectiveIndicator}
        </span>
      ) : null

    const SymbolChunk = symbol ? (
      <span className={cn("inline items-center", symbolClassName)}>
        {isSymbolTruncated ? (
          <TruncateComponent
            text={String(symbol)}
            maxChars={symbolMaxChars}
            className={cn("relative top-[2px]", truncateClassName)}
          />
        ) : (
          symbol
        )}
      </span>
    ) : null

    const hasSign = typeof sign === "string" && sign.length > 0
    const SignChunk = hasSign ? <span className="inline-flex items-center">{sign}</span> : null

    return (
      <span ref={ref} className={cn("inline-flex items-center", containerClassName)}>
        {errorPossition === "before" && ErrorChunk}
        {PrefixChunk}
        {SignChunk}

        {symbolPosition === "before" && (
          <>
            {IndicatorChunk}
            {SymbolChunk}
          </>
        )}

        {symbolPosition === "after" && IndicatorChunk}

        <span className={cn("inline", valueClassName)}>{viewValue ?? fallbackViewValue}</span>

        {symbolPosition === "after" && SymbolChunk}
        {errorPossition === "after" && ErrorChunk}
      </span>
    )
  },
)
DisplayValue.displayName = "DisplayValue"
