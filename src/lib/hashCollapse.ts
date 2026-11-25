import type { Action } from 'svelte/action';

import { replaceState } from '$app/navigation';
import { page } from '$app/state';

interface HashCollapseParams {
  openIds: string[];
  scrollIds: string[];
}

export const hashCollapse: Action<HTMLInputElement, HashCollapseParams> = (
  checkbox,
  params,
) => {
  let current = params;

  const sync = () => {
    const hash = decodeURIComponent(globalThis.location.hash.slice(1));
    checkbox.checked = current.openIds.includes(hash);
    if (current.scrollIds.includes(hash)) {
      checkbox.parentElement?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  sync();
  globalThis.addEventListener('hashchange', sync);

  return {
    update(next) {
      current = next;
    },
    destroy() {
      globalThis.removeEventListener('hashchange', sync);
    },
  };
};

export function updateHash(id: string, isOpen: boolean) {
  const url = new URL(globalThis.location.href);
  url.hash = isOpen ? id : '';
  void replaceState(url, page.state);
}
