"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";

interface ExportConversationButtonProps {
  chatTitle: string;
  documents: {
    id: string;
    title: string;
    source_type: string;
  }[];
  messages: {
    id: string;
    content: string;
    is_user: boolean;
    created_at: string;
  }[];
}

export function ExportConversationButton({ chatTitle, documents, messages }: ExportConversationButtonProps) {
  const [exporting, setExporting] = useState(false);

  const exportToPdf = async () => {
    try {
      setExporting(true);
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 48;
      const usableWidth = 515; // ~595pt width minus margins
      let cursorY = margin;

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(18);
      doc.text(chatTitle || "Chat Export", margin, cursorY);
      cursorY += 26;

      const wrap = (text: string) => doc.splitTextToSize(text, usableWidth);

      if (documents.length) {
        doc.setFontSize(12);
        doc.text("Sources:", margin, cursorY);
        cursorY += 18;
        doc.setFont("Helvetica", "normal");
        documents.forEach((source, index) => {
          const label = `[${index + 1}] ${source.title} (${source.source_type})`;
          const lines = wrap(label);
          lines.forEach(line => {
            if (cursorY > 760) {
              doc.addPage();
              cursorY = margin;
            }
            doc.text(line, margin, cursorY);
            cursorY += 16;
          });
        });
        cursorY += 12;
      }

      const addMessage = (speaker: string, content: string) => {
        if (cursorY > 760) {
          doc.addPage();
          cursorY = margin;
        }
        doc.setFont("Helvetica", "bold");
        doc.text(`${speaker}:`, margin, cursorY);
        cursorY += 16;
        doc.setFont("Helvetica", "normal");
        const lines = wrap(content);
        lines.forEach(line => {
          if (cursorY > 760) {
            doc.addPage();
            cursorY = margin;
          }
          doc.text(line, margin, cursorY);
          cursorY += 16;
        });
        cursorY += 10;
      };

      messages.forEach(message => {
        addMessage(message.is_user ? "You" : "Assistant", message.content);
      });

      const sanitizedTitle = (chatTitle || "chat-export").replace(/[^a-z0-9\-]+/gi, "-");
      doc.save(`${sanitizedTitle}.pdf`);
    } catch (error) {
      console.error("Failed to export conversation:", error);
      alert("Failed to export conversation. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={exportToPdf} disabled={exporting}>
      {exporting ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4 mr-2" />
          Export PDF
        </>
      )}
    </Button>
  );
}
