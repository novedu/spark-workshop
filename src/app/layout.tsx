import type { Metadata, Viewport } from "next";
import { PwaRegistration } from "@/components/PwaRegistration";
import "./globals.css";

export const metadata: Metadata = {
  title: "灵光一闪 AI创意工坊",
  description: "从一句话灵感，到一套完整自洽的世界框架。",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
