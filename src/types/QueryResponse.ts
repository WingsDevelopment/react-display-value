export interface Displayable<T> extends QueryResponse {
  data?: T
}

export interface QueryResponse {
  isLoading?: boolean
  isError?: boolean
  isFetched?: boolean
  isPending?: boolean
  errorMessage?: string
  error?: any
}
