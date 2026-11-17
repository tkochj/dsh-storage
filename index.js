import { randomBytes, timingSafeEqual } from 'node:crypto'
import fs from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

const API_PATH = '/dsh-storage-api'
const DEFAULT_SCAN_BUDGET_MS = 8000
const DEFAULT_CACHE_TTL_MS = 60000
const MAX_SCAN_BUDGET_MS = 60000
const MAX_CACHE_TTL_MS = 600000
const MAX_ENTRIES = 400000
const MAX_PLAN_FILES = 100000
const MAX_PLANS = 16
const PLAN_TTL_MS = 120000
const MAX_BODY_BYTES = 65536
const TRASH_DIR_NAME = 'dsh-storage-trash'
const SESSIONS_DIR_NAME = 'sessions'
const SESSION_DELETE_MAX = 500

const CLEANABLE = {
  cache: { root: () => join(resolveDshHome(), 'cache'), mode: 'trash' },
  attachments: { root: () => join(resolveDshHome(), 'attachments'), mode: 'trash' },
  trash: { root: () => join(resolveDshHome(), TRASH_DIR_NAME), mode: 'purge' },
}

const CATEGORIES = [
  { id: 'sessions', dirs: ['sessions'], trackSessions: true },
  { id: 'attachments', dirs: ['attachments'] },
  { id: 'cache', dirs: ['cache'] },
  { id: 'trash', dirs: [TRASH_DIR_NAME] },
  { id: 'profiles', dirs: ['profiles'] },
  { id: 'storages', dirs: ['storages'] },
  { id: 'logs', dirs: ['logs'] },
]

const KNOWN_DIRS = new Set(CATEGORIES.flatMap((category) => category.dirs))
const SESSION_FILE = /^session(?:\.v\d+)?\.jsonl(?:\.zstd?)?$/
const CATEGORY_ORDER = [...CATEGORIES.map((category) => category.id), 'other']

function clampInteger(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.floor(number)))
}

function expandHome(value) {
  if (value === '~') return homedir()
  if (value.startsWith('~/') || value.startsWith('~\\')) return join(homedir(), value.slice(2))
  return value
}

export function resolveDshHome() {
  const configured = typeof process.env.DSH_HOME === 'string' ? process.env.DSH_HOME.trim() : ''
  return configured ? resolve(expandHome(configured)) : join(homedir(), '.dsh')
}

function dshHomeDisplay() {
  const configured = typeof process.env.DSH_HOME === 'string' ? process.env.DSH_HOME.trim() : ''
  return configured ? '$DSH_HOME' : '~/.dsh'
}

function emptyMeasure() {
  return {
    bytes: 0,
    files: 0,
    dirs: 0,
    skipped: 0,
    errors: 0,
    partial: false,
    sessionDirs: null,
  }
}

async function measurePath(target, deadline, trackSessions) {
  const out = emptyMeasure()
  if (trackSessions) out.sessionDirs = new Set()

  let rootInfo
  try {
    rootInfo = await fs.promises.lstat(target)
  } catch {
    out.errors = 1
    return out
  }

  if (rootInfo.isSymbolicLink()) {
    out.skipped = 1
    return out
  }

  if (rootInfo.isFile()) {
    out.bytes = rootInfo.size
    out.files = 1
    if (trackSessions && SESSION_FILE.test(basename(target))) out.sessionDirs.add(dirname(target))
    return out
  }

  if (!rootInfo.isDirectory()) {
    out.skipped = 1
    return out
  }

  const stack = [target]
  let seen = 0
  while (stack.length > 0) {
    if (Date.now() > deadline || seen >= MAX_ENTRIES) {
      out.partial = true
      break
    }

    const dir = stack.pop()
    let entries
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true })
    } catch {
      out.errors += 1
      continue
    }

    for (const entry of entries) {
      seen += 1
      if (seen > MAX_ENTRIES) {
        out.partial = true
        break
      }

      const child = join(dir, entry.name)
      if (entry.isSymbolicLink()) {
        out.skipped += 1
        continue
      }
      if (entry.isDirectory()) {
        out.dirs += 1
        stack.push(child)
        continue
      }
      if (!entry.isFile()) {
        out.skipped += 1
        continue
      }

      try {
        const info = await fs.promises.lstat(child)
        out.bytes += info.size
        out.files += 1
        if (trackSessions && SESSION_FILE.test(entry.name)) out.sessionDirs.add(dir)
      } catch {
        out.errors += 1
      }

      if ((seen & 31) === 0 && Date.now() > deadline) {
        out.partial = true
        break
      }
    }

    if (out.partial) break
  }

  return out
}

