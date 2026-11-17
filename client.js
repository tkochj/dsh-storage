window.__ModuleLoader__.load({
  id: 'dsh-storage',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useRef, useState } = React

    const API = '/dsh-storage-api'
    const POLL_MS = 180000

    let localeService = null

    const DICT = {
      zh: {
        nav: '存储',
        title: '存储',
        intro: '查看 DeepSeek Harness 在这台电脑上占用了多少空间。可在「会话记录」里选择删除会话；删除会把会话、缓存或附件移入回收站，清空回收站需再次确认。',
        refresh: '重新扫描',
        refreshing: '扫描中…',
        loading: '正在扫描数据目录…',
        loadingHint: '首次扫描可能需要几秒钟',
        dshData: 'DSH 数据',
        at: '位于',
        files: (count, lang) => formatNumber(count, lang) + ' 个文件',
        updated: (text) => '更新于 ' + text,
        justNow: '刚刚',
        minutesAgo: (count) => count + ' 分钟前',
        hoursAgo: (count) => count + ' 小时前',
        daysAgo: (count) => count + ' 天前',
        cached: '缓存',
        scanTime: (ms) => '扫描用时 ' + formatDuration(ms),
        partial: '扫描超出时间预算，以上为部分结果。',
        errors: (count) => count + ' 个文件无法读取',
        skipped: (count) => '已跳过 ' + count + ' 个符号链接',
        disk: '磁盘空间',
        diskFree: '可用',
        diskTotal: '总共',
        diskUsed: (percent) => '已用 ' + percent,
        sessionsMeta: (sessions, files, lang) =>
          formatNumber(sessions, lang) + ' 个会话 · ' + formatNumber(files, lang) + ' 个文件',
        filesMeta: (files, lang) => formatNumber(files, lang) + ' 个文件',
        stackLabel: (total, files) => '存储构成：' + total + '，' + files,
        empty: '数据目录里还没有可统计的内容。',
        homeMissing: '没有找到 DSH 数据目录。如果设置了 DSH_HOME，请确认路径存在。',
        homeError: (code) => '数据目录读取失败（' + code + '）。',
        readOnly: '统计只读 · 清理与清空均需确认',
        retry: '重试',
        error: '读取失败',
        errorHint: 'Host 侧存储接口没有响应。请确认插件已启用，并尝试重启 DSH。',
        clean: '清理',
        cleanAria: (name) => '清理' + name,
        cleanHint: '把该分类的文件移入回收站',
        empty: '清空',
        emptyAria: '清空回收站',
        emptyHint: '永久删除回收站中的文件',
        cleanCacheTitle: '清理缓存？',
        cleanAttachmentsTitle: '清理附件？',
        emptyTrashTitle: '清空回收站？',
        cleanCacheText: '将把 ~/.dsh/cache 下的缓存文件移入回收站。DSH 会重新生成缓存，聊天记录不受影响；清空回收站后才释放磁盘空间。',
        cleanAttachmentsText: '将把 ~/.dsh/attachments 下的原始附件移入回收站。旧会话乃至当前会话中的图片和文件可能无法再打开；清空回收站后才释放磁盘空间。',
        emptyTrashText: '将永久删除回收站中的文件，无法恢复；这会真正释放磁盘空间。',
        planning: '正在统计要处理的文件…',
        willMove: (files, bytes) => '将把 ' + files + ' 个文件（' + bytes + '）移入回收站。',
        willDeletePermanently: (files, bytes) => '将永久删除 ' + files + ' 个文件（' + bytes + '），无法恢复。',
        planPartial: '统计超时，只会处理已列出的文件；剩余部分可再次清理。',
        planErrors: (count) => count + ' 个文件无法读取，不会处理。',
        ackAttachments: '我知道旧会话中的附件会失效；文件会移入回收站。',
        ackEmpty: '我知道清空回收站后无法恢复。',
        cancel: '取消',
        confirmClean: '移入回收站',
        confirmEmpty: '永久删除',
        cleaning: '处理中…',
        replan: '重新统计',
        movedToTrash: (label, files, bytes, errors, skipped, where) =>
          '已清理' + label + '：' + files + ' 个文件（' + bytes + '）已移入回收站；清空回收站后释放磁盘空间。' +
          (where ? '位置：' + where + '。' : '') +
          (errors ? ' ' + errors + ' 个文件未能移动。' : '') +
          (skipped ? ' ' + skipped + ' 个文件已变化，未移动。' : ''),
        emptiedTrash: (files, bytes, errors, skipped) =>
          '已清空回收站：永久删除 ' + files + ' 个文件，释放 ' + bytes + '。' +
          (errors ? ' ' + errors + ' 个文件未能删除。' : '') +
          (skipped ? ' ' + skipped + ' 个文件已变化，未删除。' : ''),
        nothingToClean: '没有可清理的文件。',
        nothingDeleted: '没有文件被处理。',
        planExpired: '清理计划已过期，请重新统计。',
        cleanupUnavailable: 'Host 侧清理接口未就绪。请确认插件已启用，并重启 DSH。',
        sessionExpired: '页面已过期，请刷新后重试。',
        trashInUse: (bytes) => '其中 ' + bytes + ' 在回收站；清空回收站后才会释放磁盘空间。',
        manage: '管理',
        manageAria: '管理会话',
        manageHint: '选择并删除会话',
        collapse: '收起',
        sessionsTitle: '会话记录',
        sessionsIntro: '选择要删除的会话。运行中的会话不能删除；删除会移入回收站，附件不会一并删除。',
        sessionsSummary: (total, bytes, lang) =>
          formatNumber(total, lang) + ' 个会话 · ' + bytes + '；运行中的会话不可选。',
        sessionsLoading: '正在读取会话…',
        sessionsRefresh: '刷新列表',
        sessionsSearch: '搜索标题或工作区…',
        sessionsSelectAll: '全选',
        sessionsClear: '清除',
        sessionsSelected: (count, bytes) => '已选 ' + count + ' 个会话 · ' + bytes,
        sessionsDelete: '删除所选',
        sessionsEmpty: '没有匹配的会话。',
        sessionsUnavailable: '会话管理服务未就绪，暂时无法删除会话。',
        untitled: '未命名会话',
        ungrouped: '未分组',
        active: '使用中',
        archived: '已归档',
        pinned: '已置顶',
        orphan: '未登记',
        noFiles: '无文件',
        childCount: (count) => '含 ' + count + ' 个子会话',
        sessionDeleteTitle: '删除所选会话？',
        sessionDeleteText: '会把所选会话（含子会话）从侧栏移除，并把文件移入回收站。运行中的会话不会被删除；附件不会一并删除。',
        sessionDeleteStats: (sessions, children, files, bytes) =>
          '将删除 ' + sessions + ' 个会话' +
          (children ? '（含 ' + children + ' 个子会话）' : '') +
          ' · ' + files + ' 个文件 · ' + bytes + '。',
        sessionActiveWarning: (count) => '有 ' + count + ' 个会话正在使用，请先切换到其他会话。',
        sessionMissingNote: (count) => count + ' 个会话没有本地文件，只会移除 Workspace 登记。',
        sessionArchivedNote: (count) => count + ' 个已归档会话会被取消归档后删除。',
        sessionAck: '我知道所选会话会从侧栏移除，并移入回收站。',
        sessionConfirm: '移入回收站',
        sessionsDeleted: (sessions, files, bytes, errors, skipped, where) =>
          '已删除 ' + sessions + ' 个会话：' + files + ' 个文件（' + bytes + '）移入回收站；清空回收站后释放磁盘空间。' +
          (where ? '位置：' + where + '。' : '') +
          (errors ? ' ' + errors + ' 个会话未能完全处理。' : '') +
          (skipped ? ' ' + skipped + ' 个会话已变化，未处理。' : ''),
        sessionPlanExpired: '会话删除计划已过期，请重新选择。',
        sessionsActive: '所选会话中有正在使用的，已取消操作。',
        sessionDeleteFailed: '删除会话失败，请刷新列表确认实际结果。',
        sessionTooMany: '一次选择的会话太多，请分批删除。',
        cat: {
          sessions: ['会话记录', '聊天记录、压缩会话日志与恢复点'],
          attachments: ['附件', '上传的图片、文件与消息引用'],
          cache: ['缓存', '可以重新生成的临时数据'],
          trash: ['回收站', '已移入回收站的文件；清空后才释放磁盘空间'],
          profiles: ['配置与插件', 'DSH 插件、依赖与运行配置'],
          storages: ['工作区数据', '工作区索引与会话投影缓存'],
          logs: ['日志', '启动和运行日志'],
          other: ['其他', '数据目录里的其余文件'],
        },
      },
      en: {
        nav: 'Storage',
        title: 'Storage',
        intro: 'See how much space DeepSeek Harness uses on this computer. Manage sessions from the Sessions section; deletion moves sessions, cache, or attachments to the recycle bin, and emptying it requires another confirmation.',
        refresh: 'Rescan',
        refreshing: 'Scanning…',
        loading: 'Scanning the data folder…',
        loadingHint: 'The first scan can take a few seconds',
        dshData: 'DSH data',
        at: 'in',
        files: (count, lang) => formatNumber(count, lang) + (Number(count) === 1 ? ' file' : ' files'),
        updated: (text) => 'Updated ' + text,
        justNow: 'just now',
        minutesAgo: (count) => count + ' min ago',
        hoursAgo: (count) => count + ' hr ago',
        daysAgo: (count) => count + ' days ago',
        cached: 'cached',
        scanTime: (ms) => 'Scanned in ' + formatDuration(ms),
        partial: 'The scan hit its time budget; these numbers are partial.',
        errors: (count) => count + ' files could not be read',
        skipped: (count) => count + ' symlinks skipped',
        disk: 'Disk space',
        diskFree: 'Free',
        diskTotal: 'Total',
        diskUsed: (percent) => percent + ' used',
        sessionsMeta: (sessions, files, lang) =>
          formatNumber(sessions, lang) +
          (Number(sessions) === 1 ? ' session · ' : ' sessions · ') +
          formatNumber(files, lang) +
          (Number(files) === 1 ? ' file' : ' files'),
        filesMeta: (files, lang) =>
          formatNumber(files, lang) + (Number(files) === 1 ? ' file' : ' files'),
        stackLabel: (total, files) => 'Storage breakdown: ' + total + ', ' + files,
        empty: 'Nothing to measure yet.',
        homeMissing: 'The DSH data folder was not found. If DSH_HOME is set, check that the path exists.',
        homeError: (code) => 'Could not read the data folder (' + code + ').',
        readOnly: 'Scan is read-only · cleanup and emptying require confirmation',
        retry: 'Retry',
        error: 'Could not read storage',
        errorHint: 'The host storage endpoint did not respond. Confirm the plugin is enabled, then restart DSH.',
        clean: 'Clean',
        cleanAria: (name) => 'Clean ' + name.toLowerCase(),
        cleanHint: 'Move this category\'s files to the recycle bin',
        empty: 'Empty',
        emptyAria: 'Empty recycle bin',
        emptyHint: 'Permanently delete files in the recycle bin',
        cleanCacheTitle: 'Clean cache?',
        cleanAttachmentsTitle: 'Clean attachments?',
        emptyTrashTitle: 'Empty the recycle bin?',
        cleanCacheText: 'This moves the cache files under ~/.dsh/cache to the recycle bin. DSH regenerates them; chat history is not affected. Disk space is freed after the recycle bin is emptied.',
        cleanAttachmentsText: 'This moves the original attachments under ~/.dsh/attachments to the recycle bin. Images and files in old or current sessions may no longer open. Disk space is freed after the recycle bin is emptied.',
        emptyTrashText: 'This permanently deletes the files in the recycle bin. It cannot be undone, and it frees disk space.',
        planning: 'Counting files…',
        willMove: (files, bytes) => 'Will move ' + files + ' files (' + bytes + ') to the recycle bin.',
        willDeletePermanently: (files, bytes) => 'Will permanently delete ' + files + ' files (' + bytes + '). This cannot be undone.',
        planPartial: 'The scan hit its time budget; only the listed files will be handled. Run it again for the rest.',
        planErrors: (count) => count + ' files could not be read and will not be handled.',
        ackAttachments: 'I understand attachments in old sessions will stop working; files are moved to the recycle bin.',
        ackEmpty: 'I understand emptying the recycle bin cannot be undone.',
        cancel: 'Cancel',
        confirmClean: 'Move to trash',
        confirmEmpty: 'Delete permanently',
        cleaning: 'Working…',
        replan: 'Recount',
        movedToTrash: (label, files, bytes, errors, skipped, where) =>
          'Cleaned ' + label + ': ' + files + ' files (' + bytes + ') moved to the recycle bin. Disk space is freed after emptying it.' +
          (where ? ' Location: ' + where + '.' : '') +
          (errors ? ' ' + errors + ' files could not be moved.' : '') +
          (skipped ? ' ' + skipped + ' files changed and were left in place.' : ''),
        emptiedTrash: (files, bytes, errors, skipped) =>
          'Emptied the recycle bin: ' + files + ' files permanently deleted, ' + bytes + ' freed.' +
          (errors ? ' ' + errors + ' files could not be deleted.' : '') +
          (skipped ? ' ' + skipped + ' files changed and were left in place.' : ''),
        nothingToClean: 'There are no files to clean.',
        nothingDeleted: 'No files were handled.',
        planExpired: 'The cleanup plan expired. Recount and try again.',
        cleanupUnavailable: 'The host cleanup endpoint is not ready. Confirm the plugin is enabled, then restart DSH.',
        sessionExpired: 'This page is out of date. Refresh and try again.',
        trashInUse: (bytes) => bytes + ' is in the recycle bin; disk space is freed only after emptying it.',
        manage: 'Manage',
        manageAria: 'Manage sessions',
        manageHint: 'Select and delete sessions',
        collapse: 'Close',
        sessionsTitle: 'Sessions',
        sessionsIntro: 'Select sessions to delete. Sessions in use cannot be deleted; deletion moves files to the recycle bin and leaves attachments alone.',
        sessionsSummary: (total, bytes, lang) =>
          formatNumber(total, lang) + ' sessions · ' + bytes + '; sessions in use cannot be selected.',
        sessionsLoading: 'Loading sessions…',
        sessionsRefresh: 'Refresh',
        sessionsSearch: 'Search title or workspace…',
        sessionsSelectAll: 'Select all',
        sessionsClear: 'Clear',
        sessionsSelected: (count, bytes) => count + ' selected · ' + bytes,
        sessionsDelete: 'Delete selected',
        sessionsEmpty: 'No matching sessions.',
        sessionsUnavailable: 'Session management is not ready; deletion is unavailable.',
        untitled: 'Untitled session',
        ungrouped: 'Ungrouped',
        active: 'In use',
        archived: 'Archived',
        pinned: 'Pinned',
        orphan: 'Unregistered',
        noFiles: 'No files',
        childCount: (count) => count + ' subagent session' + (count === 1 ? '' : 's'),
        sessionDeleteTitle: 'Delete selected sessions?',
        sessionDeleteText: 'This removes the selected sessions (including subagent children) from the sidebar and moves their files to the recycle bin. Sessions in use are not deleted; attachments are left alone.',
        sessionDeleteStats: (sessions, children, files, bytes) =>
          'Will delete ' + sessions + ' sessions' +
          (children ? ' (including ' + children + ' subagent sessions)' : '') +
          ' · ' + files + ' files · ' + bytes + '.',
        sessionActiveWarning: (count) => count + ' selected sessions are in use; switch away from them first.',
        sessionMissingNote: (count) => count + ' sessions have no local files; only their Workspace registration will be removed.',
        sessionArchivedNote: (count) => count + ' archived sessions will be unarchived and deleted.',
        sessionAck: 'I understand the selected sessions will be removed from the sidebar and moved to the recycle bin.',
        sessionConfirm: 'Move to trash',
        sessionsDeleted: (sessions, files, bytes, errors, skipped, where) =>
          'Deleted ' + sessions + ' sessions: ' + files + ' files (' + bytes + ') moved to the recycle bin. Disk space is freed after emptying it.' +
          (where ? ' Location: ' + where + '.' : '') +
          (errors ? ' ' + errors + ' sessions were not fully handled.' : '') +
          (skipped ? ' ' + skipped + ' sessions changed and were left in place.' : ''),
        sessionPlanExpired: 'The session deletion plan expired. Select the sessions again.',
        sessionsActive: 'Some selected sessions are in use; the operation was cancelled.',
        sessionDeleteFailed: 'Session deletion failed; refresh the list to confirm what happened.',
        sessionTooMany: 'Too many sessions selected; delete them in smaller batches.',
        cat: {
          sessions: ['Sessions', 'Chat logs, compressed session logs and recovery points'],
          attachments: ['Attachments', 'Uploaded images, files and message references'],
          cache: ['Cache', 'Temporary data that can be regenerated'],
          trash: ['Recycle bin', 'Files moved here; disk space is freed after emptying'],
          profiles: ['Profiles & plugins', 'DSH plugins, dependencies and profile config'],
          storages: ['Workspace data', 'Workspace index and session projection cache'],
          logs: ['Logs', 'Startup and runtime logs'],
          other: ['Other', 'Remaining files in the data folder'],
        },
      },
    }

    function detectLang() {
      try {
        const snapshot = localeService && localeService.getLocale ? localeService.getLocale() : null
        const active = snapshot && typeof snapshot.active === 'string' ? snapshot.active : ''
        if (active) return /^zh/i.test(active) ? 'zh' : 'en'
      } catch {
        // Fall through to the browser language.
      }
      try {
        return /^zh/i.test(navigator.language || '') ? 'zh' : 'en'
      } catch {
        return 'en'
      }
    }

    function formatNumber(value, lang) {
      const number = Number(value)
      if (!Number.isFinite(number)) return '0'
      try {
        return new Intl.NumberFormat(lang === 'zh' ? 'zh-CN' : 'en-US').format(number)
      } catch {
        return String(number)
      }
    }

    function formatBytes(bytes) {
      const value = Number(bytes)
      if (!Number.isFinite(value) || value <= 0) return '0 B'
      const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
      let size = value
      let unit = 0
      while (size >= 1024 && unit < units.length - 1) {
        size /= 1024
        unit += 1
      }
      const digits = size >= 100 ? 0 : size >= 10 ? 1 : 2
      const text = size
        .toFixed(digits)
        .replace(/\.0+$/, '')
        .replace(/(\.\d*[1-9])0+$/, '$1')
      return text + ' ' + units[unit]
    }

    function formatPercent(value) {
      const number = Number(value)
      if (!Number.isFinite(number) || number <= 0) return '0%'
      if (number >= 10) return Math.round(number) + '%'
      if (number >= 1) return number.toFixed(1).replace(/\.0$/, '') + '%'
      return number.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') + '%'
    }

    function formatDuration(ms) {
      const number = Number(ms)
      if (!Number.isFinite(number) || number < 0) return '0 ms'
      if (number < 1000) return Math.round(number) + ' ms'
      if (number < 60000) {
        return (number / 1000).toFixed(number < 10000 ? 1 : 0).replace(/\.0$/, '') + ' s'
      }
      return Math.round(number / 60000) + ' min'
    }

    function relativeTime(iso, lang) {
      const then = Date.parse(iso)
      if (!Number.isFinite(then)) return DICT[lang].justNow
      const diff = Math.max(0, Date.now() - then)
      if (diff < 45000) return DICT[lang].justNow
      const minutes = Math.round(diff / 60000)
      if (minutes < 60) return DICT[lang].minutesAgo(minutes)
      const hours = Math.round(minutes / 60)
      if (hours < 24) return DICT[lang].hoursAgo(hours)
      return DICT[lang].daysAgo(Math.round(hours / 24))
    }

    function formatSessionDate(iso, lang) {
      const date = new Date(iso)
      if (!Number.isFinite(date.getTime())) return ''
      try {
        return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(date)
      } catch {
        return date.toLocaleString()
      }
    }

    function percentOf(part, total) {
      const value = Number(part)
      const whole = Number(total)
      if (!Number.isFinite(value) || !Number.isFinite(whole) || whole <= 0) return 0
      return Math.max(0, Math.min(100, (value / whole) * 100))
    }

    function toneOf(id) {
      const tones = {
        sessions: 0,
        attachments: 1,
        cache: 2,
        trash: 3,
        profiles: 4,
        storages: 5,
        logs: 6,
        other: 7,
      }
      return Object.prototype.hasOwnProperty.call(tones, id) ? tones[id] : 7
    }

    const CSS = `
      .dst-section {
        max-width: 760px;
        color: var(--dsw-alias-label-primary);
        display: flex;
        flex-direction: column;
        gap: 12px;
        font-size: 13px;
        line-height: 1.5;
      }
      .dst-section *, .dst-section *::before, .dst-section *::after { box-sizing: border-box; }
      .dst-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
      .dst-head-text { min-width: 0; }
      .dst-heading { margin: 0; font-size: 18px; font-weight: 600; line-height: 1.35; }
      .dst-intro { margin: 4px 0 0; color: var(--dsw-alias-label-tertiary); font-size: 13px; }
      .dst-btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        height: 30px; padding: 0 11px; border-radius: 8px;
        border: 1px solid var(--dsw-alias-border-l1);
        background: transparent; color: var(--dsw-alias-label-primary);
        font: inherit; font-size: 12px; font-weight: 500;
        cursor: pointer; white-space: nowrap; flex: none;
        transition: background .12s ease, border-color .12s ease, opacity .12s ease;
      }
      .dst-btn:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); border-color: var(--dsw-alias-border-l2); }
      .dst-btn:focus-visible {
        outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
        outline-offset: 2px;
      }
      .dst-btn:disabled { opacity: .55; cursor: default; }
      .dst-btn-danger {
        border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, var(--dsw-alias-border-l1));
        color: var(--dsw-alias-state-error-primary);
      }
      .dst-btn-danger:hover:not(:disabled) {
        background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent);
        border-color: var(--dsw-alias-state-error-primary);
      }
      .dst-refresh-icon.spinning { animation: dst-spin .9s linear infinite; }
      @keyframes dst-spin { to { transform: rotate(360deg); } }

      .dst-body { display: flex; flex-direction: column; gap: 12px; }
      .dst-card {
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 12px;
        background: var(--dsw-alias-bg-layer-1);
      }
      .dst-hero {
        padding: 16px 18px 14px;
        display: flex; flex-direction: column; gap: 2px;
        background: linear-gradient(180deg, var(--dsw-alias-bg-layer-1), var(--dsw-alias-bg-base));
      }
      .dst-hero-label { font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-secondary); }
      .dst-hero-value { font-size: 30px; font-weight: 650; letter-spacing: -.02em; line-height: 1.2; font-variant-numeric: tabular-nums; }
      .dst-hero-sub { font-size: 12px; color: var(--dsw-alias-label-tertiary); overflow-wrap: anywhere; }
      .dst-hero-note { margin-top: 6px; font-size: 11.5px; color: var(--dsw-alias-label-tertiary); }
      .dst-stack {
        display: flex; gap: 2px; height: 10px; margin-top: 14px;
        border-radius: 999px; overflow: hidden; background: var(--dsw-alias-bg-layer-2);
      }
      .dst-seg { display: block; height: 100%; flex-basis: 0; min-width: 1px; background: var(--dst-color, var(--dsw-alias-brand-primary)); }
      .dst-tone-0 { --dst-color: var(--dsw-alias-brand-primary); }
      .dst-tone-1 { --dst-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 82%, var(--dsw-alias-bg-base)); }
      .dst-tone-2 { --dst-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 66%, var(--dsw-alias-bg-base)); }
      .dst-tone-3 { --dst-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 52%, var(--dsw-alias-bg-base)); }
      .dst-tone-4 { --dst-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, var(--dsw-alias-bg-base)); }
      .dst-tone-5 { --dst-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, var(--dsw-alias-bg-base)); }
      .dst-tone-6 { --dst-color: color-mix(in srgb, var(--dsw-alias-label-secondary) 52%, var(--dsw-alias-bg-base)); }
      .dst-tone-7 { --dst-color: color-mix(in srgb, var(--dsw-alias-label-secondary) 38%, var(--dsw-alias-bg-base)); }

      .dst-list { display: flex; flex-direction: column; gap: 2px; }
      .dst-row {
        display: grid; grid-template-columns: 34px minmax(0, 1fr) auto 64px;
        align-items: center; gap: 12px; padding: 9px 10px; border-radius: 9px;
      }
      .dst-row:hover { background: var(--dsw-alias-bg-layer-1); }
      .dst-glyph {
        width: 32px; height: 32px; border-radius: 9px;
        display: flex; align-items: center; justify-content: center;
        color: var(--dst-color);
        background: color-mix(in srgb, var(--dst-color) 13%, transparent);
      }
      .dst-row-main { min-width: 0; }
      .dst-row-title { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
      .dst-row-name { font-size: 13px; font-weight: 600; white-space: nowrap; }
      .dst-row-hint {
        font-size: 11.5px; color: var(--dsw-alias-label-tertiary);
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
      }
      .dst-row-meta { font-size: 11.5px; color: var(--dsw-alias-label-secondary); margin-top: 1px; }
      .dst-row-num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
      .dst-row-size { font-size: 13px; font-weight: 600; }
      .dst-row-pct { font-size: 11px; color: var(--dsw-alias-label-tertiary); margin-top: 1px; }
      .dst-row-action { display: flex; justify-content: flex-end; }
      .dst-clean {
        height: 24px; padding: 0 8px; border-radius: 6px;
        border: 1px solid transparent; background: transparent;
        color: var(--dsw-alias-label-secondary);
        font: inherit; font-size: 11.5px; font-weight: 500;
        cursor: pointer; white-space: nowrap;
        transition: background .12s ease, color .12s ease, opacity .12s ease;
      }
      .dst-clean:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
      .dst-clean:focus-visible {
        outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
        outline-offset: 1px;
      }
      .dst-clean:disabled { opacity: .4; cursor: default; }
      .dst-clean-danger { color: var(--dsw-alias-state-error-primary); }
      .dst-clean-danger:hover:not(:disabled) {
        background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent);
        color: var(--dsw-alias-state-error-primary);
      }

      .dst-disk { padding: 13px 15px; display: flex; flex-direction: column; gap: 8px; }
      .dst-disk-head { display: flex; justify-content: space-between; gap: 12px; font-size: 12.5px; font-weight: 600; }
      .dst-disk-pct { color: var(--dsw-alias-label-secondary); font-weight: 500; }
      .dst-disk-bar { height: 8px; border-radius: 999px; background: var(--dsw-alias-bg-layer-2); overflow: hidden; }
      .dst-disk-fill { display: block; height: 100%; border-radius: inherit; background: var(--dsw-alias-brand-primary); opacity: .62; }
      .dst-disk-foot { display: flex; justify-content: space-between; gap: 12px; font-size: 11.5px; color: var(--dsw-alias-label-secondary); }

      .dst-foot { display: flex; flex-direction: column; gap: 3px; font-size: 11.5px; color: var(--dsw-alias-label-tertiary); padding-top: 2px; }
      .dst-foot-line { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; color: var(--dsw-alias-label-secondary); }
      .dst-note { font-size: 11.5px; color: var(--dsw-alias-label-tertiary); }
      .dst-warn { color: var(--dsw-alias-state-warn-primary); }
      .dst-empty {
        margin: 0; padding: 16px; text-align: center;
        color: var(--dsw-alias-label-tertiary);
        border: 1px dashed var(--dsw-alias-border-l2); border-radius: 10px;
      }

      .dst-loading { padding: 22px 18px; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
      .dst-dots { display: flex; gap: 5px; }
      .dst-dots span {
        width: 6px; height: 6px; border-radius: 50%;
        background: var(--dsw-alias-brand-primary);
        animation: dst-pulse 1.1s infinite ease-in-out;
      }
      .dst-dots span:nth-child(2) { animation-delay: .15s; }
      .dst-dots span:nth-child(3) { animation-delay: .3s; }
      @keyframes dst-pulse {
        0%, 70%, 100% { opacity: .25; transform: scale(.8); }
        35% { opacity: 1; transform: scale(1); }
      }
      .dst-loading-title { font-size: 13px; font-weight: 600; }
      .dst-loading-hint { font-size: 11.5px; color: var(--dsw-alias-label-tertiary); }

      .dst-error {
        padding: 14px 16px; display: flex; flex-direction: column; gap: 6px;
        border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 38%, var(--dsw-alias-border-l1));
        background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 7%, var(--dsw-alias-bg-layer-1));
      }
      .dst-error-title { font-size: 13px; font-weight: 600; color: var(--dsw-alias-state-error-primary); }
      .dst-error-msg {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Cascadia Mono", monospace;
        font-size: 11.5px; color: var(--dsw-alias-label-secondary); overflow-wrap: anywhere;
      }
      .dst-error-hint { font-size: 12px; color: var(--dsw-alias-label-secondary); }
      .dst-inline-error { font-size: 11.5px; color: var(--dsw-alias-state-error-primary); }

      .dst-notice {
        padding: 10px 12px; border-radius: 9px; font-size: 12px;
        border: 1px solid var(--dsw-alias-border-l1);
        color: var(--dsw-alias-label-primary);
      }
      .dst-notice-success {
        border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 38%, var(--dsw-alias-border-l1));
        background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 7%, transparent);
      }
      .dst-notice-error {
        border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 38%, var(--dsw-alias-border-l1));
        background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 7%, transparent);
      }
      .dst-confirm {
        border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 36%, var(--dsw-alias-border-l1));
        border-radius: 12px; padding: 14px 16px;
        background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 6%, var(--dsw-alias-bg-layer-1));
        display: flex; flex-direction: column; gap: 8px;
      }
      .dst-confirm-title { font-size: 14px; font-weight: 600; }
      .dst-confirm-text { font-size: 12.5px; color: var(--dsw-alias-label-secondary); }
      .dst-confirm-stats { font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; }
      .dst-confirm-note { font-size: 11.5px; color: var(--dsw-alias-label-tertiary); }
      .dst-confirm-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
      .dst-ack {
        display: flex; align-items: flex-start; gap: 8px;
        font-size: 12px; color: var(--dsw-alias-label-primary); cursor: pointer;
      }
      .dst-ack input { margin: 2px 0 0; accent-color: var(--dsw-alias-state-error-primary); }

      .dst-session-manager {
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 12px;
        background: var(--dsw-alias-bg-layer-1);
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-width: 0;
      }
      .dst-session-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
      .dst-session-head-text { min-width: 0; }
      .dst-session-title { font-size: 13px; font-weight: 600; }
      .dst-session-sub { margin-top: 2px; font-size: 11.5px; color: var(--dsw-alias-label-tertiary); }
      .dst-session-head-actions { display: flex; gap: 6px; flex: none; }
      .dst-session-search {
        width: 100%; height: 30px; padding: 0 9px; border-radius: 8px;
        border: 1px solid var(--dsw-alias-border-l1);
        background: var(--dsw-alias-bg-base);
        color: var(--dsw-alias-label-primary);
        font: inherit; font-size: 12px; outline: none;
      }
      .dst-session-search:focus { border-color: var(--dsw-alias-brand-primary); }
      .dst-session-list {
        display: flex; flex-direction: column; gap: 1px;
        max-height: 340px; overflow: auto; padding-right: 2px;
      }
      .dst-session-row {
        display: grid; grid-template-columns: 20px minmax(0, 1fr) auto;
        align-items: center; gap: 9px; padding: 7px 6px; border-radius: 8px;
        cursor: pointer; min-width: 0;
      }
      .dst-session-row:hover { background: var(--dsw-alias-bg-base); }
      .dst-session-row.active, .dst-session-row.locked { cursor: default; opacity: .72; }
      .dst-session-row input { margin: 0; accent-color: var(--dsw-alias-brand-primary); }
      .dst-session-main { min-width: 0; }
      .dst-session-row-title {
        font-size: 12.5px; font-weight: 600;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .dst-session-row-meta {
        margin-top: 1px; font-size: 11px; color: var(--dsw-alias-label-tertiary);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .dst-session-badges { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
      .dst-badge {
        display: inline-flex; align-items: center; height: 18px; padding: 0 6px;
        border-radius: 999px; background: var(--dsw-alias-bg-layer-2);
        color: var(--dsw-alias-label-secondary);
        font-size: 10.5px; font-weight: 600; white-space: nowrap;
      }
      .dst-badge-active {
        color: var(--dsw-alias-state-warn-primary);
        background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent);
      }
      .dst-session-loading, .dst-session-empty {
        margin: 0; padding: 8px 0; font-size: 12px; color: var(--dsw-alias-label-tertiary);
      }
      .dst-session-toolbar {
        display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        border-top: 1px solid var(--dsw-alias-border-l1); padding-top: 9px;
      }
      .dst-session-count { margin-left: auto; font-size: 11.5px; color: var(--dsw-alias-label-secondary); }
      .dst-session-confirm { margin-top: 2px; }

      @media (max-width: 560px) {
        .dst-head { flex-direction: column; }
        .dst-row { grid-template-columns: 30px minmax(0, 1fr) auto 56px; gap: 9px; }
        .dst-row-hint { display: none; }
        .dst-session-head { flex-direction: column; }
        .dst-session-toolbar { align-items: stretch; }
        .dst-session-count { margin-left: 0; }
      }
      @media (prefers-reduced-motion: reduce) {
        .dst-refresh-icon.spinning, .dst-dots span { animation: none; }
      }
    `

    function useLang() {
      const [lang, setLang] = useState(detectLang)
      useEffect(() => {
        let alive = true
        const apply = () => {
          if (alive) setLang(detectLang())
        }
        apply()
        let off = null
        try {
          if (localeService && typeof localeService.subscribe === 'function') off = localeService.subscribe(apply)
        } catch {
          off = null
        }
        return () => {
          alive = false
          try {
            if (typeof off === 'function') off()
          } catch {
            // ignore
          }
        }
      }, [])
      return lang
    }

    async function requestStats(force, signal) {
      const response = await fetch(API + (force ? '?refresh=1' : ''), {
        method: 'GET',
        headers: { accept: 'application/json' },
        cache: 'no-store',
        signal,
      })
      const data = await response.json().catch(() => null)
      if (!data || typeof data !== 'object') throw new Error('HTTP ' + response.status)
      if (data.ok !== true) throw new Error(data.error || 'HTTP ' + response.status)
      return data
    }

    async function requestSessionList(signal) {
      const response = await fetch(API + '?action=sessions', {
        method: 'GET',
        headers: { accept: 'application/json' },
        cache: 'no-store',
        signal,
      })
      const data = await response.json().catch(() => null)
      if (!data || typeof data !== 'object') throw new Error('HTTP ' + response.status)
      if (data.ok !== true) throw new Error(data.error || 'HTTP ' + response.status)
      return data
    }

    function sessionPlanErrorMessage(err, text) {
      const code = err && err.code
      if (code === 'sessions-active') return text.sessionsActive
      if (code === 'plan-expired') return text.sessionPlanExpired
      if (code === 'invalid-token') return text.sessionExpired
      if (code === 'workspace-unavailable') return text.sessionsUnavailable
      if (code === 'sessions-missing') return text.sessionsEmpty
      if (code === 'too-many-sessions') return text.sessionTooMany
      return String((err && err.message) || err || text.sessionDeleteFailed)
    }

    async function postJson(body, signal) {
      const response = await fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
        signal,
      })
      const data = await response.json().catch(() => null)
      if (!data || typeof data !== 'object') throw new Error('HTTP ' + response.status)
      if (data.ok !== true) {
        const error = new Error(data.error || 'HTTP ' + response.status)
        error.code = data.code
        throw error
      }
      return data
    }

    function Glyph({ id }) {
      const common = {
        viewBox: '0 0 24 24',
        width: 16,
        height: 16,
        'aria-hidden': true,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }

      if (id === 'sessions') {
        return h(
          'svg',
          common,
          h('path', { d: 'M4 5.5h16v11H9l-4 4v-4H4z' }),
          h('path', { d: 'M8 9h8M8 12.5h5' }),
        )
      }
      if (id === 'attachments') {
        return h(
          'svg',
          common,
          h('path', { d: 'M20 11.5 12.4 19a4.1 4.1 0 0 1-5.8-5.8l7.9-7.9a2.8 2.8 0 1 1 4 4l-7.8 7.8a1.4 1.4 0 0 1-2-2l7-7' }),
        )
      }
      if (id === 'cache') {
        return h(
          'svg',
          common,
          h('ellipse', { cx: 12, cy: 6, rx: 7, ry: 3 }),
          h('path', { d: 'M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6' }),
          h('path', { d: 'M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6' }),
        )
      }
      if (id === 'profiles') {
        return h(
          'svg',
          common,
          h('rect', { x: 4, y: 4, width: 7, height: 7, rx: 1.5 }),
          h('rect', { x: 13, y: 4, width: 7, height: 7, rx: 1.5 }),
          h('rect', { x: 4, y: 13, width: 7, height: 7, rx: 1.5 }),
          h('rect', { x: 13, y: 13, width: 7, height: 7, rx: 1.5 }),
        )
      }
      if (id === 'storages') {
        return h(
          'svg',
          common,
          h('path', { d: 'M3.5 7.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z' }),
        )
      }
      if (id === 'logs') {
        return h(
          'svg',
          common,
          h('path', { d: 'M6 3.5h8l4 4v13H6z' }),
          h('path', { d: 'M14 3.5v4h4' }),
          h('path', { d: 'M9 12h6M9 16h4' }),
        )
      }
      if (id === 'trash') {
        return h(
          'svg',
          common,
          h('path', { d: 'M5 7h14M9 7V5h6v2M7 7l1 12h8l1-12' }),
          h('path', { d: 'M10 11v5M14 11v5' }),
        )
      }
      return h(
        'svg',
        common,
        h('circle', { cx: 6, cy: 12, r: 1.3, fill: 'currentColor', stroke: 'none' }),
        h('circle', { cx: 12, cy: 12, r: 1.3, fill: 'currentColor', stroke: 'none' }),
        h('circle', { cx: 18, cy: 12, r: 1.3, fill: 'currentColor', stroke: 'none' }),
      )
    }

    function LoadingCard({ t }) {
      return h(
        'div',
        { className: 'dst-card dst-loading', role: 'status', 'aria-live': 'polite' },
        h('div', { className: 'dst-dots' }, h('span'), h('span'), h('span')),
        h('div', { className: 'dst-loading-title' }, t.loading),
        h('div', { className: 'dst-loading-hint' }, t.loadingHint),
      )
    }

    function ErrorCard({ t, message, onRetry }) {
      return h(
        'div',
        { className: 'dst-card dst-error', role: 'alert' },
        h('div', { className: 'dst-error-title' }, t.error),
        h('div', { className: 'dst-error-msg' }, message),
        h('div', { className: 'dst-error-hint' }, t.errorHint),
        h('button', { type: 'button', className: 'dst-btn', onClick: onRetry }, t.retry),
      )
    }

    function HeroCard({ t, lang, data }) {
      const total = data.totalBytes || 0
      const rows = (data.categories || []).filter((category) => category && (category.bytes > 0 || category.files > 0))
      const partial = data.scan && data.scan.partial === true
      const atLeast = partial && total > 0 ? '≥ ' : ''
      const trashBytes = (data.categories || []).reduce(
        (sum, category) => (category && category.id === 'trash' ? sum + (category.bytes || 0) : sum),
        0,
      )

      return h(
        'div',
        { className: 'dst-card dst-hero' },
        h('div', { className: 'dst-hero-label' }, t.dshData),
        h('div', { className: 'dst-hero-value' }, atLeast + formatBytes(total)),
        h(
          'div',
          { className: 'dst-hero-sub' },
          t.at + ' ' + (data.homeDisplay || '~/.dsh') + ' · ' + t.files(data.totalFiles || 0, lang),
        ),
        trashBytes > 0 ? h('div', { className: 'dst-hero-note' }, t.trashInUse(formatBytes(trashBytes))) : null,
        rows.length > 0
          ? h(
              'div',
              {
                className: 'dst-stack',
                role: 'img',
                'aria-label': t.stackLabel(formatBytes(total), t.files(data.totalFiles || 0, lang)),
              },
              rows.map((category) =>
                h('span', {
                  key: category.id,
                  className: 'dst-seg dst-tone-' + toneOf(category.id),
                  style: { flexGrow: Math.max(category.bytes || 0, 1) },
                }),
              ),
            )
          : null,
      )
    }

    function CategoryRow({
      t,
      lang,
      category,
      total,
      sessionCount,
      onClean,
      cleanDisabled,
      onManageSessions,
      sessionsOpen,
      manageDisabled,
    }) {
      const labels = t.cat[category.id] || [category.id, '']
      const percentage = percentOf(category.bytes, total)
      const manageable = category.id === 'sessions'
      const cleanable = category.id === 'cache' || category.id === 'attachments' || category.id === 'trash'
      const destructive = category.id === 'attachments' || category.id === 'trash'
      const action = manageable
        ? {
            label: t.manage,
            title: t.manageHint,
            aria: t.manageAria,
            danger: false,
            onClick: onManageSessions,
            disabled: manageDisabled === true,
            expanded: sessionsOpen ? 'true' : 'false',
          }
        : cleanable
          ? {
              label: category.id === 'trash' ? t.empty : t.clean,
              title: category.id === 'trash' ? t.emptyHint : t.cleanHint,
              aria: category.id === 'trash' ? t.emptyAria : t.cleanAria(labels[0]),
              danger: destructive,
              onClick: () => onClean(category.id),
              disabled: cleanDisabled,
              expanded: undefined,
            }
          : null
      const meta =
        category.id === 'sessions' && sessionCount > 0
          ? t.sessionsMeta(sessionCount, category.files || 0, lang)
          : t.filesMeta(category.files || 0, lang)

      return h(
        'div',
        { className: 'dst-row dst-tone-' + toneOf(category.id), role: 'listitem' },
        h('span', { className: 'dst-glyph' }, h(Glyph, { id: category.id })),
        h(
          'div',
          { className: 'dst-row-main' },
          h(
            'div',
            { className: 'dst-row-title' },
            h('span', { className: 'dst-row-name' }, labels[0]),
            labels[1] ? h('span', { className: 'dst-row-hint' }, labels[1]) : null,
          ),
          h('div', { className: 'dst-row-meta' }, meta),
        ),
        h(
          'div',
          { className: 'dst-row-num' },
          h('div', { className: 'dst-row-size' }, (category.partial ? '≥ ' : '') + formatBytes(category.bytes)),
          h('div', { className: 'dst-row-pct' }, formatPercent(percentage)),
        ),
        h(
          'div',
          { className: 'dst-row-action' },
          action
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'dst-clean' + (action.danger ? ' dst-clean-danger' : ''),
                  title: action.title,
                  'aria-label': action.aria,
                  'aria-expanded': action.expanded,
                  onClick: action.onClick,
                  disabled: action.disabled,
                },
                action.label,
              )
            : null,
        ),
      )
    }

    function CleanupCard({ t, lang, state, onClose, onConfirm, onRetry, onAcknowledge }) {
      const isAttachments = state.category === 'attachments'
      const mode = state.plan && state.plan.mode ? state.plan.mode : state.category === 'trash' ? 'purge' : 'trash'
      const isPurge = mode === 'purge'
      const requiresAck = isAttachments || isPurge
      const plan = state.plan
      const empty = Boolean(plan) && plan.files === 0
      const busy = state.phase === 'executing'
      const canConfirm = state.phase === 'ready' && !empty && (!requiresAck || state.acknowledge === true)
      const title = isPurge ? t.emptyTrashTitle : isAttachments ? t.cleanAttachmentsTitle : t.cleanCacheTitle
      const text = isPurge ? t.emptyTrashText : isAttachments ? t.cleanAttachmentsText : t.cleanCacheText
      const ackText = isPurge ? t.ackEmpty : t.ackAttachments
      const confirmLabel = busy ? t.cleaning : isPurge ? t.confirmEmpty : t.confirmClean

      return h(
        'div',
        {
          className: 'dst-confirm',
          role: 'alertdialog',
          'aria-labelledby': 'dst-confirm-title',
          'aria-describedby': 'dst-confirm-text',
        },
        h('div', { className: 'dst-confirm-title', id: 'dst-confirm-title' }, title),
        h('div', { className: 'dst-confirm-text', id: 'dst-confirm-text' }, text),
        state.phase === 'planning'
          ? h('div', { className: 'dst-confirm-note' }, t.planning)
          : null,
        plan
          ? h(
              'div',
              { className: 'dst-confirm-stats' },
              isPurge
                ? t.willDeletePermanently(formatNumber(plan.files, lang), formatBytes(plan.bytes))
                : t.willMove(formatNumber(plan.files, lang), formatBytes(plan.bytes)),
            )
          : null,
        plan && empty ? h('div', { className: 'dst-confirm-note' }, t.nothingToClean) : null,
        plan && plan.partial ? h('div', { className: 'dst-confirm-note dst-warn' }, t.planPartial) : null,
        plan && plan.errors > 0 ? h('div', { className: 'dst-confirm-note' }, t.planErrors(plan.errors)) : null,
        requiresAck && state.phase !== 'planning'
          ? h(
              'label',
              { className: 'dst-ack' },
              h('input', {
                type: 'checkbox',
                checked: state.acknowledge === true,
                disabled: busy,
                onChange: (event) => onAcknowledge(event.target.checked),
              }),
              h('span', null, ackText),
            )
          : null,
        state.error ? h('div', { className: 'dst-inline-error', role: 'alert' }, state.error) : null,
        h(
          'div',
          { className: 'dst-confirm-actions' },
          h('button', { type: 'button', className: 'dst-btn', onClick: onClose, disabled: busy }, t.cancel),
          state.phase === 'error'
            ? h('button', { type: 'button', className: 'dst-btn dst-btn-danger', onClick: onRetry }, t.replan)
            : !empty
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'dst-btn dst-btn-danger',
                    onClick: onConfirm,
                    disabled: !canConfirm || busy,
                  },
                  confirmLabel,
                )
              : null,
        ),
      )
    }

    function SessionRow({ t, lang, session, checked, onToggle, locked }) {
      const title = session.title || t.untitled
      const date = formatSessionDate(session.updatedAt, lang)
      const meta = [
        session.workspace || t.ungrouped,
        date,
        formatBytes(session.bytes),
        session.children > 0 ? t.childCount(session.children) : '',
      ]
        .filter(Boolean)
        .join(' · ')

      return h(
        'label',
        {
          className:
            'dst-session-row' + (session.active ? ' active' : '') + (locked ? ' locked' : ''),
          role: 'listitem',
          title: session.active ? t.active : undefined,
        },
        h('input', {
          type: 'checkbox',
          checked,
          disabled: session.active || locked,
          onChange: () => onToggle(session.id),
        }),
        h(
          'div',
          { className: 'dst-session-main' },
          h('div', { className: 'dst-session-row-title' }, title),
          h('div', { className: 'dst-session-row-meta' }, meta),
        ),
        h(
          'div',
          { className: 'dst-session-badges' },
          session.active ? h('span', { className: 'dst-badge dst-badge-active' }, t.active) : null,
          session.archived ? h('span', { className: 'dst-badge' }, t.archived) : null,
          session.pinned ? h('span', { className: 'dst-badge' }, t.pinned) : null,
          session.orphan ? h('span', { className: 'dst-badge' }, t.orphan) : null,
          session.missing ? h('span', { className: 'dst-badge' }, t.noFiles) : null,
        ),
      )
    }

    function SessionManager({
      t,
      lang,
      list,
      loading,
      error,
      query,
      selected,
      plan,
      sessionBusy,
      selectionLocked,
      categoryCleanupOpen,
      onQuery,
      onRefresh,
      onToggle,
      onSelectAll,
      onClear,
      onDelete,
      onClose,
      onClosePlan,
      onConfirmDelete,
      onReplan,
      onAcknowledge,
    }) {
      const rows = list && Array.isArray(list.sessions) ? list.sessions : []
      const needle = query.trim().toLowerCase()
      const filtered = needle
        ? rows.filter(
            (session) =>
              (session.title || '').toLowerCase().includes(needle) ||
              (session.workspace || '').toLowerCase().includes(needle),
          )
        : rows
      const selectedRows = rows.filter((session) => selected.has(session.id))
      const selectedBytes = selectedRows.reduce((sum, session) => sum + (session.bytes || 0), 0)
      const workspaceUnavailable = Boolean(list && list.workspaceAvailable === false)
      const summary = list
        ? t.sessionsSummary(list.totalSessions || 0, formatBytes(list.totalBytes || 0), lang)
        : t.sessionsIntro

      return h(
        'div',
        { className: 'dst-session-manager' },
        h(
          'div',
          { className: 'dst-session-head' },
          h(
            'div',
            { className: 'dst-session-head-text' },
            h('div', { className: 'dst-session-title' }, t.sessionsTitle),
            h('div', { className: 'dst-session-sub' }, summary),
          ),
          h(
            'div',
            { className: 'dst-session-head-actions' },
            h(
              'button',
              {
                type: 'button',
                className: 'dst-btn',
                onClick: onRefresh,
                disabled: loading || Boolean(plan),
              },
              loading ? t.sessionsLoading : t.sessionsRefresh,
            ),
            h(
              'button',
              { type: 'button', className: 'dst-btn', onClick: onClose, disabled: sessionBusy },
              t.collapse,
            ),
          ),
        ),
        h('input', {
          className: 'dst-session-search',
          type: 'search',
          placeholder: t.sessionsSearch,
          value: query,
          onChange: (event) => onQuery(event.target.value),
          disabled: sessionBusy,
        }),
        loading && !list ? h('div', { className: 'dst-session-loading' }, t.sessionsLoading) : null,
        error ? h('div', { className: 'dst-inline-error', role: 'alert' }, error) : null,
        workspaceUnavailable
          ? h('div', { className: 'dst-confirm-note dst-warn' }, t.sessionsUnavailable)
          : null,
        list
          ? rows.length === 0 || filtered.length === 0
            ? h('p', { className: 'dst-session-empty' }, t.sessionsEmpty)
            : h(
                'div',
                { className: 'dst-session-list', role: 'list' },
                filtered.map((session) =>
                  h(SessionRow, {
                    key: session.id,
                    t,
                    lang,
                    session,
                    checked: selected.has(session.id),
                    onToggle,
                    locked: selectionLocked,
                  }),
                ),
              )
          : !loading && !error
            ? h('p', { className: 'dst-session-empty' }, t.sessionsLoading)
            : null,
        h(
          'div',
          { className: 'dst-session-toolbar' },
          h(
            'button',
            {
              type: 'button',
              className: 'dst-btn',
              onClick: onSelectAll,
              disabled: loading || sessionBusy || selectionLocked || filtered.length === 0,
            },
            t.sessionsSelectAll,
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dst-btn',
              onClick: onClear,
              disabled: selected.size === 0 || sessionBusy || selectionLocked,
            },
            t.sessionsClear,
          ),
          h(
            'span',
            { className: 'dst-session-count' },
            t.sessionsSelected(selected.size, formatBytes(selectedBytes)),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dst-btn dst-btn-danger',
              onClick: onDelete,
              disabled:
                selected.size === 0 ||
                loading ||
                Boolean(plan) ||
                sessionBusy ||
                categoryCleanupOpen === true ||
                workspaceUnavailable,
            },
            t.sessionsDelete,
          ),
        ),
        plan
          ? h(SessionDeleteCard, {
              t,
              lang,
              state: plan,
              onClose: onClosePlan,
              onConfirm: onConfirmDelete,
              onRetry: onReplan,
              onAcknowledge,
            })
          : null,
      )
    }

    function SessionDeleteCard({ t, lang, state, onClose, onConfirm, onRetry, onAcknowledge }) {
      const plan = state.plan
      const busy = state.phase === 'executing'
      const active = plan ? plan.active || 0 : 0
      const sessions = plan ? plan.sessions || 0 : 0
      const canConfirm =
        state.phase === 'ready' && sessions > 0 && active === 0 && state.acknowledge === true

      return h(
        'div',
        {
          className: 'dst-confirm dst-session-confirm',
          role: 'alertdialog',
          'aria-labelledby': 'dst-session-delete-title',
          'aria-describedby': 'dst-session-delete-text',
        },
        h('div', { className: 'dst-confirm-title', id: 'dst-session-delete-title' }, t.sessionDeleteTitle),
        h('div', { className: 'dst-confirm-text', id: 'dst-session-delete-text' }, t.sessionDeleteText),
        state.phase === 'planning' ? h('div', { className: 'dst-confirm-note' }, t.planning) : null,
        plan
          ? h(
              'div',
              { className: 'dst-confirm-stats' },
              t.sessionDeleteStats(
                formatNumber(plan.sessions || 0, lang),
                formatNumber(plan.children || 0, lang),
                formatNumber(plan.files || 0, lang),
                formatBytes(plan.bytes || 0),
              ),
            )
          : null,
        active > 0
          ? h('div', { className: 'dst-confirm-note dst-warn' }, t.sessionActiveWarning(active))
          : null,
        plan && plan.missing > 0
          ? h('div', { className: 'dst-confirm-note' }, t.sessionMissingNote(plan.missing))
          : null,
        plan && plan.archived > 0
          ? h('div', { className: 'dst-confirm-note' }, t.sessionArchivedNote(plan.archived))
          : null,
        plan && plan.partial ? h('div', { className: 'dst-confirm-note dst-warn' }, t.planPartial) : null,
        state.phase !== 'planning' && sessions > 0
          ? h(
              'label',
              { className: 'dst-ack' },
              h('input', {
                type: 'checkbox',
                checked: state.acknowledge === true,
                disabled: busy || active > 0,
                onChange: (event) => onAcknowledge(event.target.checked),
              }),
              h('span', null, t.sessionAck),
            )
          : null,
        state.error ? h('div', { className: 'dst-inline-error', role: 'alert' }, state.error) : null,
        h(
          'div',
          { className: 'dst-confirm-actions' },
          h('button', { type: 'button', className: 'dst-btn', onClick: onClose, disabled: busy }, t.cancel),
          state.phase === 'error'
            ? h('button', { type: 'button', className: 'dst-btn dst-btn-danger', onClick: onRetry }, t.replan)
            : sessions > 0
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'dst-btn dst-btn-danger',
                    onClick: onConfirm,
                    disabled: !canConfirm || busy,
                  },
                  busy ? t.cleaning : t.sessionConfirm,
                )
              : null,
        ),
      )
    }

    function DiskCard({ t, disk }) {
      if (!disk || !(disk.totalBytes > 0)) return null
      const used = percentOf(disk.usedBytes, disk.totalBytes)

      return h(
        'div',
        { className: 'dst-card dst-disk' },
        h(
          'div',
          { className: 'dst-disk-head' },
          h('span', null, t.disk),
          h('span', { className: 'dst-disk-pct' }, t.diskUsed(formatPercent(used))),
        ),
        h(
          'div',
          { className: 'dst-disk-bar' },
          h('span', { className: 'dst-disk-fill', style: { width: used + '%' } }),
        ),
        h(
          'div',
          { className: 'dst-disk-foot' },
          h('span', null, t.diskFree + ' ' + formatBytes(disk.freeBytes)),
          h('span', null, t.diskTotal + ' ' + formatBytes(disk.totalBytes)),
        ),
      )
    }

    function Footer({ t, lang, data }) {
      const scan = data.scan || {}
      const cache = data.cache || {}
      const updatedText = t.updated(relativeTime(data.generatedAt, lang))
      const updatedLine = cache.cached ? updatedText + ' · ' + t.cached : updatedText

      return h(
        'footer',
        { className: 'dst-foot' },
        h(
          'div',
          { className: 'dst-foot-line' },
          h('span', null, updatedLine),
          h('span', null, t.scanTime(scan.durationMs || 0)),
        ),
        data.homeError ? h('div', { className: 'dst-note dst-warn' }, t.homeError(data.homeError)) : null,
        scan.partial ? h('div', { className: 'dst-note dst-warn', role: 'status' }, t.partial) : null,
        scan.errors > 0 ? h('div', { className: 'dst-note' }, t.errors(scan.errors)) : null,
        scan.skipped > 0 ? h('div', { className: 'dst-note' }, t.skipped(scan.skipped)) : null,
        h('div', { className: 'dst-note' }, t.readOnly),
      )
    }

    function StorageSection() {
      const lang = useLang()
      const t = DICT[lang]
      const [data, setData] = useState(null)
      const [error, setError] = useState('')
      const [loading, setLoading] = useState(true)
      const [refreshing, setRefreshing] = useState(false)
      const [cleanup, setCleanup] = useState(null)
      const [notice, setNotice] = useState(null)
      const [sessionsOpen, setSessionsOpen] = useState(false)
      const [sessionList, setSessionList] = useState(null)
      const [sessionsLoading, setSessionsLoading] = useState(false)
      const [sessionsError, setSessionsError] = useState('')
      const [sessionQuery, setSessionQuery] = useState('')
      const [selectedSessions, setSelectedSessions] = useState(() => new Set())
      const [sessionPlan, setSessionPlan] = useState(null)
      const dataRef = useRef(null)
      const seq = useRef(0)
      const ctrl = useRef(null)
      const cleanupSeq = useRef(0)
      const cleanupCtrl = useRef(null)
      const sessionSeq = useRef(0)
      const sessionCtrl = useRef(null)
      const alive = useRef(true)
      const timer = useRef(null)

      const load = useCallback(async (force, silent) => {
        const id = seq.current + 1
        seq.current = id

        if (ctrl.current) {
          try {
            ctrl.current.abort()
          } catch {
            // ignore
          }
        }
        const controller = typeof AbortController === 'function' ? new AbortController() : null
        ctrl.current = controller

        if (force) setRefreshing(true)
        if (!silent) setError('')
        if (!silent && !dataRef.current) setLoading(true)

        try {
          const next = await requestStats(force, controller ? controller.signal : undefined)
          if (!alive.current || seq.current !== id) return
          dataRef.current = next
          setData(next)
          setError('')
        } catch (err) {
          if (!alive.current || seq.current !== id) return
          if (err && (err.name === 'AbortError' || err.name === 'TimeoutError')) return
          if (!silent) setError(String((err && err.message) || err))
        } finally {
          if (alive.current && seq.current === id) {
            setLoading(false)
            setRefreshing(false)
          }
          if (ctrl.current === controller) ctrl.current = null
        }
      }, [])

      useEffect(() => {
        alive.current = true
        load(false, false)
        timer.current = setInterval(() => {
          if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
          load(false, true)
        }, POLL_MS)

        return () => {
          alive.current = false
          if (timer.current) clearInterval(timer.current)
          if (ctrl.current) {
            try {
              ctrl.current.abort()
            } catch {
              // ignore
            }
          }
          if (cleanupCtrl.current) {
            try {
              cleanupCtrl.current.abort()
            } catch {
              // ignore
            }
          }
          if (sessionCtrl.current) {
            try {
              sessionCtrl.current.abort()
            } catch {
              // ignore
            }
          }
        }
      }, [load])

      useEffect(() => {
        if (!notice) return undefined
        const id = setTimeout(() => setNotice(null), 10000)
        return () => clearTimeout(id)
      }, [notice])

      const beginCleanupRequest = useCallback(() => {
        const id = cleanupSeq.current + 1
        cleanupSeq.current = id
        if (cleanupCtrl.current) {
          try {
            cleanupCtrl.current.abort()
          } catch {
            // ignore
          }
        }
        const controller = typeof AbortController === 'function' ? new AbortController() : null
        cleanupCtrl.current = controller
        return { id, controller }
      }, [])

      const abortCleanup = useCallback(() => {
        cleanupSeq.current += 1
        if (cleanupCtrl.current) {
          try {
            cleanupCtrl.current.abort()
          } catch {
            // ignore
          }
          cleanupCtrl.current = null
        }
      }, [])

      const openCleanup = useCallback(async (category) => {
        if (sessionPlan) return
        const current = dataRef.current
        const token = current && current.cleanupToken
        if (!token) {
          setNotice({ kind: 'error', text: DICT[detectLang()].cleanupUnavailable })
          return
        }

        const { id, controller } = beginCleanupRequest()
        setCleanup({ category, phase: 'planning', plan: null, error: '', acknowledge: false })

        try {
          const plan = await postJson(
            { action: 'plan', category, token },
            controller ? controller.signal : undefined,
          )
          if (!alive.current || cleanupSeq.current !== id) return
          setCleanup({ category, phase: 'ready', plan, error: '', acknowledge: false })
        } catch (err) {
          if (!alive.current || cleanupSeq.current !== id) return
          if (err && (err.name === 'AbortError' || err.name === 'TimeoutError')) return
          const text = DICT[detectLang()]
          const message =
            err && err.code === 'category-missing'
              ? text.nothingToClean
              : err && err.code === 'invalid-token'
                ? text.sessionExpired
                : String((err && err.message) || err)
          setCleanup({ category, phase: 'error', plan: null, error: message, acknowledge: false })
        } finally {
          if (cleanupCtrl.current === controller) cleanupCtrl.current = null
        }
      }, [beginCleanupRequest, sessionPlan])

      const closeCleanup = useCallback(() => {
        if (cleanup) abortCleanup()
        setCleanup(null)
      }, [cleanup, abortCleanup])

      const acknowledgeCleanup = useCallback((value) => {
        setCleanup((current) => (current ? { ...current, acknowledge: value === true } : current))
      }, [])

      const executeCleanup = useCallback(async () => {
        const current = cleanup
        const stats = dataRef.current
        if (!current || current.phase !== 'ready' || !current.plan) return
        if ((current.category === 'attachments' || current.category === 'trash') && !current.acknowledge) return
        const token = stats && stats.cleanupToken
        if (!token) {
          setNotice({ kind: 'error', text: DICT[detectLang()].cleanupUnavailable })
          return
        }

        const acknowledge =
          current.category === 'attachments'
            ? 'move-attachments'
            : current.category === 'trash'
              ? 'empty-trash'
              : undefined

        const { id, controller } = beginCleanupRequest()
        setCleanup({ ...current, phase: 'executing', error: '' })

        try {
          const result = await postJson(
            {
              action: 'execute',
              category: current.category,
              planId: current.plan.planId,
              token,
              ...(acknowledge ? { acknowledge } : {}),
            },
            controller ? controller.signal : undefined,
          )
          if (!alive.current || cleanupSeq.current !== id) return
          const text = DICT[detectLang()]
          const label = text.cat[current.category] ? text.cat[current.category][0] : current.category
          const mode = result.mode || (current.category === 'trash' ? 'purge' : 'trash')
          const handled = result.files > 0 || result.errors > 0 || result.skipped > 0
          setCleanup(null)
          setNotice({
            kind: 'success',
            text: !handled
              ? text.nothingDeleted
              : mode === 'purge'
                ? text.emptiedTrash(result.files, formatBytes(result.bytes), result.errors, result.skipped)
                : text.movedToTrash(
                    label,
                    result.files,
                    formatBytes(result.bytes),
                    result.errors,
                    result.skipped,
                    result.trashDisplay,
                  ),
          })
          load(true, false)
        } catch (err) {
          if (!alive.current || cleanupSeq.current !== id) return
          if (err && (err.name === 'AbortError' || err.name === 'TimeoutError')) return
          const text = DICT[detectLang()]
          const message =
            err && err.code === 'plan-expired'
              ? text.planExpired
              : err && err.code === 'invalid-token'
                ? text.sessionExpired
                : String((err && err.message) || err)
          setCleanup({
            category: current.category,
            phase: 'error',
            plan: null,
            error: message,
            acknowledge: current.acknowledge,
          })
        } finally {
          if (cleanupCtrl.current === controller) cleanupCtrl.current = null
        }
      }, [beginCleanupRequest, cleanup, load])

      const replanCleanup = useCallback(() => {
        if (cleanup) openCleanup(cleanup.category)
      }, [cleanup, openCleanup])

      const onRefresh = useCallback(() => {
        load(true, false)
      }, [load])

      const loadSessions = useCallback(async () => {
        const id = sessionSeq.current + 1
        sessionSeq.current = id
        if (sessionCtrl.current) {
          try {
            sessionCtrl.current.abort()
          } catch {
            // ignore
          }
        }
        const controller = typeof AbortController === 'function' ? new AbortController() : null
        sessionCtrl.current = controller
        setSessionsLoading(true)
        setSessionsError('')

        try {
          const next = await requestSessionList(controller ? controller.signal : undefined)
          if (!alive.current || sessionSeq.current !== id) return
          setSessionList(next)
          setSelectedSessions((previous) => {
            const available = new Set((next.sessions || []).map((session) => session.id))
            const filtered = new Set([...previous].filter((sessionId) => available.has(sessionId)))
            return filtered.size === previous.size ? previous : filtered
          })
        } catch (err) {
          if (!alive.current || sessionSeq.current !== id) return
          if (err && (err.name === 'AbortError' || err.name === 'TimeoutError')) return
          setSessionsError(String((err && err.message) || err))
        } finally {
          if (alive.current && sessionSeq.current === id) setSessionsLoading(false)
          if (sessionCtrl.current === controller) sessionCtrl.current = null
        }
      }, [])

      const closeSessionPlan = useCallback(() => {
        if (sessionPlan) abortCleanup()
        setSessionPlan(null)
      }, [sessionPlan, abortCleanup])

      const closeSessions = useCallback(() => {
        closeSessionPlan()
        setSessionsOpen(false)
      }, [closeSessionPlan])

      const toggleSessions = useCallback(() => {
        if (sessionPlan && sessionPlan.phase === 'executing') return
        if (sessionsOpen) {
          closeSessions()
        } else {
          setSessionsOpen(true)
          loadSessions()
        }
      }, [sessionsOpen, sessionPlan, closeSessions, loadSessions])

      const toggleSession = useCallback((sessionId) => {
        setSelectedSessions((previous) => {
          const next = new Set(previous)
          if (next.has(sessionId)) next.delete(sessionId)
          else next.add(sessionId)
          return next
        })
      }, [])

      const selectAllSessions = useCallback(() => {
        const needle = sessionQuery.trim().toLowerCase()
        const rows = (sessionList && Array.isArray(sessionList.sessions) ? sessionList.sessions : []).filter(
          (session) =>
            !needle ||
            (session.title || '').toLowerCase().includes(needle) ||
            (session.workspace || '').toLowerCase().includes(needle),
        )
        setSelectedSessions((previous) => {
          const next = new Set(previous)
          for (const session of rows) {
            if (!session.active) next.add(session.id)
          }
          return next
        })
      }, [sessionList, sessionQuery])

      const clearSessions = useCallback(() => {
        setSelectedSessions(new Set())
      }, [])

      const openSessionDelete = useCallback(async () => {
        if (cleanup) return
        if (sessionList && sessionList.workspaceAvailable === false) {
          setNotice({ kind: 'error', text: DICT[detectLang()].sessionsUnavailable })
          return
        }
        if (selectedSessions.size === 0) return
        const stats = dataRef.current
        const token = stats && stats.cleanupToken
        if (!token) {
          setNotice({ kind: 'error', text: DICT[detectLang()].cleanupUnavailable })
          return
        }

        const { id, controller } = beginCleanupRequest()
        setSessionPlan({ phase: 'planning', plan: null, error: '', acknowledge: false })

        try {
          const plan = await postJson(
            { action: 'plan-sessions', sessionIds: [...selectedSessions], token },
            controller ? controller.signal : undefined,
          )
          if (!alive.current || cleanupSeq.current !== id) return
          setSessionPlan({ phase: 'ready', plan, error: '', acknowledge: false })
        } catch (err) {
          if (!alive.current || cleanupSeq.current !== id) return
          if (err && (err.name === 'AbortError' || err.name === 'TimeoutError')) return
          setSessionPlan({
            phase: 'error',
            plan: null,
            error: sessionPlanErrorMessage(err, DICT[detectLang()]),
            acknowledge: false,
          })
        } finally {
          if (cleanupCtrl.current === controller) cleanupCtrl.current = null
        }
      }, [beginCleanupRequest, cleanup, selectedSessions, sessionList])

      const acknowledgeSessionDelete = useCallback((value) => {
        setSessionPlan((current) => (current ? { ...current, acknowledge: value === true } : current))
      }, [])

      const executeSessionDelete = useCallback(async () => {
        const current = sessionPlan
        const stats = dataRef.current
        if (!current || current.phase !== 'ready' || !current.plan) return
        if (current.plan.active > 0) return
        if (!current.acknowledge) return
        const token = stats && stats.cleanupToken
        if (!token) {
          setNotice({ kind: 'error', text: DICT[detectLang()].cleanupUnavailable })
          return
        }

        const { id, controller } = beginCleanupRequest()
        setSessionPlan({ ...current, phase: 'executing', error: '' })

        try {
          const result = await postJson(
            {
              action: 'execute-sessions',
              planId: current.plan.planId,
              token,
              acknowledge: 'delete-sessions',
            },
            controller ? controller.signal : undefined,
          )
          if (!alive.current || cleanupSeq.current !== id) return
          const text = DICT[detectLang()]
          setSessionPlan(null)
          setSelectedSessions(new Set())
          setNotice({
            kind: 'success',
            text:
              result.sessions > 0 || result.errors > 0 || result.skipped > 0
                ? text.sessionsDeleted(
                    result.sessions,
                    result.files,
                    formatBytes(result.bytes),
                    result.errors,
                    result.skipped,
                    result.trashDisplay,
                  )
                : text.nothingDeleted,
          })
          load(true, false)
          loadSessions()
        } catch (err) {
          if (!alive.current || cleanupSeq.current !== id) return
          if (err && (err.name === 'AbortError' || err.name === 'TimeoutError')) return
          setSessionPlan({
            phase: 'error',
            plan: null,
            error: sessionPlanErrorMessage(err, DICT[detectLang()]),
            acknowledge: current.acknowledge,
          })
        } finally {
          if (cleanupCtrl.current === controller) cleanupCtrl.current = null
        }
      }, [beginCleanupRequest, load, loadSessions, sessionPlan])

      const replanSessionDelete = useCallback(() => {
        if (sessionPlan) openSessionDelete()
      }, [sessionPlan, openSessionDelete])

      const rows = useMemo(() => {
        if (!data || !Array.isArray(data.categories)) return []
        return data.categories.filter((category) => category && (category.bytes > 0 || category.files > 0))
      }, [data])

      return h(
        'section',
        { className: 'dst-section', 'aria-busy': loading ? 'true' : undefined },
        h('style', null, CSS),
        h(
          'header',
          { className: 'dst-head' },
          h(
            'div',
            { className: 'dst-head-text' },
            h('h2', { className: 'dst-heading' }, t.title),
            h('p', { className: 'dst-intro' }, t.intro),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dst-btn',
              onClick: onRefresh,
              disabled:
                refreshing ||
                (cleanup !== null && cleanup.phase === 'executing') ||
                (sessionPlan !== null && sessionPlan.phase === 'executing'),
              'aria-busy': refreshing ? 'true' : undefined,
            },
            h(
              'svg',
              {
                className: 'dst-refresh-icon' + (refreshing ? ' spinning' : ''),
                viewBox: '0 0 24 24',
                width: 14,
                height: 14,
                'aria-hidden': true,
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: 2,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              },
              h('path', { d: 'M20 11a8.1 8.1 0 0 0-14.7-4.4L3 9' }),
              h('path', { d: 'M3 4v5h5' }),
              h('path', { d: 'M4 13a8.1 8.1 0 0 0 14.7 4.4L21 15' }),
              h('path', { d: 'M21 20v-5h-5' }),
            ),
            refreshing ? t.refreshing : t.refresh,
          ),
        ),
        loading && !data ? h(LoadingCard, { t }) : null,
        error && !data ? h(ErrorCard, { t, message: error, onRetry: onRefresh }) : null,
        data
          ? h(
              'div',
              { className: 'dst-body' },
              error ? h('div', { className: 'dst-inline-error', role: 'status' }, t.error + ': ' + error) : null,
              notice
                ? h('div', { className: 'dst-notice dst-notice-' + notice.kind, role: 'status' }, notice.text)
                : null,
              h(HeroCard, { t, lang, data }),
              rows.length > 0
                ? h(
                    'div',
                    { className: 'dst-list', role: 'list' },
                    rows.map((category) =>
                      h(CategoryRow, {
                        key: category.id,
                        t,
                        lang,
                        category,
                        total: data.totalBytes || 0,
                        sessionCount: data.sessionCount || 0,
                        onClean: openCleanup,
                        cleanDisabled: cleanup !== null || sessionPlan !== null,
                        onManageSessions: toggleSessions,
                        sessionsOpen,
                        manageDisabled: Boolean(sessionPlan && sessionPlan.phase === 'executing'),
                      }),
                    ),
                  )
                : h(
                    'p',
                    { className: 'dst-empty' },
                    data.dshHomeExists === false ? t.homeMissing : t.empty,
                  ),
              sessionsOpen
                ? h(SessionManager, {
                    t,
                    lang,
                    list: sessionList,
                    loading: sessionsLoading,
                    error: sessionsError,
                    query: sessionQuery,
                    selected: selectedSessions,
                    plan: sessionPlan,
                    sessionBusy: Boolean(sessionPlan && sessionPlan.phase === 'executing'),
                    selectionLocked: Boolean(sessionPlan),
                    categoryCleanupOpen: cleanup !== null,
                    onQuery: setSessionQuery,
                    onRefresh: loadSessions,
                    onToggle: toggleSession,
                    onSelectAll: selectAllSessions,
                    onClear: clearSessions,
                    onDelete: openSessionDelete,
                    onClose: closeSessions,
                    onClosePlan: closeSessionPlan,
                    onConfirmDelete: executeSessionDelete,
                    onReplan: replanSessionDelete,
                    onAcknowledge: acknowledgeSessionDelete,
                  })
                : null,
              cleanup
                ? h(CleanupCard, {
                    t,
                    lang,
                    state: cleanup,
                    onClose: closeCleanup,
                    onConfirm: executeCleanup,
                    onRetry: replanCleanup,
                    onAcknowledge: acknowledgeCleanup,
                  })
                : null,
              h(DiskCard, { t, disk: data.disk }),
              h(Footer, { t, lang, data }),
            )
          : null,
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        try {
          localeService = ctx.get('locale') || null
        } catch {
          localeService = null
        }

        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            {
              name: 'settings.section',
              id: 'dsh-storage',
              order: 90,
              label: () => (detectLang() === 'zh' ? '存储' : 'Storage'),
            },
            StorageSection,
          ),
        )
      },
    }
  },
})
