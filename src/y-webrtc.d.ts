declare module "y-webrtc" {
  import type { Doc } from "yjs";
  import type { Awareness } from "y-protocols/awareness";

  export class WebrtcProvider {
    readonly awareness: Awareness;
    readonly key: Promise<CryptoKey | null>;
    constructor(
      roomName: string,
      doc: Doc,
      opts?: {
        signaling?: string[];
        password?: string;
        awareness?: Awareness;
        maxConns?: number;
        filterBcConns?: boolean;
        peerOpts?: Record<string, unknown>;
      },
    );
    destroy(): void;
    disconnect(): void;
    connect(): void;
  }
}
