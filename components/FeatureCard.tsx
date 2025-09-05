import { LucideIcon } from "lucide-react"

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  gradientFrom: string
  gradientTo: string
  borderColor: string
  iconBgColor: string
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  gradientFrom,
  gradientTo,
  borderColor,
  iconBgColor
}: FeatureCardProps) {
  return (
    <div className={`p-6 rounded-xl bg-gradient-to-br ${gradientFrom} ${gradientTo} dark:from-slate-700 dark:to-slate-600 border ${borderColor} dark:border-slate-600`}>
      <div className={`w-12 h-12 ${iconBgColor} rounded-lg flex items-center justify-center mb-4`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-slate-600 dark:text-slate-300">
        {description}
      </p>
    </div>
  )
}
