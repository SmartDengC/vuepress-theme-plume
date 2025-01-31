import { onMounted, onUnmounted, onUpdated } from 'vue'
import type { Ref } from 'vue'
import type { ThemeOutline } from '../../shared/index.js'
import { throttleAndDebounce } from '../utils/index.js'
import { useAside } from './aside.js'

export interface Header {
  /**
   * The level of the header
   *
   * `1` to `6` for `<h1>` to `<h6>`
   */
  level: number
  /**
   * The title of the header
   */
  title: string
  /**
   * The slug of the header
   *
   * Typically the `id` attr of the header anchor
   */
  slug: string
  /**
   * Link of the header
   *
   * Typically using `#${slug}` as the anchor hash
   */
  link: string
  /**
   * The children of the header
   */
  children: Header[]
}

// cached list of anchor elements from resolveHeaders
const resolvedHeaders: { element: HTMLHeadElement, link: string }[] = []

export type MenuItem = Omit<Header, 'slug' | 'children'> & {
  element: HTMLHeadElement
  children?: MenuItem[]
}

export function getHeaders(range?: ThemeOutline): MenuItem[] {
  const headers = Array.from(
    document.querySelectorAll('.vp-doc :where(h1,h2,h3,h4,h5,h6)'),
  )
    .filter(el => el.id && el.hasChildNodes())
    .map((el) => {
      const level = Number(el.tagName[1])
      return {
        element: el as HTMLHeadElement,
        title: serializeHeader(el),
        link: `#${el.id}`,
        level,
      }
    })
  return resolveHeaders(headers, range)
}

function serializeHeader(h: Element): string {
  // <hx><a href="#"><span>title</span></a></hx>
  const anchor = h.firstChild
  const el = anchor?.firstChild
  let ret = ''
  for (const node of Array.from(el?.childNodes ?? [])) {
    if (node.nodeType === 1) {
      if (
        (node as Element).classList.contains('vp-badge')
        || (node as Element).classList.contains('ignore-header')
      ) {
        continue
      }

      ret += node.textContent
    }
    else if (node.nodeType === 3) {
      ret += node.textContent
    }
  }
  // maybe `<hx><a href="#"></a><a href="xxx"></a</hx>` or more
  let next = anchor?.nextSibling
  while (next) {
    if (next.nodeType === 1 || next.nodeType === 3)
      ret += next.textContent

    next = next.nextSibling
  }
  return ret.trim()
}

export function resolveHeaders(headers: MenuItem[], range?: ThemeOutline): MenuItem[] {
  if (range === false)
    return []

  const levelsRange = range || 2

  const [high, low]: [number, number]
    = typeof levelsRange === 'number'
      ? [levelsRange, levelsRange]
      : levelsRange === 'deep'
        ? [2, 6]
        : levelsRange

  headers = headers.filter(h => h.level >= high && h.level <= low)
  // clear previous caches
  resolvedHeaders.length = 0
  // update global header list for active link rendering
  for (const { element, link } of headers)
    resolvedHeaders.push({ element, link })

  const ret: MenuItem[] = []
  // eslint-disable-next-line no-labels, no-restricted-syntax
  outer: for (let i = 0; i < headers.length; i++) {
    const cur = headers[i]
    if (i === 0) {
      ret.push(cur)
    }
    else {
      for (let j = i - 1; j >= 0; j--) {
        const prev = headers[j]
        if (prev.level < cur.level) {
          ;(prev.children || (prev.children = [])).push(cur)
          // eslint-disable-next-line no-labels
          continue outer
        }
      }
      ret.push(cur)
    }
  }

  return ret
}

export function useActiveAnchor(container: Ref<HTMLElement>, marker: Ref<HTMLElement>): void {
  const { isAsideEnabled } = useAside()

  let prevActiveLink: HTMLAnchorElement | null = null

  const setActiveLink = (): void => {
    if (!isAsideEnabled.value)
      return

    const scrollY = window.scrollY
    const innerHeight = window.innerHeight
    const offsetHeight = document.body.offsetHeight
    const isBottom = Math.abs(scrollY + innerHeight - offsetHeight) < 1

    // resolvedHeaders may be repositioned, hidden or fix positioned
    const headers = resolvedHeaders
      .map(({ element, link }) => ({
        link,
        top: getAbsoluteTop(element),
      }))
      .filter(({ top }) => !Number.isNaN(top))
      .sort((a, b) => a.top - b.top)

    // no headers available for active link
    if (!headers.length) {
      activateLink(null)
      return
    }

    // page top
    if (scrollY < 1) {
      activateLink(null)
      return
    }

    // page bottom - highlight last link
    if (isBottom) {
      activateLink(headers[headers.length - 1].link)
      return
    }

    // find the last header above the top of viewport
    let activeLink: string | null = null
    for (const { link, top } of headers) {
      if (top > scrollY + 144)
        break

      activeLink = link
    }
    activateLink(activeLink)
  }

  function activateLink(hash: string | null): void {
    if (prevActiveLink)
      prevActiveLink.classList.remove('active')

    if (hash == null) {
      prevActiveLink = null
    }
    else {
      prevActiveLink = container.value.querySelector(
        `a[href="${decodeURIComponent(hash)}"]`,
      )
    }

    const activeLink = prevActiveLink

    if (activeLink) {
      activeLink.classList.add('active')
      marker.value.style.top = `${activeLink.offsetTop + 39}px`
      marker.value.style.opacity = '1'
    }
    else {
      marker.value.style.top = '33px'
      marker.value.style.opacity = '0'
    }
  }

  const onScroll = throttleAndDebounce(setActiveLink, 100)

  onMounted(() => {
    requestAnimationFrame(setActiveLink)
    window.addEventListener('scroll', onScroll)
  })

  onUpdated(() => {
    // sidebar update means a route change
    activateLink(location.hash)
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
  })
}

function getAbsoluteTop(element: HTMLElement): number {
  let offsetTop = 0
  while (element !== document.body) {
    if (element === null) {
      // child element is:
      // - not attached to the DOM (display: none)
      // - set to fixed position (not scrollable)
      // - body or html element (null offsetParent)
      return Number.NaN
    }
    offsetTop += element.offsetTop
    element = element.offsetParent as HTMLElement
  }
  return offsetTop
}
