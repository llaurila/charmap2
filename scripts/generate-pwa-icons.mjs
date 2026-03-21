import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const iconsDir = join(projectRoot, 'public', 'icons')

const createCrcTable = () => {
  const table = new Uint32Array(256)

  for (let index = 0; index < table.length; index += 1) {
    let value = index

    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }

    table[index] = value >>> 0
  }

  return table
}

const crcTable = createCrcTable()

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max)
const mix = (start, end, amount) => start + (end - start) * amount
const distance = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2)

const mixColor = (start, end, amount) => [
  mix(start[0], end[0], amount),
  mix(start[1], end[1], amount),
  mix(start[2], end[2], amount),
]

const colorWithAlpha = (red, green, blue, alpha = 1) => [red, green, blue, alpha]

const colors = {
  deepSea: colorWithAlpha(6, 49, 63),
  teal: colorWithAlpha(13, 111, 104),
  tealDark: colorWithAlpha(8, 79, 74),
  ivory: colorWithAlpha(250, 248, 241),
  ivoryShade: colorWithAlpha(238, 240, 234),
  warmGlow: colorWithAlpha(255, 232, 178),
  coolGlow: colorWithAlpha(166, 227, 224),
  white: colorWithAlpha(255, 255, 255),
  ink: colorWithAlpha(24, 34, 47),
}

const orbitTiles = [
  { x: 0.09, y: 0.15, w: 0.125, h: 0.125, r: 0.032 },
  { x: 0.12, y: 0.36, w: 0.1, h: 0.1, r: 0.028 },
  { x: 0.13, y: 0.57, w: 0.11, h: 0.11, r: 0.03 },
  { x: 0.79, y: 0.14, w: 0.12, h: 0.12, r: 0.03 },
  { x: 0.74, y: 0.59, w: 0.14, h: 0.14, r: 0.035 },
]

const orbitTileDotOffsets = [
  { x: 0.34, y: 0.34 },
  { x: 0.62, y: 0.34 },
  { x: 0.34, y: 0.62 },
  { x: 0.62, y: 0.62 },
]

const sigmaStrokePoints = [
  { x: 0.664, y: 0.348 },
  { x: 0.356, y: 0.348 },
  { x: 0.618, y: 0.5 },
  { x: 0.356, y: 0.654 },
  { x: 0.676, y: 0.654 },
]

const sideCells = [
  { x: 0.296, y: 0.386, w: 0.052, h: 0.052, r: 0.017 },
  { x: 0.296, y: 0.474, w: 0.052, h: 0.052, r: 0.017 },
  { x: 0.296, y: 0.562, w: 0.052, h: 0.052, r: 0.017 },
  { x: 0.648, y: 0.404, w: 0.052, h: 0.052, r: 0.017 },
  { x: 0.648, y: 0.492, w: 0.052, h: 0.052, r: 0.017 },
  { x: 0.648, y: 0.58, w: 0.052, h: 0.052, r: 0.017 },
]

const footerCells = [
  { x: 0.31, y: 0.706, w: 0.08, h: 0.05, r: 0.018 },
  { x: 0.41, y: 0.706, w: 0.08, h: 0.05, r: 0.018 },
  { x: 0.51, y: 0.706, w: 0.08, h: 0.05, r: 0.018 },
  { x: 0.61, y: 0.706, w: 0.08, h: 0.05, r: 0.018 },
]

const headerDots = [
  { x: 0.364, y: 0.279, r: 0.013 },
  { x: 0.418, y: 0.279, r: 0.013 },
  { x: 0.472, y: 0.279, r: 0.013 },
]

const headerDotOpacities = [0.34, 0.24, 0.18]
const sideCellOpacities = [0.82, 0.76, 0.7]

const offsetPoints = (points, offsetX = 0, offsetY = 0) =>
  points.map(({ x, y }) => ({ x: x + offsetX, y: y + offsetY }))

const crc32 = (buffer) => {
  let value = 0xffffffff

  for (let index = 0; index < buffer.length; index += 1) {
    value = crcTable[(value ^ buffer[index]) & 0xff] ^ (value >>> 8)
  }

  return (value ^ 0xffffffff) >>> 0
}

