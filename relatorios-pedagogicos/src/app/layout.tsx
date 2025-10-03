import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PPI",
  description: "Relatórios Pedagógicos Individualizados",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR"> {/* Mudei para pt-BR já que é um sistema em português */}
      <body className={`${outfit.variable} antialiased`}>
        <ThemeProvider>
          <SidebarProvider>
            {children}
            {/* Container do Toastify - deve ficar aqui para funcionar em todas as páginas */}
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}