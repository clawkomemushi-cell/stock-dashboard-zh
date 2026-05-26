import {
  LayoutDashboard,
  Star,
  Lightbulb,
  Newspaper,
  Clock,
  FileText,
  BookOpen,
  Layers,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  children?: NavItem[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "總覽", href: "/dashboard", icon: LayoutDashboard },
  { label: "自選股", href: "/watchlist", icon: Star },
  { label: "分池監控", href: "/pools", icon: Layers },
  { label: "候選池", href: "/ideas", icon: Lightbulb },
  { label: "消息面", href: "/news", icon: Newspaper },
  { label: "今日時間軸", href: "/today", icon: Clock },
  { label: "術語字典", href: "/glossary", icon: BookOpen },
  {
    label: "回顧報告",
    href: "/reports/close",
    icon: FileText,
    children: [
      { label: "收盤回顧", href: "/reports/close", icon: FileText },
      { label: "週回顧", href: "/reports/weekly", icon: FileText },
    ],
  },
];
