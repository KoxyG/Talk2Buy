// React component for React sites: <Talk2BuyWidget projectId="choppaddi" apiUrl="https://…" />.
// It mounts the same widget (Preact inside a shadow root), so it works with any React version.

import { useEffect, useRef } from "react";
import { mount, type Widget, type WidgetOptions } from "./index";

export type { WidgetOptions } from "./index";

export function Talk2BuyWidget(props: WidgetOptions & { onReady?: (widget: Widget) => void }) {
  // Callbacks may change on every render; the widget always calls the latest ones.
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    const widget = mount({ ...props, getUserToken: () => latest.current.getUserToken?.() ?? null });
    props.onReady?.(widget);
    return () => widget.unmount();
  }, [props.projectId, props.apiUrl, props.area, props.language, props.themeColor]);

  return null;
}
