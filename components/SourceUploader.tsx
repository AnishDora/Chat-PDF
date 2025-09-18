"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, RefreshCw, Link2, FileText, ImageIcon } from "lucide-react";
import type { SourceType } from "@/lib/sourceTypes";

interface UploadResult {
  success: boolean;
  file: string;
  error?: string;
  documentId?: string;
  sourceType?: string;
}

interface SourceUploaderProps {
  onUploadComplete: (results: UploadResult[]) => void;
  onUploadStart?: () => void;
}

const MODES: { id: SourceType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: "pdf",
    label: "PDF",
    description: "Upload PDFs from your computer",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    id: "url",
    label: "URL",
    description: "Scrape a web page and add it as a source",
    icon: <Link2 className="h-4 w-4" />,
  },
  {
    id: "screenshot",
    label: "Screenshot",
    description: "Upload screenshots for OCR",
    icon: <ImageIcon className="h-4 w-4" />,
  },
];

const URL_LIMIT = 5;

export default function SourceUploader({ onUploadComplete, onUploadStart }: SourceUploaderProps) {
  const [mode, setMode] = useState<SourceType>("pdf");
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (files: File[], sourceType: SourceType) => {
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach(file => formData.append("files", file));
    formData.append("sourceType", sourceType);

    await performUpload({ body: formData, isFormData: true });
  };

  const performUpload = async ({ body, isFormData }: { body: FormData | string; isFormData: boolean }) => {
    try {
      setUploading(true);
      setStatus(null);
      onUploadStart?.();

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: isFormData ? undefined : { "Content-Type": "application/json" },
        body: body instanceof FormData ? body : body,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const results: UploadResult[] = [
          ...(data.documents || []).map((doc: { id: string; title: string; source_type?: string }) => ({
            success: true,
            file: doc.title,
            documentId: doc.id,
            sourceType: doc.source_type,
          })),
          ...(data.failed || []).map((fail: { file: string; error: string }) => ({
            success: false,
            file: fail.file,
            error: fail.error,
          })),
        ];

        if (results.length === 0) {
          setStatus("Upload finished, but no sources were processed.");
        } else if (results.every(r => r.success)) {
          setStatus(`Uploaded ${results.length} ${results.length === 1 ? "source" : "sources"}.`);
        } else {
          const failures = results.filter(r => !r.success).length;
          setStatus(`Some sources failed to upload (${failures}). Check the details below.`);
        }

        onUploadComplete(results);
      } else {
        const failedUploads: UploadResult[] = [];
        if (Array.isArray(data.failed)) {
          data.failed.forEach((fail: { file: string; error: string }) => {
            failedUploads.push({ success: false, file: fail.file, error: fail.error });
          });
        }
        if (!failedUploads.length && data.error) {
          failedUploads.push({ success: false, file: "Request", error: data.error });
        }
        setStatus(data.error || "Upload failed");
        onUploadComplete(failedUploads);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setStatus(message);
      onUploadComplete([]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const openFileDialog = () => {
    if (uploading) return;
    if (mode === "pdf") {
      fileInputRef.current?.click();
    } else if (mode === "screenshot") {
      imageInputRef.current?.click();
    }
  };

  const handleUrlSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!urlInput.trim()) {
      setStatus("Enter at least one URL.");
      return;
    }

    const normalized = urlInput
      .split(/\r?\n|,|\s+/)
      .map(url => url.trim())
      .filter(Boolean)
      .map(url => (url.startsWith("http://") || url.startsWith("https://")) ? url : `https://${url}`);

    if (normalized.length === 0) {
      setStatus("Enter at least one valid URL.");
      return;
    }

    if (normalized.length > URL_LIMIT) {
      setStatus(`You can submit up to ${URL_LIMIT} URLs at a time.`);
      return;
    }

    await performUpload({ body: JSON.stringify({ urls: normalized }), isFormData: false });
    setUrlInput("");
  };

  const renderModeDescription = () => {
    const config = MODES.find(tab => tab.id === mode);
    if (!config) return null;
    return (
      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
        {config.icon}
        {config.description}
      </p>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {MODES.map(tab => (
          <Button
            key={tab.id}
            type="button"
            variant={mode === tab.id ? "default" : "outline"}
            size="sm"
            onClick={() => setMode(tab.id)}
            disabled={uploading}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {renderModeDescription()}

      {mode === "pdf" && (
        <div className="space-y-3">
          <Button
            size="lg"
            className="text-lg px-8 py-6"
            type="button"
            onClick={openFileDialog}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Upload PDFs
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            onChange={event => {
              const files = Array.from(event.target.files || []);
              const pdfs = files.filter(file => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
              if (pdfs.length !== files.length) {
                setStatus("Some files were ignored because they are not PDFs.");
              }
              void handleFileUpload(pdfs, "pdf");
            }}
            hidden
            disabled={uploading}
          />
        </div>
      )}

      {mode === "screenshot" && (
        <div className="space-y-3">
          <Button
            size="lg"
            className="text-lg px-8 py-6"
            type="button"
            onClick={openFileDialog}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Upload Screenshots
              </>
            )}
          </Button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg"
            multiple
            onChange={event => {
              const files = Array.from(event.target.files || []);
              const images = files.filter(file => file.type.startsWith("image/") || /\.(png|jpg|jpeg)$/i.test(file.name));
              if (images.length !== files.length) {
                setStatus("Unsupported image types were ignored. Use PNG or JPEG screenshots.");
              }
              void handleFileUpload(images, "screenshot");
            }}
            hidden
            disabled={uploading}
          />
        </div>
      )}

      {mode === "url" && (
        <form className="space-y-3" onSubmit={handleUrlSubmit}>
          <textarea
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            placeholder={`Paste up to ${URL_LIMIT} URLs (one per line)`}
            value={urlInput}
            onChange={event => setUrlInput(event.target.value)}
            disabled={uploading}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={uploading}>
              {uploading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Add URLs
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {status && (
        <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
          {status}
        </div>
      )}
    </div>
  );
}
