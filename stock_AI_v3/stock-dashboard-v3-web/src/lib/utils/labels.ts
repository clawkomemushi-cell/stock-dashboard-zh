export function kindLabel(kind?: string | null): string {
  switch (kind) {
    case "stock": return "個股";
    case "etf": return "ETF";
    case "index": return "指數";
    case "future": return "期貨";
    default: return kind ?? "—";
  }
}

export function roleLabel(role?: string | null): string {
  switch (role) {
    case "starter": return "入場";
    case "watch": return "關注";
    case "observe": return "觀察";
    case "avoid": return "迴避";
    default: return role ?? "—";
  }
}

export function confLabel(conf?: string | null): string {
  switch (conf) {
    case "high": return "高";
    case "medium": return "中";
    case "low": return "低";
    default: return conf ?? "—";
  }
}

export function checkpointKindLabel(kind?: string | null): string {
  switch (kind) {
    case "pre": return "盤前";
    case "open": return "開盤";
    case "open-track": return "開盤後追蹤";
    case "mid": return "午間";
    case "noon": return "午間";
    case "close": return "收盤";
    case "evening": return "晚間";
    default: return kind ?? "—";
  }
}

export function continuationVerdictLabel(verdict?: string | null): string {
  switch (verdict) {
    case "hold": return "續抱";
    case "reduce": return "減碼";
    case "sell": return "賣出";
    case "watch": return "持續觀察";
    default: return verdict ?? "—";
  }
}

export function shortStrengthLabel(strength?: string | null): string {
  switch (strength) {
    case "strong": return "強勢";
    case "neutral": return "中性";
    case "weak": return "弱勢";
    default: return strength ?? "—";
  }
}
