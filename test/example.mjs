import { showErrorText, showInfoText, showText, showWarnText } from '@quitsmx/show-text'

try {
  showText('This is a normal message.', 'END')
  showInfoText('This is a info text.\n END')
  showWarnText('This is a warning.')
  throw new Error('This is an error message.')
} catch (error) {
  showErrorText(error)
  // process.exitCode = 1
}
