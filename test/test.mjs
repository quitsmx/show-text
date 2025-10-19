import {
  prefix,
  showErrorText,
  showInfoText,
  showText,
  showWarnText,
} from '@quitsmx/show-text'
import assert from 'node:assert/strict'
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

void test('show simple text with `console.log`', () => {
  const text = 'This is a normal message.'
  const getResult = setOutCon('log')
  const expected = `
 ─
${prefix.ok}${text}
 ─
`
  showText(text)
  assert.equal(getResult(), expected)
})

void test('show info text with `console.info`', () => {
  const text = 'This is showInfoText()'
  const getResult = setOutCon('info')
  const expected = `
 ─
${prefix.info}${text}
 ─
`
  showInfoText(text)
  assert.equal(getResult(), expected)
})

void test('show warnings with `console.warn`', () => {
  const text = 'This is showWarnText()'
  const getResult = setOutCon('warn')
  const expected = `
 ─
${prefix.warn}${text}
 ─
`
  showWarnText(text)
  assert.equal(getResult(), expected)
})

void test('show error text with `console.error`', () => {
  const text = 'This is showErrorText()'
  const getResult = setOutCon('error')
  const expected = `
 ─
${prefix.error}${text}
 ─
`
  showErrorText(text)
  assert.equal(getResult(), expected)
})

void test('show message from Error object', () => {
  const error = new TypeError('Message from Error object')
  const expected = ` ─ ${prefix.error}${error.stack || error.message} ─ `
  const getResult = setOutCon('error')

  showErrorText(error)
  assert.equal(getResult().replace(/\s+/g, ' '), expected.replace(/\s+/g, ' '))
})

void test('show 2 or more messages', () => {
  const text = ['Message 1', 'Message 2', 'Message 3']
  const getResult = setOutCon('log')
  const expected = `
 ─
${prefix.ok}Message 1
    Message 2
    Message 3
 ─
`
  showText(...text)
  assert.equal(getResult(), expected)
})

void test('show message with eol inside', () => {
  const text = 'First line\n Same message, second line.'
  const getResult = setOutCon('log')
  const expected = `
 ─
${prefix.ok}First line
    Same message, second line.
 ─
`
  showText(text)
  assert.equal(getResult(), expected)
})

void test('Long text wraps', () => {
  if (process.stdout.columns !== 80) {
    return
  }
  const text =
    'Lorem ipsum dolor sit amet aute sit neque. Lorem ipsum dolor sit amet voluptas magna numquam nemo voluptate sit vero fugit rem labore. Lorem ipsum dolor sit amet amet incididunt aliquip enim sunt sed ullamco ea aliquam id consectetur minim. Lorem ipsum dolor sit amet sunt anim adipisci labore magnam eiusmod. Lorem ipsum dolor sit amet quasi elit est voluptate et est ut. Lorem ipsum dolor sit amet doloremque nostrud labore ad porro voluptatem doloremque.\n END'
  const getResult = setOutCon('info')
  const expected = `
 ─
${prefix.info}Lorem ipsum dolor sit amet aute sit neque. Lorem ipsum dolor sit amet
    voluptas magna numquam nemo voluptate sit vero fugit rem labore. Lorem
    ipsum dolor sit amet amet incididunt aliquip enim sunt sed ullamco ea
    aliquam id consectetur minim. Lorem ipsum dolor sit amet sunt anim adipisci
    labore magnam eiusmod. Lorem ipsum dolor sit amet quasi elit est voluptate
    et est ut. Lorem ipsum dolor sit amet doloremque nostrud labore ad porro
    voluptatem doloremque.
    END
 ─
`
  showInfoText(text)
  assert.equal(getResult(), expected)
})

void test('Force break long lines', () => {
  const text =
    'https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/filtering-and-searching-issues-and-pull-requests#building-advanced-filters-for-issues'
  const getResult = setOutCon('log')
  const expected = `
 ─
${prefix.ok}https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/filtering-and-searching-issues-and-pull-requests#building-advanced-filters-for-issues
 ─
`
  showText(text)
  assert.equal(getResult(), expected)
})

void test('Force break long lines inside short lines', () => {
  const text = [
    'First line',
    'https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/filtering-and-searching-issues-and-pull-requests#building-advanced-filters-for-issues LONG LINE END',
    'Last line',
  ]
  const getResult = setOutCon('log')
  const expected = `
 ─
${prefix.ok}First line
    https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/filtering-and-searching-issues-and-pull-requests#building-advanced-filters-for-issues
    LONG LINE END
    Last line
 ─
`
  showText(...text)
  assert.equal(getResult(), expected)
})

void test('Characters inside multiple spaces', () => {
  const text = '  a\t b  c  d \f e   '
  const getResult = setOutCon('log')
  const expected = `
 ─
${prefix.ok}a b c d e
 ─
`
  showText(text)
  assert.equal(getResult(), expected)
})

void test('Empty text', () => {
  const getResult = setOutCon('log')
  const expected = `
 ─
${prefix.ok}
 ─
`
  showText('')
  assert.equal(getResult(), expected)
})

void test('With other types (Date, number, RegExp)', () => {
  const dt = new Date(Date.UTC(2025, 9, 15, 1, 20, 10))
  const num = 125.3
  const re = /\s+/g

  const getResult = setOutCon('log')
  const expected = `
 ─
${prefix.ok}2025-10-15 01:20:10Z
    ${num}
    ${re}
 ─
`
  showText(dt, num, re)
  assert.equal(getResult(), expected)
})
