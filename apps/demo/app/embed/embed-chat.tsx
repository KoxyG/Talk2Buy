"use client";

// Mounts the chat filling the frame and tells the host page what happens, with postMessage:
//   { type: "talk2buy:ready" }                         the chat has loaded
//   { type: "talk2buy:close" }                         the customer pressed the close button
//   { type: "talk2buy:orders", orders, total }         orders wait for the customer's Confirm
//   { type: "talk2buy:confirmed", orderIds }           the customer confirmed them
//   { type: "talk2buy:cart", vendorId, vendorSlug, items }   one per shop, for the host's own checkout
// Messages go only to the page that framed this one, never to "*".

import { mount, type WidgetEvent, type WidgetOptions } from "@talk2buy/widget";
import { useEffect, useRef } from "react";

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8787";

// The framing page's origin. Chrome and Safari list it in ancestorOrigins; Firefox only gives the referrer.
function parentOrigin(): string | null {
  if (window.parent === window) return null;
  const listed = window.location.ancestorOrigins?.[0];
  if (listed) return listed;
  try {
    return document.referrer ? new URL(document.referrer).origin : null;
  } catch {
    return null;
  }
}

type Props = Omit<WidgetOptions, "apiUrl" | "layout" | "container" | "onClose" | "onEvent">;

export function EmbedChat(props: Props) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const origin = parentOrigin();
    const post = (message: WidgetEvent | { type: "ready" | "close" }) => {
      if (origin) window.parent.postMessage({ ...message, type: `talk2buy:${message.type}` }, origin);
    };
    const widget = mount({
      ...props,
      apiUrl: AGENT_URL,
      layout: "inline",
      container: box.current!,
      onClose: origin ? () => post({ type: "close" }) : undefined,
      onEvent: post,
    });
    post({ type: "ready" });
    return () => widget.unmount();
    // Settings come from the URL and don't change while the page is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={box} style={{ height: "100dvh" }} />;
}
