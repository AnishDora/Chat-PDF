interface StepCardProps {
  stepNumber: number
  title: string
  description: string
  bgColor: string
}

export function StepCard({ stepNumber, title, description, bgColor }: StepCardProps) {
  return (
    <div className="text-center">
      <div className={`w-16 h-16 ${bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
        <span className="text-2xl font-bold text-white">{stepNumber}</span>
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
