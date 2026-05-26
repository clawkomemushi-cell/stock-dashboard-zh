import { Badge } from "@/components/ui/badge";

/**
 * StatusBadge — visualises a soft enum status. Unknown values render as muted.
 */
export function StatusBadge({
  level,
  label,
  className,
}: {
  level?: string | null;
  label?: string;
  className?: string;
}) {
  const variant = mapVariant(level);
  const text = label ?? mapLabel(level);
  return (
    <Badge variant={variant} className={className}>
      {text}
    </Badge>
  );
}

function mapLabel(level?: string | null) {
  switch (level) {
    case "ok":
      return "正常";
    case "fresh":
      return "最新";
    case "running":
      return "執行中";
    case "worked":
      return "有效";
    case "bull":
      return "偏多";
    case "warn":
    case "warning":
      return "提醒";
    case "stale":
      return "過期";
    case "mixed":
      return "混合";
    case "critical":
      return "嚴重";
    case "failed":
      return "失敗";
    case "missing":
      return "缺失";
    case "error":
      return "錯誤";
    case "bear":
      return "偏空";
    case "info":
      return "資訊";
    case "neutral":
      return "中性";
    default:
      return level ?? "未知";
  }
}

function mapVariant(level?: string | null) {
  switch (level) {
    case "ok":
    case "fresh":
    case "running":
    case "worked":
    case "bull":
      return "success" as const;
    case "warn":
    case "warning":
    case "stale":
    case "mixed":
      return "warn" as const;
    case "critical":
    case "failed":
    case "missing":
    case "error":
    case "bear":
      return "danger" as const;
    case "info":
    case "neutral":
      return "info" as const;
    default:
      return "muted" as const;
  }
}
