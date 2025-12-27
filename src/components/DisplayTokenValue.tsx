import * as React from "react"
import { DisplayValue, type DisplayValueProps } from "./DisplayValue.js"

export const DisplayTokenValue: React.FC<DisplayValueProps> = ({
  symbol = "$",
  symbolPosition = "before",
  loaderSkeleton = true,
  ...props
}) => {
  return (
    <DisplayValue
      symbol={symbol}
      symbolPosition={symbolPosition}
      loaderSkeleton={loaderSkeleton}
      {...props}
    />
  )
}
