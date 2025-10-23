import { showText } from '@quitsmx/show-text'

const text = [
  'Indent 0,0 in this line in 40 cols.',
  '<#2,4>',
  'Indent by 2,4 .............. x x x x',
  '<#0,2>',
  'Indent by 0,2 .............. x x x x',
  '<#0,-8>',
  'Indent by 0,-8 ............. x x x x',
].join('\n')

const cols = process.stdout.columns
process.stdout.columns = 40
showText(text)
process.stdout.columns = cols
