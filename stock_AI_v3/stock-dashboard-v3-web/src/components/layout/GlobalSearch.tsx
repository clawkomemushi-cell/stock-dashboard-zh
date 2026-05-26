"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        inputRef.current?.blur();
        const query = q.trim();
        if (query) {
          router.push(`/symbols?q=${encodeURIComponent(query)}`);
        }
      }}
      className="relative flex items-center w-full max-w-md"
    >
      <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜尋代號或名稱，列出候選"
        className="pl-8 h-9 text-sm"
        aria-label="搜尋股票代號或名稱"
      />
    </form>
  );
}