const pngChunk = (type, data) => {
  const typeBuffer = Buffer.from(type)
  const lengthBuffer = Buffer.alloc(4)
  lengthBuffer.writeUInt32BE(data.length, 0)

  const crcBuffer = Buffer.alloc(4)
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0)

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer])
}

const writePng = (filePath, width, height, rgba) => {
  const scanlines = Buffer.alloc((width * 4 + 1) * height)

  for (let y = 0; y < height; y += 1) {
    const scanlineOffset = y * (width * 4 + 1)
    scanlines[scanlineOffset] = 0

    for (let x = 0; x < width * 4; x += 1) {
      scanlines[scanlineOffset + 1 + x] = rgba[y * width * 4 + x]
    }
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 6
  header[10] = 0
  header[11] = 0
  header[12] = 0

  const fileBuffer = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(scanlines, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])

  writeFileSync(filePath, fileBuffer)
}

const blendPixel = (buffer, width, x, y, color, alpha = 1) => {
  if (x < 0 || y < 0 || x >= width || y >= width) {
    return
  }

  const index = (y * width + x) * 4
  const amount = clamp(alpha)
  const inverse = 1 - amount

  buffer[index] = Math.round(buffer[index] * inverse + color[0] * amount)
  buffer[index + 1] = Math.round(buffer[index + 1] * inverse + color[1] * amount)
  buffer[index + 2] = Math.round(buffer[index + 2] * inverse + color[2] * amount)
  buffer[index + 3] = 255
}

const fillBackground = (buffer, width) => {
  for (let y = 0; y < width; y += 1) {
    const ny = y / (width - 1)

    for (let x = 0; x < width; x += 1) {
      const nx = x / (width - 1)
      const base = mixColor(colors.teal, colors.deepSea, Math.pow(ny, 0.88))
      const warmGlow = Math.pow(clamp(1 - distance(nx, ny, 0.16, 0.14) / 0.45), 2.3)
      const coolGlow = Math.pow(clamp(1 - distance(nx, ny, 0.88, 0.82) / 0.42), 2.1)
      const topMist = Math.pow(clamp(1 - distance(nx, ny, 0.5, -0.15) / 0.9), 2.8)

      const red = clamp((base[0] + colors.warmGlow[0] * warmGlow * 0.52 + colors.coolGlow[0] * coolGlow * 0.25 + 255 * topMist * 0.08) / 255, 0, 1) * 255
      const green = clamp((base[1] + colors.warmGlow[1] * warmGlow * 0.44 + colors.coolGlow[1] * coolGlow * 0.3 + 255 * topMist * 0.08) / 255, 0, 1) * 255
      const blue = clamp((base[2] + colors.warmGlow[2] * warmGlow * 0.16 + colors.coolGlow[2] * coolGlow * 0.52 + 255 * topMist * 0.1) / 255, 0, 1) * 255
      const index = (y * width + x) * 4

      buffer[index] = Math.round(red)
      buffer[index + 1] = Math.round(green)
      buffer[index + 2] = Math.round(blue)
      buffer[index + 3] = 255
    }
  }
}

const fillRoundedRect = (buffer, width, x, y, rectWidth, rectHeight, radius, color, alpha = 1) => {
  const minX = Math.max(0, Math.floor((x - radius) * width))
  const maxX = Math.min(width - 1, Math.ceil((x + rectWidth + radius) * width))
  const minY = Math.max(0, Math.floor((y - radius) * width))
  const maxY = Math.min(width - 1, Math.ceil((y + rectHeight + radius) * width))
  const centerX = x + rectWidth / 2
  const centerY = y + rectHeight / 2
  const halfWidth = rectWidth / 2 - radius
  const halfHeight = rectHeight / 2 - radius

  for (let pixelY = minY; pixelY <= maxY; pixelY += 1) {
    const ny = (pixelY + 0.5) / width

    for (let pixelX = minX; pixelX <= maxX; pixelX += 1) {
      const nx = (pixelX + 0.5) / width
      const qx = Math.abs(nx - centerX) - halfWidth
      const qy = Math.abs(ny - centerY) - halfHeight
      const edgeX = Math.max(qx, 0)
      const edgeY = Math.max(qy, 0)
      const signedDistance = Math.min(Math.max(qx, qy), 0) + Math.hypot(edgeX, edgeY) - radius

      if (signedDistance <= 0) {
        blendPixel(buffer, width, pixelX, pixelY, color, alpha)
      }
    }
  }
}

