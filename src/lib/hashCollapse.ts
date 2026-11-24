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
  if (isOpen) {
    window.history.replaceState(null, '', `#${id}`)
    return
  }
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
}
