import { FileText } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-slate-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <FileText className="h-6 w-6" />
              <span className="text-xl font-bold">PDF AI</span>
            </div>
            <p className="text-slate-400">
              The future of document interaction is here. Chat with your PDFs using advanced AI technology.
            </p>
          </div>
        </div>
        <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400">
          <p>&copy; 2025 PDF AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