const fillSoftCircle = (buffer, width, centerX, centerY, radius, color, alpha = 1) => {
  const minX = Math.max(0, Math.floor((centerX - radius) * width))
  const maxX = Math.min(width - 1, Math.ceil((centerX + radius) * width))
  const minY = Math.max(0, Math.floor((centerY - radius) * width))
  const maxY = Math.min(width - 1, Math.ceil((centerY + radius) * width))

  for (let pixelY = minY; pixelY <= maxY; pixelY += 1) {
    const ny = (pixelY + 0.5) / width

    for (let pixelX = minX; pixelX <= maxX; pixelX += 1) {
      const nx = (pixelX + 0.5) / width
      const amount = clamp(1 - distance(nx, ny, centerX, centerY) / radius)

      if (amount > 0) {
        blendPixel(buffer, width, pixelX, pixelY, color, Math.pow(amount, 2.2) * alpha)
      }
    }
  }
}

const fillCapsule = (buffer, width, x1, y1, x2, y2, radius, color, alpha = 1) => {
  const minX = Math.max(0, Math.floor((Math.min(x1, x2) - radius) * width))
  const maxX = Math.min(width - 1, Math.ceil((Math.max(x1, x2) + radius) * width))
  const minY = Math.max(0, Math.floor((Math.min(y1, y2) - radius) * width))
  const maxY = Math.min(width - 1, Math.ceil((Math.max(y1, y2) + radius) * width))
  const dx = x2 - x1
  const dy = y2 - y1
  const lengthSquared = dx * dx + dy * dy

  for (let pixelY = minY; pixelY <= maxY; pixelY += 1) {
    const ny = (pixelY + 0.5) / width

    for (let pixelX = minX; pixelX <= maxX; pixelX += 1) {
      const nx = (pixelX + 0.5) / width
      const amount = lengthSquared === 0 ? 0 : clamp(((nx - x1) * dx + (ny - y1) * dy) / lengthSquared)
      const closestX = x1 + dx * amount
      const closestY = y1 + dy * amount

      if (distance(nx, ny, closestX, closestY) <= radius) {
        blendPixel(buffer, width, pixelX, pixelY, color, alpha)
      }
    }
  }
}

const fillPolyline = (buffer, width, points, radius, color, alpha = 1) => {
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index]
    const end = points[index + 1]
    fillCapsule(buffer, width, start.x, start.y, end.x, end.y, radius, color, alpha)
  }
}

const renderOrbitTiles = (buffer, width) => {
  const tileColor = colorWithAlpha(255, 255, 255)
  const detailColor = colorWithAlpha(255, 255, 255)

  for (const tile of orbitTiles) {
    fillRoundedRect(buffer, width, tile.x, tile.y, tile.w, tile.h, tile.r, tileColor, 0.1)

    const dotSize = Math.min(tile.w, tile.h) * 0.19
    const dotRadius = dotSize * 0.45

    for (const dotOffset of orbitTileDotOffsets) {
      fillRoundedRect(
        buffer,
        width,
        tile.x + tile.w * dotOffset.x - dotSize / 2,
        tile.y + tile.h * dotOffset.y - dotSize / 2,
        dotSize,
        dotSize,
        dotRadius,
        detailColor,
        0.14,
      )
    }
  }
}

const downsampleBox = (source, width, height, factor) => {
  const targetWidth = Math.floor(width / factor)
  const targetHeight = Math.floor(height / factor)
  const target = new Uint8ClampedArray(targetWidth * targetHeight * 4)

  for (let y = 0; y < targetHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      let red = 0
      let green = 0
      let blue = 0
      let alpha = 0

      for (let offsetY = 0; offsetY < factor; offsetY += 1) {
        for (let offsetX = 0; offsetX < factor; offsetX += 1) {
          const sourceIndex = (((y * factor + offsetY) * width) + (x * factor + offsetX)) * 4
          red += source[sourceIndex]
          green += source[sourceIndex + 1]
          blue += source[sourceIndex + 2]
          alpha += source[sourceIndex + 3]
        }
      }

      const divisor = factor * factor
      const targetIndex = (y * targetWidth + x) * 4
      target[targetIndex] = Math.round(red / divisor)
      target[targetIndex + 1] = Math.round(green / divisor)
      target[targetIndex + 2] = Math.round(blue / divisor)
      target[targetIndex + 3] = Math.round(alpha / divisor)
    }
  }

  return target
}

