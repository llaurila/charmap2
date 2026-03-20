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

const renderGlyphTiles = (buffer, width) => {
  const tileColor = colorWithAlpha(255, 255, 255)
  const detailColor = colorWithAlpha(255, 255, 255)

  const tiles = [
    { x: 0.09, y: 0.15, w: 0.125, h: 0.125, r: 0.032 },
    { x: 0.12, y: 0.36, w: 0.1, h: 0.1, r: 0.028 },
    { x: 0.13, y: 0.57, w: 0.11, h: 0.11, r: 0.03 },
    { x: 0.79, y: 0.14, w: 0.12, h: 0.12, r: 0.03 },
    { x: 0.74, y: 0.59, w: 0.14, h: 0.14, r: 0.035 },
  ]

  for (const tile of tiles) {
    fillRoundedRect(buffer, width, tile.x, tile.y, tile.w, tile.h, tile.r, tileColor, 0.1)
    fillRoundedRect(buffer, width, tile.x + tile.w * 0.22, tile.y + tile.h * 0.24, tile.w * 0.18, tile.h * 0.52, tile.w * 0.05, detailColor, 0.12)
    fillRoundedRect(buffer, width, tile.x + tile.w * 0.48, tile.y + tile.h * 0.32, tile.w * 0.22, tile.h * 0.12, tile.w * 0.05, detailColor, 0.12)
    fillRoundedRect(buffer, width, tile.x + tile.w * 0.48, tile.y + tile.h * 0.56, tile.w * 0.18, tile.h * 0.12, tile.w * 0.05, detailColor, 0.12)
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
  renderGlyphTiles(buffer, renderSize)

  fillRoundedRect(buffer, renderSize, 0.23, 0.235, 0.54, 0.56, 0.102, colors.ink, 0.08)
  fillRoundedRect(buffer, renderSize, 0.225, 0.22, 0.55, 0.58, 0.108, colors.ink, 0.04)
  fillRoundedRect(buffer, renderSize, 0.22, 0.2, 0.56, 0.58, 0.11, colors.ivory, 0.98)
  fillRoundedRect(buffer, renderSize, 0.235, 0.215, 0.53, 0.55, 0.092, colors.white, 0.55)
  fillSoftCircle(buffer, renderSize, 0.33, 0.27, 0.18, colors.warmGlow, 0.1)
  fillSoftCircle(buffer, renderSize, 0.67, 0.73, 0.14, colors.coolGlow, 0.08)

  fillRoundedRect(buffer, renderSize, 0.33, 0.245, 0.34, 0.07, 0.03, colors.tealDark, 0.12)
  fillRoundedRect(buffer, renderSize, 0.37, 0.265, 0.03, 0.03, 0.012, colors.tealDark, 0.34)
  fillRoundedRect(buffer, renderSize, 0.43, 0.265, 0.03, 0.03, 0.012, colors.tealDark, 0.24)
  fillRoundedRect(buffer, renderSize, 0.49, 0.265, 0.03, 0.03, 0.012, colors.tealDark, 0.18)

  fillCapsule(buffer, renderSize, 0.395, 0.34, 0.395, 0.71, 0.035, colors.coolGlow, 0.18)
  fillCapsule(buffer, renderSize, 0.395, 0.375, 0.66, 0.322, 0.032, colors.coolGlow, 0.15)
  fillCapsule(buffer, renderSize, 0.395, 0.505, 0.62, 0.455, 0.03, colors.coolGlow, 0.12)

  fillCapsule(buffer, renderSize, 0.41, 0.35, 0.41, 0.71, 0.038, colors.ink, 0.12)
  fillCapsule(buffer, renderSize, 0.41, 0.385, 0.675, 0.332, 0.035, colors.ink, 0.12)
  fillCapsule(buffer, renderSize, 0.41, 0.515, 0.635, 0.462, 0.033, colors.ink, 0.12)

  fillCapsule(buffer, renderSize, 0.395, 0.335, 0.395, 0.705, 0.03, colors.teal, 1)
  fillCapsule(buffer, renderSize, 0.395, 0.37, 0.655, 0.315, 0.027, colors.teal, 1)
  fillCapsule(buffer, renderSize, 0.395, 0.5, 0.615, 0.45, 0.025, colors.teal, 1)

  fillRoundedRect(buffer, renderSize, 0.31, 0.7, 0.08, 0.05, 0.018, colors.ivoryShade, 0.7)
  fillRoundedRect(buffer, renderSize, 0.41, 0.7, 0.08, 0.05, 0.018, colors.ivoryShade, 0.7)
  fillRoundedRect(buffer, renderSize, 0.51, 0.7, 0.08, 0.05, 0.018, colors.ivoryShade, 0.7)
  fillRoundedRect(buffer, renderSize, 0.61, 0.7, 0.08, 0.05, 0.018, colors.ivoryShade, 0.7)
  fillRoundedRect(buffer, renderSize, 0.645, 0.205, 0.07, 0.07, 0.026, colors.warmGlow, 0.38)
  fillSoftCircle(buffer, renderSize, 0.68, 0.24, 0.042, colors.white, 0.25)

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

const svgIcon = `
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
  <g opacity="0.12" fill="#fff">
    <rect x="46" y="78" width="64" height="64" rx="16" />
    <rect x="64" y="184" width="52" height="52" rx="14" />
    <rect x="72" y="294" width="56" height="56" rx="15" />
    <rect x="402" y="72" width="60" height="60" rx="15" />
    <rect x="378" y="300" width="70" height="70" rx="18" />
  </g>
  <g opacity="0.14" fill="#fff">
    <rect x="60" y="96" width="12" height="28" rx="5" />
    <rect x="82" y="104" width="18" height="8" rx="4" />
    <rect x="82" y="118" width="14" height="8" rx="4" />
    <rect x="79" y="199" width="10" height="24" rx="4" />
    <rect x="96" y="206" width="12" height="7" rx="3.5" />
    <rect x="94" y="219" width="10" height="7" rx="3.5" />
    <rect x="89" y="312" width="10" height="26" rx="4" />
    <rect x="106" y="320" width="13" height="7" rx="3.5" />
    <rect x="104" y="333" width="10" height="7" rx="3.5" />
    <rect x="417" y="87" width="11" height="26" rx="4" />
    <rect x="436" y="95" width="16" height="8" rx="4" />
    <rect x="435" y="108" width="13" height="8" rx="4" />
    <rect x="395" y="319" width="12" height="32" rx="4.5" />
    <rect x="416" y="329" width="18" height="8" rx="4" />
    <rect x="414" y="344" width="14" height="8" rx="4" />
  </g>
  <rect x="116" y="112" width="280" height="294" rx="56" fill="#112836" fill-opacity="0.12" />
  <rect x="112" y="102" width="288" height="298" rx="58" fill="#faf8f1" />
  <rect x="120" y="110" width="272" height="282" rx="48" fill="#fff" fill-opacity="0.55" />
  <rect x="170" y="124" width="172" height="36" rx="15" fill="#084f4a" fill-opacity="0.12" />
  <rect x="189" y="134" width="15" height="15" rx="6" fill="#084f4a" fill-opacity="0.34" />
  <rect x="220" y="134" width="15" height="15" rx="6" fill="#084f4a" fill-opacity="0.24" />
  <rect x="251" y="134" width="15" height="15" rx="6" fill="#084f4a" fill-opacity="0.18" />
  <path d="M202 181v194M202 199l136-29M202 267l116-26" stroke="#1b3a3a" stroke-width="38" stroke-linecap="round" stroke-opacity="0.12" />
  <path d="M198 173v192M198 192l138-29M198 260l118-26" stroke="#0d6f68" stroke-width="31" stroke-linecap="round" />
  <rect x="158" y="358" width="39" height="24" rx="9" fill="#eef0ea" />
  <rect x="207" y="358" width="39" height="24" rx="9" fill="#eef0ea" />
  <rect x="256" y="358" width="39" height="24" rx="9" fill="#eef0ea" />
  <rect x="305" y="358" width="39" height="24" rx="9" fill="#eef0ea" />
  <rect x="330" y="104" width="34" height="34" rx="13" fill="#ffe8b2" fill-opacity="0.38" />
  <circle cx="347" cy="121" r="10" fill="#fff" fill-opacity="0.25" />
</svg>
`.trimStart()

mkdirSync(iconsDir, { recursive: true })

const icon512 = renderIcon(512)
const icon192 = resizeBilinear(icon512, 512, 512, 192, 192)
const appleTouchIcon = resizeBilinear(icon512, 512, 512, 180, 180)

writePng(join(iconsDir, 'icon-512.png'), 512, 512, icon512)
writePng(join(iconsDir, 'icon-192.png'), 192, 192, icon192)
writePng(join(iconsDir, 'apple-touch-icon.png'), 180, 180, appleTouchIcon)
writeFileSync(join(iconsDir, 'icon.svg'), svgIcon)
