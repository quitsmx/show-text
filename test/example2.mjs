import { showInfoText } from '@quitsmx/show-text'

const text = `Usage: bump [type [identifier]] [flags]

Bump the package.json version following the semver rules for 'type' and 'identifier'

Types:
Examples for 'bump <type>' and actual release version '1.4.7'
<#2,24>
  major        → 2.0.0    Bumps the major version number, for breaking changes.
  premajor     → 2.0.0-0  Increases the major version and adds pre-release 0.
  minor        → 1.5.0    Bumps the minor version number, for new backward compatible functionality.
  preminor     → 1.5.0-0  Increases the minor version and adds pre-release 0.
  patch        → 1.4.8    Bumps the patch version number, for backward compatible bug fixes.
  prepatch     → 1.4.8-0  Increases the patch version and adds pre-release 0.
  prerelease   → 1.4.8-0  With a release, it is the same as 'prepatch'…
  \u200B             → 1.4.8-1  With a pre-release, only increments the identifier.
  release      → 1.4.8    With a pre-release, remove the identifier.
  \u200B               -------  With a release, it generates an error.
  init         → 1.4.7    It does not change the version, it creates and/or updates the 'CHANGELOG.md' and 'whats_new' files, if necessary.
<#-2,0>

Pre-release identifiers:
Examples for 'bump prerelease <identifier>' and version '1.4.7-beta.1'
<#2,23>
  alpha  → 1.4.7-alpha.0  Add or increment alpha identifier '-alpha.#'
  beta   → 1.4.7-beta.2   Add or increment beta identifier '-beta.#'
  rc     → 1.4.7-rc.0     Add or increment release candidate version '-rc.#'
<#-2,0>

Flags:
<#2,16>
  --no-changelog  Do no update the changelog.
  --help, -h      Show this help.`

showInfoText(text)