const renderIcon = (size) => {
  const supersample = 4
  const renderSize = size * supersample
  const buffer = new Uint8ClampedArray(renderSize * renderSize * 4)

  fillBackground(buffer, renderSize)
  fillSoftCircle(buffer, renderSize, 0.18, 0.14, 0.23, colors.warmGlow, 0.24)
  fillSoftCircle(buffer, renderSize, 0.82, 0.82, 0.2, colors.coolGlow, 0.18)
  renderOrbitTiles(buffer, renderSize)

  fillRoundedRect(buffer, renderSize, 0.23, 0.235, 0.54, 0.56, 0.102, colors.ink, 0.08)
  fillRoundedRect(buffer, renderSize, 0.225, 0.22, 0.55, 0.58, 0.108, colors.ink, 0.04)
  fillRoundedRect(buffer, renderSize, 0.22, 0.2, 0.56, 0.58, 0.11, colors.ivory, 0.98)
  fillRoundedRect(buffer, renderSize, 0.235, 0.215, 0.53, 0.55, 0.092, colors.white, 0.55)
  fillSoftCircle(buffer, renderSize, 0.42, 0.31, 0.16, colors.warmGlow, 0.1)
  fillSoftCircle(buffer, renderSize, 0.61, 0.61, 0.18, colors.coolGlow, 0.08)

  fillRoundedRect(buffer, renderSize, 0.33, 0.245, 0.25, 0.07, 0.03, colors.tealDark, 0.12)

  for (let index = 0; index < headerDots.length; index += 1) {
    const dot = headerDots[index]
    const opacity = headerDotOpacities[index] ?? headerDotOpacities.at(-1) ?? 0.18

    fillRoundedRect(
      buffer,
      renderSize,
      dot.x - dot.r,
      dot.y - dot.r,
      dot.r * 2,
      dot.r * 2,
      dot.r,
      colors.tealDark,
      opacity,
    )
  }

  fillRoundedRect(buffer, renderSize, 0.62, 0.238, 0.09, 0.07, 0.026, colors.warmGlow, 0.38)
  fillSoftCircle(buffer, renderSize, 0.665, 0.273, 0.038, colors.white, 0.22)

  for (let index = 0; index < sideCells.length; index += 1) {
    const cell = sideCells[index]
    const opacity = sideCellOpacities[index % sideCellOpacities.length]

    fillRoundedRect(buffer, renderSize, cell.x, cell.y, cell.w, cell.h, cell.r, colors.ivoryShade, opacity)
  }

  fillSoftCircle(buffer, renderSize, 0.52, 0.48, 0.19, colors.warmGlow, 0.08)
  fillSoftCircle(buffer, renderSize, 0.53, 0.54, 0.2, colors.coolGlow, 0.08)

  fillPolyline(buffer, renderSize, offsetPoints(sigmaStrokePoints, -0.01, -0.006), 0.05, colors.coolGlow, 0.24)
  fillPolyline(buffer, renderSize, offsetPoints(sigmaStrokePoints, 0.008, 0.01), 0.052, colors.ink, 0.14)
  fillPolyline(buffer, renderSize, sigmaStrokePoints, 0.036, colors.tealDark, 1)
  fillPolyline(buffer, renderSize, offsetPoints(sigmaStrokePoints, -0.003, -0.006), 0.014, colors.teal, 0.45)

  for (let index = 0; index < footerCells.length; index += 1) {
    const cell = footerCells[index]
    const opacity = 0.76 - index * 0.02

    fillRoundedRect(buffer, renderSize, cell.x, cell.y, cell.w, cell.h, cell.r, colors.ivoryShade, opacity)
  }

  return downsampleBox(buffer, renderSize, renderSize, supersample)
}

