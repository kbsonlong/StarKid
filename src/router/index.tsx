import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Home } from '../pages/Home'
import { Login } from '../pages/Login'
import { Register } from '../pages/Register'
import { Rules } from '../pages/Rules'
import { Behaviors } from '../pages/Behaviors'
import { Rewards } from '../pages/Rewards'
import { Reports } from '../pages/Reports'
import Settings from '../pages/Settings'
import Community from '../pages/Community'
import Collaborate from '../pages/Collaborate'
import Debug from '../pages/Debug'
import { ProtectedRoute } from '../components/ProtectedRoute'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/register',
    element: <Register />
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Home />
      },
      {
        path: 'rules',
        element: <Rules />
      },
      {
        path: 'behaviors',
        element: <Behaviors />
      },
      {
        path: 'rewards',
        element: <Rewards />
      },
      {
        path: 'reports',
        element: <Reports />
      },
      {
        path: 'community',
        element: <Community />
      },
      {
        path: 'collaborate',
        element: <Collaborate />
      },
      {
        path: 'settings',
        element: <Settings />
      },
      {
        path: 'debug',
        element: <Debug />
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
])