import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"

export function Navigation() {
  return (
    <nav className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-slate-900 dark:text-white">PDF AI</span>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost">Sign In</Button>
          <Button>Get Started</Button>
        </div>
      </div>
    </nav>
  )
}
