import type { App } from 'vuepress'
import { entries, fromEntries, getRootLangPath, isPlainObject } from '@vuepress/helper'
import type { PlumeThemeEncrypt, PlumeThemePluginOptions } from '../../shared/index.js'
import { PRESET_LOCALES } from '../locales/index.js'
import { resolveEncrypt } from './resolveEncrypt.js'

export function resolveProvideData(
  app: App,
  plugins: PlumeThemePluginOptions,
  encrypt?: PlumeThemeEncrypt,

): Record<string, any> {
  const root = getRootLangPath(app)

  return {
    // 注入 加密配置
    ...resolveEncrypt(encrypt),
    // 注入水印配置
    __PLUME_WM_FP__: isPlainObject(plugins.watermark)
      ? plugins.watermark.fullPage !== false
      : true,
    // 注入多语言配置
    __PLUME_PRESET_LOCALE__: fromEntries(
      entries(PRESET_LOCALES)
        .map(([locale, value]) => [locale === root ? '/' : locale, value]),
    ),
  }
}
