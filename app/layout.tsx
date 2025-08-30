import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import React from "react";
export default function RootLayout({children,}: Readonly<{children: React.ReactNode;}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
