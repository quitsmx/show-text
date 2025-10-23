const oneSpaceRe = /\s/
const controlReG = /[\x00-\x1F\x7F]/g
const EOL = /\r\n?|[\n\u2028\u2029]/u

type PrefixType = 'ok' | 'info' | 'warn' | 'error'

// const isPresen = /\p{Emoji_Presentation}/u
// const isSingle = /[\u{1F1E6}-\u{1F1FF}]/u
// const isDouble = /[\u3030\u303D\u3297\u3299\u{1F202}\u{1F237}]/u
//
// const emojiWidth = (ch: string) =>
//   isSingle.test(ch) ? 1 : isDouble.test(ch) || isPresen.test(ch) ? 2 : 1
//
// const prefixSrc = ([
//     ['ok', 0x2714], ['info', 0x1f4aC], ['warn', 0x26a0],['error', 0x274c]
//   ] as [PrefixType, number][]
// ).map(([k, n]) => {
//   const ch = String.fromCodePoint(n)
//   return [k, ` ${ch}\uFE0F${emojiWidth(ch) === 2 ? ' ' : '  '}`]
// })

/**
 * Los emojis gráficos, modificados por `uFE0F`, _generalmente_ ocupan dos
 * columnas en pantallas de texto, así que los prefijos ocuparán cuatro cuando
 * cuando sean desplegados con espacios circundantes.
 * @internal
 */
// prettier-ignore
export const PREFIX = {
  ok:    ' \u2714\uFE0F  ', // ✔️
  info:  ' \uD83D\uDCAC ',  // 💬
  warn:  ' \u26A0\uFE0F  ', // ⚠️
  error: ' \u274c\uFE0F ',  // ❌
}
const LMARGIN = 4 // separación fija del margén izquierdo
const RMARGIN = 1

/**
 * Esta función no es genérica (aunque podría serlo) y espera que `text`...
 * - no incluya EOLs
 * - no incluya caracteres que ocupen 0 o más de 1 columnas en pantalla
 * - tenga todos sus caracteres blancos o no-imprimibles sucesivos compactados
 *   como 1 solo espacio.
 * De otra manera, esta función no trabajará correctamente.
 *
 * @param text   - Buffer
 * @param cols   - Columnas
 * @param left   - Indentación de la 1er línea)
 * @param indent - Indentación 2a línea y posteriores, en relación a `padding`
 * @returns Buffer formateado
 * @internal
 */
const wrapText = (text: string, cols: number, left: number, indent: number) => {
  const result: string[] = []
  let prefix = ' '.repeat(LMARGIN + left)
  cols -= LMARGIN + RMARGIN + left

  // Eliminamos los Zero-Width spaces y sacamos el texto línea a línea
  // text = text.replaceAll('\u200B', '')
  do {
    const ch = text.at(cols)
    let line = ''

    // si el caracter después del margen derecho es...
    if (!ch) {
      // ...un caracter nulo, estamos al final del búfer
      line = text
      text = ''
    } else if (oneSpaceRe.test(ch)) {
      // ...un espacio, estamos entre 2 palabras
      line = text.slice(0, cols).trimEnd()
      text = text.slice(cols).trimStart()
    } else {
      // ...un no-blanco, estamos dentro de una palabra, buscar
      // su inicio o el inicio del búfer para quebrar la palabra.
      let pos = text.lastIndexOf(' ', cols)
      if (pos === -1) {
        pos = text.indexOf(' ', cols)
        if (pos === -1) {
          pos = text.length
        }
      }
      line = text.slice(0, pos).trimEnd()
      text = text.slice(pos).trimStart()
    }

    result.push(prefix + line)

    if (indent > 0 && text) {
      cols -= indent
      prefix = ' '.repeat(LMARGIN + left + indent)
      indent = 0
    }
  } while (text.length > 0)

  return result.join('\n')
}

const methods = { ok: 'log', warn: 'warn', error: 'error', info: 'info' } as const

const asStr = (v: unknown) =>
  v instanceof Error
    ? v.stack || v.message
    : v && v instanceof Date
      ? v
          .toJSON()
          .replace('T', ' ')
          .replace(/\.\d+Z$/, 'Z')
      : String(v)

/**
 * wrapText espera texto sin EOLs y sin espacios redundantes, esta función
 * garantiza que se cumpla ese requerimiento.
 * @param v El valor a formatear
 * @returns Texto limpio.
 */
const getLines = (v: unknown) => {
  const a = Array.isArray(v) ? v : [v]
  return a
    .map(asStr)
    .join('\n')
    .split(EOL)
    .map((s) => s.replaceAll('\t', ' ').replaceAll(controlReG, '').trim())
}

const getLeft = (cols: number, left: number, match: RegExpExecArray) => {
  cols -= LMARGIN + RMARGIN
  const maxMargin = (cols * 0.4) | 0 // máx padding
  const margin = ~~(match[1] ?? '')
  // margin es additivo, el total no debe ser < 0 ni > maxMargin
  left = Math.max(0, Math.min(left + margin, maxMargin))
  // indent sobrescribe, se conserva si no se da un nuevo valor
  let indent
  if (match[2] !== undefined) {
    indent = left + ~~match[2] // puede ser < 0 o > availCols-20
    indent = Math.min(Math.max(0, indent), cols - 20) - left
  }
  return { left, indent }
}

/**
 * Muestra uno o más mensajes en la salida de error `stderr`.
 * @description  <#-2,0>
 * El mensaje o mensajes son mostrados de forma que destaquen en pantalla,
 * sin "romper" las palabras dentro de lo posible. \
 * El tipo recibido puede no ser `string`, pero se convierte por medio del
 * método `toString` de cada tipo. \
 * Se pueden usar terminadores de línea en el texto, pero ten cuidado con
 * los emoji y otros caracteres que podrían ocupar más de una columna.
 *
 * @param text - Message(s) to show
 */
function printText(text: unknown | unknown[], type: PrefixType): void {
  const fn = methods[type]
  const out = fn === 'log' ? process.stdout : process.stderr
  const cols = Math.max(Math.min(out.columns || 80, 240), 40)
  const sx = '─'.repeat(cols - 2)
  const lines = getLines(text)
  let first = true
  let indent = 0
  let left = 0

  console[fn](`\n ${sx}`)
  for (const line of lines) {
    let grp = /^<#(-?\d{0,2})(?:,(-?\d\d?))?>/u.exec(line)
    if (grp) {
      const res = getLeft(cols, left, grp)
      indent = res.indent ?? indent
      left = res.left
      continue
    }
    const text = wrapText(line, cols, left, indent)
    if (first) {
      first = false
      console[fn](PREFIX[type] + text.slice(LMARGIN))
    } else {
      console[fn](text)
    }
    first = false
  }
  console[fn](` ${sx}\n`)
}

export const showText = (...text: unknown[]) => void printText(text, 'ok')
export const showWarnText = (...text: unknown[]) => void printText(text, 'warn')
export const showErrorText = (...text: unknown[]) => void printText(text, 'error')
export const showInfoText = (...text: unknown[]) => void printText(text, 'info')