async function listPathFiles(root, deadline) {
  const result = {
    exists: false,
    files: [],
    dirs: [],
    bytes: 0,
    errors: 0,
    partial: false,
    skipped: 0,
  }

  let rootInfo
  try {
    rootInfo = await fs.promises.lstat(root)
  } catch {
    return result
  }

  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) {
    result.skipped = 1
    return result
  }
  result.exists = true

  const stack = [root]
  let seen = 0
  while (stack.length > 0) {
    if (Date.now() > deadline || seen >= MAX_ENTRIES || result.files.length >= MAX_PLAN_FILES) {
      result.partial = true
      break
    }

    const dir = stack.pop()
    let entries
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true })
    } catch {
      result.errors += 1
      continue
    }

    for (const entry of entries) {
      seen += 1
      if (seen > MAX_ENTRIES || result.files.length >= MAX_PLAN_FILES) {
        result.partial = true
        break
      }

      const child = join(dir, entry.name)
      if (entry.isSymbolicLink()) {
        result.skipped += 1
        continue
      }
      if (entry.isDirectory()) {
        result.dirs.push(child)
        stack.push(child)
        continue
      }
      if (!entry.isFile()) {
        result.skipped += 1
        continue
      }

      try {
        const info = await fs.promises.lstat(child)
        result.files.push({ path: child, size: info.size, mtimeMs: info.mtimeMs })
        result.bytes += info.size
      } catch {
        result.errors += 1
      }

      if ((seen & 31) === 0 && Date.now() > deadline) {
        result.partial = true
        break
      }
    }

    if (result.partial) break
  }

  return result
}

function isInside(root, target) {
  const rel = relative(root, target)
  return rel !== '' && rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel)
}

function sessionsRootPath() {
  return join(resolveDshHome(), SESSIONS_DIR_NAME)
}

async function measureSessionDir(dir, deadline) {
  let bytes = 0
  let files = 0
  let mtimeMs = 0
  let partial = false
  let errors = 0
  const stack = [dir]
  let seen = 0

  while (stack.length > 0) {
    if (Date.now() > deadline || seen >= MAX_ENTRIES) {
      partial = true
      break
    }
    const current = stack.pop()
    let entries
    try {
      entries = await fs.promises.readdir(current, { withFileTypes: true })
    } catch {
      errors += 1
      continue
    }
    for (const entry of entries) {
      seen += 1
      if (seen >= MAX_ENTRIES) {
        partial = true
        break
      }
      const child = join(current, entry.name)
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) {
        stack.push(child)
        continue
      }
      if (!entry.isFile()) continue
      try {
        const info = await fs.promises.lstat(child)
        bytes += info.size
        files += 1
        if (info.mtimeMs > mtimeMs) mtimeMs = info.mtimeMs
      } catch {
        errors += 1
      }
    }
    if (partial) break
  }

  return { bytes, files, mtimeMs, partial, errors }
}

async function scanSessionDirs(deadline) {
  const root = sessionsRootPath()
  const result = { entries: new Map(), partial: false, errors: 0 }

  let projectDirs
  try {
    projectDirs = await fs.promises.readdir(root, { withFileTypes: true })
  } catch {
    return result
  }

  for (const project of projectDirs) {
    if (Date.now() > deadline) {
      result.partial = true
      break
    }
    if (project.isSymbolicLink() || !project.isDirectory()) continue
    const projectPath = join(root, project.name)
    let children
    try {
      children = await fs.promises.readdir(projectPath, { withFileTypes: true })
    } catch {
      result.errors += 1
      continue
    }
    for (const child of children) {
      if (Date.now() > deadline) {
        result.partial = true
        break
      }
      if (child.isSymbolicLink() || !child.isDirectory()) continue
      const dir = join(projectPath, child.name)
      const measured = await measureSessionDir(dir, deadline)
      result.entries.set(child.name, {
        id: child.name,
        dir,
        relativeDir: relative(root, dir),
        bytes: measured.bytes,
        files: measured.files,
        mtimeMs: measured.mtimeMs,
        partial: measured.partial,
      })
      result.errors += measured.errors
    }
    if (result.partial) break
  }

  return result
}

async function moveDirectory(source, destination) {
  await fs.promises.mkdir(dirname(destination), { recursive: true })
  try {
    await fs.promises.rename(source, destination)
  } catch (error) {
    if (!error || error.code !== 'EXDEV') throw error
    await fs.promises.cp(source, destination, { recursive: true, force: true })
    await fs.promises.rm(source, { recursive: true, force: true })
  }
}

async function moveFile(source, destination) {
  await fs.promises.mkdir(dirname(destination), { recursive: true })
  try {
    await fs.promises.rename(source, destination)
  } catch (error) {
    if (!error || error.code !== 'EXDEV') throw error
    await fs.promises.copyFile(source, destination)
    await fs.promises.unlink(source)
  }
}

function trashRunName(category) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return stamp + '-' + category + '-' + randomBytes(3).toString('hex')
}

function sumMeasures(results, trackSessions) {
  const total = emptyMeasure()
  if (trackSessions) total.sessionDirs = new Set()

  for (const result of results) {
    total.bytes += result.bytes || 0
    total.files += result.files || 0
    total.dirs += result.dirs || 0
    total.skipped += result.skipped || 0
    total.errors += result.errors || 0
    total.partial = total.partial || result.partial === true
    if (total.sessionDirs && result.sessionDirs) {
      for (const dir of result.sessionDirs) total.sessionDirs.add(dir)
    }
  }

  return total
}

