"use client";

import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";

interface PdfViewerProps {
  documentId: string;
  documentTitle: string;
}

export default function PdfViewer({ documentId, documentTitle }: PdfViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchPdfUrl = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/documents/${documentId}/view`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to load PDF");
      }
      
      setPdfUrl(data.url);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load PDF");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchPdfUrl();
  };

  useEffect(() => {
    if (documentId) {
      fetchPdfUrl();
    }
  }, [documentId, fetchPdfUrl]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 dark:text-red-400 mb-2">Failed to load PDF</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            {loading ? "Retrying..." : `Retry ${retryCount > 0 ? `(${retryCount})` : ""}`}
          </button>
        </div>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">No PDF to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <iframe
        src={pdfUrl}
        className="w-full h-full border border-gray-200 dark:border-gray-600 rounded-lg"
        title={`PDF Viewer - ${documentTitle}`}
        style={{ minHeight: "500px" }}
      />
    </div>
  );
}
