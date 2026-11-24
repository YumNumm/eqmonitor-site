import { replaceState } from '$app/navigation'
import { page } from '$app/state'
import type { Action } from 'svelte/action'

interface HashCollapseParams {
  openIds: string[]
  scrollIds: string[]
}

export const hashCollapse: Action<HTMLInputElement, HashCollapseParams> = (checkbox, params) => {
  let current = params

  const sync = () => {
    const hash = decodeURIComponent(window.location.hash.slice(1))
    checkbox.checked = current.openIds.includes(hash)
    if (current.scrollIds.includes(hash)) {
      checkbox.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  sync()
  window.addEventListener('hashchange', sync)

  return {
    update(next) {
      current = next
    },
    destroy() {
      window.removeEventListener('hashchange', sync)
    },
  }
}

export function updateHash(id: string, isOpen: boolean) {
  const url = new URL(window.location.href)
  url.hash = isOpen ? id : ''
  replaceState(url, page.state)
}
