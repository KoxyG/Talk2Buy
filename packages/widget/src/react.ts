// React component for React sites: <Talk2BuyWidget projectId="choppaddi" apiUrl="https://…" />.
// It mounts the same widget (Preact inside a shadow root), so it works with any React version.

import { useEffect, useRef } from "react";
import { mount, type Widget, type WidgetOptions } from "./index";

export type { Theme, WidgetOptions } from "./index";

export function Talk2BuyWidget(props: WidgetOptions & { onReady?: (widget: Widget) => void }) {
  // Callbacks may change on every render; the widget always calls the latest ones.
  const latest = useRef(props);
  latest.current = props;
  const widget = useRef<Widget | null>(null);

  useEffect(() => {
    const w = mount({ ...props, getUserToken: () => latest.current.getUserToken?.() ?? null });
    widget.current = w;
    props.onReady?.(w);
    return () => {
      w.unmount();
      widget.current = null;
    };
  }, [props.projectId, props.apiUrl, props.area, props.language, props.themeColor]);

  // A theme change restyles the widget in place instead of remounting it.
  useEffect(() => {
    widget.current?.setTheme(props.theme ?? "light");
  }, [props.theme]);

  return null;
}
