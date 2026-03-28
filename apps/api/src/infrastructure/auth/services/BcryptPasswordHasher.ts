import bcrypt from 'bcryptjs'
import type { IPasswordHasher } from '@domain/auth/services/IPasswordHasher.js'

export class BcryptPasswordHasher implements IPasswordHasher {
  private readonly rounds: number

  constructor() {
    this.rounds = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10)
  }

  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds)
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash)
  }
}
