import "../styles.css";
import { Providers } from "./providers";

export const metadata = {
  title: "Factrova",
  description: "Factory operations platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
