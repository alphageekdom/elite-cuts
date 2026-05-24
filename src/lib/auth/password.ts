// Canonical password-length bounds for every entry point — register, password
// change, sign-in. Previously declared independently in three files; sign-in
// only enforced MAX, which meant a one-character password could sneak past
// `authorize()`'s length check (and only failed deeper in bcrypt.compare for an
// unrelated reason). Importing from here closes that gap.
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export const PASSWORD_LENGTH_MESSAGE = `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`;

export function isPasswordLengthValid(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH && password.length <= MAX_PASSWORD_LENGTH;
}
