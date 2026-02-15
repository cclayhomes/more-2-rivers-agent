declare module 'canvas' {
  export function createCanvas(width: number, height: number): {
    getContext(contextId: '2d'): {
      fillStyle: string;
      font: string;
      fillRect(x: number, y: number, w: number, h: number): void;
      fillText(text: string, x: number, y: number, maxWidth?: number): void;
    };
    toBuffer(type?: string): Buffer;
  };
}
