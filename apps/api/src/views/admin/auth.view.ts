/** Pure response-shaping — no business logic, just what the client sees. */

export function loginPendingView(result: { pendingToken: string; twoFAEnabled: boolean }) {
  return { pendingToken: result.pendingToken, twoFAEnabled: result.twoFAEnabled };
}

export function twoFASetupView(result: { otpauthUrl: string; recoveryCodes: string[] }) {
  return { otpauthUrl: result.otpauthUrl, recoveryCodes: result.recoveryCodes };
}

export function sessionAccessTokenView(result: { accessToken: string }) {
  return { accessToken: result.accessToken };
}
