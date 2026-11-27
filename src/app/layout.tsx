import type { Metadata, Viewport } from "next";
import { Pixelify_Sans } from "next/font/google";
import { DEFAULT_PACK_ID, GAME_NAME, PACK_PENDING_ATTR, PACK_STORAGE_KEY } from "@/config/game";
import { UI_LANG } from "@/i18n/strings";
import "./globals.css";

const pixel = Pixelify_Sans({
  variable: "--font-pixel",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: GAME_NAME,
  description: `${GAME_NAME}: a tiny pixel word duel for vocabulary practice.`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2A2440",
};

/** Runs before the first paint: hides the page while a non-default pack is stored (see PACK_PENDING_ATTR). */
const packPendingScript = `(function(){try{var p=localStorage.getItem(${JSON.stringify(PACK_STORAGE_KEY)});if(p&&p!==${JSON.stringify(DEFAULT_PACK_ID)})document.documentElement.setAttribute(${JSON.stringify(PACK_PENDING_ATTR)},"")}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={UI_LANG} className={pixel.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: packPendingScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
