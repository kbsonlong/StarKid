import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useAuthStore } from './store'
import { useEffect } from 'react'

function App() {
  const { initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <RouterProvider router={router} />
  )
}

export default App
