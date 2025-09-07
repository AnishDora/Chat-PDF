import { SignUp } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Create Your Account
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Start chatting with your PDFs today
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <SignUp 
            appearance={{
              elements: {
                formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-sm normal-case',
                card: 'shadow-none',
                headerTitle: 'text-slate-900 dark:text-white',
                headerSubtitle: 'text-slate-600 dark:text-slate-300',
                socialButtonsBlockButton: 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700',
                formFieldInput: 'border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500',
                footerActionLink: 'text-blue-600 hover:text-blue-700',
              }
            }}
            redirectUrl="/"
          />
        </div>
      </div>
    </div>
  )
}
