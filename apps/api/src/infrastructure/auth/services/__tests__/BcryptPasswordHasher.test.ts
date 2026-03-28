import { describe, it, expect, beforeEach } from 'vitest'
import { BcryptPasswordHasher } from '../BcryptPasswordHasher.js'

// Use a low round count in tests to keep them fast.
// BCRYPT_ROUNDS=4 is safe for tests; the default (12) would make the suite too slow.
beforeEach(() => {
  process.env['BCRYPT_ROUNDS'] = '4'
})

describe('BcryptPasswordHasher', () => {
  it('hash() returns a string different from the plain-text input', async () => {
    const hasher = new BcryptPasswordHasher()
    const plain = 'my-secret-password'

    const hash = await hasher.hash(plain)

    expect(hash).not.toBe(plain)
    expect(typeof hash).toBe('string')
    expect(hash.length).toBeGreaterThan(0)
  })

  it('hash() produces a bcrypt-formatted hash (starts with $2a$ or $2b$)', async () => {
    const hasher = new BcryptPasswordHasher()

    const hash = await hasher.hash('password')

    // bcryptjs may produce $2a$ or $2b$ depending on version and round count.
    // Both are valid bcrypt variants and are mutually verifiable.
    expect(hash).toMatch(/^\$2[ab]\$/)
  })

  it('hash() produces different output on each call (uses unique salt)', async () => {
    const hasher = new BcryptPasswordHasher()
    const plain = 'same-password'

    const hash1 = await hasher.hash(plain)
    const hash2 = await hasher.hash(plain)

    expect(hash1).not.toBe(hash2)
  })

  it('compare(plain, hash(plain)) returns true', async () => {
    const hasher = new BcryptPasswordHasher()
    const plain = 'correct-horse-battery-staple'

    const hash = await hasher.hash(plain)
    const result = await hasher.compare(plain, hash)

    expect(result).toBe(true)
  })

  it('compare(wrongPlain, hash(plain)) returns false', async () => {
    const hasher = new BcryptPasswordHasher()
    const plain = 'correct-password'
    const wrong = 'wrong-password'

    const hash = await hasher.hash(plain)
    const result = await hasher.compare(wrong, hash)

    expect(result).toBe(false)
  })

  it('compare is case-sensitive', async () => {
    const hasher = new BcryptPasswordHasher()
    const plain = 'Password123'

    const hash = await hasher.hash(plain)

    await expect(hasher.compare('password123', hash)).resolves.toBe(false)
    await expect(hasher.compare('PASSWORD123', hash)).resolves.toBe(false)
    await expect(hasher.compare(plain, hash)).resolves.toBe(true)
  })
})
