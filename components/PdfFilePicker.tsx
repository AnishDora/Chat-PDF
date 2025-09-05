"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";

interface PdfFilePickerProps {
  onFileSelect: (files: File[]) => void;
}

export default function PdfFilePicker({ onFileSelect }: PdfFilePickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    
    const pdfFiles = files.filter(file => file.type === "application/pdf");
    const nonPdfFiles = files.filter(file => file.type !== "application/pdf");
    
    if (nonPdfFiles.length > 0) {
      alert(`Please choose only PDF files! ${nonPdfFiles.length} non-PDF file(s) were ignored.`);
    }
    
    if (pdfFiles.length > 0) {
      onFileSelect(pdfFiles);
    }
    
    // Reset input
    event.target.value = "";
  };

  const openFilePicker = () => inputRef.current?.click();

  return (
    <>
      <Button
        size="lg"
        className="text-lg px-8 py-6"
        type="button"
        onClick={openFilePicker}
      >
        Upload PDF
      </Button>

      <input
        type="file"
        accept=".pdf"
        multiple
        ref={inputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </>
  );
}
