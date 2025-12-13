declare module 'page-flip' {
  export interface PageFlipSettings {
    width?: number;
    height?: number;
    maxShadowOpacity?: number;
    showCover?: boolean;
    drawShadow?: boolean;
    flippingTime?: number;
    usePortrait?: boolean;
    startPage?: number;
    size?: 'fixed' | 'stretch';
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    autoSize?: boolean;
    mobileScrollSupport?: boolean;
  }

  export class PageFlip {
    constructor(container: HTMLElement, settings?: PageFlipSettings);
    loadFromHTML(pages: HTMLElement[]): void;
    flip(page: number): void;
    flipNext(): void;
    flipPrev(): void;
    getCurrentPageIndex(): number;
    on(event: 'flip' | 'flipEnd', callback: (e: { data: number }) => void): void;
    destroy(): void;
  }
}

