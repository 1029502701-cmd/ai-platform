// Ambient declarations for Cloudflare Workers + Node interop

declare var Buffer: {
  isBuffer(obj: unknown): boolean;
  from(data: string | Uint8Array, encoding?: string): Uint8Array;
};

declare var process: { env: Record<string, string | undefined> };

declare function require(id: string): any;

declare var window: unknown;

declare const Image: new (width?: number, height?: number) => HTMLImageElement & {
  crossOrigin: string | null;
  onload: ((ev: Event) => void) | null;
  onerror: ((ev: Event) => void) | null;
  src: string;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
};