function readDisk(home) {
  if (typeof fs.statfsSync !== 'function') return null

  for (const candidate of [home, dirname(home)]) {
    try {
      const stat = fs.statfsSync(candidate)
      const blockSize = Number(stat.bsize)
      const blocks = Number(stat.blocks)
      const freeBlocks = Number(stat.bfree)
      const availableBlocks = Number(stat.bavail)
      if (!blockSize || !blocks) continue
      return {
        totalBytes: blocks * blockSize,
        freeBytes: availableBlocks * blockSize,
        usedBytes: (blocks - freeBlocks) * blockSize,
      }
    } catch {
      // Try the parent directory when DSH_HOME does not exist yet.
    }
  }

  return null
}

export async function collectStorageStats(config = {}) {
  const budgetMs = clampInteger(config.scanBudgetMs, 1000, MAX_SCAN_BUDGET_MS, DEFAULT_SCAN_BUDGET_MS)
  const startedAt = Date.now()
  const deadline = startedAt + budgetMs
  const home = resolveDshHome()

  let exists = false
  let homeError = ''
  let entries = []
  try {
    const homeInfo = await fs.promises.stat(home)
    exists = homeInfo.isDirectory()
    if (exists) entries = await fs.promises.readdir(home, { withFileTypes: true })
  } catch (error) {
    homeError = String((error && error.code) || 'unreadable')
  }

  const byName = new Map(entries.map((entry) => [entry.name, entry]))

  const categoryPromise = Promise.all(
    CATEGORIES.map(async (category) => {
      const present = category.dirs.filter((name) => byName.has(name))
      if (present.length === 0) return { id: category.id, ...emptyMeasure() }
      const measured = await Promise.all(
        present.map((name) => measurePath(join(home, name), deadline, category.trackSessions === true)),
      )
      return { id: category.id, ...sumMeasures(measured, category.trackSessions === true) }
    }),
  )

  const otherEntries = entries.filter((entry) => !KNOWN_DIRS.has(entry.name))
  const otherPromise = Promise.all(
    otherEntries.map((entry) => measurePath(join(home, entry.name), deadline, false)),
  )

  const [categoriesMeasured, otherMeasured] = await Promise.all([categoryPromise, otherPromise])
  categoriesMeasured.push({ id: 'other', ...sumMeasures(otherMeasured, false) })
  categoriesMeasured.sort((a, b) => CATEGORY_ORDER.indexOf(a.id) - CATEGORY_ORDER.indexOf(b.id))

  const total = sumMeasures(categoriesMeasured, false)
  const sessionCategory = categoriesMeasured.find((category) => category.id === 'sessions')
  const sessionCount = sessionCategory && sessionCategory.sessionDirs ? sessionCategory.sessionDirs.size : 0

  const categories = categoriesMeasured.map((category) => ({
    id: category.id,
    bytes: category.bytes,
    files: category.files,
    dirs: category.dirs,
    partial: category.partial,
    ...(category.id === 'sessions' ? { sessionCount } : {}),
  }))

  return {
    homeDisplay: dshHomeDisplay(),
    dshHomeExists: exists,
    ...(homeError ? { homeError } : {}),
    generatedAt: new Date().toISOString(),
    totalBytes: total.bytes,
    totalFiles: total.files,
    totalDirs: total.dirs,
    sessionCount,
    categories,
    disk: readDisk(home),
    scan: {
      durationMs: Date.now() - startedAt,
      budgetMs,
      partial: total.partial,
      errors: total.errors,
      skipped: total.skipped,
    },
  }
}

function sendJson(res, status, body, extraHeaders) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(payload),
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'same-origin',
    ...(extraHeaders || {}),
  })
  res.end(payload)
}

function fail(res, status, code, message) {
  sendJson(res, status, { ok: false, code, error: message })
}

function isSameOrigin(req) {
  const origin = String((req.headers && req.headers.origin) || '')
  if (!origin) return true
  const host = String((req.headers && req.headers.host) || '')
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase()
  } catch {
    return false
  }
}

function isFetchSiteSameOrigin(req) {
  const site = String((req.headers && req.headers['sec-fetch-site']) || '')
  return !site || site === 'same-origin' || site === 'none'
}

function tokenMatches(expected, given) {
  const left = Buffer.from(String(expected || ''), 'utf8')
  const right = Buffer.from(String(given || ''), 'utf8')
  return left.length > 0 && left.length === right.length && timingSafeEqual(left, right)
}

function readJsonBody(req, limit) {
  return new Promise((resolve) => {
    let size = 0
    let tooLarge = false
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        tooLarge = true
        chunks.length = 0
        return
      }
      if (!tooLarge) chunks.push(chunk)
    })
    req.on('end', () => {
      if (tooLarge) {
        resolve({ tooLarge: true })
        return
      }
      try {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve({ value: text ? JSON.parse(text) : {} })
      } catch {
        resolve({ invalid: true })
      }
    })
    req.on('error', () => resolve({ invalid: true }))
  })
}

