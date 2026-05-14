# CAPTCHA Hardening - MOB Research Track

Moved from queue 2026-05-14. CAPTCHA capability is a MOB concern - automated browser
sessions need to handle or route around vendor CAPTCHAs.

Related: `Holly : Console/captcha-playbook.md`, `Ventures/Captcha-Gym/`

---

## Vendor Demo Runs (~10m each)

1. **reCAPTCHA v2** - Navigate to https://www.google.com/recaptcha/api2/demo. Holly attempts
   the checkbox + image grid within 60s budget. Log result. Screenshot at decision point.

2. **reCAPTCHA v3** - Find a public v3 demo (or build a 1-page form pinned to Google's test
   sitekey 6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe). Submit the form, capture the score
   returned by the backend echo, log.

3. **hCaptcha** - https://accounts.hcaptcha.com/demo. Same logging schema. Note: hCaptcha
   aggressively challenges headless - record whether Holly is auto-failed before attempting.

4. **Cloudflare Turnstile** - https://developers.cloudflare.com/turnstile/demo/. Turnstile is
   mostly invisible / behavioural - record whether the iframe resolves to a token without
   challenge, and how long it takes.

5. **GeeTest** - https://www.geetest.com/en/demo. Try slider variant + rotate variant.
   Screenshots of each.

6. **Arkose / FunCaptcha** - Use the public sandbox sitekey from arkoselabs.com/developer-hub
   or their docs. Record challenge type served (3D rotate / image select / audio).

## Batch Testing (~50m total)

7. **Holly batch-fire harness** (~30m) - Playwright MCP loop: for each of 4 DIY types, fire
   100 attempts. Log per attempt: pass/fail, ms, fail reason. Append to
   `Captcha-Gym/results/<YYYY-MM-DD>.jsonl`.

8. **Pass-rate report** (~20m) - Aggregate the JSONL into
   `Captcha-Gym/results/<YYYY-MM-DD>.md`: per-vendor + per-DIY-type pass rate, median time,
   dominant fail mode, blocked-pre-attempt count.

---

## Logging Schema

Per attempt: `{ vendor, type, pass, ms, failReason, blockedPreAttempt, timestamp }`

## DIY Types (Captcha-Gym)

text / math / slider / node - served by `Ventures/Captcha-Gym/server.py` on port 5055.
