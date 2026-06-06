import "./globals.css";

export const metadata = {
  title: "Mafia Empire",
  description: "Anonymous realtime mafia chat",
  icons: {
    icon: "/favicon.png"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
