import Hero from '@/components/dashboard/home/Hero'
import DashboardOverview from '@/components/dashboard/home/DashboardOverview'

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <Hero />
      <DashboardOverview />
    </div>
  )
}
