import { path } from 'vuepress/utils'
import { removeLeadingSlash, resolveLocalePath } from 'vuepress/shared'
import { ensureLeadingSlash } from '@vuepress/helper'
import type {
  AutoFrontmatterOptions,
  FrontmatterArray,
  FrontmatterObject,
} from '@vuepress-plume/plugin-auto-frontmatter'
import { format } from 'date-fns'
import { uniq } from '@pengzhanbo/utils'
import type { NotesSidebar } from '@vuepress-plume/plugin-notes-data'
import type {
  PlumeThemeLocaleOptions,
  PlumeThemePluginOptions,
} from '../../shared/index.js'
import {
  getCurrentDirname,
  getPackage,
  nanoid,
  normalizePath,
  pathJoin,
  withBase,
} from '../utils.js'
import { resolveNotesOptions } from '../config/index.js'

export function resolveAutoFrontmatterOptions(
  pluginOptions: PlumeThemePluginOptions,
  localeOptions: PlumeThemeLocaleOptions,
): AutoFrontmatterOptions {
  const pkg = getPackage()
  const { locales = {}, article: articlePrefix = '/article/' } = localeOptions
  const { frontmatter } = pluginOptions

  const resolveLocale = (relativeFilepath: string) => {
    const file = ensureLeadingSlash(relativeFilepath)

    return resolveLocalePath(localeOptions.locales!, file)
  }

  const resolveOptions = (relativeFilepath: string) => {
    const locale = resolveLocale(relativeFilepath)
    return locales[locale] || localeOptions
  }

  const notesList = resolveNotesOptions(localeOptions)
  const localesNotesDirs = notesList
    .flatMap(({ notes, dir }) => {
      dir = removeLeadingSlash(dir || '')
      return notes.map(note => normalizePath(`${dir}/${note.dir || ''}/`))
    })
    .filter(Boolean)

  const baseFrontmatter: FrontmatterObject = {
    author(author: string, { relativePath }, data: any) {
      if (author)
        return author
      if (data.friends)
        return
      const profile = resolveOptions(relativePath).profile ?? resolveOptions(relativePath).avatar

      return profile?.name || pkg.author || ''
    },
    createTime(formatTime: string, { createTime }, data: any) {
      if (formatTime)
        return formatTime
      if (data.friends)
        return
      return format(new Date(createTime), 'yyyy/MM/dd HH:mm:ss')
    },
  }

  const notesByLocale = (locale: string) => {
    const notes = localeOptions.locales?.[locale]?.notes
    if (notes === false)
      return undefined
    return notes
  }

  const findNote = (relativeFilepath: string) => {
    const locale = resolveLocale(relativeFilepath)
    const filepath = ensureLeadingSlash(relativeFilepath)
    const notes = notesByLocale(locale)
    if (!notes)
      return undefined
    const notesList = notes?.notes || []
    const notesDir = notes?.dir || ''
    return notesList.find(note =>
      filepath.startsWith(normalizePath(`${notesDir}/${note.dir}`)),
    )
  }

  return {
    include: frontmatter?.include ?? ['**/*.md'],
    exclude: uniq(['.vuepress/**/*', 'node_modules', ...(frontmatter?.exclude ?? [])]),

    frontmatter: [
      localesNotesDirs.length
        ? {
            // note 首页链接
            include: localesNotesDirs.map(dir => pathJoin(dir, '/{readme,README,index}.md')),
            frontmatter: {
              title(title: string, { relativePath }) {
                if (title)
                  return title
                const note = findNote(relativePath)
                if (note?.text)
                  return note.text
                return getCurrentDirname(note?.dir, relativePath) || ''
              },
              ...baseFrontmatter,
              permalink(permalink: string, { relativePath }, data: any) {
                if (permalink)
                  return permalink
                if (data.friends)
                  return
                const locale = resolveLocale(relativePath)

                const prefix = notesByLocale(locale)?.link || ''
                const note = findNote(relativePath)
                return pathJoin(
                  locale,
                  prefix,
                  note?.link || getCurrentDirname(note?.dir, relativePath),
                  '/',
                )
              },
            },
          }
        : '',
      localesNotesDirs.length
        ? {
            include: localesNotesDirs.map(dir => `${dir}**/**.md`),
            frontmatter: {
              title(title: string, { relativePath }) {
                if (title)
                  return title

                const note = findNote(relativePath)
                let basename = path.basename(relativePath, '.md')
                if (note?.sidebar === 'auto')
                  basename = basename.replace(/^\d+\./, '')

                return basename
              },
              ...baseFrontmatter,
              permalink(permalink: string, { relativePath }, data: any) {
                if (permalink)
                  return permalink
                if (data.friends)
                  return
                const locale = resolveLocale(relativePath)
                const notes = notesByLocale(locale)
                const note = findNote(relativePath)
                const prefix = notes?.link || ''
                const args: string[] = [
                  locale,
                  prefix,
                  note?.link || '',
                ]
                const sidebar = note?.sidebar

                if (note && sidebar && sidebar !== 'auto') {
                  const res = resolveLinkBySidebar(sidebar, pathJoin(notes?.dir || '', note.dir || ''))
                  const file = ensureLeadingSlash(relativePath)
                  if (res[file])
                    args.push(res[file])
                  else
                    res[path.dirname(file)] && args.push(res[path.dirname(file)])
                }

                return pathJoin(...args, nanoid(), '/')
              },
            },
          }
        : '',
      {
        include: '**/{readme,README,index}.md',
        frontmatter: {},
      },
      {
        include: '*',
        frontmatter: {
          title(title: string, { relativePath }) {
            if (title)
              return title
            const basename = path.basename(relativePath || '', '.md')
            return basename
          },
          ...baseFrontmatter,
          permalink(permalink: string, { relativePath }) {
            if (permalink)
              return permalink
            const locale = resolveLocale(relativePath)
            const prefix = withBase(articlePrefix, locale)

            return normalizePath(`${prefix}/${nanoid()}/`)
          },
        },
      },
    ].filter(Boolean) as FrontmatterArray,
  }
}

function resolveLinkBySidebar(
  sidebar: NotesSidebar,
  prefix: string,
) {
  const res: Record<string, string> = {}

  for (const item of sidebar) {
    if (typeof item !== 'string') {
      const { dir = '', link = '/', items, text = '' } = item
      SidebarLink(items, link, text, pathJoin(prefix, dir), res)
    }
  }
  return res
}

function SidebarLink(items: NotesSidebar | undefined, link: string, text: string, dir = '', res: Record<string, string> = {}) {
  if (!items) {
    res[pathJoin(dir, `${text}.md`)] = link
    return
  }

  for (const item of items) {
    if (typeof item === 'string') {
      if (!link)
        continue
      if (item) {
        res[pathJoin(dir, `${item}.md`)] = link
      }
      else {
        res[pathJoin(dir, 'README.md')] = link
        res[pathJoin(dir, 'index.md')] = link
        res[pathJoin(dir, 'readme.md')] = link
      }
      res[dir] = link
    }
    else {
      const { dir: subDir = '', link: subLink = '/', items: subItems, text: subText = '' } = item
      SidebarLink(subItems, pathJoin(link, subLink), subText, pathJoin(dir, subDir), res)
    }
  }
}
