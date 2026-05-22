export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"> {/* Add the html tag */}
      <body> {/* Add the body tag */}
        {children} {/* Render the rest of the app */}
      </body>
    </html>
  );
}