const resizeBilinear = (source, sourceWidth, sourceHeight, targetWidth, targetHeight) => {
  const target = new Uint8ClampedArray(targetWidth * targetHeight * 4)

  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = targetHeight === 1 ? 0 : (y * (sourceHeight - 1)) / (targetHeight - 1)
    const top = Math.floor(sourceY)
    const bottom = Math.min(sourceHeight - 1, top + 1)
    const verticalMix = sourceY - top

    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = targetWidth === 1 ? 0 : (x * (sourceWidth - 1)) / (targetWidth - 1)
      const left = Math.floor(sourceX)
      const right = Math.min(sourceWidth - 1, left + 1)
      const horizontalMix = sourceX - left
      const targetIndex = (y * targetWidth + x) * 4

      for (let channel = 0; channel < 4; channel += 1) {
        const topLeft = source[(top * sourceWidth + left) * 4 + channel]
        const topRight = source[(top * sourceWidth + right) * 4 + channel]
        const bottomLeft = source[(bottom * sourceWidth + left) * 4 + channel]
        const bottomRight = source[(bottom * sourceWidth + right) * 4 + channel]
        const topMix = mix(topLeft, topRight, horizontalMix)
        const bottomMix = mix(bottomLeft, bottomRight, horizontalMix)
        target[targetIndex + channel] = Math.round(mix(topMix, bottomMix, verticalMix))
      }
    }
  }

  return target
}

const svgCanvasSize = 512

const toSvgPixels = (value) => Number.parseFloat((value * svgCanvasSize).toFixed(3)).toString()

const svgAttributes = (attributes) =>
  Object.entries(attributes)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => ` ${key}="${value}"`)
    .join('')

const svgRect = ({ x, y, w, h, r, ...attributes }) =>
  `  <rect x="${toSvgPixels(x)}" y="${toSvgPixels(y)}" width="${toSvgPixels(w)}" height="${toSvgPixels(h)}" rx="${toSvgPixels(r)}"${svgAttributes(attributes)} />`

const svgCircle = ({ cx, cy, r, ...attributes }) =>
  `  <circle cx="${toSvgPixels(cx)}" cy="${toSvgPixels(cy)}" r="${toSvgPixels(r)}"${svgAttributes(attributes)} />`

