"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button"
import { FeatureCard } from "@/components/FeatureCard"
import { StepCard } from "@/components/StepCard"
import { Navigation } from "@/components/Navigation"
import { Footer } from "@/components/Footer"
import PdfFilePicker from "@/components/PdfFilePicker"
import ChatInterface from "@/components/ChatInterface"
import { Upload, MessageCircle, Brain, Shield, Zap, FileText } from "lucide-react"

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileSelect = (files: File[]) => {
    setSelectedFiles(files);
  };

  // If files are selected, show the chat interface
  if (selectedFiles.length > 0) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <ChatInterface files={selectedFiles} />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <Navigation />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6">
            Chat with Your
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              {" "}PDFs
            </span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
            Upload your PDF documents and have intelligent conversations with them. 
            Ask questions, get summaries, and extract insights using advanced AI technology.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <PdfFilePicker onFileSelect={handleFileSelect} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Powerful AI Features
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Transform your PDF documents into interactive, intelligent conversations
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={Brain}
              title="Smart Analysis"
              description="AI-powered document analysis that understands context and provides intelligent responses to your questions."
              gradientFrom="from-blue-50"
              gradientTo="to-indigo-50"
              borderColor="border-blue-100"
              iconBgColor="bg-blue-600"
            />
            <FeatureCard
              icon={MessageCircle}
              title="Natural Conversations"
              description="Chat naturally with your documents using plain English. Ask questions, request summaries, or get specific information."
              gradientFrom="from-purple-50"
              gradientTo="to-pink-50"
              borderColor="border-purple-100"
              iconBgColor="bg-purple-600"
            />
            <FeatureCard
              icon={Zap}
              title="Instant Results"
              description="Get immediate answers and insights from your documents without manually searching through pages of content."
              gradientFrom="from-green-50"
              gradientTo="to-emerald-50"
              borderColor="border-green-100"
              iconBgColor="bg-green-600"
            />
            <FeatureCard
              icon={FileText}
              title="Multiple Formats"
              description="Support for various PDF types including research papers, reports, manuals, and academic documents."
              gradientFrom="from-orange-50"
              gradientTo="to-red-50"
              borderColor="border-orange-100"
              iconBgColor="bg-orange-600"
            />
            <FeatureCard
              icon={Shield}
              title="Secure & Private"
              description="Your documents are processed securely with enterprise-grade encryption and privacy protection."
              gradientFrom="from-indigo-50"
              gradientTo="to-blue-50"
              borderColor="border-indigo-100"
              iconBgColor="bg-indigo-600"
            />
            <FeatureCard
              icon={Upload}
              title="Easy Upload"
              description="Simply drag and drop your PDF files or browse to upload. No complex setup or technical knowledge required."
              gradientFrom="from-teal-50"
              gradientTo="to-cyan-50"
              borderColor="border-teal-100"
              iconBgColor="bg-teal-600"
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StepCard
              stepNumber={1}
              title="Upload PDF"
              description="Upload your PDF document using our secure upload interface"
              bgColor="bg-blue-600"
            />
            <StepCard
              stepNumber={2}
              title="AI Processing"
              description="Our AI analyzes and understands your document content"
              bgColor="bg-purple-600"
            />
            <StepCard
              stepNumber={3}
              title="Start Chatting"
              description="Ask questions and get intelligent answers about your document"
              bgColor="bg-green-600"
            />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
