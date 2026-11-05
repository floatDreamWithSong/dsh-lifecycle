(() => {
  // node_modules/@simplewebauthn/browser/esm/helpers/bufferToBase64URLString.js
  function bufferToBase64URLString(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = "";
    for (const charCode of bytes) {
      str += String.fromCharCode(charCode);
    }
    const base64String = btoa(str);
    return base64String.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  // node_modules/@simplewebauthn/browser/esm/helpers/base64URLStringToBuffer.js
  function base64URLStringToBuffer(base64URLString) {
    const base64 = base64URLString.replace(/-/g, "+").replace(/_/g, "/");
    const padLength = (4 - base64.length % 4) % 4;
    const padded = base64.padEnd(base64.length + padLength, "=");
    const binary = atob(padded);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return buffer;
  }

  // node_modules/@simplewebauthn/browser/esm/helpers/browserSupportsWebAuthn.js
  function browserSupportsWebAuthn() {
    return _browserSupportsWebAuthnInternals.stubThis(globalThis?.PublicKeyCredential !== void 0 && typeof globalThis.PublicKeyCredential === "function");
  }
  var _browserSupportsWebAuthnInternals = {
    stubThis: (value) => value
  };

  // node_modules/@simplewebauthn/browser/esm/helpers/toPublicKeyCredentialDescriptor.js
  function toPublicKeyCredentialDescriptor(descriptor) {
    const { id } = descriptor;
    return {
      ...descriptor,
      id: base64URLStringToBuffer(id),
      /**
       * `descriptor.transports` is an array of our `AuthenticatorTransportFuture` that includes newer
       * transports that TypeScript's DOM lib is ignorant of. Convince TS that our list of transports
       * are fine to pass to WebAuthn since browsers will recognize the new value.
       */
      transports: descriptor.transports
    };
  }

  // node_modules/@simplewebauthn/browser/esm/helpers/isValidDomain.js
  function isValidDomain(hostname) {
    return (
      // Consider localhost valid as well since it's okay wrt Secure Contexts
      hostname === "localhost" || // Support punycode (ACE) or ascii labels and domains
      /^((xn--[a-z0-9-]+|[a-z0-9]+(-[a-z0-9]+)*)\.)+([a-z]{2,}|xn--[a-z0-9-]+)$/i.test(hostname)
    );
  }

  // node_modules/@simplewebauthn/browser/esm/helpers/webAuthnError.js
  var WebAuthnError = class extends Error {
    constructor({ message: message2, code, cause, name }) {
      super(message2, { cause });
      Object.defineProperty(this, "code", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: void 0
      });
      this.name = name ?? cause.name;
      this.code = code;
    }
  };

  // node_modules/@simplewebauthn/browser/esm/helpers/identifyRegistrationError.js
  function identifyRegistrationError({ error, options }) {
    const { publicKey } = options;
    if (!publicKey) {
      throw Error("options was missing required publicKey property");
    }
    if (error.name === "AbortError") {
      if (options.signal instanceof AbortSignal) {
        return new WebAuthnError({
          message: "Registration ceremony was sent an abort signal",
          code: "ERROR_CEREMONY_ABORTED",
          cause: error
        });
      }
    } else if (error.name === "ConstraintError") {
      if (publicKey.authenticatorSelection?.requireResidentKey === true) {
        return new WebAuthnError({
          message: "Discoverable credentials were required but no available authenticator supported it",
          code: "ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT",
          cause: error
        });
      } else if (
        // @ts-ignore: `mediation` doesn't yet exist on CredentialCreationOptions but it's possible as of Sept 2024
        options.mediation === "conditional" && publicKey.authenticatorSelection?.userVerification === "required"
      ) {
        return new WebAuthnError({
          message: "User verification was required during automatic registration but it could not be performed",
          code: "ERROR_AUTO_REGISTER_USER_VERIFICATION_FAILURE",
          cause: error
        });
      } else if (publicKey.authenticatorSelection?.userVerification === "required") {
        return new WebAuthnError({
          message: "User verification was required but no available authenticator supported it",
          code: "ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT",
          cause: error
        });
      }
    } else if (error.name === "InvalidStateError") {
      return new WebAuthnError({
        message: "The authenticator was previously registered",
        code: "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED",
        cause: error
      });
    } else if (error.name === "NotAllowedError") {
      return new WebAuthnError({
        message: error.message,
        code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
        cause: error
      });
    } else if (error.name === "NotSupportedError") {
      const validPubKeyCredParams = publicKey.pubKeyCredParams.filter((param) => param.type === "public-key");
      if (validPubKeyCredParams.length === 0) {
        return new WebAuthnError({
          message: 'No entry in pubKeyCredParams was of type "public-key"',
          code: "ERROR_MALFORMED_PUBKEYCREDPARAMS",
          cause: error
        });
      }
      return new WebAuthnError({
        message: "No available authenticator supported any of the specified pubKeyCredParams algorithms",
        code: "ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG",
        cause: error
      });
    } else if (error.name === "SecurityError") {
      const effectiveDomain = globalThis.location.hostname;
      if (!isValidDomain(effectiveDomain)) {
        return new WebAuthnError({
          message: `${globalThis.location.hostname} is an invalid domain`,
          code: "ERROR_INVALID_DOMAIN",
          cause: error
        });
      } else if (publicKey.rp.id !== effectiveDomain) {
        return new WebAuthnError({
          message: `The RP ID "${publicKey.rp.id}" is invalid for this domain`,
          code: "ERROR_INVALID_RP_ID",
          cause: error
        });
      }
    } else if (error.name === "TypeError") {
      if (publicKey.user.id.byteLength < 1 || publicKey.user.id.byteLength > 64) {
        return new WebAuthnError({
          message: "User ID was not between 1 and 64 characters",
          code: "ERROR_INVALID_USER_ID_LENGTH",
          cause: error
        });
      }
    } else if (error.name === "UnknownError") {
      return new WebAuthnError({
        message: "The authenticator was unable to process the specified options, or could not create a new credential",
        code: "ERROR_AUTHENTICATOR_GENERAL_ERROR",
        cause: error
      });
    }
    return error;
  }

  // node_modules/@simplewebauthn/browser/esm/helpers/webAuthnAbortService.js
  var BaseWebAuthnAbortService = class {
    constructor() {
      Object.defineProperty(this, "controller", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: void 0
      });
    }
    createNewAbortSignal() {
      if (this.controller) {
        const abortError = new Error("Cancelling existing WebAuthn API call for new one");
        abortError.name = "AbortError";
        this.controller.abort(abortError);
      }
      const newController = new AbortController();
      this.controller = newController;
      return newController.signal;
    }
    cancelCeremony() {
      if (this.controller) {
        const abortError = new Error("Manually cancelling existing WebAuthn API call");
        abortError.name = "AbortError";
        this.controller.abort(abortError);
        this.controller = void 0;
      }
    }
  };
  var WebAuthnAbortService = new BaseWebAuthnAbortService();

  // node_modules/@simplewebauthn/browser/esm/helpers/toAuthenticatorAttachment.js
  var attachments = ["cross-platform", "platform"];
  function toAuthenticatorAttachment(attachment) {
    if (!attachment) {
      return;
    }
    if (attachments.indexOf(attachment) < 0) {
      return;
    }
    return attachment;
  }

  // node_modules/@simplewebauthn/browser/esm/methods/startRegistration.js
  async function startRegistration(options) {
    if (!options.optionsJSON && options.challenge) {
      console.warn("startRegistration() was not called correctly. It will try to continue with the provided options, but this call should be refactored to use the expected call structure instead. See https://simplewebauthn.dev/docs/packages/browser#typeerror-cannot-read-properties-of-undefined-reading-challenge for more information.");
      options = { optionsJSON: options };
    }
    const { optionsJSON, useAutoRegister = false } = options;
    if (!browserSupportsWebAuthn()) {
      throw new Error("WebAuthn is not supported in this browser");
    }
    const publicKey = {
      ...optionsJSON,
      challenge: base64URLStringToBuffer(optionsJSON.challenge),
      user: {
        ...optionsJSON.user,
        id: base64URLStringToBuffer(optionsJSON.user.id)
      },
      excludeCredentials: optionsJSON.excludeCredentials?.map(toPublicKeyCredentialDescriptor)
    };
    const createOptions = {};
    if (useAutoRegister) {
      createOptions.mediation = "conditional";
    }
    createOptions.publicKey = publicKey;
    createOptions.signal = WebAuthnAbortService.createNewAbortSignal();
    let credential;
    try {
      credential = await navigator.credentials.create(createOptions);
    } catch (err) {
      throw identifyRegistrationError({ error: err, options: createOptions });
    }
    if (!credential) {
      throw new Error("Registration was not completed");
    }
    const { id, rawId, response, type } = credential;
    let transports = void 0;
    if (typeof response.getTransports === "function") {
      transports = response.getTransports();
    }
    let responsePublicKeyAlgorithm = void 0;
    if (typeof response.getPublicKeyAlgorithm === "function") {
      try {
        responsePublicKeyAlgorithm = response.getPublicKeyAlgorithm();
      } catch (error) {
        warnOnBrokenImplementation("getPublicKeyAlgorithm()", error);
      }
    }
    let responsePublicKey = void 0;
    if (typeof response.getPublicKey === "function") {
      try {
        const _publicKey = response.getPublicKey();
        if (_publicKey !== null) {
          responsePublicKey = bufferToBase64URLString(_publicKey);
        }
      } catch (error) {
        warnOnBrokenImplementation("getPublicKey()", error);
      }
    }
    let responseAuthenticatorData;
    if (typeof response.getAuthenticatorData === "function") {
      try {
        responseAuthenticatorData = bufferToBase64URLString(response.getAuthenticatorData());
      } catch (error) {
        warnOnBrokenImplementation("getAuthenticatorData()", error);
      }
    }
    return {
      id,
      rawId: bufferToBase64URLString(rawId),
      response: {
        attestationObject: bufferToBase64URLString(response.attestationObject),
        clientDataJSON: bufferToBase64URLString(response.clientDataJSON),
        transports,
        publicKeyAlgorithm: responsePublicKeyAlgorithm,
        publicKey: responsePublicKey,
        authenticatorData: responseAuthenticatorData
      },
      type,
      clientExtensionResults: credential.getClientExtensionResults(),
      authenticatorAttachment: toAuthenticatorAttachment(credential.authenticatorAttachment)
    };
  }
  function warnOnBrokenImplementation(methodName, cause) {
    console.warn(`The browser extension that intercepted this WebAuthn API call incorrectly implemented ${methodName}. You should report this error to them.
`, cause);
  }

  // node_modules/@simplewebauthn/browser/esm/helpers/browserSupportsWebAuthnAutofill.js
  function browserSupportsWebAuthnAutofill() {
    if (!browserSupportsWebAuthn()) {
      return _browserSupportsWebAuthnAutofillInternals.stubThis(new Promise((resolve) => resolve(false)));
    }
    const globalPublicKeyCredential = globalThis.PublicKeyCredential;
    if (globalPublicKeyCredential?.isConditionalMediationAvailable === void 0) {
      return _browserSupportsWebAuthnAutofillInternals.stubThis(new Promise((resolve) => resolve(false)));
    }
    return _browserSupportsWebAuthnAutofillInternals.stubThis(globalPublicKeyCredential.isConditionalMediationAvailable());
  }
  var _browserSupportsWebAuthnAutofillInternals = {
    stubThis: (value) => value
  };

  // node_modules/@simplewebauthn/browser/esm/helpers/identifyAuthenticationError.js
  function identifyAuthenticationError({ error, options }) {
    const { publicKey } = options;
    if (!publicKey) {
      throw Error("options was missing required publicKey property");
    }
    if (error.name === "AbortError") {
      if (options.signal instanceof AbortSignal) {
        return new WebAuthnError({
          message: "Authentication ceremony was sent an abort signal",
          code: "ERROR_CEREMONY_ABORTED",
          cause: error
        });
      }
    } else if (error.name === "NotAllowedError") {
      return new WebAuthnError({
        message: error.message,
        code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
        cause: error
      });
    } else if (error.name === "SecurityError") {
      const effectiveDomain = globalThis.location.hostname;
      if (!isValidDomain(effectiveDomain)) {
        return new WebAuthnError({
          message: `${globalThis.location.hostname} is an invalid domain`,
          code: "ERROR_INVALID_DOMAIN",
          cause: error
        });
      } else if (publicKey.rpId !== effectiveDomain) {
        return new WebAuthnError({
          message: `The RP ID "${publicKey.rpId}" is invalid for this domain`,
          code: "ERROR_INVALID_RP_ID",
          cause: error
        });
      }
    } else if (error.name === "UnknownError") {
      return new WebAuthnError({
        message: "The authenticator was unable to process the specified options, or could not create a new assertion signature",
        code: "ERROR_AUTHENTICATOR_GENERAL_ERROR",
        cause: error
      });
    }
    return error;
  }

  // node_modules/@simplewebauthn/browser/esm/methods/startAuthentication.js
  async function startAuthentication(options) {
    if (!options.optionsJSON && options.challenge) {
      console.warn("startAuthentication() was not called correctly. It will try to continue with the provided options, but this call should be refactored to use the expected call structure instead. See https://simplewebauthn.dev/docs/packages/browser#typeerror-cannot-read-properties-of-undefined-reading-challenge for more information.");
      options = { optionsJSON: options };
    }
    const { optionsJSON, useBrowserAutofill = false, verifyBrowserAutofillInput = true } = options;
    if (!browserSupportsWebAuthn()) {
      throw new Error("WebAuthn is not supported in this browser");
    }
    let allowCredentials;
    if (optionsJSON.allowCredentials?.length !== 0) {
      allowCredentials = optionsJSON.allowCredentials?.map(toPublicKeyCredentialDescriptor);
    }
    const publicKey = {
      ...optionsJSON,
      challenge: base64URLStringToBuffer(optionsJSON.challenge),
      allowCredentials
    };
    const getOptions = {};
    if (useBrowserAutofill) {
      if (!await browserSupportsWebAuthnAutofill()) {
        throw Error("Browser does not support WebAuthn autofill");
      }
      const eligibleInputs = document.querySelectorAll("input[autocomplete$='webauthn']");
      if (eligibleInputs.length < 1 && verifyBrowserAutofillInput) {
        throw Error('No <input> with "webauthn" as the only or last value in its `autocomplete` attribute was detected');
      }
      getOptions.mediation = "conditional";
      publicKey.allowCredentials = [];
    }
    getOptions.publicKey = publicKey;
    getOptions.signal = WebAuthnAbortService.createNewAbortSignal();
    let credential;
    try {
      credential = await navigator.credentials.get(getOptions);
    } catch (err) {
      throw identifyAuthenticationError({ error: err, options: getOptions });
    }
    if (!credential) {
      throw new Error("Authentication was not completed");
    }
    const { id, rawId, response, type } = credential;
    let userHandle = void 0;
    if (response.userHandle) {
      userHandle = bufferToBase64URLString(response.userHandle);
    }
    return {
      id,
      rawId: bufferToBase64URLString(rawId),
      response: {
        authenticatorData: bufferToBase64URLString(response.authenticatorData),
        clientDataJSON: bufferToBase64URLString(response.clientDataJSON),
        signature: bufferToBase64URLString(response.signature),
        userHandle
      },
      type,
      clientExtensionResults: credential.getClientExtensionResults(),
      authenticatorAttachment: toAuthenticatorAttachment(credential.authenticatorAttachment)
    };
  }

  // src/login/api.js
  var base = window.__LIFECYCLE__?.basePath ?? "";
  var state;
  async function refreshState() {
    const response = await fetch(base + "/lifecycle/state", { cache: "no-store" });
    if (!response.ok) throw new Error("\u65E0\u6CD5\u8FDE\u63A5\u767B\u5F55\u670D\u52A1");
    state = await response.json();
    return state;
  }
  async function post(path, body = {}) {
    if (!state) await refreshState();
    const response = await fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json", "X-Lifecycle-CSRF": state.csrf }, body: JSON.stringify(body) });
    if (!response.headers.get("content-type")?.includes("application/json")) throw new Error(`\u767B\u5F55\u670D\u52A1\u8FD4\u56DE\u5F02\u5E38\uFF08${response.status}\uFF09\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5`);
    const data = await response.json();
    if (!response.ok || data.ok === false) {
      const errors = { "invalid-otp": "\u9A8C\u8BC1\u7801\u4E0D\u6B63\u786E\uFF0C\u8BF7\u68C0\u67E5\u8BA4\u8BC1\u5668\u4E2D\u7684\u6700\u65B0\u9A8C\u8BC1\u7801", "setup-expired": "\u7ED1\u5B9A\u8BF7\u6C42\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u5F00\u59CB", "invalid-password": "\u5BC6\u7801\u4E0D\u6B63\u786E", "otp-required": "\u8BF7\u5148\u5B8C\u6210\u7B2C\u4E8C\u6B65\u9A8C\u8BC1", "invalid-credentials": "\u8EAB\u4EFD\u9A8C\u8BC1\u5931\u8D25", "rate-limited": "\u5C1D\u8BD5\u6B21\u6570\u8FC7\u591A\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5" };
      throw new Error(errors[data.error] || data.error || "\u64CD\u4F5C\u672A\u5B8C\u6210");
    }
    return data;
  }
  async function get(path) {
    const response = await fetch(base + path, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "\u8BF7\u91CD\u65B0\u767B\u5F55");
    return data;
  }
  async function uploadWallpaper(file, signal) {
    await refreshState();
    const response = await fetch(base + "/lifecycle/wallpapers/upload?name=" + encodeURIComponent(file.name), {
      method: "POST",
      headers: { "Content-Type": file.type, "X-Lifecycle-CSRF": state.csrf },
      body: file,
      signal
    });
    if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("\u4E0A\u4F20\u5931\u8D25\uFF0C\u8BF7\u786E\u8BA4\u56FE\u7247\u4E0D\u8D85\u8FC7 5 MB");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "\u58C1\u7EB8\u4E0A\u4F20\u5931\u8D25");
    return data;
  }
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  // src/security/index.js
  var tabs = [["methods", "\u767B\u5F55\u65B9\u5F0F", "\u2311"], ["password", "\u8BBF\u95EE\u5BC6\u7801", "\u25C7"], ["otp", "OTP \u8BA4\u8BC1\u5668", "\u25A3"], ["passkey", "Passkey", "\u26BF"], ["wallpapers", "\u9501\u5C4F\u58C1\u7EB8", "\u25A7"], ["sessions", "\u4F1A\u8BDD\u7BA1\u7406", "\u25CE"]];
  async function mountSecurity(root, { onBack = () => window.location.assign(base + "/") } = {}) {
    let active = "methods", disposed = false, revision = 0, config;
    const controller = new AbortController();
    function message2(error) {
      const target = root.querySelector(".auth-error");
      if (target) target.textContent = error.message || String(error);
    }
    function toast(text) {
      const target = root.querySelector(".dl-notice");
      if (target) {
        target.textContent = text;
        target.hidden = false;
      }
    }
    function exit() {
      window.location.assign(base + "/login");
    }
    async function security(reload = false) {
      const rendering = ++revision;
      if (!config || reload) {
        await refreshState();
        config = await get("/lifecycle/security/state");
      }
      if (disposed || rendering !== revision) return;
      const originReady = config.publicOrigin && new URL(config.publicOrigin).origin === window.location.origin;
      const panels = {
        methods: `<section class="security-panel"><h2>\u767B\u5F55\u9A8C\u8BC1 <span class="badge">${config.twoFactor ? "\u4E24\u6B65\u9A8C\u8BC1" : "\u5355\u6B65\u9A8C\u8BC1"}</span></h2><p>\u5355\u6B65\uFF1A\u5BC6\u7801\u6216\u5DF2\u7ED1\u5B9A\u7684\u9A8C\u8BC1\u65B9\u5F0F\u3002\u4E24\u6B65\uFF1A\u5BC6\u7801\u4E4B\u540E\uFF0C\u518D\u9A8C\u8BC1 OTP \u6216 Passkey\u3002</p><form id="policy-form"><label class="check-line"><input name="twoFactor" type="checkbox" ${config.twoFactor ? "checked" : ""}>\u542F\u7528\u4E24\u6B65\u9A8C\u8BC1</label><label>\u5F53\u524D\u5BC6\u7801\uFF08\u66F4\u6539\u5B89\u5168\u8BBE\u7F6E\u65F6\u9A8C\u8BC1\uFF09</label><input name="password" type="password" autocomplete="current-password" required><div class="button-row"><button type="submit" class="primary">\u4FDD\u5B58\u9A8C\u8BC1\u8BBE\u7F6E</button></div></form><p>\u66F4\u6539\u9A8C\u8BC1\u65B9\u5F0F\u4F1A\u64A4\u9500\u5DF2\u6709\u767B\u5F55\uFF0C\u9700\u8981\u6309\u65B0\u89C4\u5219\u91CD\u65B0\u767B\u5F55\u3002</p></section>`,
        password: `<section class="security-panel"><h2>\u8BBF\u95EE\u5BC6\u7801</h2><p>\u6539\u5BC6\u4F1A\u64A4\u9500\u5176\u4ED6\u767B\u5F55\u3002\u82E5\u4F60\u521A\u901A\u8FC7 OTP \u6216 Passkey \u767B\u5F55\uFF0C\u53EF\u4EE5\u4E0D\u586B\u5199\u65E7\u5BC6\u7801\u3002</p><form id="password-form"><label>\u5F53\u524D\u5BC6\u7801</label><input name="password" type="password" autocomplete="current-password"><label>\u65B0\u5BC6\u7801</label><input name="newPassword" type="password" autocomplete="new-password" minlength="8" required><label>\u786E\u8BA4\u65B0\u5BC6\u7801</label><input name="confirm" type="password" autocomplete="new-password" required><div class="button-row"><button type="submit" class="primary">\u66F4\u6539\u5BC6\u7801</button></div></form></section>`,
        otp: `<section class="security-panel"><h2>OTP \u8BA4\u8BC1\u5668 <span class="badge">${config.otp.enabled ? "\u5DF2\u7ED1\u5B9A" : "\u672A\u7ED1\u5B9A"}</span></h2><p>\u7ED1\u5B9A\u540E\uFF0C\u5355\u6B65\u6A21\u5F0F\u53EF\u76F4\u63A5\u7528 OTP \u767B\u5F55\uFF1B\u4E24\u6B65\u6A21\u5F0F\u5C06\u5B83\u4F5C\u4E3A\u5BC6\u7801\u4E4B\u540E\u7684\u7B2C\u4E8C\u6B21\u9A8C\u8BC1\u3002</p><div id="otp-enrollment"></div>${!config.otp.enabled ? '<label>\u5F53\u524D\u5BC6\u7801\uFF08\u7ED1\u5B9A\u65F6\u9A8C\u8BC1\uFF09</label><input id="otp-password" type="password" autocomplete="current-password"><div class="button-row"><button id="enroll-otp" class="primary">\u7ED1\u5B9A\u8BA4\u8BC1\u5668</button></div>' : '<label>\u5F53\u524D\u5BC6\u7801</label><input id="disable-password" type="password" autocomplete="current-password"><label>\u5F53\u524D OTP \u9A8C\u8BC1\u7801\u6216\u5907\u4EFD\u4EE3\u7801</label><input id="disable-otp" autocomplete="one-time-code"><div class="button-row"><button id="disable-otp-button" class="secondary">\u89E3\u9664 OTP \u7ED1\u5B9A</button></div>'}</section>`,
        passkey: `<section class="security-panel"><h2>Passkey <span class="badge">${config.passkeys.length} \u628A\u5BC6\u94A5</span></h2><p>${originReady ? "\u4F7F\u7528\u8BBE\u5907\u4E0A\u7684\u6307\u7EB9\u3001\u9762\u5BB9\u6216\u5B89\u5168\u5BC6\u94A5\u9A8C\u8BC1\uFF1B\u79C1\u94A5\u53EA\u4FDD\u5B58\u5728\u4F60\u7684\u8BBE\u5907\u6216\u5BC6\u7801\u7BA1\u7406\u5668\u4E2D\u3002" : "\u7A0D\u540E\u914D\u7F6E\u7A33\u5B9A\u7684 HTTPS \u57DF\u540D\uFF0C\u5E76\u4ECE\u8BE5\u57DF\u540D\u8BBF\u95EE\u6B64\u9875\uFF0C\u5373\u53EF\u7ED1\u5B9A Passkey\u3002\u516C\u7F51 IP \u4E0D\u5F71\u54CD\u5BC6\u7801\u548C OTP \u4F7F\u7528\u3002"}</p>${config.passkeys.map((c) => `<div class="passkey-row"><span>${escapeHTML(c.name)}</span><button data-delete="${escapeHTML(c.id)}">\u79FB\u9664</button></div>`).join("")}<label>\u516C\u5F00\u8BBF\u95EE\u5730\u5740</label><input id="passkey-origin" type="url" placeholder="https://dsh.example.com" value="${escapeHTML(config.publicOrigin)}"><label>\u5F53\u524D\u5BC6\u7801\uFF08\u6CE8\u518C\u6216\u4FEE\u6539\u57DF\u540D\u65F6\u9A8C\u8BC1\uFF09</label><input id="passkey-password" type="password" autocomplete="current-password"><div class="button-row"><button id="save-origin" class="secondary">\u4FDD\u5B58\u57DF\u540D</button><button id="enroll-passkey" class="primary" ${!originReady ? "disabled" : ""}>\u6DFB\u52A0 Passkey</button></div></section>`,
        sessions: `<section class="security-panel wide"><h2>\u9501\u5C4F\u4E0E\u4F1A\u8BDD</h2><p>\u767B\u5F55\u72B6\u6001\u4EE5\u4EE4\u724C\u6458\u8981\u6301\u4E45\u5316\uFF0C\u91CD\u542F\u548C\u66F4\u65B0\u540E\u65E0\u9700\u91CD\u65B0\u767B\u5F55\u3002\u9501\u5C4F\u53EA\u64A4\u9500\u5F53\u524D\u6D4F\u89C8\u5668\u7684\u767B\u5F55\uFF0C\u4E0D\u4F1A\u505C\u6B62 DSH\uFF1B\u5176\u4ED6\u5DF2\u767B\u5F55\u8BBE\u5907\u4E0D\u53D7\u5F71\u54CD\u3002</p><p>\u5F53\u524D\u6709 ${config.activeSessions} \u4E2A\u6709\u6548\u767B\u5F55\u3002</p><div class="button-row"><button id="lock-now" class="secondary">\u7ACB\u5373\u9501\u5C4F</button><button id="revoke-others" class="secondary">\u9000\u51FA\u5176\u4ED6\u8BBE\u5907</button></div></section>`,
        wallpapers: `<section class="security-panel"><h2>\u9501\u5C4F\u58C1\u7EB8</h2><p>\u5185\u7F6E\u84DD\u8272\u80CC\u666F\u59CB\u7EC8\u53EF\u7528\uFF0C\u4E5F\u53EF\u4EE5\u4E0A\u4F20\u81EA\u5DF1\u7684\u56FE\u7247\u3002\u6240\u9009\u58C1\u7EB8\u4F1A\u7528\u4E8E\u9501\u5C4F\u548C\u5BC6\u7801\u767B\u5F55\u80CC\u666F\u3002</p><div class="wallpaper-preview" role="img" aria-label="\u5F53\u524D\u9501\u5C4F\u58C1\u7EB8"></div><div class="wallpaper-toolbar"><label class="upload-button" for="wallpaper-upload">\uFF0B \u6DFB\u52A0\u58C1\u7EB8<input id="wallpaper-upload" type="file" accept="image/png,image/jpeg,image/webp"></label><span>PNG / JPEG / WebP \xB7 \u6BCF\u5F20\u6700\u591A 5 MB \xB7 \u6700\u591A 12 \u5F20</span></div><div id="wallpaper-library" class="wallpaper-library" aria-label="\u58C1\u7EB8\u56FE\u5E93"></div></section>`
      };
      root.innerHTML = `<section class="dl-security"><header class="security-header"><div><p class="eyebrow">ADMIN \xB7 PERSONAL SPACE</p><h1>\u767B\u5F55\u4E0E\u5B89\u5168</h1><p>\u7BA1\u7406\u8FDB\u5165\u5DE5\u4F5C\u7A7A\u95F4\u7684\u65B9\u5F0F\uFF0C\u4EE5\u53CA\u9501\u5C4F\u7684\u6837\u5B50\u3002</p></div><button class="secondary" id="security-back">\u8FD4\u56DE\u5DE5\u4F5C\u7A7A\u95F4</button></header><div class="security-layout"><nav class="security-tabs" role="tablist" aria-label="\u5B89\u5168\u8BBE\u7F6E">${tabs.map(([id, label, icon]) => `<button id="dl-tab-${id}" role="tab" data-tab="${id}" aria-selected="${id === active}" aria-controls="dl-settings-panel" tabindex="${id === active ? 0 : -1}"><span aria-hidden="true">${icon}</span>${label}</button>`).join("")}</nav><div class="security-content"><div class="dl-notice" role="status" hidden></div><div id="dl-settings-panel" role="tabpanel" aria-labelledby="dl-tab-${active}" tabindex="0">${panels[active]}</div><p class="auth-error" role="alert"></p></div></div></section>`;
      root.querySelector("#security-back").onclick = onBack;
      for (const button of root.querySelectorAll("[data-tab]")) button.onclick = async () => {
        active = button.dataset.tab;
        try {
          await security();
          root.querySelector(`[data-tab="${active}"]`)?.focus();
        } catch (error) {
          message2(error);
        }
      };
      root.querySelector("[role=tablist]").onkeydown = (event) => {
        if (!["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const index = tabs.findIndex(([id]) => id === active);
        const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : -1) + tabs.length) % tabs.length;
        root.querySelector(`[data-tab="${tabs[next][0]}"]`).click();
      };
      for (const id of ["policy-form", "password-form"]) {
        const form = root.querySelector("#" + id);
        if (!form) continue;
        form.onsubmit = async (event) => {
          event.preventDefault();
          const button = form.querySelector("button");
          button.disabled = true;
          try {
            const data = new FormData(form);
            if (id === "policy-form") {
              await post("/lifecycle/security/policy", { password: data.get("password"), twoFactor: data.has("twoFactor"), publicOrigin: config.publicOrigin });
              window.location.assign(base + "/login");
            } else {
              if (data.get("newPassword") !== data.get("confirm")) throw new Error("\u4E24\u6B21\u8F93\u5165\u7684\u5BC6\u7801\u4E0D\u4E00\u81F4");
              await post("/lifecycle/password", { password: data.get("password"), newPassword: data.get("newPassword") });
              toast("\u5BC6\u7801\u5DF2\u66F4\u65B0\uFF0C\u5176\u4ED6\u4F1A\u8BDD\u5DF2\u9000\u51FA");
              form.reset();
            }
          } catch (error) {
            message2(error);
          } finally {
            button.disabled = false;
          }
        };
      }
      root.querySelector("#revoke-others")?.addEventListener("click", async () => {
        try {
          await post("/lifecycle/sessions/others");
          await security(true);
          toast("\u5176\u4ED6\u8BBE\u5907\u5DF2\u9000\u51FA");
        } catch (error) {
          message2(error);
        }
      });
      root.querySelector("#lock-now")?.addEventListener("click", async () => {
        try {
          await post("/lifecycle/lock");
          exit();
        } catch (error) {
          message2(error);
        }
      });
      root.querySelector("#enroll-otp")?.addEventListener("click", async (event) => {
        event.target.disabled = true;
        try {
          const result = await post("/otp/enable", { password: root.querySelector("#otp-password").value }), target = root.querySelector("#otp-enrollment");
          target.innerHTML = `<div class="qr-box"><img src="${escapeHTML(result.svgUrl)}" alt="OTP \u7ED1\u5B9A\u4E8C\u7EF4\u7801"><code>${escapeHTML(result.secret)}</code></div><label>\u8BA4\u8BC1\u5668\u9A8C\u8BC1\u7801</label><input id="enroll-code" inputmode="numeric" autocomplete="one-time-code"><div class="button-row"><button id="confirm-enroll" class="primary">\u786E\u8BA4\u7ED1\u5B9A</button></div>`;
          root.querySelector("#confirm-enroll").onclick = async () => {
            try {
              const result2 = await post("/otp/verify-setup", { otp: root.querySelector("#enroll-code").value });
              target.innerHTML = `<p>\u5DF2\u7ED1\u5B9A\u3002\u8BF7\u4FDD\u5B58\u4E00\u6B21\u6027\u5907\u4EFD\u4EE3\u7801\uFF0C\u518D\u91CD\u65B0\u767B\u5F55\u3002</p><pre class="backup-codes">${escapeHTML(result2.backupCodes.join("\n"))}</pre><a href="${base}/login">\u5DF2\u4FDD\u5B58\uFF0C\u91CD\u65B0\u767B\u5F55 \u2192</a>`;
            } catch (error) {
              message2(error);
            }
          };
        } catch (error) {
          message2(error);
          event.target.disabled = false;
        }
      });
      root.querySelector("#disable-otp-button")?.addEventListener("click", async () => {
        try {
          const code = root.querySelector("#disable-otp").value;
          await post("/otp/disable", { password: root.querySelector("#disable-password").value, ...code.length === 6 ? { otp: code } : { backupCode: code } });
          window.location.assign(base + "/login");
        } catch (error) {
          message2(error);
        }
      });
      root.querySelector("#enroll-passkey")?.addEventListener("click", async (event) => {
        event.target.disabled = true;
        try {
          const options = await post("/lifecycle/passkeys/register/options", { password: root.querySelector("#passkey-password").value });
          const response = await startRegistration({ optionsJSON: options.options });
          await post("/lifecycle/passkeys/register/verify", { response });
          window.location.assign(base + "/login");
        } catch (error) {
          message2(error);
          event.target.disabled = false;
        }
      });
      for (const button of root.querySelectorAll("[data-delete]")) button.onclick = async () => {
        if (!window.confirm("\u79FB\u9664\u8FD9\u628A Passkey\uFF1F\u9700\u8981\u91CD\u65B0\u767B\u5F55\u3002")) return;
        try {
          await post("/lifecycle/passkeys/remove", { id: button.dataset.delete, password: root.querySelector("#passkey-password").value });
          window.location.assign(base + "/login");
        } catch (error) {
          message2(error);
        }
      };
      root.querySelector("#save-origin")?.addEventListener("click", async () => {
        try {
          await post("/lifecycle/security/policy", { password: root.querySelector("#passkey-password").value, twoFactor: config.twoFactor, publicOrigin: root.querySelector("#passkey-origin").value });
          exit();
        } catch (error) {
          message2(error);
        }
      });
      if (active === "wallpapers") await wallpapers();
    }
    async function wallpapers() {
      const library = await get("/lifecycle/wallpapers");
      if (disposed || active !== "wallpapers") return;
      const preview = root.querySelector(".wallpaper-preview");
      preview.style.backgroundImage = `url("${base}/lifecycle/wallpaper/current?v=${Date.now()}")`;
      const items = [{ id: null, name: "\u9ED8\u8BA4 \xB7 \u84DD\u8272\u6D41\u5149", url: base + "/lifecycle/assets/wallpaper-v1.png" }, ...library.items.map((item) => ({ ...item, url: base + "/lifecycle/wallpapers/image/" + item.id }))];
      root.querySelector("#wallpaper-library").innerHTML = items.map((item) => `<article class="wallpaper-card ${library.selected === item.id ? "selected" : ""}"><button class="wallpaper-select" data-wallpaper="${item.id || "default"}" aria-label="\u4F7F\u7528${escapeHTML(item.name)}" aria-pressed="${library.selected === item.id}"><img src="${escapeHTML(item.url)}" alt="" loading="lazy"><span>${escapeHTML(item.name)}</span><small>${library.selected === item.id ? "\u2713 \u6B63\u5728\u4F7F\u7528" : "\u8BBE\u4E3A\u58C1\u7EB8"}</small></button>${item.id ? `<button class="wallpaper-delete" data-remove="${item.id}" aria-label="\u5220\u9664${escapeHTML(item.name)}">\u5220\u9664</button>` : ""}</article>`).join("");
      for (const button of root.querySelectorAll("[data-wallpaper]")) button.onclick = async () => {
        try {
          await post("/lifecycle/wallpapers/select", { id: button.dataset.wallpaper === "default" ? null : button.dataset.wallpaper });
          await wallpapers();
          toast("\u9501\u5C4F\u58C1\u7EB8\u5DF2\u66F4\u65B0");
        } catch (error) {
          message2(error);
        }
      };
      for (const button of root.querySelectorAll("[data-remove]")) button.onclick = async () => {
        if (!window.confirm("\u5220\u9664\u8FD9\u5F20\u58C1\u7EB8\uFF1F\u5982\u679C\u6B63\u5728\u4F7F\u7528\uFF0C\u5C06\u6062\u590D\u9ED8\u8BA4\u80CC\u666F\u3002")) return;
        try {
          await post("/lifecycle/wallpapers/delete", { id: button.dataset.remove });
          await wallpapers();
          toast("\u58C1\u7EB8\u5DF2\u5220\u9664");
        } catch (error) {
          message2(error);
        }
      };
      root.querySelector("#wallpaper-upload").onchange = async (event) => {
        const input = event.target, file = input.files[0];
        if (!file) return;
        input.disabled = true;
        try {
          if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("\u8BF7\u9009\u62E9 PNG\u3001JPEG \u6216 WebP \u56FE\u7247");
          if (file.size > 5 * 1024 * 1024) throw new Error("\u56FE\u7247\u4E0D\u80FD\u8D85\u8FC7 5 MB");
          let bitmap;
          try {
            bitmap = await createImageBitmap(file);
          } catch {
            throw new Error("\u56FE\u7247\u65E0\u6CD5\u8BFB\u53D6\uFF0C\u8BF7\u9009\u62E9\u6709\u6548\u7684 PNG\u3001JPEG \u6216 WebP \u56FE\u7247");
          }
          bitmap.close();
          const result = await uploadWallpaper(file, controller.signal);
          await post("/lifecycle/wallpapers/select", { id: result.item.id });
          await wallpapers();
          toast("\u5DF2\u6DFB\u52A0\u5E76\u8BBE\u4E3A\u9501\u5C4F\u58C1\u7EB8");
        } catch (error) {
          if (!disposed) message2(error);
        } finally {
          input.disabled = false;
          input.value = "";
        }
      };
    }
    await security();
    return () => {
      disposed = true;
      controller.abort();
      root.replaceChildren();
    };
  }

  // src/login/index.js
  var app = document.getElementById("app");
  var avatar = '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="32" cy="22" r="11"/><path d="M12 54c0-12 8-19 20-19s20 7 20 19" stroke-linecap="round"/></svg>';
  var icons = {
    password: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    otp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4M9 6h6M9 10h6"/></svg>',
    passkey: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="9" r="4"/><path d="m11 12 9 9m-5-5 3-3m-1 5 3-3"/></svg>',
    backup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6z"/><path d="m8 12 3 3 5-6"/></svg>'
  };
  var capabilities;
  var factor = false;
  var initialPassword = "";
  var desiredTwoFactor = false;
  var unlockListener;
  function message(error) {
    const target = document.querySelector(".auth-error");
    if (target) target.textContent = error.message || String(error);
  }
  function wireForm(callback) {
    const form = app.querySelector("form");
    if (!form) return;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = form.querySelector("button[type=submit]");
      if (button?.disabled) return;
      if (button) button.disabled = true;
      const error = document.querySelector(".auth-error");
      if (error) error.textContent = "";
      try {
        await callback(new FormData(form));
      } catch (error2) {
        message(error2);
      } finally {
        if (button?.isConnected) button.disabled = false;
      }
    });
  }
  function showFocused() {
    document.body.classList.add("focused");
  }
  function lockScreen() {
    document.body.classList.remove("focused", "setup-page", "security-page");
    app.innerHTML = '<section class="lock" tabindex="0" role="button" aria-label="\u5524\u9192\u5E76\u767B\u5F55 Admin"><div class="lock-symbol" aria-hidden="true">\u2311</div><div class="clock"></div><div class="date"></div><p class="lock-hint">\u6309 Enter \u952E\uFF0C\u6216\u70B9\u51FB\u4EFB\u610F\u4F4D\u7F6E\u767B\u5F55</p></section>';
    const update = () => {
      const now = /* @__PURE__ */ new Date(), clock = app.querySelector(".clock"), date = app.querySelector(".date");
      if (clock) clock.textContent = now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
      if (date) date.textContent = now.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" });
    };
    update();
    const timer = setInterval(update, 1e3);
    const open = () => {
      clearInterval(timer);
      document.removeEventListener("keydown", unlockListener);
      signin();
    };
    unlockListener = (event) => {
      if (["Enter", " ", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        open();
      }
    };
    document.addEventListener("keydown", unlockListener);
    app.querySelector(".lock").addEventListener("click", open, { once: true });
    app.querySelector(".lock").focus();
  }
  function signin(method = "password") {
    showFocused();
    document.body.classList.remove("setup-page", "security-page");
    const names = { password: "\u8F93\u5165\u5BC6\u7801", otp: "\u8F93\u5165\u8BA4\u8BC1\u5668\u9A8C\u8BC1\u7801", backup: "\u8F93\u5165\u4E00\u6B21\u6027\u5907\u4EFD\u4EE3\u7801", passkey: "\u4F7F\u7528 Passkey \u7EE7\u7EED" };
    const passkeyReady = capabilities.publicOrigin && new URL(capabilities.publicOrigin).origin === window.location.origin;
    const allowed = factor ? [capabilities.otp && "otp", capabilities.passkey && passkeyReady && "passkey", capabilities.otp && "backup"].filter(Boolean) : ["password", capabilities.methods.otp && "otp", capabilities.methods.passkey && passkeyReady && "passkey", capabilities.methods.otp && "backup"].filter(Boolean);
    if (factor && allowed.length === 0) {
      app.innerHTML = `<section class="signin"><div class="avatar">${avatar}</div><h1 class="account-name">Admin</h1><p class="status-line">Passkey \u5DF2\u7ED1\u5B9A\u5230\u4F60\u7684\u767B\u5F55\u57DF\u540D\uFF0C\u8BF7\u4ECE\u8BE5\u5730\u5740\u7EE7\u7EED\u9A8C\u8BC1\u3002</p><a class="text-button" href="${escapeHTML(capabilities.publicOrigin + base + "/login")}">\u524D\u5F80\u767B\u5F55\u57DF\u540D \u2192</a></section>`;
      return;
    }
    if (factor && !allowed.includes(method)) method = allowed[0];
    app.innerHTML = `<section class="signin"><button class="back-lock" aria-label="\u8FD4\u56DE\u9501\u5C4F">\u2039</button><div class="avatar">${avatar}</div><h1 class="account-name">Admin</h1><p class="signin-sub">${factor ? "\u518D\u5B8C\u6210\u4E00\u6B65\u9A8C\u8BC1\uFF0C\u4FDD\u62A4\u4F60\u7684\u5DE5\u4F5C\u7A7A\u95F4" : "\u4F60\u7684\u5DE5\u4F5C\u7A7A\u95F4\uFF0C\u7B49\u4F60\u56DE\u6765"}</p><form autocomplete="on">${method === "passkey" ? '<button type="submit" class="primary">\u4F7F\u7528 Passkey</button>' : `<div class="field"><input name="credential" aria-label="${names[method]}" placeholder="${names[method]}" type="${method === "password" ? "password" : "text"}" autocomplete="${method === "password" ? "current-password" : "one-time-code"}" ${method === "otp" ? 'inputmode="numeric" maxlength="6" class="code-input"' : ""} required><button type="submit" class="submit-arrow" aria-label="\u767B\u5F55">\u2192</button></div>`}<p class="auth-error" role="alert"></p></form><div class="method-list">${allowed.map((item) => `<button class="method ${item === method ? "active" : ""}" data-method="${item}" aria-label="${{ password: "\u5BC6\u7801\u767B\u5F55", otp: "OTP \u9A8C\u8BC1", backup: "\u4F7F\u7528\u5907\u4EFD\u4EE3\u7801", passkey: "Passkey \u9A8C\u8BC1" }[item]}" title="${names[item]}">${icons[item]}</button>`).join("")}</div><div class="auth-links">${!factor && allowed.length > 1 ? '<span class="text-button">\u5FD8\u8BB0\u5BC6\u7801\uFF1F\u53EF\u9009\u62E9\u5DF2\u7ED1\u5B9A\u7684\u5176\u4ED6\u9A8C\u8BC1\u65B9\u5F0F</span>' : ""}${factor ? '<button class="text-button" id="restart-login">\u91CD\u65B0\u8F93\u5165\u5BC6\u7801</button>' : ""}</div></section>`;
    app.querySelector(".back-lock").onclick = lockScreen;
    for (const button of app.querySelectorAll("[data-method]")) button.onclick = () => signin(button.dataset.method);
    app.querySelector("#restart-login")?.addEventListener("click", () => {
      factor = false;
      signin("password");
    });
    wireForm(async (data) => {
      let result;
      if (method === "passkey") {
        const options = await post("/lifecycle/passkeys/auth/options");
        const response = await startAuthentication({ optionsJSON: options.options });
        result = await post("/lifecycle/passkeys/auth/verify", { response });
      } else result = await post("/lifecycle/login", { method, ...method === "password" ? { password: data.get("credential") } : { code: data.get("credential") } });
      capabilities = await refreshState();
      if (result.stage === "factor") {
        factor = true;
        signin();
      } else if (result.stage === "setup") {
        setupNewPassword();
      } else await welcome();
    });
    app.querySelector("input")?.focus();
  }
  async function welcome() {
    showFocused();
    app.innerHTML = `<section class="signin"><div class="welcome"><div class="avatar">${avatar}</div><h1>\u6B22\u8FCE\u56DE\u6765\uFF0CAdmin</h1><div class="loading-ring" aria-hidden="true"></div><p>\u6B63\u5728\u51C6\u5907\u4F60\u7684\u5DE5\u4F5C\u7A7A\u95F4</p></div></section>`;
    await new Promise((resolve) => setTimeout(resolve, 650));
    document.body.classList.add("leaving");
    await new Promise((resolve) => setTimeout(resolve, 350));
    window.location.assign(base + "/");
  }
  function oobe(title, description, content, step) {
    document.body.classList.add("setup-page");
    document.body.classList.remove("security-page", "focused");
    app.innerHTML = `<section class="oobe"><aside class="oobe-visual"><div class="oobe-emblem" aria-hidden="true"></div><h2>\u8BA9\u5DE5\u4F5C\u7A7A\u95F4\u5C5E\u4E8E\u4F60</h2><p>DEEPSEEK LIFECYCLE</p></aside><div class="oobe-content"><div class="steps" aria-label="\u521D\u59CB\u5316\u8FDB\u5EA6">${[0, 1, 2, 3].map((i) => `<span class="${i <= step ? "active" : ""}"></span>`).join("")}</div><p class="eyebrow">WELCOME, ADMIN</p><h1>${title}</h1><p class="description">${description}</p>${content}<p class="auth-error" role="alert"></p></div></section>`;
    app.querySelector("input")?.focus();
  }
  function setupInitial() {
    oobe("\u4ECE\u8FD9\u91CC\uFF0C\u5F00\u59CB\u4F60\u7684\u5DE5\u4F5C\u7A7A\u95F4", "\u9996\u6B21\u4F7F\u7528\u9700\u8981\u9A8C\u8BC1\u670D\u52A1\u5668\u751F\u6210\u7684\u521D\u59CB\u5BC6\u7801\u3002\u63A5\u4E0B\u6765\uFF0C\u4F60\u5C06\u8BBE\u7F6E\u81EA\u5DF1\u7684\u5BC6\u7801\uFF0C\u5E76\u9009\u62E9\u9002\u5408\u4F60\u7684\u767B\u5F55\u65B9\u5F0F\u3002", '<form><label for="initial-password">\u521D\u59CB\u5BC6\u7801</label><input id="initial-password" name="password" type="password" autocomplete="current-password" placeholder="\u8F93\u5165\u670D\u52A1\u5668\u63A7\u5236\u53F0\u4E2D\u7684\u521D\u59CB\u5BC6\u7801" required><p class="initial-note">\u521D\u59CB\u5BC6\u7801\u4E0D\u4F1A\u5728\u7F51\u9875\u516C\u5F00\u663E\u793A\u3002\u5B8C\u6210\u521D\u59CB\u5316\u540E\uFF0C\u5B83\u5C06\u81EA\u52A8\u5931\u6548\u3002</p><div class="button-row"><button type="submit" class="primary">\u4E0B\u4E00\u6B65 \u2192</button></div></form>', 0);
    wireForm(async (data) => {
      initialPassword = String(data.get("password"));
      const result = await post("/lifecycle/login", { method: "password", password: initialPassword });
      capabilities = await refreshState();
      if (result.stage === "factor") {
        factor = true;
        signin();
      } else setupNewPassword();
    });
  }
  function setupNewPassword() {
    oobe("\u8BBE\u7F6E\u4E00\u4E2A\u5C5E\u4E8E\u4F60\u7684\u5BC6\u7801", "\u5BC6\u7801\u81F3\u5C11 8 \u4F4D\uFF0C\u5E76\u5305\u542B\u5927\u5C0F\u5199\u5B57\u6BCD\u6216\u7279\u6B8A\u5B57\u7B26\u3002\u4EE5\u540E\u91CD\u542F\u670D\u52A1\uFF0C\u5DF2\u9A8C\u8BC1\u7684\u767B\u5F55\u72B6\u6001\u4E5F\u4F1A\u4FDD\u7559\u3002", `<form>${!initialPassword ? '<label for="current-password">\u521D\u59CB\u5BC6\u7801</label><input id="current-password" name="current" type="password" autocomplete="current-password" required>' : ""}<label for="new-password">\u65B0\u5BC6\u7801</label><input id="new-password" name="password" type="password" autocomplete="new-password" required minlength="8"><label for="confirm-password">\u786E\u8BA4\u5BC6\u7801</label><input id="confirm-password" name="confirm" type="password" autocomplete="new-password" required><div class="button-row"><button type="submit" class="primary">\u4E0B\u4E00\u6B65 \u2192</button></div></form>`, 1);
    wireForm(async (data) => {
      if (data.get("password") !== data.get("confirm")) throw new Error("\u4E24\u6B21\u8F93\u5165\u7684\u5BC6\u7801\u4E0D\u4E00\u81F4");
      const password = String(data.get("password"));
      await post("/lifecycle/password", { password: initialPassword || data.get("current"), newPassword: password });
      initialPassword = password;
      capabilities = await refreshState();
      setupMethods();
    });
  }
  function setupMethods() {
    oobe("\u9009\u62E9\u4F60\u7684\u767B\u5F55\u65B9\u5F0F", "\u5355\u6B65\u9A8C\u8BC1\u53EF\u4EE5\u4F7F\u7528\u5BC6\u7801\uFF0C\u6216\u5DF2\u7ED1\u5B9A\u7684 OTP\u3001Passkey\u3002\u4E24\u6B65\u9A8C\u8BC1\u4F1A\u5728\u5BC6\u7801\u4E4B\u540E\uFF0C\u518D\u9A8C\u8BC1\u4E00\u6B21 OTP \u6216 Passkey\u3002", `<button class="choice ${!desiredTwoFactor ? "selected" : ""}" id="single-choice"><span class="choice-icon">\u2311</span><span><strong>\u5355\u6B65\u9A8C\u8BC1</strong><small>\u7B80\u5355\u76F4\u63A5\uFF1B\u53EF\u7A0D\u540E\u6DFB\u52A0\u5176\u4ED6\u767B\u5F55\u65B9\u5F0F</small></span></button><button class="choice ${desiredTwoFactor ? "selected" : ""}" id="double-choice"><span class="choice-icon">\u2713</span><span><strong>\u4E24\u6B65\u9A8C\u8BC1</strong><small>\u5BC6\u7801 + OTP \u6216 Passkey\uFF0C\u591A\u4E00\u5C42\u4FDD\u62A4</small></span></button><div class="button-row"><button id="setup-next" class="primary">\u4E0B\u4E00\u6B65 \u2192</button></div>`, 2);
    app.querySelector("#single-choice").onclick = () => {
      desiredTwoFactor = false;
      setupMethods();
    };
    app.querySelector("#double-choice").onclick = () => {
      desiredTwoFactor = true;
      setupMethods();
    };
    app.querySelector("#setup-next").onclick = () => desiredTwoFactor ? setupOTP() : setupDone();
  }
  async function setupOTP() {
    try {
      const result = await post("/otp/enable", { password: initialPassword });
      oobe("\u518D\u52A0\u4E00\u628A\u968F\u8EAB\u7684\u94A5\u5319", "\u4F7F\u7528\u8BA4\u8BC1\u5668\u626B\u63CF\u4E8C\u7EF4\u7801\uFF0C\u7136\u540E\u8F93\u5165\u5F53\u524D\u7684\u516D\u4F4D\u9A8C\u8BC1\u7801\u3002\u7ED1\u5B9A\u6210\u529F\u540E\u8BF7\u59A5\u5584\u4FDD\u5B58\u4E00\u6B21\u6027\u5907\u4EFD\u4EE3\u7801\u3002", `<div class="qr-box"><img src="${escapeHTML(result.svgUrl)}" alt="OTP \u7ED1\u5B9A\u4E8C\u7EF4\u7801"><div><p>\u65E0\u6CD5\u626B\u7801\u65F6\uFF0C\u624B\u52A8\u8F93\u5165\uFF1A</p><code>${escapeHTML(result.secret)}</code></div></div><form><label for="setup-otp">\u8BA4\u8BC1\u5668\u9A8C\u8BC1\u7801</label><input id="setup-otp" name="code" class="code-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required><div class="button-row"><button type="submit" class="primary">\u9A8C\u8BC1\u5E76\u7EE7\u7EED \u2192</button></div></form>`, 2);
      wireForm(async (data) => {
        const verified = await post("/otp/verify-setup", { otp: data.get("code") });
        await post("/lifecycle/login", { method: "password", password: initialPassword });
        oobe("\u628A\u8FD9\u4E9B\u4EE3\u7801\u653E\u5728\u5B89\u5168\u7684\u5730\u65B9", "\u8BA4\u8BC1\u5668\u4E0D\u53EF\u7528\u65F6\uFF0C\u53EF\u4EE5\u7528\u5907\u4EFD\u4EE3\u7801\u5B8C\u6210\u9A8C\u8BC1\u3002\u6BCF\u4E2A\u4EE3\u7801\u53EA\u80FD\u4F7F\u7528\u4E00\u6B21\uFF1B\u79BB\u5F00\u6B64\u9875\u540E\u4E0D\u4F1A\u518D\u6B21\u663E\u793A\u3002", `<pre class="backup-codes">${escapeHTML(verified.backupCodes.join("\n"))}</pre><div class="button-row"><button id="saved-codes" class="primary">\u6211\u5DF2\u4FDD\u5B58\uFF0C\u7EE7\u7EED \u2192</button></div>`, 3);
        app.querySelector("#saved-codes").onclick = () => {
          void finalizeSetup();
        };
      });
    } catch (error) {
      message(error);
    }
  }
  async function finalizeSetup() {
    try {
      await post("/lifecycle/security/policy", { password: initialPassword, twoFactor: true, publicOrigin: "" });
      initialPassword = "";
      capabilities = await refreshState();
      setupDone(true);
    } catch (error) {
      message(error);
    }
  }
  function setupDone(twoFactor = false) {
    oobe("\u4E00\u5207\u5C31\u7EEA", twoFactor ? "\u4E24\u6B65\u9A8C\u8BC1\u5DF2\u5F00\u542F\u3002\u4E0B\u6B21\u767B\u5F55\u65F6\uFF0C\u5148\u8F93\u5165\u5BC6\u7801\uFF0C\u518D\u5B8C\u6210 OTP \u9A8C\u8BC1\u3002\u5DF2\u5B8C\u6210\u7684\u767B\u5F55\u72B6\u6001\u53EF\u4EE5\u8DE8\u670D\u52A1\u91CD\u542F\u4FDD\u7559\u3002" : "\u4F60\u7684\u4E2A\u4EBA\u5BC6\u7801\u5DF2\u8BBE\u7F6E\u3002\u4EE5\u540E\u53EF\u4EE5\u5728\u7535\u6E90\u83DC\u5355\u7684\u300C\u767B\u5F55\u4E0E\u5B89\u5168\u300D\u4E2D\u6DFB\u52A0 OTP\u3001Passkey\uFF0C\u6216\u8C03\u6574\u9A8C\u8BC1\u65B9\u5F0F\u3002", `<div class="oobe-emblem" aria-hidden="true"></div><div class="button-row"><button id="enter-workspace" class="primary">${twoFactor ? "\u524D\u5F80\u767B\u5F55 \u2192" : "\u8FDB\u5165\u5DE5\u4F5C\u7A7A\u95F4 \u2192"}</button></div>`, 3);
    app.querySelector("#enter-workspace").onclick = () => {
      initialPassword = "";
      if (twoFactor) window.location.assign(base + "/login");
      else void welcome();
    };
  }
  async function main() {
    capabilities = await refreshState();
    const view = window.__LIFECYCLE__.view;
    if (view === "security") {
      document.body.classList.add("security-page");
      await mountSecurity(app);
      return;
    }
    if (view === "setup" || !capabilities.initialized) {
      if (capabilities.needsPasswordChange) setupNewPassword();
      else setupInitial();
      return;
    }
    if (capabilities.pendingFactor) {
      factor = true;
      signin();
      return;
    }
    lockScreen();
  }
  main().catch((error) => {
    app.innerHTML = `<section class="signin"><h1>\u6682\u65F6\u65E0\u6CD5\u8FDE\u63A5</h1><p class="auth-error">${escapeHTML(error.message)}</p><button class="text-button" id="retry">\u91CD\u65B0\u8F7D\u5165</button></section>`;
    document.getElementById("retry").onclick = () => window.location.reload();
  });
})();
