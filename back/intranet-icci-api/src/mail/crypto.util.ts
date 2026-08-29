import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const hex = process.env.MAIL_ENCRYPTION_KEY;
  if (!hex) throw new Error('MAIL_ENCRYPTION_KEY no está configurada en el .env');
  const key = Buffer.from(hex, 'hex');
  if (key.length !== 32) throw new Error('MAIL_ENCRYPTION_KEY debe representar 32 bytes en hexadecimal');
  return key;
}

export function encrypt(texto: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const cifrado = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('hex'), authTag.toString('hex'), cifrado.toString('hex')].join(':');
}

export function decrypt(valor: string): string {
  const [ivHex, authTagHex, cifradoHex] = valor.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const texto = Buffer.concat([decipher.update(Buffer.from(cifradoHex, 'hex')), decipher.final()]);
  return texto.toString('utf8');
}
