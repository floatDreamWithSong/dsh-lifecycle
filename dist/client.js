window.__ModuleLoader__.load({id:"dsh-lifecycle",factory:(require)=>{const module={exports:{}};const exports=module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.jsx
var index_exports = {};
__export(index_exports, {
  PowerMenu: () => PowerMenu,
  PowerOverlay: () => PowerOverlay,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"), 1);
var import_react_dom = require("react-dom");

// src/client/style.css
var style_default = ".dpm-trigger{box-sizing:border-box;display:flex;flex:1 1 auto;align-items:center;justify-content:flex-start;gap:8px;width:100%;min-width:0;height:32px;min-height:32px;margin:0;padding:6px 2px 6px 6px;border:0;border-radius:var(--dsw-radius-md,8px);background:transparent;color:var(--dsw-alias-label-primary,inherit);cursor:pointer;font:inherit;font-size:14px;line-height:20px;text-align:left}.dpm-trigger>svg{width:14px;height:14px;flex:none}.dpm-trigger>span{min-width:0;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}.dpm-trigger:hover,.dpm-trigger[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.14))}.dpm-trigger--collapsed{flex:0 0 36px;width:36px;height:36px;justify-content:center;gap:0;margin:0;padding:0}.dpm-trigger--collapsed>svg{width:18px;height:18px}\r\n.dpm-menu,.dpm-dialog{--dpm-surface:#fff;--dpm-text:#24262b;--dpm-muted:#737984;--dpm-caption:#858992;--dpm-border:rgba(128,128,128,.2);--dpm-hover:rgba(100,120,160,.1);--dpm-danger:#c45151;--dpm-warning:#b76b2e;--dpm-shadow:0 16px 60px #0002;color:var(--dsw-alias-label-primary,var(--dpm-text));background:var(--dsw-alias-bg-layer-1,var(--dpm-surface));font-family:system-ui,-apple-system,'Segoe UI',sans-serif;border:1px solid var(--dsw-alias-border-l2,var(--dpm-border));box-shadow:var(--dpm-shadow);border-radius:14px}\r\n.dpm-menu{background:var(--dsw-specific-menu,var(--dpm-surface));backdrop-filter:var(--dsw-menu-backdrop-filter,blur(20px));position:fixed;z-index:2147483001;width:264px;padding:7px;box-sizing:border-box;animation:dpm-pop .14s ease-out}.dpm-caption{font-size:9px;letter-spacing:1.2px;color:var(--dsw-alias-label-tertiary,var(--dpm-caption));padding:9px 10px 12px;display:flex;justify-content:space-between;gap:6px}.dpm-caption span{letter-spacing:0;font-size:10px}\r\n.dpm-menu button{display:flex;align-items:center;width:100%;gap:12px;border:0;background:transparent;color:inherit;text-align:left;padding:11px 10px;border-radius:8px;font:inherit;font-size:13px;cursor:pointer}.dpm-menu button>span{font-size:23px;width:18px;text-align:center;line-height:1}.dpm-menu button small{display:block;color:var(--dsw-alias-label-secondary,var(--dpm-muted));font-size:11px;margin-top:4px}.dpm-menu button:hover,.dpm-menu button:focus-visible{background:var(--dsw-alias-interactive-bg-hover,var(--dpm-hover))}.dpm-menu button:disabled{opacity:.4;cursor:wait}.dpm-divider{height:1px;background:var(--dsw-alias-border-l2,var(--dpm-border));margin:5px 7px}.dpm-menu .dpm-danger{color:var(--dpm-danger)}.dpm-dot{width:6px;height:6px;background:#4a85ed;border-radius:50%;margin-left:auto}.dpm-warning{font-size:11px;line-height:1.5;color:var(--dpm-warning);margin:9px}\r\n.dpm-mask{position:fixed;inset:0;z-index:2147483002;display:grid;place-items:center;padding:20px;background:var(--dsw-alias-bg-mask-2,#10182480);backdrop-filter:blur(4px)}.dpm-dialog{padding:28px;max-width:390px;animation:dpm-pop .18s ease-out}.dpm-dialog-icon{display:grid;place-items:center;background:#df707015;color:var(--dpm-danger);width:42px;height:42px;border-radius:12px;margin-bottom:20px}.dpm-dialog h2{font-size:19px;line-height:1.4;letter-spacing:-.4px;margin:0 0 12px}.dpm-dialog p{font-size:13px;line-height:1.8;color:var(--dsw-alias-label-secondary,var(--dpm-muted))}.dpm-dialog .dpm-note{font-size:12px}.dpm-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:24px}.dpm-dialog-actions button,.dpm-back{border:1px solid var(--dsw-alias-border-l2,var(--dpm-border,#8883));border-radius:8px;padding:9px 16px;cursor:pointer;background:transparent;color:inherit;font:inherit;font-size:13px}.dpm-dialog-actions .dpm-shutdown{background:#bf4d4d;border-color:#bf4d4d;color:white}\r\n.dpm-overlay{position:fixed;inset:0;z-index:2147483640;display:grid;place-items:center;overflow:hidden;background:#073568;color:#fff;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;animation:dpm-fade .4s ease-out}.dpm-halo{position:absolute;inset:-50%;background:radial-gradient(ellipse at 48% 54%,#1472bc80 0,transparent 45%),radial-gradient(ellipse at 70% 20%,#1f478b90 0,transparent 42%);animation:dpm-breathe 8s ease-in-out infinite alternate}.dpm-transition{position:relative;text-align:center;max-width:540px;padding:32px}.dpm-transition h1{font-size:clamp(22px,3vw,30px);font-weight:400;letter-spacing:.4px;line-height:1.5;margin:36px 0 13px}.dpm-transition p{font-size:14px;color:#e8f2ff;line-height:1.9;margin:0}.dpm-transition small{display:block;color:#abc7e6;font-size:11px;margin-top:16px;line-height:1.8}.dpm-spinner{position:relative;width:52px;height:52px;margin:auto}.dpm-spinner span{position:absolute;inset:0;animation:dpm-orbit 2.8s cubic-bezier(.35,.05,.25,1) infinite;animation-delay:calc(var(--i)*.13s)}.dpm-spinner span:after{content:'';display:block;width:4px;height:4px;background:#fff;border-radius:50%;margin:0 auto}.dpm-off-icon{display:grid;place-items:center;opacity:.7}.dpm-off-icon svg{width:42px;height:42px}.dpm-overlay-brand{position:absolute;bottom:35px;display:flex;align-items:center;gap:9px;color:#aec9e5;font-size:9px;letter-spacing:2.5px}.dpm-back{margin-top:25px;border-color:#ffffff50;color:white;background:#ffffff15}\r\n[data-ds-dark-theme] :is(.dpm-menu,.dpm-dialog){--dpm-surface:#24272d;--dpm-text:#e9ebef;--dpm-muted:#bdc2cc;--dpm-caption:#a0a6b1;--dpm-border:#ffffff1f;--dpm-hover:#ffffff14;--dpm-danger:#ee8585;--dpm-warning:#efb96f;--dpm-shadow:0 16px 60px #0007}[data-ds-dark-theme] .dpm-overlay{background:#081e35}:is(.dpm-menu,.dpm-dialog,.dpm-overlay) button:focus-visible,.dpm-trigger:focus-visible{outline:2px solid #629bec;outline-offset:2px}\r\n@keyframes dpm-orbit{0%{transform:rotate(0);opacity:0}8%{opacity:1}80%{opacity:1}100%{transform:rotate(720deg);opacity:0}}@keyframes dpm-pop{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes dpm-fade{from{opacity:0}to{opacity:1}}@keyframes dpm-breathe{from{transform:scale(1)}to{transform:scale(1.12) translate(2%,-1%)}}\r\n@media(prefers-reduced-motion:reduce){.dpm-menu,.dpm-dialog,.dpm-overlay,.dpm-halo,.dpm-spinner span{animation:none}.dpm-spinner span{transform:rotate(calc(var(--i)*55deg))}}@media(max-width:420px){.dpm-dialog{padding:22px}}\r\n.dpm-caption .dpm-version{display:flex;align-items:center;gap:3px;flex:none}.dpm-caption .dpm-refresh{display:inline-flex;align-items:center;justify-content:center;flex:none;width:20px;height:20px;min-height:20px;margin:-4px 0;padding:3px;border:0;border-radius:4px;color:inherit;background:transparent;cursor:pointer}.dpm-caption .dpm-refresh:disabled{cursor:wait;opacity:.6}.dpm-refresh.is-refreshing svg{animation:dpm-refresh-spin 1s linear infinite}@keyframes dpm-refresh-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.dpm-refresh.is-refreshing svg{animation:none}}\r\n.dpm-dialog .dpm-refresh-login{display:block;width:100%;margin-top:20px;padding:12px 16px;border:0;border-radius:6px;background:#1767bb;color:#fff;font:inherit;cursor:pointer}\r\n";

// src/security/style.css
var style_default2 = ".dl-native-panel{height:100%;min-height:0;overflow:auto;width:100%}\r\n.dl-security{--dl-bg:#fafbfc;--dl-card:#fff;--dl-text:#243449;--dl-muted:#758399;--dl-border:#e4e8ee;--dl-field:#fff;--dl-accent:#2563b9;--dl-soft:#eaf2fd;min-height:100%;padding:40px clamp(20px,4vw,64px) 64px;background:var(--dl-bg);color:var(--dl-text);font:14px/1.6 system-ui,-apple-system,'PingFang SC',sans-serif;box-sizing:border-box}\r\n.dl-security *{box-sizing:border-box}.dl-security button,.dl-security input{font:inherit}.dl-security button{cursor:pointer;color:inherit}.dl-security button:disabled{cursor:not-allowed;opacity:.5}\r\n.dl-security button:focus-visible,.dl-security input:focus-visible{outline:2px solid var(--dl-accent);outline-offset:3px}\r\n.dl-security .security-header{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:0 auto 32px;max-width:1120px}\r\n.dl-security .eyebrow{font-size:10px;letter-spacing:1.8px;color:var(--dl-muted);margin:0 0 6px}.dl-security h1{font-size:26px;font-weight:600;letter-spacing:-.6px;margin:0 0 8px}.dl-security .security-header p:not(.eyebrow){color:var(--dl-muted);font-size:13px;margin:0}\r\n.dl-security .security-layout{display:grid;grid-template-columns:168px minmax(0,720px);gap:34px;max-width:1120px;margin:auto;align-items:start}\r\n.dl-security .security-tabs{display:flex;flex-direction:column;gap:5px;position:sticky;top:20px}.dl-security .security-tabs button{display:flex;gap:12px;align-items:center;text-align:left;padding:12px 14px;border:0;background:transparent;border-radius:8px;color:var(--dl-muted);white-space:nowrap;font-size:13px}\r\n.dl-security .security-tabs button span{font-size:18px;line-height:1;width:20px;text-align:center}.dl-security .security-tabs button[aria-selected=true]{background:var(--dl-soft);color:var(--dl-accent);font-weight:550}.dl-security .security-tabs button:hover{background:var(--dl-soft)}\r\n.dl-security .security-content{min-width:0}.dl-security .security-panel{background:var(--dl-card);border:1px solid var(--dl-border);border-radius:14px;padding:30px;min-width:0;box-shadow:0 3px 12px #132b4910}\r\n.dl-security h2{font-size:18px;font-weight:600;margin:0 0 9px;display:flex;align-items:center;flex-wrap:wrap;gap:7px}.dl-security .security-panel p{font-size:13px;line-height:1.8;color:var(--dl-muted);margin:0 0 24px}.dl-security .badge{font-size:10px;line-height:1.7;padding:3px 9px;border-radius:20px;background:var(--dl-soft);color:var(--dl-accent);font-weight:400}\r\n.dl-security label:not(.upload-button){display:block;color:var(--dl-text);font-size:12px;margin:18px 0 7px}.dl-security input:not([type=checkbox]):not([type=file]){display:block;border:1px solid var(--dl-border);border-radius:7px;background:var(--dl-field);color:var(--dl-text);width:100%;max-width:420px;height:41px;padding:10px 12px;outline-offset:2px}\r\n.dl-security .check-line{display:flex!important;align-items:center;gap:10px;margin:22px 0!important}.dl-security input[type=checkbox]{width:16px;height:16px;accent-color:var(--dl-accent)}\r\n.dl-security .button-row{display:flex;flex-wrap:wrap;gap:10px;margin:24px 0 12px;justify-content:flex-start}.dl-security .primary,.dl-security .secondary{border:1px solid var(--dl-border);border-radius:7px;padding:9px 16px;font-size:12px;line-height:1.5;background:var(--dl-field);color:var(--dl-text);white-space:nowrap}.dl-security .primary{background:var(--dl-accent);border-color:var(--dl-accent);color:#fff}\r\n.dl-security .auth-error{font-size:12px;color:#d45656;white-space:pre-wrap;text-align:left;margin:12px 0;min-height:0}.dl-security .dl-notice{padding:12px 16px;background:var(--dl-soft);color:var(--dl-accent);font-size:12px;border-radius:8px;margin-bottom:14px}.dl-security [hidden]{display:none!important}\r\n.dl-security .qr-box{display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin:20px 0;padding:16px;border:1px solid var(--dl-border);border-radius:9px;max-width:100%;background:var(--dl-field)}.dl-security .qr-box img{height:150px;width:150px}.dl-security code{overflow-wrap:anywhere;font-size:11px}.dl-security .backup-codes{padding:18px;background:var(--dl-soft);color:var(--dl-text);font-size:12px;line-height:1.9;border-radius:8px;white-space:pre-wrap}.dl-security a{color:var(--dl-accent)}\r\n.dl-security .passkey-row{display:flex;justify-content:space-between;align-items:center;padding:13px 0;border-bottom:1px solid var(--dl-border)}.dl-security .passkey-row button{background:transparent;border:0;color:#c75c5c;font-size:12px}\r\n.dl-security .wallpaper-preview{aspect-ratio:16/8.5;width:100%;border-radius:10px;background-position:center;background-size:cover;border:1px solid var(--dl-border);margin:20px 0}.dl-security .wallpaper-toolbar{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:22px 0}.dl-security .wallpaper-toolbar>span{font-size:11px;color:var(--dl-muted)}\r\n.dl-security .upload-button{display:inline-flex;padding:9px 14px;border:1px solid var(--dl-border);border-radius:7px;background:var(--dl-field);cursor:pointer;font-size:12px}.dl-security input[type=file]{width:1px;height:1px;opacity:0;position:absolute}.dl-security .upload-button:focus-within{outline:2px solid var(--dl-accent);outline-offset:3px}\r\n.dl-security .wallpaper-library{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.dl-security .wallpaper-card{border:1px solid var(--dl-border);border-radius:9px;overflow:hidden;position:relative;background:var(--dl-field)}.dl-security .wallpaper-card.selected{border:2px solid var(--dl-accent)}.dl-security .wallpaper-select{border:0;background:transparent;padding:0 0 10px;width:100%;text-align:left;display:block}.dl-security .wallpaper-select img{width:100%;aspect-ratio:16/10;object-fit:cover;display:block}.dl-security .wallpaper-select span{display:block;margin:10px 10px 2px;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dl-security .wallpaper-select small{font-size:10px;display:block;color:var(--dl-muted);margin:0 10px}.dl-security .selected .wallpaper-select small{color:var(--dl-accent)}.dl-security .wallpaper-delete{position:absolute;right:5px;top:5px;border:0;border-radius:4px;background:#162338c9;color:#fff;font-size:10px;padding:4px 6px}\r\n:is(html.dark,html[data-theme=dark],body.dark,body[data-theme=dark],[data-ds-dark-theme]) .dl-security{--dl-bg:#17191d;--dl-card:#202329;--dl-text:#e1e5eb;--dl-muted:#99a5b5;--dl-border:#343b46;--dl-field:#272c34;--dl-accent:#6ca7f7;--dl-soft:#27364c}\r\n@media(prefers-color-scheme:dark){html:not(.light):not([data-theme=light]) .dl-security{--dl-bg:#17191d;--dl-card:#202329;--dl-text:#e1e5eb;--dl-muted:#99a5b5;--dl-border:#343b46;--dl-field:#272c34;--dl-accent:#6ca7f7;--dl-soft:#27364c}}\r\n@media(max-width:760px){.dl-security{padding:26px 18px 40px}.dl-security .security-header{align-items:flex-start;gap:12px;margin-bottom:22px}.dl-security h1{font-size:22px}.dl-security .security-header p:not(.eyebrow){font-size:11px}.dl-security .security-header>.secondary{padding:7px 10px;font-size:11px}.dl-security .security-layout{grid-template-columns:minmax(0,1fr);gap:18px}.dl-security .security-tabs{position:static;flex-direction:row;overflow-x:auto;padding-bottom:7px;gap:4px}.dl-security .security-tabs button{padding:9px 11px;font-size:12px}.dl-security .security-tabs button span{display:none}.dl-security .security-panel{padding:22px 18px}.dl-security .wallpaper-library{grid-template-columns:repeat(2,minmax(0,1fr))}}\r\n";

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
  constructor({ message, code, cause, name }) {
    super(message, { cause });
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
  function message(error) {
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
        message(error);
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
          message(error);
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
        message(error);
      }
    });
    root.querySelector("#lock-now")?.addEventListener("click", async () => {
      try {
        await post("/lifecycle/lock");
        exit();
      } catch (error) {
        message(error);
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
            message(error);
          }
        };
      } catch (error) {
        message(error);
        event.target.disabled = false;
      }
    });
    root.querySelector("#disable-otp-button")?.addEventListener("click", async () => {
      try {
        const code = root.querySelector("#disable-otp").value;
        await post("/otp/disable", { password: root.querySelector("#disable-password").value, ...code.length === 6 ? { otp: code } : { backupCode: code } });
        window.location.assign(base + "/login");
      } catch (error) {
        message(error);
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
        message(error);
        event.target.disabled = false;
      }
    });
    for (const button of root.querySelectorAll("[data-delete]")) button.onclick = async () => {
      if (!window.confirm("\u79FB\u9664\u8FD9\u628A Passkey\uFF1F\u9700\u8981\u91CD\u65B0\u767B\u5F55\u3002")) return;
      try {
        await post("/lifecycle/passkeys/remove", { id: button.dataset.delete, password: root.querySelector("#passkey-password").value });
        window.location.assign(base + "/login");
      } catch (error) {
        message(error);
      }
    };
    root.querySelector("#save-origin")?.addEventListener("click", async () => {
      try {
        await post("/lifecycle/security/policy", { password: root.querySelector("#passkey-password").value, twoFactor: config.twoFactor, publicOrigin: root.querySelector("#passkey-origin").value });
        exit();
      } catch (error) {
        message(error);
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
        message(error);
      }
    };
    for (const button of root.querySelectorAll("[data-remove]")) button.onclick = async () => {
      if (!window.confirm("\u5220\u9664\u8FD9\u5F20\u58C1\u7EB8\uFF1F\u5982\u679C\u6B63\u5728\u4F7F\u7528\uFF0C\u5C06\u6062\u590D\u9ED8\u8BA4\u80CC\u666F\u3002")) return;
      try {
        await post("/lifecycle/wallpapers/delete", { id: button.dataset.remove });
        await wallpapers();
        toast("\u58C1\u7EB8\u5DF2\u5220\u9664");
      } catch (error) {
        message(error);
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
        if (!disposed) message(error);
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

// src/client/reload-notice.js
function mountReloadNotice() {
  let disposed = false, dialog;
  void fetch("/lifecycle/state", { cache: "no-store" }).then(async (response) => {
    if (!response.ok) throw new Error("\u767B\u5F55\u72B6\u6001\u68C0\u67E5\u5931\u8D25\uFF1AHTTP " + response.status);
    const state2 = await response.json();
    if (disposed || state2.authenticated) return;
    dialog = document.createElement("div");
    dialog.className = "dpm-mask";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "\u5B89\u88C5\u5B8C\u6210\u540E\u9700\u8981\u5237\u65B0");
    const panel = document.createElement("section");
    panel.className = "dpm-dialog";
    const title = document.createElement("h2");
    title.textContent = "\u767B\u5F55\u9A8C\u8BC1\u5DF2\u542F\u7528\uFF0C\u8BF7\u5237\u65B0\u9875\u9762";
    const text = document.createElement("p");
    text.textContent = "\u5B89\u88C5 DSH Lifecycle \u540E\uFF0C\u65E7\u9875\u9762\u53EF\u80FD\u663E\u793A\u201C\u65E0\u6CD5\u8FDE\u63A5\u201D\u6216\u6536\u5230 HTTP 401\u3002\u8FD9\u662F\u5C1A\u672A\u767B\u5F55\uFF0C\u4E0D\u662F\u63D2\u4EF6\u542F\u52A8\u5931\u8D25\u3002\u8BF7\u5237\u65B0\u8FDB\u5165\u767B\u5F55\u6216\u9996\u6B21\u8BBE\u7F6E\u3002";
    const button = document.createElement("button");
    button.className = "dpm-refresh-login";
    button.textContent = "\u5237\u65B0\u5E76\u8FDB\u5165\u767B\u5F55 / \u8BBE\u7F6E";
    button.onclick = () => window.location.assign("/login");
    panel.append(title, text, button);
    dialog.append(panel);
    document.body.append(dialog);
    dialog.style.zIndex = "2147483647";
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "Tab") {
        event.preventDefault();
        button.focus();
      }
    });
    button.focus();
  }).catch((error) => {
    if (!disposed) console.error("[dsh-lifecycle] \u65E0\u6CD5\u68C0\u67E5\u5B89\u88C5\u540E\u7684\u767B\u5F55\u72B6\u6001", error);
  });
  return () => {
    disposed = true;
    dialog?.remove();
  };
}

// src/client/index.jsx
var inject = ["slots", "layout"];
var BASE = "/api/dsh-lifecycle/power";
var snapshot = { action: null, phase: "", error: null };
var listeners = /* @__PURE__ */ new Set();
var titles = { setup: "\u6B63\u5728\u542F\u7528\u7535\u6E90\u63A7\u5236", restart: "\u6B63\u5728\u91CD\u65B0\u542F\u52A8", shutdown: "\u6B63\u5728\u5173\u95ED DeepSeek Harness", update: "\u6B63\u5728\u66F4\u65B0 DeepSeek Harness" };
var phases = {
  accepted: "\u6B63\u5728\u51C6\u5907\uFF0C\u8BF7\u7A0D\u5019",
  downloading: "\u6B63\u5728\u4E0B\u8F7D\u5E76\u5B89\u88C5\u65B0\u7248\u672C\uFF0C\u670D\u52A1\u4ECD\u53EF\u4F7F\u7528",
  validating: "\u6B63\u5728\u68C0\u67E5\u65B0\u7248\u672C",
  restarting: "\u6B63\u5728\u91CD\u65B0\u542F\u52A8\u670D\u52A1",
  stopping: "\u6B63\u5728\u505C\u6B62 Harness \u670D\u52A1",
  "waiting-for-exit": "\u540E\u53F0\u670D\u52A1\u5DF2\u5C31\u7EEA\uFF0C\u6B63\u5728\u5207\u6362\u6258\u7BA1",
  "rolling-back": "\u66F4\u65B0\u672A\u6210\u529F\uFF0C\u6B63\u5728\u6062\u590D\u539F\u7248\u672C"
};
function publish(value) {
  snapshot = { ...snapshot, ...value };
  for (const listener of listeners) listener();
}
async function status(refreshToken) {
  const options = { cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(15e3) };
  if (refreshToken) Object.assign(options, { method: "POST", headers: { "Content-Type": "application/json", "X-DSH-Power-Token": refreshToken }, body: "{}" });
  const res = await fetch(BASE + (refreshToken ? "/refresh" : "/status"), options);
  if (!res.ok) {
    const detail = await res.json();
    throw new Error(detail.error || `\u72B6\u6001\u68C0\u67E5\u5931\u8D25\uFF08${res.status}\uFF09`);
  }
  return res.json();
}
async function session() {
  const res = await fetch(BASE + "/session", { cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(5e3) });
  if (!res.ok) throw new Error(`\u65E0\u6CD5\u8FDE\u63A5\u7535\u6E90\u63A7\u5236\uFF08${res.status}\uFF09`);
  return res.json();
}
async function begin(action, target, confirm) {
  publish({ action, phase: "accepted", error: null, operationId: null });
  try {
    const before = await session();
    const res = await fetch(BASE + (action === "setup" ? "/setup" : "/action"), { method: "POST", headers: {
      "Content-Type": "application/json",
      "X-DSH-Power-Token": before.csrf
    }, body: JSON.stringify({ action, target, confirm }) });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    if (action === "setup" && !result.restartRequired) {
      window.location.reload();
      return;
    }
    publish({ original: before.instanceId, operationId: result.id, startedAt: Date.now() });
  } catch (error) {
    publish({ error: error.message });
  }
}
async function lock() {
  try {
    const result = await fetch("/lifecycle/state", { cache: "no-store" });
    if (!result.ok) throw new Error("\u65E0\u6CD5\u8FDE\u63A5\u9501\u5C4F\u670D\u52A1");
    const state2 = await result.json();
    const response = await fetch("/lifecycle/lock", { method: "POST", headers: { "Content-Type": "application/json", "X-Lifecycle-CSRF": state2.csrf }, body: "{}" });
    if (!response.ok) throw new Error("\u9501\u5B9A\u5931\u8D25");
    window.location.assign("/login");
  } catch (error) {
    publish({ action: "lock", operationId: null, error: error.message });
  }
}
function PowerIcon() {
  return /* @__PURE__ */ import_react.default.createElement("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.7", "aria-hidden": "true" }, /* @__PURE__ */ import_react.default.createElement("path", { d: "M12 3v9", strokeLinecap: "round" }), /* @__PURE__ */ import_react.default.createElement("path", { d: "M7.2 5.8a8 8 0 1 0 9.6 0", strokeLinecap: "round" }));
}
function PowerMenu({ wide = true, openSecurity }) {
  const [open, setOpen] = (0, import_react.useState)(false);
  const [info, setInfo] = (0, import_react.useState)(null);
  const [error, setError] = (0, import_react.useState)(null);
  const [refreshing, setRefreshing] = (0, import_react.useState)(false);
  const pending = (0, import_react.useRef)(false);
  const [confirm, setConfirm] = (0, import_react.useState)(false);
  const [position, setPosition] = (0, import_react.useState)({ left: 12, bottom: 60 });
  const trigger = (0, import_react.useRef)(null);
  const menu = (0, import_react.useRef)(null);
  const cancel = (0, import_react.useRef)(null);
  const dialog = (0, import_react.useRef)(null);
  async function loadInfo(forceRefresh = false) {
    if (pending.current) return;
    pending.current = true;
    setRefreshing(true);
    setError(null);
    try {
      const value = forceRefresh ? await status((await session()).csrf) : await status();
      setInfo(value);
    } catch (error2) {
      setError(error2.message);
    } finally {
      pending.current = false;
      setRefreshing(false);
    }
  }
  (0, import_react.useEffect)(() => {
    if (!open) return;
    if (!info) void loadInfo();
    menu.current?.focus();
    const outside = (e) => {
      if (!menu.current?.contains(e.target) && !trigger.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);
  (0, import_react.useEffect)(() => {
    if (confirm) cancel.current?.focus();
  }, [confirm]);
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  function keyMenu(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
    const items = [...menu.current.querySelectorAll("button:not(:disabled)")];
    const index = items.indexOf(document.activeElement);
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      const next = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : (index + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    }
    if (e.key === "Tab") close();
  }
  return /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      ref: trigger,
      className: "dpm-trigger" + (wide ? "" : " dpm-trigger--collapsed"),
      title: "\u7535\u6E90",
      "aria-label": "\u7535\u6E90",
      "aria-haspopup": "menu",
      "aria-expanded": open,
      "aria-controls": "dpm-menu",
      onClick: () => {
        const box = trigger.current.getBoundingClientRect();
        setPosition({ left: Math.max(8, Math.min(box.left, window.innerWidth - 272)), bottom: window.innerHeight - box.top + 8 });
        setOpen(!open);
      }
    },
    /* @__PURE__ */ import_react.default.createElement(PowerIcon, null),
    wide && /* @__PURE__ */ import_react.default.createElement("span", null, "\u7535\u6E90")
  ), open && (0, import_react_dom.createPortal)(/* @__PURE__ */ import_react.default.createElement("div", { ref: menu, id: "dpm-menu", className: "dpm-menu", role: "menu", tabIndex: -1, "aria-label": "\u7535\u6E90\u9009\u9879", style: position, onKeyDown: keyMenu }, /* @__PURE__ */ import_react.default.createElement("div", { className: "dpm-caption" }, "DEEPSEEK HARNESS ", /* @__PURE__ */ import_react.default.createElement("span", { className: "dpm-version" }, /* @__PURE__ */ import_react.default.createElement("span", null, info?.current || (refreshing ? "\u6B63\u5728\u68C0\u67E5\u7248\u672C\u2026" : "\u7248\u672C\u4E0D\u53EF\u7528")), /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "dpm-refresh" + (refreshing ? " is-refreshing" : ""), "aria-label": "\u5237\u65B0\u68C0\u6D4B", title: "\u91CD\u65B0\u68C0\u6D4B\u66F4\u65B0", disabled: refreshing, "aria-busy": refreshing, onClick: () => {
    void loadInfo(true);
  } }, /* @__PURE__ */ import_react.default.createElement("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.7", "aria-hidden": "true" }, /* @__PURE__ */ import_react.default.createElement("path", { d: "M20 7v5h-5M4 17v-5h5", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ import_react.default.createElement("path", { d: "M6.1 6.1a8 8 0 0 1 13.1 2.2M4.8 15.7a8 8 0 0 0 13.1 2.2", strokeLinecap: "round" }))))), info?.installed === false && /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, /* @__PURE__ */ import_react.default.createElement("p", { className: "dpm-warning", role: "status" }, info.setupReason), info.setupAvailable && /* @__PURE__ */ import_react.default.createElement("button", { role: "menuitem", onClick: () => {
    close();
    setConfirm("setup");
  } }, /* @__PURE__ */ import_react.default.createElement(PowerIcon, null), /* @__PURE__ */ import_react.default.createElement("div", null, "\u542F\u7528\u7535\u6E90\u63A7\u5236", /* @__PURE__ */ import_react.default.createElement("small", null, "\u81EA\u52A8\u914D\u7F6E\uFF0C\u65E0\u9700\u6253\u5F00\u7EC8\u7AEF")))), /* @__PURE__ */ import_react.default.createElement("button", { role: "menuitem", disabled: info?.installed === false, onClick: () => {
    close();
    void begin("restart");
  } }, /* @__PURE__ */ import_react.default.createElement("span", null, "\u21BB"), /* @__PURE__ */ import_react.default.createElement("div", null, "\u91CD\u65B0\u542F\u52A8", /* @__PURE__ */ import_react.default.createElement("small", null, info?.platformNotice ? "\u505C\u6B62\u5E76\u91CD\u65B0\u542F\u52A8\u6258\u7BA1\u8FDB\u7A0B" : "\u4FDD\u5B58\u4F1A\u8BDD\uFF0C\u91CD\u65B0\u52A0\u8F7D\u670D\u52A1"))), info?.update && /* @__PURE__ */ import_react.default.createElement("button", { role: "menuitem", onClick: () => {
    close();
    void begin("update", info.update);
  } }, /* @__PURE__ */ import_react.default.createElement("span", null, "\u2193"), /* @__PURE__ */ import_react.default.createElement("div", null, "\u66F4\u65B0\u5E76\u91CD\u542F", /* @__PURE__ */ import_react.default.createElement("small", null, info.current, " \u2192 ", info.update)), /* @__PURE__ */ import_react.default.createElement("i", { className: "dpm-dot" })), /* @__PURE__ */ import_react.default.createElement("button", { role: "menuitem", onClick: () => {
    close();
    void lock();
  } }, /* @__PURE__ */ import_react.default.createElement("span", null, "\u2311"), /* @__PURE__ */ import_react.default.createElement("div", null, "\u9501\u5B9A", /* @__PURE__ */ import_react.default.createElement("small", null, "\u4FDD\u7559\u670D\u52A1\uFF0C\u9501\u5B9A\u5F53\u524D\u6D4F\u89C8\u5668"))), /* @__PURE__ */ import_react.default.createElement("button", { role: "menuitem", onClick: () => {
    close();
    openSecurity();
  } }, /* @__PURE__ */ import_react.default.createElement("span", null, "\u2699"), /* @__PURE__ */ import_react.default.createElement("div", null, "\u767B\u5F55\u4E0E\u5B89\u5168", /* @__PURE__ */ import_react.default.createElement("small", null, "\u9A8C\u8BC1\u65B9\u5F0F\u3001\u9501\u5C4F\u58C1\u7EB8\u4E0E\u4F1A\u8BDD\u7BA1\u7406"))), /* @__PURE__ */ import_react.default.createElement("div", { className: "dpm-divider" }), /* @__PURE__ */ import_react.default.createElement("button", { className: "dpm-danger", role: "menuitem", disabled: info?.installed === false, onClick: () => {
    close();
    setConfirm("shutdown");
  } }, /* @__PURE__ */ import_react.default.createElement(PowerIcon, null), /* @__PURE__ */ import_react.default.createElement("div", null, "\u5173\u673A", /* @__PURE__ */ import_react.default.createElement("small", null, "\u505C\u6B62 Harness \u670D\u52A1"))), (error || info?.checkError || info?.updateReason) && /* @__PURE__ */ import_react.default.createElement("p", { className: "dpm-warning", role: "status" }, error || (info?.checkError ? "\u7248\u672C\u68C0\u67E5\u5931\u8D25\uFF1A" + info.checkError : info.updateReason)), info?.platformNotice && /* @__PURE__ */ import_react.default.createElement("p", { className: "dpm-warning", role: "status" }, info.platformNotice)), document.body), confirm && (0, import_react_dom.createPortal)(/* @__PURE__ */ import_react.default.createElement("div", { className: "dpm-mask", onClick: (e) => {
    if (e.target === e.currentTarget) setConfirm(false);
  } }, /* @__PURE__ */ import_react.default.createElement(
    "section",
    {
      ref: dialog,
      className: "dpm-dialog",
      role: "alertdialog",
      "aria-modal": "true",
      "aria-labelledby": "dpm-confirm-title",
      "aria-describedby": "dpm-confirm-body",
      onKeyDown: (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          setConfirm(false);
          trigger.current?.focus();
        }
        if (e.key === "Tab") {
          const items = [...dialog.current.querySelectorAll("button")];
          const i = items.indexOf(document.activeElement);
          e.preventDefault();
          items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus();
        }
      }
    },
    /* @__PURE__ */ import_react.default.createElement("div", { className: "dpm-dialog-icon" }, /* @__PURE__ */ import_react.default.createElement(PowerIcon, null)),
    /* @__PURE__ */ import_react.default.createElement("h2", { id: "dpm-confirm-title" }, confirm === "setup" ? "\u542F\u7528\u7535\u6E90\u63A7\u5236\uFF1F" : "\u5173\u95ED DeepSeek Harness\uFF1F"),
    /* @__PURE__ */ import_react.default.createElement("p", { id: "dpm-confirm-body" }, confirm === "setup" ? "\u5C06\u81EA\u52A8\u5B89\u88C5\u5F53\u524D Windows \u7528\u6237\u7684\u540E\u53F0\u670D\u52A1\uFF0C\u5E76\u91CD\u65B0\u542F\u52A8 Harness\u3002\u4F1A\u8BDD\u4F1A\u4FDD\u7559\uFF0C\u6B63\u5728\u8FD0\u884C\u7684\u4EFB\u52A1\u4F1A\u4E2D\u65AD\u3002" : "\u4F1A\u8BDD\u4F1A\u4FDD\u5B58\uFF0C\u6B63\u5728\u8FD0\u884C\u7684\u4EFB\u52A1\u5C06\u4E2D\u65AD\u3002\u5173\u95ED\u540E\u7F51\u9875\u65E0\u6CD5\u8BBF\u95EE\uFF0C\u9700\u8981\u5728\u670D\u52A1\u5668\u4E0A\u91CD\u65B0\u542F\u52A8\u670D\u52A1\u3002"),
    /* @__PURE__ */ import_react.default.createElement("p", { className: "dpm-note" }, confirm === "setup" ? "\u767B\u5F55 Windows \u540E\u4F1A\u81EA\u52A8\u542F\u52A8 Harness\u3002\u4F7F\u7528\u5F53\u524D\u7528\u6237\u6743\u9650\uFF0C\u4E0D\u4F1A\u5173\u95ED\u670D\u52A1\u5668\u3002" : "\u53EA\u505C\u6B62 Harness\uFF0C\u4E0D\u5173\u95ED\u670D\u52A1\u5668\u3002"),
    /* @__PURE__ */ import_react.default.createElement("div", { className: "dpm-dialog-actions" }, /* @__PURE__ */ import_react.default.createElement("button", { ref: cancel, onClick: () => {
      setConfirm(false);
      trigger.current?.focus();
    } }, "\u53D6\u6D88"), /* @__PURE__ */ import_react.default.createElement("button", { className: "dpm-shutdown", onClick: () => {
      const action = confirm;
      setConfirm(false);
      void begin(action, void 0, action === "setup" ? "enable-and-restart" : "shutdown");
    } }, confirm === "setup" ? "\u542F\u7528\u5E76\u91CD\u542F" : "\u786E\u8BA4\u5173\u673A"))
  )), document.body));
}
function PowerOverlay() {
  const state2 = (0, import_react.useSyncExternalStore)((callback) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }, () => snapshot);
  const overlay = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    if (state2.action) overlay.current?.focus();
  }, [state2.action]);
  (0, import_react.useEffect)(() => {
    if (!state2.operationId || state2.error) return;
    let cancelled = false;
    let timer;
    let downSince;
    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(BASE + "/health", { cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(5e3) });
        if (cancelled) return;
        if ((res.status === 401 || res.status === 302 || res.type === "opaqueredirect") && state2.action !== "shutdown" && Date.now() - state2.startedAt > 3e3) {
          window.location.assign("/login");
          return;
        }
        if (!res.ok) throw new Error("Service unavailable");
        downSince = null;
        const info = await res.json();
        if (info.operation?.id === state2.operationId) {
          if (info.operation.phase === "failed") {
            publish({ error: info.operation.error });
            return;
          }
          publish({ phase: info.operation.phase });
        }
        if (state2.action !== "shutdown" && info.instanceId !== state2.original) {
          window.location.reload();
          return;
        }
      } catch {
        if (cancelled) return;
        downSince ??= Date.now();
        if (state2.action === "shutdown" && Date.now() - downSince > 4e3) {
          publish({ phase: "off" });
          return;
        }
      }
      if (Date.now() - state2.startedAt > 72e4) {
        publish({ error: "\u7B49\u5F85\u8D85\u65F6\uFF0C\u8BF7\u68C0\u67E5\u670D\u52A1\u5668\u670D\u52A1\u72B6\u6001\u3002" });
        return;
      }
      timer = setTimeout(tick, 1800);
    };
    timer = setTimeout(tick, 1600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state2.operationId, state2.error]);
  if (!state2.action) return null;
  return (0, import_react_dom.createPortal)(/* @__PURE__ */ import_react.default.createElement(
    "div",
    {
      ref: overlay,
      className: "dpm-overlay",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "dpm-transition-title",
      tabIndex: -1,
      onKeyDown: (e) => {
        if (e.key === "Tab") {
          e.preventDefault();
          (overlay.current?.querySelector("button") || overlay.current)?.focus();
        }
      }
    },
    /* @__PURE__ */ import_react.default.createElement("div", { className: "dpm-halo" }),
    /* @__PURE__ */ import_react.default.createElement("div", { className: "dpm-transition" }, state2.phase !== "off" && !state2.error && /* @__PURE__ */ import_react.default.createElement("div", { className: "dpm-spinner", "aria-hidden": "true" }, [0, 1, 2, 3, 4].map((i) => /* @__PURE__ */ import_react.default.createElement("span", { key: i, style: { "--i": i } }))), state2.phase === "off" && /* @__PURE__ */ import_react.default.createElement("div", { className: "dpm-off-icon" }, /* @__PURE__ */ import_react.default.createElement(PowerIcon, null)), /* @__PURE__ */ import_react.default.createElement("h1", { id: "dpm-transition-title" }, state2.error ? "\u64CD\u4F5C\u672A\u5B8C\u6210" : state2.phase === "off" ? "Harness \u670D\u52A1\u5DF2\u505C\u6B62\u54CD\u5E94" : titles[state2.action]), /* @__PURE__ */ import_react.default.createElement("p", { role: "status", "aria-live": "polite" }, state2.error || (state2.phase === "off" ? "\u8BF7\u5728\u670D\u52A1\u5668\u4E0A\u542F\u52A8\u670D\u52A1\u540E\uFF0C\u91CD\u65B0\u8BBF\u95EE\u6B64\u9875\u9762\u3002" : phases[state2.phase] || "\u8BF7\u7A0D\u5019\uFF0C\u6B63\u5728\u8FDE\u63A5\u670D\u52A1")), !state2.error && state2.phase !== "off" && /* @__PURE__ */ import_react.default.createElement("small", null, state2.action === "shutdown" ? "\u4F1A\u8BDD\u6B63\u5728\u5B89\u5168\u4FDD\u5B58" : "\u5B8C\u6210\u540E\u5C06\u81EA\u52A8\u6062\u590D\u8BBF\u95EE\uFF1B\u82E5\u767B\u5F55\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55"), state2.error && /* @__PURE__ */ import_react.default.createElement("button", { className: "dpm-back", onClick: () => publish({ action: null, operationId: null }) }, "\u8FD4\u56DE\u9875\u9762")),
    /* @__PURE__ */ import_react.default.createElement("div", { className: "dpm-overlay-brand" }, /* @__PURE__ */ import_react.default.createElement(PowerIcon, null), " DEEPSEEK HARNESS")
  ), document.body);
}
function apply(ctx) {
  ctx.effect(() => {
    const style = document.createElement("style");
    style.textContent = style_default + style_default2;
    document.head.appendChild(style);
    return () => {
      style.remove();
      publish({ action: null, operationId: null });
    };
  });
  ctx.effect(() => mountReloadNotice());
  const openSecurity = () => ctx.layout.selectPanel("dsh-lifecycle-security");
  const PowerEntry = (props) => /* @__PURE__ */ import_react.default.createElement(PowerMenu, { ...props, openSecurity });
  function SecurityPanel() {
    const root = (0, import_react.useRef)(null);
    (0, import_react.useEffect)(() => {
      let cancelled = false, dispose;
      mountSecurity(root.current, { onBack: () => ctx.layout.selectPanel(null) }).then((cleanup) => {
        if (cancelled) cleanup();
        else dispose = cleanup;
      }).catch((error) => {
        if (!cancelled) root.current.textContent = "\u65E0\u6CD5\u6253\u5F00\u767B\u5F55\u4E0E\u5B89\u5168\uFF1A" + error.message;
      });
      return () => {
        cancelled = true;
        dispose?.();
      };
    }, []);
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "dl-native-panel", ref: root });
  }
  ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: "dsh-lifecycle-security" }, SecurityPanel));
  ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({ name: "sidebar.panellist", id: "dsh-lifecycle-security", label: () => "\u767B\u5F55\u4E0E\u5B89\u5168", order: 60 }, ({ size = 18 }) => /* @__PURE__ */ import_react.default.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5" }, /* @__PURE__ */ import_react.default.createElement("path", { d: "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z" }), /* @__PURE__ */ import_react.default.createElement("path", { d: "m8 12 3 3 5-6" }))));
  ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({ name: "sidebar.footer.action", id: "dsh-lifecycle-power", label: "\u7535\u6E90", order: 50 }, PowerEntry));
  ctx.slots.inject("shell.overlay", () => ctx.slots.register({ name: "shell.overlay", id: "dsh-lifecycle-overlay" }, PowerOverlay));
}
return module.exports;}});
