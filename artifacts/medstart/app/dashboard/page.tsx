import Hero from '@/components/dashboard/home/Hero'
import Stats from '@/components/dashboard/home/Stats'
import RecommendedTutors from '@/components/dashboard/home/RecommendedTutors'
import UpcomingLesson from '@/components/dashboard/home/UpcomingLesson'
import QuickActions from '@/components/dashboard/home/QuickActions'
export default function DashboardPage() { return <div className="space-y-8"><Hero /><Stats /><RecommendedTutors /><UpcomingLesson /><QuickActions /></div> }
