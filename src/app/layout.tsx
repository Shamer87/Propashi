import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Пропащі — База даних",
  description: "Система обліку зниклих безвісти, загиблих та полонених військовослужбовців окупантів.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body suppressHydrationWarning>
        <Sidebar />
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
