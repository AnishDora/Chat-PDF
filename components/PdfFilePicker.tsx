"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, RefreshCw } from "lucide-react";

interface UploadResult {
  success: boolean;
  file: string;
  error?: string;
  documentId?: string;
}

interface PdfFilePickerProps {
  onUploadComplete: (results: UploadResult[]) => void;
  onUploadStart?: () => void;
}

export default function PdfFilePicker({ onUploadComplete, onUploadStart }: PdfFilePickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    
    const pdfFiles = files.filter(file => file.type === "application/pdf");
    const nonPdfFiles = files.filter(file => file.type !== "application/pdf");
    
    if (nonPdfFiles.length > 0) {
      alert(`Please choose only PDF files! ${nonPdfFiles.length} non-PDF file(s) were ignored.`);
    }
    
    if (pdfFiles.length === 0) return;

    // Start upload process
    setUploading(true);
    onUploadStart?.();
    
    const formData = new FormData();
    pdfFiles.forEach(file => formData.append("files", file));

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        const results: UploadResult[] = [
          ...data.documents.map((doc: { id: string; title: string }) => ({
            success: true,
            file: doc.title,
            documentId: doc.id,
          })),
          ...(data.failed || []).map((fail: { file: string; error: string }) => ({
            success: false,
            file: fail.file,
            error: fail.error,
          })),
        ];
        onUploadComplete(results);
      } else {
        const results: UploadResult[] = pdfFiles.map(file => ({
          success: false,
          file: file.name,
          error: data.error || "Upload failed",
        }));
        onUploadComplete(results);
      }
    } catch (error) {
      const results: UploadResult[] = pdfFiles.map(file => ({
        success: false,
        file: file.name,
        error: error instanceof Error ? error.message : "Upload failed",
      }));
      onUploadComplete(results);
    } finally {
      setUploading(false);
    }
    
    // Reset input
    event.target.value = "";
  };

  const openFilePicker = () => {
    if (!uploading) {
      inputRef.current?.click();
    }
  };

  return (
    <>
      <Button
        size="lg"
        className="text-lg px-8 py-6"
        type="button"
        onClick={openFilePicker}
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
        type="file"
        accept=".pdf"
        multiple
        ref={inputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
        disabled={uploading}
      />
    </>
  );
}
