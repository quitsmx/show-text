import { PREFIX, showText } from '@quitsmx/show-text'
import assert from 'assert/strict'
import test from 'node:test'

/**
 * Normalize result
 * @type {(aStr: string[]) => string}
 */
const formatBuf = (aStr) => aStr.join('\n').replaceAll(/─+/g, '─')

/**
 * @type {(fn: 'log' | 'info' | 'error' | 'warn') => () => string}
 */
const setOutCon = (fn) => {
  /** @type {string[]} */
  const output = []
  const con = console[fn]
  console[fn] = (s) => {
    output.push(s)
    con(s)
  }
  return () => {
    console[fn] = con
    return formatBuf(output)
  }
}

/**
 * La indentación es adicional al margen izquierdo de 4 columnas y se establece
 * con la secuencia `<#\d[,\d]>` que debe se el único texto en la línea y donde
 * `\d` son números positivos o negativos, el 1ro corresponde a la indentación
 * de la primer línea y el 2do número **establece** la indentación secundaria,
 * calculada en relación a la indentación principal.
 * Ambos son opcionales, el 1ro con default a 0 (que no cambia la indentación)
 * y el segundo a `undefined` (que no cambia la indentación secundaria).
 * Ejemplos:
 * `<#4>`       // indenta 4 columnas, el texto inicia en la columna 8 base 0.
 * `<#,4>`      // Pone indentación secundaria en 4 conservando la principal.
 *              // El texto sobrante inicia en la columna 12 (8+4)
 * `<#,2>`      // Establece la indentación secundaria en 2
 * `<#-4,0>`    // Quita la indentacón principal y fija la secundaria en 0
 *              // El atajo `<#->` elimina la indentación principal, por lo que
 *              // esto se podría haber escrito `<#-,0>`
 * ```
 */
void test('feat basic indentation in addition to margin', () => {
  const text = 'Indent by 2\n<#2>\nMessage\n<#-2>\nIndent 0'
  const getResult = setOutCon('log')
  const expected = `
 ─
${PREFIX.ok}Indent by 2
      Message
    Indent 0
 ─
`
  showText(text)
  assert.equal(getResult(), expected)
})

void test('secondary indentation starts at 2nd line', () => {
  const text = [
    'Indent by 2,4 in 42 cols',
    '<#2,4>',
    'First line',
    'Line 2 '.repeat(6),
    'Line 3',
    '<#-2>',
    'Indent 0',
  ].join('\n')
  const getResult = setOutCon('log')
  const expected = `
 ─
${PREFIX.ok}Indent by 2,4 in 42 cols
      First line
      Line 2 Line 2 Line 2 Line 2 Line 2
          Line 2
      Line 3
    Indent 0
 ─
`
  const cols = process.stdout.columns
  process.stdout.columns = 42
  showText(text)
  process.stdout.columns = cols
  assert.equal(getResult(), expected)
})

/**
 * La indentación máxima se determina como un 40% del número de columnas de
 * la salida menos los márgenes `(4+1)`, por lo que una salida de 42 columnas
 * se limita a `Math.trunc((42 - 5) * .4)`, o sea 14.
 *
 * @example
 * ```text
 *  Cols: 42-(LMARGIN+RMARGIN) == 42-5 == 37
 *  0123456789012345678901234567890123456 <- 37 chars available
 *  01234567890123 <-- indent 14 chars (0..13)
 *                45678901234567890123456 <- 23 chars
 * ```
 */
void test('max indentation is about 35-40%', () => {
  const text = [
    'Indent by 40 in 42 cols',
    '<#40>',
    '01234567890123456789012 A',
    '0123456789012345678901 A',
  ].join('\n')
  const spaces = ' '.repeat(14) // <- trunc((42-5)*.4)
  const getResult = setOutCon('log')
  const expected = `
 ─
${PREFIX.ok}Indent by 40 in 42 cols
    ${spaces}01234567890123456789012
    ${spaces}A
    ${spaces}0123456789012345678901
    ${spaces}A
 ─
`
  const cols = process.stdout.columns
  process.stdout.columns = 42
  showText(text)
  process.stdout.columns = cols
  assert.equal(getResult(), expected)
})

/**
 * La indentación mínima es de 0, por lo que no puede sobrescribir el margen
 * izquierdo de 4 (LMARGIN).
 */
