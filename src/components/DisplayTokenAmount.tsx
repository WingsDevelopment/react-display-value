import * as React from "react"
import { DisplayValue, type DisplayValueProps } from "./DisplayValue.js"

export const DisplayTokenAmount: React.FC<DisplayValueProps> = ({
  symbolPosition = "after",
  loaderSkeleton = true,
  ...props
}) => {
  return (
    <DisplayValue
      symbol={props.symbol}
      symbolPosition={symbolPosition}
      loaderSkeleton={loaderSkeleton}
      symbolClassName="ml-0.5"
      {...props}
    />
  )
}
