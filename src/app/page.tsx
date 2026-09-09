"use client";

import { useRef, useState } from "react";
import type { Asset, AssetCategory, ReviewStatus } from "@/types/asset";

const mockAssets: Asset[] = [
  {
    erpCode: "ERP-00123",
    sapCode: "SAP-A1023",
    name: "Microsoft Office 365 企業版授權",
    aiCategory: "軟體",
    confidence: 96,
    status: "已確認",
  },
  {
    erpCode: "ERP-00124",
    sapCode: "SAP-A1024",
    name: "AWS 雲端運算服務",
    aiCategory: "第三方資訊服務",
    confidence: 91,
    status: "已確認",
  },
  {
    erpCode: "ERP-00125",
    sapCode: "SAP-A1025",
    name: "辦公室多功能事務機",
    aiCategory: "皆非",
    confidence: 88,
    status: "已確認",
  },
  {
    erpCode: "ERP-00126",
    sapCode: "SAP-A1026",
    name: "Adobe Creative Cloud 授權",
    aiCategory: "軟體",
    confidence: 73,
    status: "待人工確認",
  },
  {
    erpCode: "ERP-00127",
    sapCode: "SAP-A1027",
    name: "資安顧問服務合約",
    aiCategory: "第三方資訊服務",
    confidence: 65,
    status: "待人工確認",
  },
];

const categoryStyles: Record<AssetCategory, string> = {
  軟體: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  第三方資訊服務: "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-200",
  皆非: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
};

const statusStyles: Record<ReviewStatus, string> = {
  已確認: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  待人工確認: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  已駁回: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
};

