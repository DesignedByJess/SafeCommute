const OPENCV_CDN = 'https://docs.opencv.org/4.9.0/opencv.js'
const PERSPECTIVE_OUTPUT_W = 320
const PERSPECTIVE_OUTPUT_H = 80

export interface Point {
  x: number
  y: number
}

export interface DetectedPlate {
  x: number
  y: number
  width: number
  height: number
  confidence: number
  corners: [Point, Point, Point, Point]
}

let loadPromise: Promise<boolean> | null = null

async function loadOpenCv(): Promise<boolean> {
  if ((window as any).cv?.Mat) return true
  if (loadPromise) return loadPromise

  loadPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement('script')
    script.src = OPENCV_CDN
    script.async = true
    script.onload = () => {
      const poll = setInterval(() => {
        if ((window as any).cv?.Mat) {
          clearInterval(poll)
          resolve(true)
        }
      }, 200)
      setTimeout(() => { clearInterval(poll); resolve(false) }, 40000)
    }
    script.onerror = () => {
      loadPromise = null
      resolve(false)
    }
    document.head.appendChild(script)
  })

  return loadPromise
}

function cv(): any {
  return (window as any).cv
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  return canvas
}

function cleanup(...mats: any[]): void {
  for (const m of mats) {
    try { m.delete() } catch { /* ignore */ }
  }
}

export interface OpenCvResult {
  correctedImage: string
  detectedRegion: DetectedPlate
}

export async function detectAndCorrectPlate(
  imageDataUrl: string,
): Promise<OpenCvResult | null> {
  const ok = await loadOpenCv()
  if (!ok) return null

  const _cv = cv()
  const img = await loadImage(imageDataUrl)
  const canvas = imageToCanvas(img)
  const src = _cv.imread(canvas)
  const gray = new _cv.Mat()
  const blurred = new _cv.Mat()
  const edges = new _cv.Mat()
  const dilated = new _cv.Mat()
  const contours = new _cv.MatVector()
  const hierarchy = new _cv.Mat()

  try {
    _cv.cvtColor(src, gray, _cv.COLOR_RGBA2GRAY)
    _cv.GaussianBlur(gray, blurred, new _cv.Size(5, 5), 0)
    _cv.Canny(blurred, edges, 50, 150)

    const kernel = _cv.getStructuringElement(_cv.MORPH_RECT, new _cv.Size(3, 3))
    _cv.dilate(edges, dilated, kernel)
    kernel.delete()

    _cv.findContours(dilated, contours, hierarchy, _cv.RETR_EXTERNAL, _cv.CHAIN_APPROX_SIMPLE)

    let best: DetectedPlate | null = null
    let bestScore = 0
    const totalArea = img.naturalWidth * img.naturalHeight

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i)
      const area = _cv.contourArea(contour)
      if (area < totalArea * 0.005) {
        contour.delete()
        continue
      }

      const rect = _cv.boundingRect(contour)
      const aspect = rect.width / rect.height
      if (aspect < 1.5 || aspect > 6) {
        contour.delete()
        continue
      }

      const peri = _cv.arcLength(contour, true)
      const approx = new _cv.Mat()
      _cv.approxPolyDP(contour, approx, 0.02 * peri, true)

      const areaRatio = area / totalArea
      const aspectScore = 1 - Math.abs(aspect - 4.5) / 5
      const score = areaRatio * aspectScore

      if (score > bestScore) {
        let corners: [Point, Point, Point, Point]
        if (approx.rows === 4) {
          corners = [
            { x: approx.data32S[0], y: approx.data32S[1] },
            { x: approx.data32S[2], y: approx.data32S[3] },
            { x: approx.data32S[4], y: approx.data32S[5] },
            { x: approx.data32S[6], y: approx.data32S[7] },
          ]
          corners = sortCorners(corners)
        } else {
          corners = rectToCorners(rect)
        }

        bestScore = score
        best = {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          confidence: Math.round(score * 100),
          corners,
        }
      }

      approx.delete()
      contour.delete()
    }

    if (!best || best.confidence < 1) return null

    const dst = new _cv.Mat()
    try {
      const sorted = sortCorners(best.corners)
      const srcPts = _cv.matFromArray(4, 1, _cv.CV_32FC2, [
        sorted[0].x, sorted[0].y,
        sorted[1].x, sorted[1].y,
        sorted[2].x, sorted[2].y,
        sorted[3].x, sorted[3].y,
      ])
      const dstPts = _cv.matFromArray(4, 1, _cv.CV_32FC2, [
        0, 0,
        PERSPECTIVE_OUTPUT_W, 0,
        PERSPECTIVE_OUTPUT_W, PERSPECTIVE_OUTPUT_H,
        0, PERSPECTIVE_OUTPUT_H,
      ])
      const M = _cv.getPerspectiveTransform(srcPts, dstPts)
      _cv.warpPerspective(
        src, dst, M,
        new _cv.Size(PERSPECTIVE_OUTPUT_W, PERSPECTIVE_OUTPUT_H),
        _cv.INTER_LINEAR, _cv.BORDER_CONSTANT, new _cv.Scalar(255, 255, 255, 255),
      )

      const outCanvas = document.createElement('canvas')
      outCanvas.width = PERSPECTIVE_OUTPUT_W
      outCanvas.height = PERSPECTIVE_OUTPUT_H
      _cv.imshow(outCanvas, dst)

      M.delete()
      srcPts.delete()
      dstPts.delete()

      return {
        correctedImage: outCanvas.toDataURL('image/jpeg', 0.95),
        detectedRegion: best,
      }
    } finally {
      dst.delete()
    }
  } finally {
    cleanup(src, gray, blurred, edges, dilated, contours, hierarchy)
  }
}

function sortCorners(points: [Point, Point, Point, Point]): [Point, Point, Point, Point] {
  const sorted = [...points].sort((a, b) => a.y - b.y)
  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x)
  const bottom = sorted.slice(2).sort((a, b) => a.x - b.x)
  return [top[0], top[1], bottom[1], bottom[0]]
}

function rectToCorners(r: { x: number; y: number; width: number; height: number }): [Point, Point, Point, Point] {
  return [
    { x: r.x, y: r.y },
    { x: r.x + r.width, y: r.y },
    { x: r.x + r.width, y: r.y + r.height },
    { x: r.x, y: r.y + r.height },
  ]
}