void test('min indentation is 0', () => {
  const text = [
    'indent 0',
    '<#2>',
    'indent + 2',
    '<#2>',
    'indent + 2, now is 4',
    '<#-1>',
    'indent - 1, now is 3',
    '<#-5>',
    'indent - 5, min is -4, now is 0',
    '<#-5>',
    'indent - 5 is ignored, is already 0',
  ].join('\n')
  const getResult = setOutCon('log')
  const expected = `
 ─
${PREFIX.ok}indent 0
      indent + 2
        indent + 2, now is 4
       indent - 1, now is 3
    indent - 5, min is -4, now is 0
    indent - 5 is ignored, is already 0
 ─
`
  showText(text)
  assert.equal(getResult(), expected)
})

/**
 * La indentación secundaria se limita dinámicamente a un rango que garantice
 * el despliegue de al menos 20 caracteres.
 * Por ejemplo, en una salida de 42 columnas con indentado principal de 2, el
 * rango es -2 `(-indent)` y 14 `(42 - (5) - 2 - 20 - 1)` (cols son base 0).
 *
 * @example
 * ```text
 *  Available width: 42 - (LMARGIN + RMARGIN) == 42 - (4 + 1) == 37
 *  0123456789012345678901234567890123456
 *  01 <-- indent (2)                   |
 *    |              78901234567890123456 <- min 20 chars
 *    012345678901234 <- max 15 for secondary indent (0..14)
 *  01 <- min -2 for secundary indent
 * ```
 */
void test('secondary indentation show 20 characters min', () => {
  const text = [
    'Indent by 2,40 in 42 cols',
    '<#2,40>',
    '4 6 8 0 2 4 6 8 0 2 4 6 8 0 2 4 6 8',
    '4 6 8 0 2 4 6 8 0 2 4 6 8 0 2 4 6 8 a b c',
  ].join('\n')
  const getResult = setOutCon('log')
  const expected = `
 ─
${PREFIX.ok}Indent by 2,40 in 42 cols
      4 6 8 0 2 4 6 8 0 2 4 6 8 0 2 4 6 8
      4 6 8 0 2 4 6 8 0 2 4 6 8 0 2 4 6 8
      ${' '.repeat(14)}a b c
 ─
`
  const cols = process.stdout.columns
  process.stdout.columns = 42
  showText(text)
  process.stdout.columns = cols
  assert.equal(getResult(), expected)
})

void test('minimum secondary indentation is the left margin', () => {
  const text = [
    'Indent 0,0 in this line in 40 cols.',
    '<#2,4>',
    'Indent by 2,4 ............... x x x x',
    '<#0,2>',
    'Indent by 0,2 ............... x x x x',
    '<#0,-8>',
    'Indent by 0,-8 .............. x x x x',
    '<#-2,-8>',
    'Indent by -2,-8 ............. x x x x',
  ].join('\n')
  const getResult = setOutCon('log')
  const expected = `
 ─
${PREFIX.ok}Indent 0,0 in this line in 40 cols.
      Indent by 2,4 ............... x x
          x x
      Indent by 0,2 ............... x x
        x x
      Indent by 0,-8 .............. x x
    x x
    Indent by -2,-8 ............. x x x
    x
 ─
`
  const cols = process.stdout.columns
  process.stdout.columns = 40
  showText(text)
  process.stdout.columns = cols
  assert.equal(getResult(), expected)
})

/**
 * El atajo "<#->" restablece ambas indentaciones
 */
void test('el atajo "<#->" elimina ambas indentaciones', () => {
  const text = [
    'Indent 4,4 then reset with "-"',
    '<#4,4>',
    'B . . . . . . . . . . . . . . . . X',
    '<#->',
    'C . . . . . . . . . . . . . . . . . X',
  ].join('\n')
  const getResult = setOutCon('log')
  const expected = `
 ─
${PREFIX.ok}Indent 4,4 then reset with "-"
        B . . . . . . . . . . . . . . .
            . X
    C . . . . . . . . . . . . . . . . .
    X
 ─
`
  const cols = process.stdout.columns
  process.stdout.columns = 40
  showText(text)
  process.stdout.columns = cols
  assert.equal(getResult(), expected)
})

void test('surrounding zero-width spaces are not trimmed', () => {
  const text = ' \u200B \t a b c \t \u200B\t '
  const getResult = setOutCon('log')
  const expected = `
 ─
${PREFIX.ok}\u200B   a b c   \u200B
 ─
`
  showText(text)
  assert.equal(getResult(), expected)
})
