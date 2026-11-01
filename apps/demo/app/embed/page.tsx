// The hosted chat, for host sites to open in a frame (a popup, side panel or page), like hosted
// KYC or checkout pages. Settings come from the URL:
//   /embed?project=choppaddi&theme=dark&language=pcm&color=%23e2480f&areas=Lagos,Abuja&voice&feedback
// Which sites may frame it is set in proxy.ts; what it tells the host page is in embed-chat.tsx.

import { EmbedChat } from "./embed-chat";

type Search = Record<string, string | string[] | undefined>;

export default async function EmbedPage({ searchParams }: { searchParams: Promise<Search> }) {
  const q = await searchParams;
  const one = (key: string) => (typeof q[key] === "string" ? q[key] : undefined);
  return (
    <EmbedChat
      projectId={one("project") ?? ""}
      theme={one("theme") === "dark" ? "dark" : "light"}
      language={one("language") === "pcm" ? "pcm" : "en"}
      themeColor={one("color")}
      area={one("area")}
      areas={one("areas")?.split(",").map((a) => a.trim()).filter(Boolean)}
      voice={"voice" in q}
      feedback={"feedback" in q}
    />
  );
}
