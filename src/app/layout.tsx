import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "UNIVERSO EDU - Plataforma Educativa para 6to Grado",
  description: "Plataforma educativa interactiva para estudiantes de sexto grado de primaria. Aprende con EDU, tareas por campos formativos y cuentos diarios.",
  keywords: ["educación", "niños", "primaria", "6to grado", "aprendizaje", "campos formativos", "México"],
  authors: [{ name: "UNIVERSO EDU Team" }],
  icons: {
    icon: "/mascot-owl.png",
  },
  openGraph: {
    title: "UNIVERSO EDU - Aprende con EDU",
    description: "Tu compañero de aprendizaje para 6to grado con tareas por campos formativos.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} ${fraunces.variable} font-sans antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
