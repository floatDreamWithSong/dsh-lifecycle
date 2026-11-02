/**
 * Compatibility response types for lib/gateway-panel-api.js.
 * Inherited from dsh-auth-gateway 0.8.7 under MIT; the legacy client is not shipped.
 */

/** Effective Cookie-Secure policy: 'auto' follows the connection, true/false pin it. */
export type CookieSecureMode = 'auto' | true | false

/** Whether the effective policy comes from the deployment config or a panel override. */
export type CookieSecureSource = 'deployment' | 'panel'

/**
 * The plugin's own block inside `config`. Index-signature'd because the body
 * spreads the whole resolved OTP config (issuer, period, window, …); the
 * members below are the ones the panel actually reads.
 */
export interface PanelPluginConfig {
  [key: string]: unknown
  /** Whether OTP is active for this gateway (lib/gateway-otp.js). */
  otpEnabled?: boolean
  /** Digits the panel must expect in the OTP input (config `otpDigits`). */
  otpDigits?: number
  /** Raw OTP status snapshot. */
  otpStatus?: unknown
  /** Resolved policy, already normalised by the gateway. */
  cookieSecure?: CookieSecureMode
  /** Where {@link cookieSecure} comes from. */
  cookieSecureSource?: CookieSecureSource
}

/** Body of `GET /login-api/settings`. */
export interface PanelSettingsBody {
  ok: boolean
  /**
   * Whether THIS request reached the gateway over a secure transport (TLS
   * socket or `X-Forwarded-Proto: https`). Absent on older gateways, in which
   * case the panel falls back to the browser's own protocol.
   */
  requestSecure?: boolean
  config: {
    'dsh-auth-gateway': PanelPluginConfig
  }
}

/** Body of `GET /login-api/version` (also served for `?refresh=1`). */
export interface PanelVersionBody {
  ok: boolean
  version?: string
  repository?: string
  update?: {
    latest?: string | null
    updateAvailable?: boolean | null
    checkedAt?: string | null
    /** Failure reason when the check could not complete; null when it did. */
    error?: string | null
  }
}
