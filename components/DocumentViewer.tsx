"use client";

import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, AlertCircle, ExternalLink, ImageIcon, FileText, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SourceType } from "@/lib/sourceTypes";
import { SOURCE_TYPE_LABELS } from "@/lib/sourceTypes";

interface DocumentPreviewResponse {
  type: string;
  status: string;
  title?: string;
  signedUrl?: string | null;
  sourceUrl?: string | null;
  snippet?: string | null;
  expiresAt?: string;
  error?: string;
}

interface DocumentViewerProps {
  document: {
    id: string;
    title: string;
    status: "processing" | "ready" | "failed";
    source_type: SourceType;
    source_url?: string | null;
  };
}

const TYPE_ICONS: Record<SourceType, React.ReactNode> = {
  pdf: <FileText className="h-4 w-4" />,
  url: <Link2 className="h-4 w-4" />,
  screenshot: <ImageIcon className="h-4 w-4" />,
};

export function DocumentViewer({ document }: DocumentViewerProps) {
  const [preview, setPreview] = useState<DocumentPreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/documents/${document.id}/view`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load source preview");
      }
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load source preview");
    } finally {
      setLoading(false);
    }
  }, [document.id]);

  useEffect(() => {
    void fetchPreview();
  }, [fetchPreview]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400">Loading source preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-600 dark:text-red-400 mb-2">Failed to load source</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
        <Button size="sm" onClick={() => void fetchPreview()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">No preview available</p>
      </div>
    );
  }

  const typeLabel = SOURCE_TYPE_LABELS[document.source_type];
  const icon = TYPE_ICONS[document.source_type];
  const showProcessingBanner = document.status === "processing" && preview.status === "processing";

  return (
    <div className="w-full h-full flex flex-col rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          {icon}
          <span className="font-medium">{typeLabel}</span>
          {preview.sourceUrl && (
            <Button asChild variant="link" size="sm" className="px-0 text-blue-600 dark:text-blue-400">
              <a href={preview.sourceUrl} target="_blank" rel="noreferrer">
                Open Source
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => void fetchPreview()}>
          <RefreshCw className="h-3 w-3 mr-2" /> Refresh
        </Button>
      </div>

      {showProcessingBanner && (
        <div className="px-4 py-2 bg-yellow-50 text-yellow-800 text-sm border-b border-yellow-200">
          This source is still processing. Content may be incomplete.
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {preview.type === "pdf" && preview.signedUrl ? (
          <iframe
            src={preview.signedUrl}
            className="w-full h-full min-h-[500px] border-0"
            title={`PDF Viewer - ${document.title}`}
          />
        ) : null}

        {preview.type === "screenshot" && preview.signedUrl ? (
          <div className="h-full">
            <img
              src={preview.signedUrl}
              alt={document.title}
              className="w-full h-full object-contain bg-black"
            />
          </div>
        ) : null}

        {preview.type === "url" && (
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Original URL</p>
              {preview.sourceUrl ? (
                <a
                  href={preview.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 dark:text-blue-400 text-sm break-words"
                >
                  {preview.sourceUrl}
                </a>
              ) : (
                <span className="text-sm text-gray-500">Not available</span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              URL sources open in a new tab. A tile preview is not shown here.
            </p>
          </div>
        )}

        {!["pdf", "screenshot", "url"].includes(preview.type) && (
          <div className="p-6 text-sm text-gray-600 dark:text-gray-300">
            This source type does not have a dedicated preview. Try downloading or reprocessing the file.
          </div>
        )}
      </div>
    </div>
  );
}
