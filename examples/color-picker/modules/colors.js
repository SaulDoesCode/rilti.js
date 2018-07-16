const {round, min, max} = Math

/**
 * Convert HSV spectrum to RGB.
 * @param h Hue
 * @param s Saturation
 * @param v Value
 * @returns {number[]} Array with rgb values.
 */
export const hsvToRgb = (h, s, v) => {
  h = (h / 360) * 6
  s /= 100
  v /= 100

  const i = Math.floor(h)

  const f = h - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)

  const mod = i % 6
  return [
    round([v, q, p, p, t, v][mod] * 255),
    round([t, v, v, q, p, p][mod] * 255),
    round([p, p, t, v, v, q][mod] * 255)
  ]
}

/**
 * Convert HSV spectrum to Hex.
 * @param h Hue
 * @param s Saturation
 * @param v Value
 * @returns {string[]} Hex values
 */
export const hsvToHex = (h, s, v) => hsvToRgb(h, s, v)
  .map(v => v.toString(16).padStart(2, '0'))

/**
 * Convert HSV spectrum to CMYK.
 * @param h Hue
 * @param s Saturation
 * @param v Value
 * @returns {number[]} CMYK values
 */
export const hsvToCmyk = (h, s, v) => {
  let [r, g, b] = hsvToRgb(h, s, v)
  ;[r, g, b] = [r / 255, g / 255, b / 255]

  let k = min(1 - r, 1 - g, 1 - b) * 100

  let c = (k === 1 ? 0 : (1 - r - k) / (1 - k)) * 100
  let m = (k === 1 ? 0 : (1 - g - k) / (1 - k)) * 100
  let y = (k === 1 ? 0 : (1 - b - k) / (1 - k)) * 100

  return [round(c), round(m), round(y), round(k)]
}

/**
 * Convert HSV spectrum to HSL.
 * @param h Hue
 * @param s Saturation
 * @param v Value
 * @returns {number[]} HSL values
 */
export const hsvToHsl = (h, s, v) => {
  s /= 100
  v /= 100

  let l = (2 - s) * v / 2
  if (l !== 0) {
    s = l === 1 ? 0 : l < 0.5 ? s * v / (l * 2) : s * v / (2 - l * 2)
  }

  return [round(h), round(s * 100), round(l * 100)]
}

/**
 * Convert RGB to HSV.
 * @param r Red
 * @param g Green
 * @param b Blue
 * @return {number[]} HSV values.
 */
export const rgbToHsv = (r, g, b) => {
  r /= 255
  g /= 255
  b /= 255

  let h, s, v
  const minVal = min(r, g, b)
  const maxVal = max(r, g, b)
  const delta = maxVal - minVal

  v = maxVal
  if (delta === 0) {
    h = s = 0
  } else {
    s = delta / maxVal
    let dr = (((maxVal - r) / 6) + (delta / 2)) / delta
    let dg = (((maxVal - g) / 6) + (delta / 2)) / delta
    let db = (((maxVal - b) / 6) + (delta / 2)) / delta

    if (r === maxVal) {
      h = db - dg
    } else if (g === maxVal) {
      h = (1 / 3) + dr - db
    } else if (b === maxVal) {
      h = (2 / 3) + dg - dr
    }

    if (h < 0) {
      h += 1
    } else if (h > 1) {
      h -= 1
    }
  }

  return [round(h * 360), round(s * 100), round(v * 100)]
}

/**
 * Convert CMYK to HSV.
 * @param c Cyan
 * @param m Magenta
 * @param y Yellow
 * @param k Key (Black)
 * @return {number[]} HSV values.
 */
export const cmykToHsv = (c, m, y, k) => {
  k /= 100
  return [...rgbToHsv(
    round((1 - min(1, (c / 100) * (1 - k) + k)) * 255),
    round((1 - min(1, (m / 100) * (1 - k) + k)) * 255),
    round((1 - min(1, (y / 100) * (1 - k) + k)) * 255)
  )]
}

/**
 * Convert HSL to HSV.
 * @param h Hue
 * @param s Saturation
 * @param l Lightness
 * @return {number[]} HSV values.
 */
export const hslToHsv = (h, s, l) => {
  s /= 100
  l /= 100
  s *= l < 0.5 ? l : 1 - l

  return [h, round((2 * s / (l + s)) * 100), round((l + s) * 100)]
}

/**
 * Convert HEX to HSV.
 * @param hex Hexadecimal string of rgb colors, can have length 3 or 6.
 * @return {number[]} HSV values.
 */
export const hexToHsv = hex => {
  if (hex[0] === '#') hex = hex.substr(1)
  if (hex.length === 3) hex += hex
  const [r, g, b] = hex.match(/.{2}/g).map(v => parseInt(v, 16))
  return rgbToHsv(r, g, b)
}

const InvalidColorError = new Error('provided color string/data is invalid: unable process color')

/**
 * Takes an Array of any type, convert strings which represents
 * a number to a number an anything else to undefined.
 * @param array
 * @return {*}
 */
const numerize = array => array.map(v => /^(|\d+)\.\d+|\d+$/.test(v) ? Number(v) : undefined)

