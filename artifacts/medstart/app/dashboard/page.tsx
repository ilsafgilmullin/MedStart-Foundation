'use client'

import Hero from '@/components/dashboard/home/Hero'
import DashboardOverview from '@/components/dashboard/home/DashboardOverview'
import {
  ModeratorHome,
  SuspendedTutorHome,
} from '@/components/dashboard/home/ModerationHome'
import { useAuth } from '@/hooks/useAuth'

export default function DashboardPage() {
  const { role, profile } = useAuth()

  if (role === 'moderator') return <ModeratorHome />
  if (role === 'tutor' && profile?.status === 'suspended') {
    return <SuspendedTutorHome />
  }

  return (
    <div className="space-y-8">
      <Hero />
      <DashboardOverview />
    </div>
  )
}
