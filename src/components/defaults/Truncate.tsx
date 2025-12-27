"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "../../utils/tailwind.js"

type TruncateProps = {
  text: string
  maxChars?: number
  className?: string
  bubbleClassName?: string
  matchTriggerWidth?: boolean
  offsetX?: number
  offsetY?: number
}

// todo explore if there is a component in some library for this and refactor/replace this one
export function Truncate({
  text,
  maxChars = 12,
  className,
  bubbleClassName,
  matchTriggerWidth = false,
  offsetX = -1,
  offsetY = -1,
}: TruncateProps) {
  const isTruncated = text.length > maxChars
  const display = isTruncated ? `${text.slice(0, maxChars)}…` : text

  const ref = React.useRef<HTMLSpanElement | null>(null)
  const [open, setOpen] = React.useState(false)
  const [rect, setRect] = React.useState<DOMRect | null>(null)
  const [copiedTextStyle, setCopiedTextStyle] = React.useState<React.CSSProperties | null>(null)

  /* biome-ignore lint/nursery/useExhaustiveDependencies: reads from ref.current and sets local state on demand */
  const measure = React.useCallback(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setRect(r)

    const cs = window.getComputedStyle(el)
    setCopiedTextStyle({
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight as any,
      fontStyle: cs.fontStyle,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      textTransform: cs.textTransform as React.CSSProperties["textTransform"],
      textDecoration: cs.textDecoration,
      color: cs.color,
      fontFeatureSettings: cs.fontFeatureSettings,
      fontVariantNumeric: cs.fontVariantNumeric,
      display: "inline-block",
      verticalAlign: "baseline",
      whiteSpace: "pre",
    })
  }, [])

  const onEnter = () => {
    if (!isTruncated) return
    measure()
    setOpen(true)
  }
  const onLeave = () => setOpen(false)

  return (
    <>
      <span
        ref={ref}
        className={cn("relative inline-block align-baseline truncate", className)}
        style={{ maxWidth: `${maxChars}ch` }}
        tabIndex={isTruncated ? 0 : -1}
        aria-label={isTruncated ? text : undefined}
        onMouseEnter={onEnter}
        onFocus={onEnter}
        onMouseLeave={onLeave}
        onBlur={onLeave}
      >
        {display}
      </span>

      {open &&
        rect &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className={cn(
              "pointer-events-none z-[99999]",
              "rounded-md border border-background-500 bg-background-600",
              "shadow-[var(--tooltip-shadow)]",
              "whitespace-pre px-1",
              bubbleClassName
            )}
            style={{
              position: "fixed",
              left: rect.left + offsetX - 4,
              top: rect.top + offsetY - 2,
              width: matchTriggerWidth ? rect.width : "auto",
            }}
          >
            <span style={copiedTextStyle ?? undefined} className={cn(className)}>
              {text}
            </span>
          </div>,
          document.body
        )}
    </>
  )
}
