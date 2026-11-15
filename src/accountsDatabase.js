import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

export const accountsDatabasePath = new URL('../data/contas.sqlite', import.meta.url);

export function createAccountsDatabase(path = accountsDatabasePath) {
  if (path === accountsDatabasePath) {
    mkdirSync(new URL('../data/', import.meta.url), { recursive: true });
  }
  const db = new DatabaseSync(path);

  db.exec(`
    CREATE TABLE IF NOT EXISTS contas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario TEXT NOT NULL,
      modo TEXT NOT NULL CHECK (modo IN ('vulneravel', 'corrigido')),
      senha_armazenada TEXT NOT NULL,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (usuario, modo)
    );
  `);

  return db;
}

const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  keyLen: 64
};

/**
 * Gera hash seguro com scrypt, salt aleatório e armazena parâmetros.
 * Formato: $scrypt$N=16384,r=8,p=1,k=64$<salt_hex>$<hash_hex>
 */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scryptAsync(password, salt, SCRYPT_PARAMS.keyLen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p
  });

  return `$scrypt$N=${SCRYPT_PARAMS.N},r=${SCRYPT_PARAMS.r},p=${SCRYPT_PARAMS.p},k=${SCRYPT_PARAMS.keyLen}$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

/**
 * Valida a senha contra o formato salvo com comparação em tempo constante.
 */
export async function verifyPassword(password, storedValue) {
  if (typeof storedValue !== 'string' || !storedValue.startsWith('$scrypt$')) {
    return false;
  }

  const parts = storedValue.split('$');
  if (parts.length !== 5 || parts[1] !== 'scrypt') {
    return false;
  }

  const paramEntries = parts[2].split(',').map((item) => item.split('='));
  const params = Object.fromEntries(paramEntries);

  const N = parseInt(params.N, 10);
  const r = parseInt(params.r, 10);
  const p = parseInt(params.p, 10);
  const keyLen = parseInt(params.k, 10);

  if (!N || !r || !p || !keyLen) {
    return false;
  }

  const salt = Buffer.from(parts[3], 'hex');
  const storedHash = Buffer.from(parts[4], 'hex');

  const derivedKey = await scryptAsync(password, salt, keyLen, { N, r, p });

  if (derivedKey.length !== storedHash.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, storedHash);
}
