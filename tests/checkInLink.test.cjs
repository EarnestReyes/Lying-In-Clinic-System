const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/checkInLink.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {}, URL, require: () => ({ CHECK_IN_URL: 'lyinginsystem://check-in' }) };
vm.runInNewContext(code, context);
const { expoGoCheckInLink, clinicCheckInLink } = context.exports;
test('Expo Go LAN and tunnel links navigate to check-in', () => {
  assert.equal(expoGoCheckInLink(' exp://192.168.1.10:8081/ '), 'exp://192.168.1.10:8081/--/check-in');
  assert.equal(expoGoCheckInLink('exps://example.exp.direct'), 'exps://example.exp.direct/--/check-in');
});
test('replaces existing route and preserves project parameters', () => {
  assert.equal(expoGoCheckInLink('exp://192.168.1.10:8081/--/home?x=1#old'), 'exp://192.168.1.10:8081/--/check-in?x=1');
  assert.equal(expoGoCheckInLink('exp://192.168.1.10:8081/--/check-in'), 'exp://192.168.1.10:8081/--/check-in');
});
test('rejects phone-local addresses and non-Expo links', () => {
  for (const input of ['', 'invalid', 'http://192.168.1.10:8081', 'lyinginsystem://check-in', 'exp://localhost:8081', 'exp://127.0.0.1:8081', 'exp://0.0.0.0:8081', 'exp://[::1]:8081']) {
    assert.throws(() => expoGoCheckInLink(input));
  }
});
test('installed app retains its own scheme regardless of Expo settings', () => {
  assert.equal(clinicCheckInLink('installed', ''), 'lyinginsystem://check-in');
});
