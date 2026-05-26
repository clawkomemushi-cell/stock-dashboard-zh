import { GlossaryExplorer } from "./GlossaryExplorer";

export const metadata = {
  title: "術語字典",
  description: "台股投資常用術語解釋，新手友善的中文詞彙庫",
};

export default function GlossaryPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">術語字典</h1>
        <p className="text-sm text-muted-foreground mt-1">
          台股投資常見詞彙解說，含技術分析、籌碼法人、ETF 配息、風險控管與 AI Cockpit 專屬術語。
        </p>
      </div>
      <GlossaryExplorer />
    </div>
  );
}
