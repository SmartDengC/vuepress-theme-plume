/**
 * @[codesandbox](id)
 * @[codesandbox share](user/id)
 * @[codesanbox title="xxx" layout="Editor+Preview" height="500px" navbar="false" console="false"](id#filepath)
 */
import type { PluginWithOptions } from 'markdown-it'
import { resolveAttrs } from '../utils/resolveAttrs.js'
import { parseRect } from '../utils/parseRect.js'
import type { CodeSandboxTokenMeta } from '../../shared/codeSandbox.js'
import { createRuleBlock } from '../utils/createRuleBlock.js'

export const codeSandboxPlugin: PluginWithOptions<never> = (md) => {
  createRuleBlock<CodeSandboxTokenMeta>(md, {
    type: 'codesandbox',
    syntaxPattern: /^@\[codesandbox(?:\s+(embed|button))?(?:\s+([^]*?))?\]\(([^)]*?)\)/,
    meta([, type, info = '', source = '']) {
      const { attrs } = resolveAttrs(info)
      const [profile, filepath = ''] = source.split('#')
      const [user, id] = profile.includes('/') ? profile.split('/') : ['', profile]

      return {
        width: attrs.width ? parseRect(attrs.width) : '100%',
        height: attrs.height ? parseRect(attrs.height) : '500px',
        user,
        id,
        title: attrs.title ?? '',
        console: attrs.console ?? false,
        navbar: attrs.navbar ?? true,
        layout: attrs.layout ?? '',
        type: (type || 'embed') as CodeSandboxTokenMeta['type'],
        filepath,
      }
    },
    content({ title, height, width, user, id, type, filepath, console, navbar, layout }) {
      return `<CodeSandboxViewer title="${title}" height="${height}" width="${width}" user="${user}" id="${id}" type="${type}" filepath="${filepath}" :console=${console} :navbar=${navbar} layout="${layout}" />`
    },
  })
}
