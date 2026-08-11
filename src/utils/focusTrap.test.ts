import { describe, expect, it } from 'vitest'
import { getFocusableElements } from '@/utils/focusTrap'

describe('focusTrap helpers', () => {
  it('returns focusable controls inside a container', () => {
    const root = document.createElement('div')
    root.innerHTML = `
      <button type="button">One</button>
      <button type="button" disabled>Skip</button>
      <a href="#x">Link</a>
      <input type="text" />
      <button type="button" tabindex="-1">Hidden tab</button>
    `
    document.body.appendChild(root)
    const nodes = getFocusableElements(root)
    expect(nodes.map((n) => n.textContent || n.tagName)).toEqual(['One', 'Link', 'INPUT'])
    root.remove()
  })
})
