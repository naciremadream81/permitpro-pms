/**
 * Storage path containment regressions.
 * Run: npx tsx --test lib/storage-path.test.ts
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { LocalStorageAdapter } from './storage'

describe('LocalStorageAdapter path containment', () => {
  let root: string
  let sibling: string
  let storage: LocalStorageAdapter

  before(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'permitpro-storage-'))
    sibling = `${root}-evil`
    await fs.mkdir(sibling, { recursive: true })
    await fs.writeFile(path.join(sibling, 'secret.txt'), 'leaked')
    await fs.mkdir(path.join(root, 'permits', 'pkg1'), { recursive: true })
    await fs.writeFile(path.join(root, 'permits', 'pkg1', 'ok.pdf'), 'safe')
    storage = new LocalStorageAdapter(root)
  })

  after(async () => {
    await fs.rm(root, { recursive: true, force: true })
    await fs.rm(sibling, { recursive: true, force: true })
  })

  it('allows reads under the storage root', async () => {
    const buf = await storage.get('permits/pkg1/ok.pdf')
    assert.equal(buf.toString(), 'safe')
    assert.equal(await storage.exists('permits/pkg1/ok.pdf'), true)
  })

  it('rejects prefix-sibling traversal via get/exists/delete', async () => {
    const escape = `../${path.basename(sibling)}/secret.txt`
    await assert.rejects(() => storage.get(escape), /outside storage root/)
    assert.equal(await storage.exists(escape), false)
    await assert.rejects(() => storage.delete(escape), /outside storage root/)
  })
})