const svgPolyline = (points, attributes) => {
  const d = points
    .map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${toSvgPixels(x)} ${toSvgPixels(y)}`)
    .join(' ')

  return `  <path d="${d}"${svgAttributes(attributes)} />`
}

const buildSvgIcon = () => {
  const orbitTileMarkup = orbitTiles.flatMap((tile) => {
    const dotSize = Math.min(tile.w, tile.h) * 0.19
    const dotRadius = dotSize * 0.45

    return [
      svgRect({ x: tile.x, y: tile.y, w: tile.w, h: tile.h, r: tile.r, fill: '#fff', 'fill-opacity': 0.1 }),
      ...orbitTileDotOffsets.map((dotOffset) =>
        svgRect({
          x: tile.x + tile.w * dotOffset.x - dotSize / 2,
          y: tile.y + tile.h * dotOffset.y - dotSize / 2,
          w: dotSize,
          h: dotSize,
          r: dotRadius,
          fill: '#fff',
          'fill-opacity': 0.14,
        }),
      ),
    ]
  }).join('\n')

  const headerDotMarkup = headerDots
    .map((dot, index) =>
      svgRect({
        x: dot.x - dot.r,
        y: dot.y - dot.r,
        w: dot.r * 2,
        h: dot.r * 2,
        r: dot.r,
        fill: '#084f4a',
        'fill-opacity': headerDotOpacities[index] ?? headerDotOpacities.at(-1) ?? 0.18,
      }),
    )
    .join('\n')

  const sideCellMarkup = sideCells
    .map((cell, index) =>
      svgRect({
        x: cell.x,
        y: cell.y,
        w: cell.w,
        h: cell.h,
        r: cell.r,
        fill: '#eef0ea',
        'fill-opacity': sideCellOpacities[index % sideCellOpacities.length],
      }),
    )
    .join('\n')

  const footerCellMarkup = footerCells
    .map((cell, index) =>
      svgRect({
        x: cell.x,
        y: cell.y,
        w: cell.w,
        h: cell.h,
        r: cell.r,
        fill: '#eef0ea',
        'fill-opacity': 0.76 - index * 0.02,
      }),
    )
    .join('\n')

  const sigmaGlow = svgPolyline(offsetPoints(sigmaStrokePoints, -0.01, -0.006), {
    stroke: '#a6e3e0',
    'stroke-width': toSvgPixels(0.05),
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-opacity': 0.24,
  })

  const sigmaShadow = svgPolyline(offsetPoints(sigmaStrokePoints, 0.008, 0.01), {
    stroke: '#18222f',
    'stroke-width': toSvgPixels(0.052),
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-opacity': 0.14,
  })

  const sigmaMain = svgPolyline(sigmaStrokePoints, {
    stroke: '#084f4a',
    'stroke-width': toSvgPixels(0.036),
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  })

  const sigmaHighlight = svgPolyline(offsetPoints(sigmaStrokePoints, -0.003, -0.006), {
    stroke: '#0d6f68',
    'stroke-width': toSvgPixels(0.014),
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-opacity': 0.45,
  })

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="bg" x1="80" y1="64" x2="408" y2="456" gradientUnits="userSpaceOnUse">
      <stop stop-color="#268178" />
      <stop offset="1" stop-color="#06313f" />
    </linearGradient>
    <radialGradient id="warm" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(98 86) rotate(45) scale(190)">
      <stop stop-color="#ffe8b2" stop-opacity="0.78" />
      <stop offset="1" stop-color="#ffe8b2" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="cool" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(430 424) rotate(90) scale(168)">
      <stop stop-color="#a6e3e0" stop-opacity="0.45" />
      <stop offset="1" stop-color="#a6e3e0" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)" />
  <rect width="512" height="512" rx="112" fill="url(#warm)" />
  <rect width="512" height="512" rx="112" fill="url(#cool)" />
${orbitTileMarkup}
${svgRect({ x: 0.23, y: 0.235, w: 0.54, h: 0.56, r: 0.102, fill: '#112836', 'fill-opacity': 0.08 })}
${svgRect({ x: 0.225, y: 0.22, w: 0.55, h: 0.58, r: 0.108, fill: '#112836', 'fill-opacity': 0.04 })}
${svgRect({ x: 0.22, y: 0.2, w: 0.56, h: 0.58, r: 0.11, fill: '#faf8f1' })}
${svgRect({ x: 0.235, y: 0.215, w: 0.53, h: 0.55, r: 0.092, fill: '#fff', 'fill-opacity': 0.55 })}
${svgCircle({ cx: 0.42, cy: 0.31, r: 0.16, fill: '#ffe8b2', 'fill-opacity': 0.1 })}
${svgCircle({ cx: 0.61, cy: 0.61, r: 0.18, fill: '#a6e3e0', 'fill-opacity': 0.08 })}
${svgRect({ x: 0.33, y: 0.245, w: 0.25, h: 0.07, r: 0.03, fill: '#084f4a', 'fill-opacity': 0.12 })}
${headerDotMarkup}
${svgRect({ x: 0.62, y: 0.238, w: 0.09, h: 0.07, r: 0.026, fill: '#ffe8b2', 'fill-opacity': 0.38 })}
${svgCircle({ cx: 0.665, cy: 0.273, r: 0.038, fill: '#fff', 'fill-opacity': 0.22 })}
${sideCellMarkup}
${svgCircle({ cx: 0.52, cy: 0.48, r: 0.19, fill: '#ffe8b2', 'fill-opacity': 0.08 })}
${svgCircle({ cx: 0.53, cy: 0.54, r: 0.2, fill: '#a6e3e0', 'fill-opacity': 0.08 })}
${sigmaGlow}
${sigmaShadow}
${sigmaMain}
${sigmaHighlight}
${footerCellMarkup}
</svg>
`.trimStart()
}

const svgIcon = buildSvgIcon()

mkdirSync(iconsDir, { recursive: true })

const icon512 = renderIcon(512)
const icon192 = resizeBilinear(icon512, 512, 512, 192, 192)
const appleTouchIcon = resizeBilinear(icon512, 512, 512, 180, 180)

writePng(join(iconsDir, 'icon-512.png'), 512, 512, icon512)
writePng(join(iconsDir, 'icon-192.png'), 192, 192, icon192)
writePng(join(iconsDir, 'apple-touch-icon.png'), 180, 180, appleTouchIcon)
writeFileSync(join(iconsDir, 'icon.svg'), svgIcon)
