function LoadingState({ message = 'Loading dashboard data...' }) {
  return (
    <div className="loading-state">
      <div className="spinner" />
      <p>{message}</p>
    </div>
  )
}

export default LoadingState
