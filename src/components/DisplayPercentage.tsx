import * as React from "react"
import { DisplayValue, type DisplayValueProps } from "./DisplayValue.js"

export const DisplayPercentage: React.FC<DisplayValueProps> = ({
  symbol = "%",
  symbolPosition = "after",
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
