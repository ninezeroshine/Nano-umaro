const RESOLUTIONS: { [key: string]: { width: number; height: number } } = {
  '16:9': { width: 1280, height: 720 },
  '4:3': { width: 1024, height: 768 },
  '1:1': { width: 1024, height: 1024 },
  '3:4': { width: 768, height: 1024 },
  '9:16': { width: 720, height: 1280 },
};

export function generateBlankCanvasDataUrl(aspectRatio: string, color: string = 'black'): string {
  const resolution = RESOLUTIONS[aspectRatio];
  if (!resolution) {
    console.error(`Invalid aspect ratio: ${aspectRatio}. Defaulting to 1:1.`);
    return generateBlankCanvasDataUrl('1:1', color);
  }

  const { width, height } = resolution;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
  }
  
  return canvas.toDataURL('image/png');
}
