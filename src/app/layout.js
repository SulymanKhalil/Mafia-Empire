import "./globals.css";

export const metadata = {
  title: "Night Syndicate",
  description: "Anonymous realtime mafia chat",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
