import "./globals.css";

export const metadata = {
  title: "Sign in",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-serif antialiased">{children}</body>
    </html>
  );
}
