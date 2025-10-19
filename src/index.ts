const oneSpaceRe = /\s/
const compactReG = /[\s\x00-\x1F\x7F]+/g
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
export const prefix = {
  ok: ' ✔️\uFE0F  ',
  info: ' 💬️\uFE0F ',
  warn: ' ⚠️\uFE0F  ',
  error: ' ❌\uFE0F ',
}
const padding = '    '

/**
 * Esta función no es genérica (aunque podría serlo) y espera que `text`...
 * - no incluya EOLs
 * - no incluya caracteres que ocupen 0 o más de 1 columnas en pantalla
 * - tenga todos sus caracteres blancos o no-imprimibles sucesivos compactados
 *   como 1 solo espacio.
 * De otra manera, esta función no trabajará correctamente.
 *
 * @param text - Buffer
 * @param cols - Columnas
 * @returns Buffer formateado
 * @internal
 */
const wrapText = (text: string, cols: number) => {
  const result: string[] = []
  cols -= padding.length + 1

  // va sacando el texto línea a línea
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
      line = text.slice(0, cols)
      text = text.slice(cols + 1)
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
      line = text.slice(0, pos)
      text = text.slice(pos + 1)
    }

    result.push(padding + line.trim())
    //
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
    .map((s) => s.replaceAll(compactReG, ' ').trim())
}

/**
 * Muestra uno o más mensajes en la salida de error `stderr`.
 * @description
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
  const cols = Math.max(Math.min(out?.columns || 80, 240), 40)
  const sx = '─'.repeat(cols - 2)
  const lines = getLines(text)
  let first = true

  console[fn](`\n ${sx}`)
  for (const line of lines) {
    const text = wrapText(line, cols)
    if (first) {
      first = false
      console[fn](prefix[type] + text.trimStart())
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
