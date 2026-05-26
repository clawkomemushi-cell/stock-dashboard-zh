#!/usr/bin/env node
/**
 * hash-password.mjs
 *
 * 互動式輸入密碼，輸出 bcrypt hash，供設定 AUTH_PASSWORD_HASH 使用。
 *
 * 使用方式：
 *   node scripts/hash-password.mjs
 */

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const bcrypt = require("bcryptjs");

const rl = createInterface({ input, output });

let password;
try {
  password = await rl.question("請輸入密碼（輸入不會顯示，但 readline 環境下可見）：");
} finally {
  rl.close();
}

if (!password || password.trim() === "") {
  console.error("[hash-password] 密碼不可為空");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);

console.log("\n✅ Bcrypt hash 產生完成，請複製以下字串到 .env.local 的 AUTH_PASSWORD_HASH：");
console.log(hash);
