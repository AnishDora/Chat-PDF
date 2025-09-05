"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, FileText, ChevronDown, Copy, Check } from "lucide-react";

interface ChatInterfaceProps {
  files: File[];
}

export default function ChatInterface({ files }: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ id: number; text: string; isUser: boolean; timestamp: Date }>>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const selectedFile = files[selectedFileIndex];
  const selectedFileUrl = selectedFile ? URL.createObjectURL(selectedFile) : "";

  const handleSendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        id: Date.now(),
        text: message.trim(),
        isUser: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, newMessage]);
      setMessage("");
      
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const copyMessage = async (messageText: string, messageId: number) => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Left side - Chat area (70%) */}
      <div className="flex-1 flex flex-col min-h-0" style={{ width: "70%" }}>
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Chat with PDFs
              </h2>
            </div>
            
            {/* PDF Selector */}
            {files.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Viewing:</span>
                <select
                  value={selectedFileIndex}
                  onChange={(e) => setSelectedFileIndex(Number(e.target.value))}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {files.map((file, index) => (
                    <option key={index} value={index}>
                      {file.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Start a conversation with your PDF</p>
              <p className="text-sm">Ask questions, request summaries, or get specific information</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isUser ? "justify-end" : "justify-start"} group`}
              >
                <div className={`max-w-xs lg:max-w-md ${msg.isUser ? "items-end" : "items-start"} flex flex-col`}>
                  {/* Dropdown button */}
                  <div className={`flex ${msg.isUser ? "justify-end" : "justify-start"} mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
                    <button
                      onClick={() => copyMessage(msg.text, msg.id)}
                      className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                      title="Copy message"
                    >
                      {copiedMessageId === msg.id ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                      )}
                    </button>
                  </div>
                  
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      msg.isUser
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <div className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${msg.isUser ? "text-right" : "text-left"}`}>
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            ))
          )}
          {/* Anchor to scroll to the bottom */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your PDF..."
              className="flex-1 resize-none border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              rows={2}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="px-4 py-2"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right side - PDF viewer (30%) */}
      <div className="bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 min-h-0" style={{ width: "30%" }}>
        <div className="h-full flex flex-col min-h-0">
          {/* PDF Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white truncate">
              {selectedFile?.name || "No PDF selected"}
            </h3>
            {files.length > 1 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selectedFileIndex + 1} of {files.length} PDFs
              </p>
            )}
          </div>
          
          {/* PDF Viewer */}
          <div className="flex-1 p-4">
            {selectedFileUrl ? (
              <iframe
                src={selectedFileUrl}
                className="w-full h-full border border-gray-200 dark:border-gray-600 rounded-lg"
                title="PDF Viewer"
              />
            ) : (
              <div className="w-full h-full border border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                <p className="text-gray-500 dark:text-gray-400">No PDF to display</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
