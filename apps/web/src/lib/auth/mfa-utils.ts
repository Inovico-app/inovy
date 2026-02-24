import crypto from "node:crypto";

interface GenerateTotpSecretResult {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
}

export class MfaUtils {
  private static readonly TOTP_WINDOW = 1;
  private static readonly TOTP_PERIOD = 30;
  private static readonly TOTP_DIGITS = 6;
  private static readonly BACKUP_CODE_LENGTH = 8;
  private static readonly BACKUP_CODE_COUNT = 10;

  static generateTotpSecret(
    userEmail: string,
    issuer: string = "Inovy"
  ): GenerateTotpSecretResult {
    const secret = this.generateBase32Secret();

    const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=${this.TOTP_DIGITS}&period=${this.TOTP_PERIOD}`;

    return {
      secret,
      qrCodeUrl: otpauthUrl,
      manualEntryKey: this.formatSecretForDisplay(secret),
    };
  }

  private static generateBase32Secret(length: number = 32): string {
    const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const bytes = crypto.randomBytes(length);

    let secret = "";
    for (let i = 0; i < length; i++) {
      secret += base32Chars[bytes[i]! % 32];
    }

    return secret;
  }

  private static formatSecretForDisplay(secret: string): string {
    return secret.match(/.{1,4}/g)?.join(" ") ?? secret;
  }

  static verifyTotpToken(token: string, secret: string): boolean {
    const currentTime = Math.floor(Date.now() / 1000);

    for (
      let i = -this.TOTP_WINDOW;
      i <= this.TOTP_WINDOW;
      i++
    ) {
      const timeStep = Math.floor(currentTime / this.TOTP_PERIOD) + i;
      const expectedToken = this.generateTotpToken(secret, timeStep);

      if (this.constantTimeCompare(token, expectedToken)) {
        return true;
      }
    }

    return false;
  }

  private static generateTotpToken(secret: string, timeStep: number): string {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(timeStep));

    const secretBytes = this.base32Decode(secret);
    const hmac = crypto.createHmac("sha1", secretBytes);
    hmac.update(buffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1]! & 0x0f;
    const binary =
      ((hash[offset]! & 0x7f) << 24) |
      ((hash[offset + 1]!) << 16) |
      ((hash[offset + 2]!) << 8) |
      hash[offset + 3]!;

    const otp = binary % Math.pow(10, this.TOTP_DIGITS);

    return otp.toString().padStart(this.TOTP_DIGITS, "0");
  }

  private static base32Decode(base32: string): Buffer {
    const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const cleanBase32 = base32.replace(/\s/g, "").toUpperCase();

    let bits = "";
    for (const char of cleanBase32) {
      const val = base32Chars.indexOf(char);
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, "0");
    }

    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.slice(i, i + 8), 2));
    }

    return Buffer.from(bytes);
  }

  private static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  static generateBackupCodes(): string[] {
    const codes: string[] = [];

    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      const code = this.generateBackupCode();
      codes.push(code);
    }

    return codes;
  }

  private static generateBackupCode(): string {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const bytes = crypto.randomBytes(this.BACKUP_CODE_LENGTH);

    let code = "";
    for (let i = 0; i < this.BACKUP_CODE_LENGTH; i++) {
      code += chars[bytes[i]! % chars.length];
    }

    return code.match(/.{1,4}/g)?.join("-") ?? code;
  }

  static hashBackupCode(code: string): string {
    return crypto
      .createHash("sha256")
      .update(code.replace(/-/g, ""))
      .digest("hex");
  }

  static verifyBackupCode(
    inputCode: string,
    hashedCodes: string[]
  ): boolean {
    const hashedInput = this.hashBackupCode(inputCode);
    return hashedCodes.some((hashedCode) =>
      this.constantTimeCompare(hashedInput, hashedCode)
    );
  }
}

export interface PasswordPolicyRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

export class PasswordValidator {
  static validate(
    password: string,
    requirements: PasswordPolicyRequirements
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < requirements.minLength) {
      errors.push(
        `Password must be at least ${requirements.minLength} characters`
      );
    }

    if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (requirements.requireLowercase && !/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (requirements.requireNumbers && !/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (
      requirements.requireSpecialChars &&
      !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    ) {
      errors.push("Password must contain at least one special character");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static async checkPasswordHistory(
    password: string,
    userId: string,
    historyCount: number
  ): Promise<boolean> {
    if (historyCount === 0) return true;

    const { PasswordHistoryQueries } = await import(
      "@/server/data-access/organization-auth-policy.queries"
    );

    const recentPasswords = await PasswordHistoryQueries.getRecentPasswords(
      userId,
      historyCount
    );

    for (const historyEntry of recentPasswords) {
      if (await this.comparePasswords(password, historyEntry.passwordHash)) {
        return false;
      }
    }

    return true;
  }

  private static async comparePasswords(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    const bcrypt = await import("bcryptjs");
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