function confidenceColor(score: number) {
  if (score >= 90) return "bg-emerald-500";
  if (score >= 70) return "bg-amber-500";
  return "bg-red-500";
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [assets, setAssets] = useState<Asset[]>(mockAssets);
  const [isSampleData, setIsSampleData] = useState(true);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const stats = [
    {
      label: "軟體",
      value: assets.filter((a) => a.aiCategory === "軟體").length,
    },
    {
      label: "第三方資訊服務",
      value: assets.filter((a) => a.aiCategory === "第三方資訊服務").length,
    },
    {
      label: "皆非",
      value: assets.filter((a) => a.aiCategory === "皆非").length,
    },
    {
      label: "待人工確認",
      value: assets.filter((a) => a.status === "待人工確認").length,
    },
  ];

  function stageFile(file: File | null | undefined) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setUploadStatus("error");
      setMessage("檔案格式錯誤，請上傳 .xlsx 格式的 Excel 檔案。");
      setPendingFile(null);
      return;
    }

    setPendingFile(file);
    setUploadStatus("idle");
    setMessage(null);
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    stageFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(false);
    stageFile(event.dataTransfer.files?.[0]);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(false);
  }

  async function handleUpload() {
    if (!pendingFile) return;

    setUploadStatus("uploading");
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", pendingFile);

      const response = await fetch("/api/upload-inventory", {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result) {
        setUploadStatus("error");
        setMessage(result?.error ?? "上傳失敗，請稍後再試。");
        return;
      }

      setAssets(result.data as Asset[]);
      setIsSampleData(false);
      setUploadStatus("success");
      setMessage(`已成功上傳，共 ${result.total} 筆資料。`);
      setPendingFile(null);
    } catch {
      setUploadStatus("error");
      setMessage("網路連線發生問題，請稍後再試。");
    }
  }

  const isUploading = uploadStatus === "uploading";

  return (
    <div className="min-h-screen flex-1 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        {/* 1. 標題與說明 */}
        <header className="mb-6 sm:mb-8">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            資產盤點小幫手
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            上傳資產清單後，系統將自動比對 ERP 與 SAP
            資產代碼，並透過 AI 判斷資產類型（軟體／第三方資訊服務／皆非），協助加速盤點作業。
          </p>
        </header>

        {/* 2. 上傳檔案區塊 */}
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:mb-8 sm:p-6">
          <h2 className="text-sm font-semibold text-slate-900">上傳資產清單</h2>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`mt-4 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-8 text-center sm:px-6 sm:py-10 ${
              isDraggingOver
                ? "border-blue-400 bg-blue-50"
                : "border-slate-300 bg-slate-50"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-9 w-9 text-slate-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 8.25 12 3.75m0 0L7.5 8.25M12 3.75v12"
              />
            </svg>
            <div>
              <p className="text-sm text-slate-600">
                將檔案拖曳至此，或
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="mx-1 font-medium text-blue-600 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-blue-400"
                >
                  點擊選擇檔案
                </button>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                支援 .xlsx 格式，單檔最大 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!pendingFile || isUploading}
              className="mt-2 inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isUploading && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {isUploading ? "上傳中…" : "上傳並開始比對"}
            </button>

            {uploadStatus === "error" && message && (
              <p className="text-xs text-red-600">{message}</p>
            )}
            {uploadStatus === "success" && message && (
              <p className="text-xs text-emerald-600">{message}</p>
            )}
            {uploadStatus === "idle" && pendingFile && (
              <p className="text-xs text-slate-400">
                已選擇檔案：{pendingFile.name}，請點擊「上傳並開始比對」
              </p>
            )}
            {uploadStatus === "idle" && !pendingFile && (
              <p className="text-xs text-slate-400">尚未選擇檔案</p>
            )}
          </div>
        </section>

        {/* 3. 資產清單表格 */}
        <section className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm sm:mb-8">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-slate-900">資產清單</h2>
            <span className="text-xs text-slate-400">
              共 {assets.length} 筆{isSampleData ? "（範例資料）" : ""}
            </span>
          </div>

          {/* 手機版：卡片式清單 */}
          <ul className="divide-y divide-slate-100 sm:hidden">
            {assets.map((asset, index) => (
              <li key={`${asset.erpCode}-${index}`} className="space-y-2.5 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-slate-800">{asset.name}</p>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[asset.status]}`}
                  >
                    {asset.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-slate-500">
                  <span>ERP：{asset.erpCode}</span>
                  <span>SAP：{asset.sapCode}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${categoryStyles[asset.aiCategory]}`}
                  >
                    {asset.aiCategory}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${confidenceColor(asset.confidence)}`}
                        style={{ width: `${asset.confidence}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{asset.confidence}%</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* 平板／桌機版：完整表格 */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium lg:px-6">資產代碼(ERP)</th>
                  <th className="px-4 py-3 font-medium lg:px-6">資產代碼(SAP)</th>
                  <th className="px-4 py-3 font-medium lg:px-6">資產名稱</th>
                  <th className="px-4 py-3 font-medium lg:px-6">AI 分類結果</th>
                  <th className="px-4 py-3 font-medium lg:px-6">信心分數</th>
                  <th className="px-4 py-3 font-medium lg:px-6">盤點狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assets.map((asset, index) => (
                  <tr key={`${asset.erpCode}-${index}`} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-slate-600 lg:px-6">
                      {asset.erpCode}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-slate-600 lg:px-6">
                      {asset.sapCode}
                    </td>
                    <td className="px-4 py-3.5 text-slate-800 lg:px-6">{asset.name}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 lg:px-6">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${categoryStyles[asset.aiCategory]}`}
                      >
                        {asset.aiCategory}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 lg:px-6">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${confidenceColor(asset.confidence)}`}
                            style={{ width: `${asset.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{asset.confidence}%</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 lg:px-6">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[asset.status]}`}
                      >
                        {asset.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. 統計卡片區 */}
        <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <p className="text-xs text-slate-400">{stat.label}</p>
              <p className="mt-1.5 text-xl font-semibold text-slate-900 sm:text-2xl">
                {stat.value}
                <span className="ml-1 text-sm font-normal text-slate-400">筆</span>
              </p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
