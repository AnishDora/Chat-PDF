"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, FileText, ChevronDown, Check, Upload, X } from "lucide-react";
import PdfFilePicker from "@/components/PdfFilePicker";
import PdfViewer from "@/components/PdfViewer";

interface Document {
  id: string;
  title: string;
  status: "processing" | "ready" | "failed";
  bytes: number;
  page_count?: number;
  created_at: string;
}

interface Message {
  id: string;
  content: string;
  is_user: boolean;
  created_at: string;
}

interface UploadResult {
  success: boolean;
  file: string;
  error?: string;
  documentId?: string;
}

interface ChatInterfaceProps {
  chatTitle: string;
  documents: Document[];
  messages: Message[];
  onSendMessage: (content: string) => void;
  onAddDocuments: (documentIds: string[]) => void;
  onRemoveDocument: (documentId: string) => void;
  onUpdateChatTitle: (title: string) => void;
}

export default function ChatInterface({ 
  chatTitle, 
  documents, 
  messages, 
  onSendMessage, 
  onAddDocuments, 
  onRemoveDocument,
  onUpdateChatTitle 
}: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [selectedDocumentIndex, setSelectedDocumentIndex] = useState(0);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(chatTitle);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const selectedDocument = documents[selectedDocumentIndex];

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
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

  const copyMessage = async (messageText: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleUploadComplete = (results: UploadResult[]) => {
    const successfulUploads = results.filter(r => r.success);
    if (successfulUploads.length > 0) {
      // Extract document IDs from successful uploads
      const documentIds = successfulUploads
        .filter(r => r.documentId)
        .map(r => r.documentId!);
      
      if (documentIds.length > 0) {
        onAddDocuments(documentIds);
      }
      setShowDocumentUpload(false);
    }
  };

  const handleTitleSave = () => {
    if (editTitle.trim() && editTitle.trim() !== chatTitle) {
      onUpdateChatTitle(editTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setEditTitle(chatTitle);
    setIsEditingTitle(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Left side - Chat area (70%) */}
      <div className="flex-1 flex flex-col min-h-0" style={{ width: "70%" }}>
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
              {isEditingTitle ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTitleSave();
                      if (e.key === 'Escape') handleTitleCancel();
                    }}
                  />
                  <Button size="sm" onClick={handleTitleSave}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleTitleCancel}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <h2 
                  className="text-lg font-semibold text-gray-900 dark:text-white truncate cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded"
                  onClick={() => setIsEditingTitle(true)}
                  title="Click to edit title"
                >
                  {chatTitle}
                </h2>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDocumentUpload(!showDocumentUpload)}
              >
                <Upload className="h-4 w-4 mr-1" />
                {showDocumentUpload ? 'Hide Upload' : 'Add Documents'}
              </Button>
            </div>
          </div>

          {/* Document Upload Section */}
          {showDocumentUpload && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Upload Documents to this Chat
              </h3>
              <PdfFilePicker 
                onUploadComplete={handleUploadComplete}
                onUploadStart={() => {}}
              />
            </div>
          )}

          {/* Document Selector */}
          {documents.length > 0 && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Viewing:</span>
              <select
                value={selectedDocumentIndex}
                onChange={(e) => setSelectedDocumentIndex(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {documents.map((doc, index) => (
                  <option key={doc.id} value={index}>
                    {doc.title} ({doc.status})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Start a conversation with your documents</p>
              <p className="text-sm">Ask questions, request summaries, or get specific information</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.is_user ? "justify-end" : "justify-start"} group`}
              >
                <div className={`max-w-xs lg:max-w-md ${msg.is_user ? "items-end" : "items-start"} flex flex-col`}>
                  {/* Dropdown button */}
                  <div className={`flex ${msg.is_user ? "justify-end" : "justify-start"} mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
                    <button
                      onClick={() => copyMessage(msg.content, msg.id)}
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
                      msg.is_user
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <div className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${msg.is_user ? "text-right" : "text-left"}`}>
                    {formatTime(new Date(msg.created_at))}
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
              placeholder="Ask a question about your documents..."
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

      {/* Right side - PDF viewer and document management (30%) */}
      <div className="bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 min-h-0" style={{ width: "30%" }}>
        <div className="h-full flex flex-col min-h-0">
          {/* PDF Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-white truncate">
                {selectedDocument?.title || "No PDF selected"}
              </h3>
              {selectedDocument && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRemoveDocument(selectedDocument.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            {documents.length > 1 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selectedDocumentIndex + 1} of {documents.length} PDFs
              </p>
            )}
          </div>
          
          {/* PDF Viewer or Document List */}
          <div className="flex-1 p-4">
            {selectedDocument ? (
              <PdfViewer 
                documentId={selectedDocument.id}
                documentTitle={selectedDocument.title}
              />
            ) : (
              <div className="h-full">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Documents in this Chat
                </h4>
                {documents.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No documents added yet</p>
                    <p className="text-xs">Upload documents to start chatting</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc, index) => (
                      <div
                        key={doc.id}
                        className="p-2 border border-gray-200 dark:border-gray-600 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={() => setSelectedDocumentIndex(index)}
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {doc.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {doc.status} • {Math.round(doc.bytes / 1024)} KB
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