function isLoopbackRequest(req) {
  const address = String((req.socket && req.socket.remoteAddress) || '')
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

function isLoopbackHost(req) {
  const raw = String((req.headers && req.headers.host) || '').toLowerCase()
  if (!raw) return false

  let hostname = raw
  if (raw.startsWith('[')) {
    const end = raw.indexOf(']')
    hostname = end > 0 ? raw.slice(1, end) : ''
  } else {
    const colon = raw.lastIndexOf(':')
    if (colon > -1 && raw.indexOf(':') === colon) hostname = raw.slice(0, colon)
  }

  return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1'
}

export function apply(ctx, config) {
  const options = {
    scanBudgetMs: clampInteger(config && config.scanBudgetMs, 1000, MAX_SCAN_BUDGET_MS, DEFAULT_SCAN_BUDGET_MS),
    cacheTtlMs: clampInteger(config && config.cacheTtlMs, 0, MAX_CACHE_TTL_MS, DEFAULT_CACHE_TTL_MS),
  }

  const cleanupToken = randomBytes(24).toString('hex')
  const plans = new Map()
  let cache = null
  let inflight = null
  let scanVersion = 0
  let cleanupBusy = false

  const invalidateStats = () => {
    scanVersion += 1
    cache = null
    inflight = null
  }

  const cleanupError = (status, code, message) => {
    const error = new Error(message)
    error.statusCode = status
    error.code = code
    return error
  }

  const getService = (name) => {
    try {
      return ctx.get(name) || null
    } catch {
      return null
    }
  }

  const getStats = async (force) => {
    const now = Date.now()
    if (!force && cache && now - cache.at < options.cacheTtlMs) {
      return {
        ...cache.value,
        cache: { cached: true, ageMs: now - cache.at, ttlMs: options.cacheTtlMs },
      }
    }

    if (!inflight) {
      const version = scanVersion
      const pending = collectStorageStats(options)
        .then((value) => {
          if (version === scanVersion) cache = { at: Date.now(), value }
          return value
        })
        .finally(() => {
          if (inflight === pending) inflight = null
        })
      inflight = pending
    }

    const value = await inflight
    return {
      ...value,
      cache: { cached: false, ageMs: 0, ttlMs: options.cacheTtlMs },
    }
  }

  const ensureTrashRoot = async () => {
    const root = join(resolveDshHome(), TRASH_DIR_NAME)
    try {
      const info = await fs.promises.lstat(root)
      if (info.isSymbolicLink() || !info.isDirectory()) {
        throw cleanupError(409, 'trash-unavailable', 'trash folder is not a directory')
      }
    } catch (error) {
      if (!error || error.code !== 'ENOENT') throw error
      await fs.promises.mkdir(root, { recursive: true })
    }
    return root
  }

  const collectSessionCorpus = async () => {
    const deadline = Date.now() + Math.max(options.scanBudgetMs, 6000)
    const dirs = await scanSessionDirs(deadline)
    const query = getService('sessionQuery')
    let records = []
    let queryError = ''

    if (query && typeof query.listSessions === 'function') {
      try {
        records = [...(await query.listSessions())]
      } catch (error) {
        queryError = String((error && error.message) || error || 'session list failed')
      }
    }

    const recordById = new Map()
    for (const record of records) recordById.set(record.header.id, record)
    const knownRecordIds = new Set(recordById.keys())

    for (const [id, info] of dirs.entries) {
      if (recordById.has(id)) continue
      const record = {
        header: { id, createdAt: info.mtimeMs || Date.now(), isSeeded: false },
        live: false,
        persisted: true,
      }
      recordById.set(id, record)
      records.push(record)
    }

    const titleById = new Map()
    const titleIds = records
      .filter((record) => knownRecordIds.has(record.header.id))
      .map((record) => record.header.id)
    if (query && typeof query.readTitleSnapshots === 'function' && titleIds.length > 0) {
      try {
        const results = await query.readTitleSnapshots(titleIds)
        for (const result of results) {
          if (result && result.status === 'fulfilled' && result.value && result.value.title) {
            titleById.set(result.sessionId, result.value.title.title)
          }
        }
      } catch {
        // Titles are optional; the list still loads without them.
      }
    }

    const liveStore = getService('sessions')
    const liveIds = new Set()
    for (const record of records) {
      if (record.live) liveIds.add(record.header.id)
      if (liveStore && typeof liveStore.get === 'function') {
        try {
          if (liveStore.get(record.header.id)) liveIds.add(record.header.id)
        } catch {
          // record.live remains the fallback.
        }
      }
    }

    const registry = getService('workspaceRegistry')
    const workspaceById = new Map()
    const workspaceIdsBySession = new Map()
    const archived = new Set()
    const pinned = new Set()
    if (registry && typeof registry.list === 'function') {
      try {
        for (const workspace of registry.list()) {
          const ids = Array.isArray(workspace.sessionIds) ? workspace.sessionIds : []
          for (const id of ids) {
            const list = workspaceIdsBySession.get(id) || []
            list.push(workspace.id)
            workspaceIdsBySession.set(id, list)
            if (!workspaceById.has(id)) workspaceById.set(id, workspace)
          }
        }
        if (Array.isArray(registry.archivedSessionIds)) {
          for (const id of registry.archivedSessionIds) archived.add(id)
        }
        if (Array.isArray(registry.pinnedSessionIds)) {
          for (const id of registry.pinnedSessionIds) pinned.add(id)
        }
      } catch {
        // Workspace membership is optional; ungrouped sessions still list.
      }
    }

    const childrenOf = new Map()
    const subagentChild = new Set()
    for (const record of records) {
      const header = record.header
      if (header.origin !== 'subagent' || !header.parentSession) continue
      if (!recordById.has(header.parentSession)) continue
      subagentChild.add(header.id)
      const list = childrenOf.get(header.parentSession) || []
      list.push(header.id)
      childrenOf.set(header.parentSession, list)
    }

    return {
      records,
      recordById,
      knownRecordIds,
      dirs,
      titleById,
      liveIds,
      workspaceById,
      workspaceIdsBySession,
      archived,
      pinned,
      childrenOf,
      subagentChild,
      queryError,
    }
  }

  const buildSessionRows = (corpus) => {
    const rows = []
    for (const record of corpus.records) {
      if (corpus.subagentChild.has(record.header.id)) continue
      const ids = [record.header.id]
      const seen = new Set(ids)
      const stack = [...(corpus.childrenOf.get(record.header.id) || [])]
      while (stack.length > 0) {
        const id = stack.pop()
        if (seen.has(id)) continue
        seen.add(id)
        ids.push(id)
        for (const child of corpus.childrenOf.get(id) || []) stack.push(child)
      }

      const infos = ids.map((id) => corpus.dirs.entries.get(id)).filter(Boolean)
      const bytes = infos.reduce((sum, info) => sum + (info.bytes || 0), 0)
      const files = infos.reduce((sum, info) => sum + (info.files || 0), 0)
      const updatedMs = Math.max(
        record.header.createdAt || 0,
        ...infos.map((info) => info.mtimeMs || 0),
      )
      const activeCount = ids.filter((id) => corpus.liveIds.has(id)).length
      const workspace =
        corpus.workspaceById.get(record.header.id) ||
        ids.map((id) => corpus.workspaceById.get(id)).find(Boolean) ||
        null

      rows.push({
        id: record.header.id,
        title: corpus.titleById.get(record.header.id) || null,
        workspace: workspace ? workspace.title : null,
        createdAt: new Date(record.header.createdAt || updatedMs || Date.now()).toISOString(),
        updatedAt: new Date(updatedMs || record.header.createdAt || Date.now()).toISOString(),
        bytes,
        files,
        sessions: ids.length,
        children: ids.length - 1,
        active: activeCount > 0,
        activeCount,
        archived: ids.some((id) => corpus.archived.has(id)),
        pinned: ids.some((id) => corpus.pinned.has(id)),
        orphan: !corpus.knownRecordIds.has(record.header.id),
        missing: infos.length === 0,
      })
    }
    rows.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    return rows
  }

  const buildSessionList = async () => {
    const corpus = await collectSessionCorpus()
    const rows = buildSessionRows(corpus)
    return {
      generatedAt: new Date().toISOString(),
      sessions: rows,
      totalSessions: rows.reduce((sum, row) => sum + row.sessions, 0),
      totalBytes: rows.reduce((sum, row) => sum + row.bytes, 0),
      partial: corpus.dirs.partial,
      errors: corpus.dirs.errors,
      ...(corpus.queryError ? { queryError: corpus.queryError } : {}),
      workspaceAvailable: Boolean(getService('workspaceRegistry')),
    }
  }

  const prunePlans = () => {
    const now = Date.now()
    for (const [id, plan] of plans) {
      if (plan.expiresAt <= now) plans.delete(id)
    }
  }

  const createPlan = async (category) => {
    const spec = CLEANABLE[category]
    if (!spec) throw cleanupError(400, 'unsupported-category', 'unsupported cleanup category')

    prunePlans()
    const root = spec.root()
    const listing = await listPathFiles(root, Date.now() + options.scanBudgetMs)
    if (!listing.exists) throw cleanupError(404, 'category-missing', 'cleanup folder not found')

    const plan = {
      id: randomBytes(16).toString('hex'),
      category,
      mode: spec.mode,
      root,
      files: listing.files,
      dirs: listing.dirs,
      bytes: listing.bytes,
      partial: listing.partial,
      errors: listing.errors,
      skipped: listing.skipped,
      expiresAt: Date.now() + PLAN_TTL_MS,
    }
    plans.set(plan.id, plan)
    while (plans.size > MAX_PLANS) plans.delete(plans.keys().next().value)
    return plan
  }

  const createSessionPlan = async (selectedIds) => {
    const ids = [
      ...new Set(
        (Array.isArray(selectedIds) ? selectedIds : [])
          .map((id) => String(id || ''))
          .filter(Boolean),
      ),
    ]
    if (ids.length === 0) throw cleanupError(400, 'no-sessions', 'no sessions selected')
    if (ids.length > SESSION_DELETE_MAX) {
      throw cleanupError(400, 'too-many-sessions', 'too many sessions selected')
    }

    prunePlans()
    const registry = getService('workspaceRegistry')
    if (!registry || typeof registry.list !== 'function') {
      throw cleanupError(409, 'workspace-unavailable', 'workspace registry is not available')
    }
    const corpus = await collectSessionCorpus()
    const entryIds = new Set()
    const rootIds = new Set()

    for (const id of ids) {
      if (!corpus.recordById.has(id) && !corpus.dirs.entries.has(id)) continue
      rootIds.add(id)
      entryIds.add(id)
      const stack = [...(corpus.childrenOf.get(id) || [])]
      while (stack.length > 0) {
        const child = stack.pop()
        if (entryIds.has(child)) continue
        entryIds.add(child)
        for (const grand of corpus.childrenOf.get(child) || []) stack.push(grand)
      }
    }

    if (entryIds.size === 0) {
      throw cleanupError(404, 'sessions-missing', 'selected sessions no longer exist')
    }

    const entries = [...entryIds].map((id) => {
      const info = corpus.dirs.entries.get(id) || null
      return {
        id,
        dir: info ? info.dir : null,
        relativeDir: info ? info.relativeDir : null,
        bytes: info ? info.bytes : 0,
        files: info ? info.files : 0,
        workspaceIds: corpus.workspaceIdsBySession.get(id) || [],
        active: corpus.liveIds.has(id),
        archived: corpus.archived.has(id),
        pinned: corpus.pinned.has(id),
      }
    })

    const plan = {
      id: randomBytes(16).toString('hex'),
      kind: 'sessions',
      mode: 'sessions',
      entries,
      roots: rootIds.size,
      sessions: entries.length,
      files: entries.reduce((sum, entry) => sum + entry.files, 0),
      bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
      active: entries.filter((entry) => entry.active).length,
      archived: entries.filter((entry) => entry.archived).length,
      pinned: entries.filter((entry) => entry.pinned).length,
      missing: entries.filter((entry) => !entry.dir).length,
      partial: corpus.dirs.partial,
      expiresAt: Date.now() + PLAN_TTL_MS,
    }
    plans.set(plan.id, plan)
    while (plans.size > MAX_PLANS) plans.delete(plans.keys().next().value)
    return plan
  }

  const executePlan = async (planId, body) => {
    prunePlans()
    const plan = plans.get(String(planId || ''))
    if (!plan || plan.kind === 'sessions') {
      throw cleanupError(410, 'plan-expired', 'cleanup plan not found or expired')
    }
    if (plan.expiresAt <= Date.now()) {
      plans.delete(plan.id)
      throw cleanupError(410, 'plan-expired', 'cleanup plan expired')
    }
    if (body.category !== plan.category) {
      throw cleanupError(400, 'category-mismatch', 'cleanup category mismatch')
    }
    if (plan.category === 'attachments' && body.acknowledge !== 'move-attachments') {
      throw cleanupError(400, 'acknowledgement-required', 'attachments cleanup requires explicit acknowledgement')
    }
    if (plan.category === 'trash' && body.acknowledge !== 'empty-trash') {
      throw cleanupError(400, 'acknowledgement-required', 'emptying the recycle bin requires explicit acknowledgement')
    }
    if (cleanupBusy) throw cleanupError(409, 'cleanup-busy', 'another cleanup is running')

    cleanupBusy = true
    const result = {
      category: plan.category,
      mode: plan.mode,
      files: 0,
      bytes: 0,
      skipped: 0,
      errors: 0,
      partial: plan.partial,
    }

    try {
      if (plan.mode === 'purge') {
        for (const file of plan.files) {
          try {
            if (!isInside(plan.root, file.path)) {
              result.skipped += 1
              continue
            }
            const info = await fs.promises.lstat(file.path)
            if (info.isSymbolicLink() || !info.isFile()) {
              result.skipped += 1
              continue
            }
            await fs.promises.unlink(file.path)
            result.files += 1
            result.bytes += file.size
          } catch (error) {
            if (error && error.code === 'ENOENT') result.skipped += 1
            else result.errors += 1
          }
        }
      } else {
        const trashRoot = await ensureTrashRoot()
        const runName = trashRunName(plan.category)
        const runDir = join(trashRoot, runName)

        for (const file of plan.files) {
          try {
            if (!isInside(plan.root, file.path)) {
              result.skipped += 1
              continue
            }
            const info = await fs.promises.lstat(file.path)
            if (info.isSymbolicLink() || !info.isFile()) {
              result.skipped += 1
              continue
            }
            // Attachments move only when unchanged since the plan; cache may change freely.
            if (plan.category === 'attachments' && (info.size !== file.size || info.mtimeMs !== file.mtimeMs)) {
              result.skipped += 1
              continue
            }
            const rel = relative(plan.root, file.path)
            if (!rel || rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) {
              result.skipped += 1
              continue
            }
            const destination = join(runDir, rel)
            if (!isInside(runDir, destination)) {
              result.skipped += 1
              continue
            }
            await moveFile(file.path, destination)
            result.files += 1
            result.bytes += file.size
          } catch (error) {
            if (error && error.code === 'ENOENT') result.skipped += 1
            else result.errors += 1
          }
        }

        if (result.files > 0) {
          result.trashDisplay = dshHomeDisplay() + '/' + TRASH_DIR_NAME + '/' + runName
        } else {
          try {
            await fs.promises.rmdir(runDir)
          } catch {
            // Missing or not empty.
          }
        }
      }

      const dirs = plan.dirs.slice().sort((a, b) => b.length - a.length)
      for (const dir of dirs) {
        if (!isInside(plan.root, dir)) continue
        try {
          await fs.promises.rmdir(dir)
        } catch {
          // Not empty or already removed.
        }
      }

      plans.delete(plan.id)
      invalidateStats()
      return result
    } finally {
      cleanupBusy = false
    }
  }

  const executeSessionPlan = async (planId, body) => {
    prunePlans()
    const plan = plans.get(String(planId || ''))
    if (!plan || plan.kind !== 'sessions') {
      throw cleanupError(410, 'plan-expired', 'session deletion plan not found or expired')
    }
    if (plan.expiresAt <= Date.now()) {
      plans.delete(plan.id)
      throw cleanupError(410, 'plan-expired', 'session deletion plan expired')
    }
    if (body.acknowledge !== 'delete-sessions') {
      throw cleanupError(400, 'acknowledgement-required', 'session deletion requires explicit acknowledgement')
    }
    if (cleanupBusy) throw cleanupError(409, 'cleanup-busy', 'another cleanup is running')

    const liveStore = getService('sessions')
    const activeNow = plan.entries.filter((entry) => {
      if (liveStore && typeof liveStore.get === 'function') {
        try {
          return liveStore.get(entry.id) !== undefined
        } catch {
          return entry.active
        }
      }
      return entry.active
    })
    if (activeNow.length > 0) {
      throw cleanupError(409, 'sessions-active', `${activeNow.length} sessions are in use; close them first`)
    }

    const registry = getService('workspaceRegistry')
    const needsRegistry = plan.entries.some(
      (entry) => entry.workspaceIds.length > 0 || entry.archived || entry.pinned,
    )
    if (needsRegistry && (!registry || typeof registry.unpinSession !== 'function')) {
      throw cleanupError(409, 'workspace-unavailable', 'workspace registry is not available')
    }

    cleanupBusy = true
    const result = {
      mode: 'sessions',
      sessions: 0,
      files: 0,
      bytes: 0,
      missing: 0,
      skipped: 0,
      errors: 0,
      partial: plan.partial,
    }
    const sourceParents = new Set()

    try {
      const trashRoot = await ensureTrashRoot()
      const runName = trashRunName('sessions')
      const runDir = join(trashRoot, runName)

      for (const entry of plan.entries) {
        let detach = false

        if (entry.dir) {
          try {
            const info = await fs.promises.lstat(entry.dir)
            if (info.isSymbolicLink() || !info.isDirectory()) {
              result.skipped += 1
              continue
            }
            const rel = entry.relativeDir
            if (!rel || rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) {
              result.skipped += 1
              continue
            }
            const destination = join(runDir, rel)
            if (!isInside(runDir, destination)) {
              result.skipped += 1
              continue
            }
            await moveDirectory(entry.dir, destination)
            result.files += entry.files
            result.bytes += entry.bytes
            sourceParents.add(dirname(entry.dir))
            detach = true
          } catch (error) {
            if (error && error.code === 'ENOENT') {
              result.missing += 1
              detach = true
            } else {
              result.errors += 1
            }
          }
        } else {
          result.missing += 1
          detach = true
        }

        if (!detach) continue
        result.sessions += 1

        try {
          if (registry && typeof registry.unpinSession === 'function') {
            await registry.unpinSession(entry.id)
          }
          if (registry && typeof registry.unarchiveSession === 'function') {
            await registry.unarchiveSession(entry.id)
          }
          if (registry && typeof registry.get === 'function') {
            const workspaceIds =
              entry.workspaceIds.length > 0
                ? entry.workspaceIds
                : typeof registry.list === 'function'
                  ? registry.list().map((workspace) => workspace.id)
                  : []
            for (const workspaceId of workspaceIds) {
              const workspace = registry.get(workspaceId)
              if (workspace && typeof workspace.detachSession === 'function') {
                await workspace.detachSession(entry.id)
              }
            }
          }
        } catch {
          result.errors += 1
        }
      }

      for (const parent of [...sourceParents].sort((left, right) => right.length - left.length)) {
        try {
          await fs.promises.rmdir(parent)
        } catch {
          // Not empty or already removed.
        }
      }

      if (result.files === 0) {
        try {
          await fs.promises.rmdir(runDir)
        } catch {
          // Missing or not empty.
        }
      }
      if (result.files > 0) {
        result.trashDisplay = dshHomeDisplay() + '/' + TRASH_DIR_NAME + '/' + runName
      }

      plans.delete(plan.id)
      invalidateStats()
      return result
    } finally {
      cleanupBusy = false
    }
  }

  ctx.inject(['webServer'], (webCtx) => {
    const webServer = webCtx.webServer
    if (!webServer || typeof webServer.register !== 'function') return

    webCtx.effect(
      () =>
        webServer.register({
          kind: 'exact',
          path: API_PATH,
          async handler(req, res) {
            if (!isLoopbackRequest(req)) {
              fail(res, 403, 'loopback-only', 'storage data is available on loopback only')
              return
            }
            if (!isLoopbackHost(req)) {
              fail(res, 403, 'bad-host', 'non-loopback Host header rejected')
              return
            }

            if (req.method === 'GET') {
              let url = null
              try {
                url = new URL(String(req.url || API_PATH), 'http://127.0.0.1')
              } catch {
                // A malformed query string falls back to the cached stats path.
              }

              if (url && url.searchParams.get('action') === 'sessions') {
                try {
                  const list = await buildSessionList()
                  sendJson(res, 200, { ok: true, cleanupToken, ...list })
                } catch (error) {
                  const message = String((error && error.message) || error || 'session list failed')
                  fail(res, 500, 'sessions-list-failed', message)
                }
                return
              }

              const force = Boolean(url && url.searchParams.get('refresh') === '1')
              try {
                const stats = await getStats(force)
                sendJson(res, 200, { ok: true, cleanupToken, ...stats })
              } catch (error) {
                const message = String((error && error.message) || error || 'storage scan failed')
                fail(res, 500, 'scan-failed', message)
              }
              return
            }

            if (req.method !== 'POST') {
              sendJson(res, 405, { ok: false, error: 'GET or POST only' }, { Allow: 'GET, POST' })
              return
            }

            if (!isSameOrigin(req) || !isFetchSiteSameOrigin(req)) {
              fail(res, 403, 'cross-origin', 'cross-origin cleanup request rejected')
              return
            }
            const contentType = String((req.headers && req.headers['content-type']) || '').toLowerCase()
            if (!contentType.startsWith('application/json')) {
              fail(res, 415, 'unsupported-media-type', 'Content-Type must be application/json')
              return
            }

            const parsed = await readJsonBody(req, MAX_BODY_BYTES)
            if (parsed.tooLarge) {
              fail(res, 413, 'body-too-large', 'request body too large')
              return
            }
            if (parsed.invalid || !parsed.value || typeof parsed.value !== 'object') {
              fail(res, 400, 'invalid-body', 'request body must be a JSON object')
              return
            }

            const body = parsed.value
            if (!tokenMatches(cleanupToken, body.token)) {
              fail(res, 403, 'invalid-token', 'cleanup token is missing or invalid')
              return
            }

            try {
              if (body.action === 'plan-sessions') {
                const plan = await createSessionPlan(body.sessionIds)
                sendJson(res, 200, {
                  ok: true,
                  planId: plan.id,
                  kind: 'sessions',
                  sessions: plan.sessions,
                  roots: plan.roots,
                  children: plan.sessions - plan.roots,
                  files: plan.files,
                  bytes: plan.bytes,
                  active: plan.active,
                  archived: plan.archived,
                  pinned: plan.pinned,
                  missing: plan.missing,
                  partial: plan.partial,
                  expiresAt: new Date(plan.expiresAt).toISOString(),
                })
                return
              }
              if (body.action === 'execute-sessions') {
                const result = await executeSessionPlan(body.planId, body)
                sendJson(res, 200, { ok: true, ...result })
                return
              }
              if (body.action === 'plan') {
                const plan = await createPlan(String(body.category || ''))
                sendJson(res, 200, {
                  ok: true,
                  planId: plan.id,
                  category: plan.category,
                  mode: plan.mode,
                  files: plan.files.length,
                  bytes: plan.bytes,
                  dirs: plan.dirs.length,
                  partial: plan.partial,
                  errors: plan.errors,
                  skipped: plan.skipped,
                  expiresAt: new Date(plan.expiresAt).toISOString(),
                })
                return
              }
              if (body.action === 'execute') {
                const result = await executePlan(body.planId, body)
                sendJson(res, 200, { ok: true, ...result })
                return
              }
              fail(res, 400, 'unsupported-action', 'unsupported cleanup action')
            } catch (error) {
              const status = Number(error && error.statusCode) || 500
              const code = String((error && error.code) || 'cleanup-failed')
              const message = String((error && error.message) || error || 'cleanup failed')
              fail(res, status, code, message)
            }
          },
        }),
      'dsh-storage api',
    )
  })
}
