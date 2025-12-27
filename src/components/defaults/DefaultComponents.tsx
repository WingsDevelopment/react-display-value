/* -------------------- Defaults (as components) -------------------- */

import React from "react"
import { cn } from "../../utils/tailwind.js"
import { Truncate } from "./Truncate.js"

export function DefaultTooltip({
  trigger,
  message,
}: {
  trigger: React.ReactNode
  message: string
}) {
  // Native title attribute as the default “tooltip”
  return (
    <span title={message} className="inline-flex items-center align-middle">
      {trigger}
    </span>
  )
}

export function DefaultTruncate({
  text,
  maxChars,
  className,
  bubbleClassName,
}: {
  text: string
  maxChars: number
  className?: string
  bubbleClassName?: string
}) {
  return (
    <Truncate
      text={String(text)}
      maxChars={maxChars}
      className={className}
      bubbleClassName={bubbleClassName}
    />
  )
}

export function DefaultLoader() {
  return (
    <span
      className="inline-block h-[1em] w-[1em] animate-spin rounded-full border border-transparent border-t-current align-baseline"
      aria-label="Loading"
      role="status"
    />
  )
}

export function DefaultErrorIcon() {
  return (
    <span
      aria-hidden
      className="inline-block h-[1em] w-[1em] align-middle text-red-700"
      style={{ lineHeight: 1 }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        className="lucide lucide-octagon-alert-icon lucide-octagon-alert"
      >
        <path d="M12 16h.01" />
        <path d="M12 8v4" />
        <path d="M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z" />
      </svg>
    </span>
  )
}

export function DefaultInlineSkeleton({
  width = 60,
  classNameWrapper,
  className,
}: {
  width?: number | string
  classNameWrapper?: string
  className?: string
}) {
  const w = typeof width === "number" ? `${width}px` : width
  return (
    <span
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("inline-flex items-center justify-center align-middle", classNameWrapper)}
      style={{ width: w, height: "1em" }}
    >
      <span
        className={cn("h-full w-full animate-pulse rounded bg-background-600", className)}
        style={{ transform: "translateY(15%)" }}
      />
    </span>
  )
}

export function DefaultEmptyCell({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("mb-0.5 inline-flex items-center justify-center align-middle", className)}
    >
      <span className="inline-block h-0.5 w-4 translate-y-[0.5px] bg-background-800" />
    </span>
  )
}
