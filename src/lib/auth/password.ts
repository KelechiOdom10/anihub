import { hash, verify } from "@node-rs/argon2";

type HashOptions = Parameters<typeof hash>[1];

const defaultOptions: HashOptions = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

export function hashPassword(password: string, options = defaultOptions) {
  return hash(password, options);
}

export function verifyPassword(
  hashed: string,
  password: string,
  options = defaultOptions
) {
  return verify(hashed, password, options);
}
