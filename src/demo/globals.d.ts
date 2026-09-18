import type { DetailedHTMLProps, HTMLAttributes } from "react";

export {};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "text-editor": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        readonly?: boolean;
        "update-url"?: string;
        "gallery-url"?: string;
        "data-room-id"?: string;
        "data-user-id"?: string;
      };
    }
  }
}
