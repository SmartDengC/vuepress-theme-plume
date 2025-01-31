import { resolveRouteFullPath, useRoute, withBase } from 'vuepress/client'
import type {
  NotesData,
  NotesSidebarItem,
} from '@vuepress-plume/plugin-notes-data'
import { useNotesData } from '@vuepress-plume/plugin-notes-data/client'
import { useMediaQuery } from '@vueuse/core'
import type { ComputedRef, Ref } from 'vue'
import { computed, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'
import { isActive } from '../utils/index.js'
import { useData } from './data.js'

export { useNotesData }

export function normalizePath(path: string) {
  return path.replace(/\/\\+/g, '/').replace(/\/+/g, '/')
}

export function getSidebarList(path: string, notesData: NotesData) {
  const link = Object.keys(notesData).find(link =>
    path.startsWith(normalizePath(link)),
  )
  const sidebar = link ? notesData[link] : []

  const groups: NotesSidebarItem[] = []

  let lastGroupIndex: number = 0

  for (const index in sidebar) {
    const item = sidebar[index]

    if (item.items && item.items.length) {
      lastGroupIndex = groups.push(item)
      continue
    }

    if (!groups[lastGroupIndex])
      groups.push({ items: [] })

    groups[lastGroupIndex]!.items!.push(item)
  }
  return groups
}

export function getSidebarFirstLink(sidebar: NotesSidebarItem[]) {
  for (const item of sidebar) {
    if (item.link)
      return item.link
    if (item.items)
      return getSidebarFirstLink(item.items as NotesSidebarItem[])
  }
  return ''
}

export function useSidebar() {
  const route = useRoute()
  const notesData = useNotesData()
  const { frontmatter, theme } = useData()

  const is960 = useMediaQuery('(min-width: 960px)')

  const isOpen = ref(false)

  const sidebarKey = computed(() => {
    const link = Object.keys(notesData.value).find(link =>
      route.path.startsWith(normalizePath(withBase(link))),
    )
    return link
  })

  const sidebar = computed(() => {
    const link = typeof frontmatter.value.sidebar === 'string'
      ? frontmatter.value.sidebar
      : route.path
    return getSidebarList(link, notesData.value)
  })

  const hasSidebar = computed(() => {
    return (
      frontmatter.value.pageLayout !== 'home'
      && sidebar.value.length > 0
      && frontmatter.value.sidebar !== false
      && frontmatter.value.layout !== 'NotFound'
    )
  })

  const hasAside = computed(() => {
    if (frontmatter.value.pageLayout === 'home')
      return false
    if (frontmatter.value.aside != null)
      return !!frontmatter.value.aside
    return theme.value.aside !== false
  })

  const leftAside = computed(() => {
    if (hasAside.value) {
      return frontmatter.value.aside == null
        ? theme.value.aside === 'left'
        : frontmatter.value.aside === 'left'
    }
    return false
  })

  const isSidebarEnabled = computed(() => hasSidebar.value && is960.value)

  const sidebarGroups = computed(() => {
    return hasSidebar.value ? getSidebarGroups(sidebar.value) : []
  })

  function open() {
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  function toggle() {
    isOpen.value ? close() : open()
  }

  return {
    isOpen,
    sidebar,
    hasSidebar,
    hasAside,
    leftAside,
    isSidebarEnabled,
    sidebarGroups,
    sidebarKey,
    open,
    close,
    toggle,
  }
}

export function useCloseSidebarOnEscape(
  isOpen: Ref<boolean>,
  close: () => void,
) {
  let triggerElement: HTMLButtonElement | undefined

  watchEffect(() => {
    triggerElement = isOpen.value
      ? (document.activeElement as HTMLButtonElement)
      : undefined
  })

  onMounted(() => {
    window.addEventListener('keyup', onEscape)
  })

  onUnmounted(() => {
    window.removeEventListener('keyup', onEscape)
  })

  function onEscape(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen.value) {
      close()
      triggerElement?.focus()
    }
  }
}

export function useSidebarControl(item: ComputedRef<NotesSidebarItem>) {
  const { page } = useData()
  const route = useRoute()

  const collapsed = ref(item.value.collapsed ?? false)

  const collapsible = computed(() => {
    return item.value.collapsed !== null && item.value.collapsed !== undefined
  })

  const isLink = computed(() => {
    return !!item.value.link
  })

  const isActiveLink = ref(false)
  const updateIsActiveLink = () => {
    isActiveLink.value = isActive(page.value.path, item.value.link ? resolveRouteFullPath(item.value.link) : undefined)
  }

  watch([page, item, () => route.hash], updateIsActiveLink)
  onMounted(updateIsActiveLink)

  const hasActiveLink = computed(() => {
    if (isActiveLink.value)
      return true

    return item.value.items
      ? containsActiveLink(
        page.value.path,
        item.value.items as NotesSidebarItem[],
      )
      : false
  })

  const hasChildren = computed(() => {
    return !!(item.value.items && item.value.items.length)
  })

  watchEffect(() => {
    collapsed.value = !!(collapsible.value && item.value.collapsed)
  })

  watchEffect(() => {
    ;(isActiveLink.value || hasActiveLink.value) && (collapsed.value = false)
  })

  function toggle() {
    if (collapsible.value)
      collapsed.value = !collapsed.value
  }

  return {
    collapsed,
    collapsible,
    isLink,
    isActiveLink,
    hasActiveLink,
    hasChildren,
    toggle,
  }
}

export function containsActiveLink(
  path: string,
  items: NotesSidebarItem | NotesSidebarItem[],
): boolean {
  if (Array.isArray(items))
    return items.some(item => containsActiveLink(path, item))

  return isActive(path, items.link ? resolveRouteFullPath(items.link) : undefined)
    ? true
    : items.items
      ? containsActiveLink(path, items.items as NotesSidebarItem[])
      : false
}

/**
 * Get or generate sidebar group from the given sidebar items.
 */
export function getSidebarGroups(
  sidebar: NotesSidebarItem[],
): NotesSidebarItem[] {
  const groups: NotesSidebarItem[] = []

  let lastGroupIndex = 0

  for (const index in sidebar) {
    const item = sidebar[index]

    if (item.items) {
      lastGroupIndex = groups.push(item)
      continue
    }

    if (!groups[lastGroupIndex])
      groups.push({ items: [] })

    groups[lastGroupIndex]!.items!.push(item)
  }

  return groups
}
