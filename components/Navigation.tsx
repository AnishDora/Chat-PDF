"use client";

import { Button } from "@/components/ui/button";
import { FileText, User, LogOut } from "lucide-react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export function Navigation() {
  const { isSignedIn, user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const handleSignOut = () => {
    signOut();
    router.push("/");
  };

  return (
    <nav className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div 
          className="flex items-center space-x-2 cursor-pointer"
          onClick={() => router.push("/")}
        >
          <FileText className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-slate-900 dark:text-white">PDF AI</span>
        </div>
        
        <div className="flex items-center space-x-4">
          {!isLoaded ? (
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-20 rounded"></div>
          ) : isSignedIn ? (
            <>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <User className="h-4 w-4" />
                <span>{user?.firstName || user?.emailAddresses[0]?.emailAddress}</span>
              </div>
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                className="flex items-center space-x-1"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="ghost" 
                onClick={() => router.push("/sign-in")}
              >
                Sign In
              </Button>
              <Button 
                onClick={() => router.push("/sign-up")}
              >
                Get Started
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
