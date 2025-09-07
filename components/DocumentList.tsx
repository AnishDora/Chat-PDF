"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, Eye, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";

interface Document {
  id: string;
  title: string;
  status: "processing" | "ready" | "failed";
  bytes: number;
  page_count?: number;
  created_at: string;
}

interface DocumentListProps {
  onDocumentSelect: (document: Document) => void;
  onRefresh?: () => void;
}

export default function DocumentList({ onDocumentSelect, onRefresh }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/documents");
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch documents");
      }
      
      setDocuments(data.documents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      const response = await fetch(`/api/documents?id=${documentId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete document");
      }
      
      // Remove from local state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete document");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processing":
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
      case "ready":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "processing":
        return "Processing";
      case "ready":
        return "Ready";
      case "failed":
        return "Failed";
      default:
        return "Unknown";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading documents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchDocuments} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="p-8 text-center">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">No documents uploaded yet</p>
        <p className="text-sm text-gray-500">Upload your first PDF to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Your Documents ({documents.length})
        </h3>
        {onRefresh && (
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        )}
      </div>
      
      <div className="space-y-2">
        {documents.map((document) => (
          <div
            key={document.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <h4 className="font-medium text-gray-900 dark:text-white truncate">
                    {document.title}
                  </h4>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(document.status)}
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {getStatusText(document.status)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>{formatFileSize(document.bytes)}</span>
                  {document.page_count && (
                    <span>{document.page_count} pages</span>
                  )}
                  <span>{formatDate(document.created_at)}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                {document.status === "ready" && (
                  <Button
                    onClick={() => onDocumentSelect(document)}
                    size="sm"
                    variant="outline"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                )}
                <Button
                  onClick={() => deleteDocument(document.id)}
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