/**
* Try's to parse a string which represents a color to a HSV array.
* Current supported types are cmyk, rgba, hsla and hexadecimal.
* @param str
* @return {*}
*/
export const parseToHSV = str => {
  let match
  if ((match = parseToHSV.regex.cmyk.exec(str))) {
    let [, c, m, y, k] = numerize(match)
    if (c > 100 || m > 100 || y > 100 || k > 100) throw InvalidColorError

    return [...cmykToHsv(c, m, y, k), 1]
  } else if ((match = parseToHSV.regex.rgba.exec(str))) {
    let [,, r, g, b, a = 1] = numerize(match)

    if (r > 255 || g > 255 || b > 255 || a < 0 || a > 1) throw InvalidColorError

    return [...rgbToHsv(r, g, b), a]
  } else if ((match = parseToHSV.regex.hex.exec(str))) {
    const splitAt = (s, i) => [s.substring(0, i), s.substring(i, s.length)]
    let [,, hex] = match

    // Fill up opacity if not declared
    if (hex.length === 3) {
      hex += 'F'
    } else if (hex.length === 6) {
      hex += 'FF'
    }

    let alpha
    if (hex.length === 4) [hex, alpha] = splitAt(hex, 3).map(v => v + v)
    else if (hex.length === 8) [hex, alpha] = splitAt(hex, 6)

    // Convert 0 - 255 to 0 - 1 for opacity
    alpha = parseInt(alpha, 16) / 255
    return [...hexToHsv(hex), alpha]
  } else if ((match = parseToHSV.regex.hsla.exec(str))) {
    let [,, h, s, l, a = 1] = numerize(match)

    if (h > 360 || s > 100 || l > 100 || a < 0 || a > 1) throw InvalidColorError

    return [...hslToHsv(h, s, l), a]
  } else if ((match = parseToHSV.regex.hsva.exec(str))) {
    let [,, h, s, v, a = 1] = numerize(match)

    if (h > 360 || s > 100 || v > 100 || a < 0 || a > 1) throw InvalidColorError

    return [h, s, v, a]
  }
}

// Regular expressions to match different types of color represention
parseToHSV.regex = {
  cmyk: /^cmyk[^\d]+(\d+)[^\d]+(\d+)[^\d]+(\d+)[^\d]+(\d+)/i,
  rgba: /^(rgb|rgba)[^\d]+(\d+)[^\d]+(\d+)[^\d]+(\d+)[^\d]*(0\.\d+|\.\d+|\d+|$)/i,
  hsla: /^(hsl|hsla)[^\d]+(\d+)[^\d]+(\d+)[^\d]+(\d+)[^\d]*(0\.\d+|\.\d+|\d+|$)/i,
  hsva: /^(hsv|hsva)[^\d]+(\d+)[^\d]+(\d+)[^\d]+(\d+)[^\d]*(0\.\d+|\.\d+|\d+|$)/i,
  hex: /^(#|)(([\dA-Fa-f]{3,4})|([\dA-Fa-f]{6})|([\dA-Fa-f]{8}))$/i
}

/**
 * Simple factory which holds the properties
 * of the color represention model hsla (hue saturation lightness alpha)
 */
export const HSVaColor = (h = 0, s = 0, v = 100, a = 1) => {
  const $color = {
    h,
    s,
    v,
    a,

    toHSVA () {
      const hsva = [$color.h, $color.s, $color.v, $color.a]
      hsva.toString = function () { return `hsva(${this[0]}, ${this[1]}%, ${this[2]}%, ${this[3]})` }
      return hsva
    },

    toHSLA () {
      const hsl = hsvToHsl($color.h, $color.s, $color.v).concat([$color.a])
      hsl.toString = function () { return `hsla(${this[0]}, ${this[1]}%, ${this[2]}%, ${this[3]})` }
      return hsl
    },

    toRGBA () {
      const rgba = hsvToRgb($color.h, $color.s, $color.v).concat([$color.a])
      rgba.toString = function () {
        return `rgba(${this[0]}, ${this[1]}, ${this[2]}, ${this[3]})`
      }
      return rgba
    },

    toHEX () {
      const hex = hsvToHex($color.h, $color.s, $color.v)
      hex.push($color.a)

      hex.toString = function () {
        // Check if alpha channel make sense, convert it to 255 number space, convert
        // to hex and pad it with zeros if needed.
        const alpha = this[3] === 1 ? '' : Number((this[3] * 255).toFixed(0))
          .toString(16)
          .toUpperCase()
          .padStart(2, '0')

        return '#' + this.slice(0, 3).join('').toUpperCase() + alpha
      }

      return hex
    },

    toCMYK () {
      const cmyk = hsvToCmyk($color.h, $color.s, $color.v)
      cmyk.toString = function () {
        return `cmyk(${this[0]}%, ${this[1]}%, ${this[2]}%, ${this[3]}%)`
      }
      return cmyk
    },

    clone: ({
      h = $color.h,
      s = $color.s,
      v = $color.v,
      a = $color.a
    }) => HSVaColor(h, s, v, a),

    toOpaque () {
      const color = $color.clone()
      color.a = 1
      return color
    },

    toString () { return $color.toRGBA() }
  }

  return $color
}

const randInt = (max = 100, min = 0) => Math.floor(Math.random() * (max - min + 1)) + min

HSVaColor.random = randomAlpha => HSVaColor(
  randInt(360),
  randInt(),
  randInt(),
  randomAlpha ? randInt() / 100 : 1
)
