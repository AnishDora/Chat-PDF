"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";

interface PdfFilePickerProps {
  onFileSelect: (file: File) => void;
}

export default function PdfFilePicker({ onFileSelect }: PdfFilePickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.type === "application/pdf") {
      onFileSelect(file);
    } else {
      alert("Please choose a PDF file!");
      event.target.value = "";
    }
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
        ref={inputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </>
  );
}
