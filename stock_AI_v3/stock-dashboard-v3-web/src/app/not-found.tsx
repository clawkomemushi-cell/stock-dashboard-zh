import Link from "next/link";
import { EmptyState } from "@/components/shared/EmptyState";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg w-full flex flex-col gap-3">
        <EmptyState
          title="找不到頁面"
          description="這個路徑不存在,或已被移除。"
        />
        <Link href="/dashboard" className={buttonVariants({ className: "self-start" })}>
          返回 Dashboard
        </Link>
      </div>
    </div>
  );
}
