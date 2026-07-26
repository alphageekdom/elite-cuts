// Canonical password-length bounds for every entry point — register, password
// change, sign-in. Previously declared independently in three files; sign-in
// only enforced MAX, which meant a one-character password could sneak past
// `authorize()`'s length check (and only failed deeper in bcrypt.compare for an
// unrelated reason). Importing from here closes that gap.
// 8 is a deliberate, documented choice — not an oversight. NIST SP 800-63B-4
// (2025) and OWASP both set the floor by whether the password stands alone:
// 8 when it is one factor of MFA, 15 when it is the only factor. EliteCuts is
// single-factor, so the letter of the standard is 15; 8 is kept because this
// is a portfolio storefront handling no real money, and the demo entrance
// signs visitors in without a password at all. If MFA ever lands, 8 becomes
// correct by the standard rather than by exception. Don't "fix" this upward
// without that conversation.
//
// The rest of the guidance IS followed: no composition rules (the register
// strength meter is advisory, never a gate), no forced rotation, and a max
// well past the required 64. The real gap the standard cares about more than
// length — screening new passwords against a known-breach list — is
// unimplemented and out of scope for a portfolio build.
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export const PASSWORD_LENGTH_MESSAGE = `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`;

export function isPasswordLengthValid(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH && password.length <= MAX_PASSWORD_LENGTH;
}

/**
 * Advisory 0–3 score behind the register form's strength meter. Never a gate —
 * `isPasswordLengthValid` decides what the form accepts.
 *
 * Anything under the minimum scores 0 no matter how complex it is. Without that
 * floor the two complexity points alone could carry a password the form
 * refuses: "Aa1!" scored 2 and rendered as "Fair" while submit rejected it.
 */
export function scorePasswordStrength(password: string): 0 | 1 | 2 | 3 {
  if (password.length < MIN_PASSWORD_LENGTH) return 0;
  let score = 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return score as 1 | 2 | 3;
}
