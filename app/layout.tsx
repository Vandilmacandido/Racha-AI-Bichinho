import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Racha AI Bichinho',
  description: 'Uma aplicação web moderna para dividir despesas de forma justa utilizando IA.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <script type="importmap" dangerouslySetInnerHTML={{__html: `
          {
            "imports": {
              "lucide-react": "https://aistudiocdn.com/lucide-react@^0.555.0",
              "@google/genai": "https://aistudiocdn.com/@google/genai@^1.30.0"
            }
          }
        `}} />
      </head>
      <body style={{ fontFamily: "'Inter', sans-serif" }} className="bg-slate-50">
        {children}
      </body>
    </html>
  );
}