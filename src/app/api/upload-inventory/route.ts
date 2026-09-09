import { NextRequest, NextResponse } from "next/server";
import { readSheet } from "read-excel-file/node";
import {
  ASSET_CATEGORIES,
  REVIEW_STATUSES,
  type Asset,
  type AssetCategory,
  type ReviewStatus,
} from "@/types/asset";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB，需與前端提示文字保持一致

// 每個欄位可能出現的標題名稱（不分大小寫），用來把 Excel 的欄位標題對應到資料欄位
const REQUIRED_HEADER_ALIASES: Record<string, string[]> = {
  erpCode: ["資產代碼(ERP)", "資產代碼(erp)", "ERP代碼", "ERP", "erpCode"],
  sapCode: ["資產代碼(SAP)", "資產代碼(sap)", "SAP代碼", "SAP", "sapCode"],
  name: ["資產名稱", "名稱", "name"],
};

const OPTIONAL_HEADER_ALIASES: Record<string, string[]> = {
  aiCategory: ["AI分類結果", "分類", "aiCategory", "category"],
  confidence: ["信心分數", "信心", "confidence"],
  status: ["盤點狀態", "狀態", "status"],
};

function normalizeHeader(header: unknown): string {
  return String(header ?? "").trim();
}

function findHeaderIndex(headers: string[], aliases: string[]): number {
  return headers.findIndex((header) =>
    aliases.some((alias) => alias.toLowerCase() === header.toLowerCase())
  );
}

function toCellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "請求格式錯誤，請重新選擇檔案上傳。" },
      { status: 400 }
    );
  }

  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "找不到上傳的檔案，請重新選擇檔案。" },
      { status: 400 }
    );
  }

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return NextResponse.json(
      { error: "檔案格式錯誤，請上傳 .xlsx 格式的 Excel 檔案。" },
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: "檔案是空的，請確認檔案內容後再上傳。" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "檔案超過大小限制（10MB），請重新選擇檔案。" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let rows: unknown[][];
  try {
    rows = await readSheet(buffer);
  } catch {
    return NextResponse.json(
      { error: "無法讀取檔案內容，請確認檔案未毀損且為 Excel 格式。" },
      { status: 400 }
    );
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json(
      { error: "檔案是空的，請確認檔案至少包含標題列與一筆資料。" },
      { status: 400 }
    );
  }

  const headers = rows[0].map(normalizeHeader);
  const dataRows = rows.slice(1);

  if (dataRows.length === 0) {
    return NextResponse.json(
      { error: "檔案是空的，請確認除了標題列外還有資料。" },
      { status: 400 }
    );
  }

  const missingFieldLabels: string[] = [];
  const fieldColumnIndex: Record<string, number> = {};

  for (const [field, aliases] of Object.entries(REQUIRED_HEADER_ALIASES)) {
    const index = findHeaderIndex(headers, aliases);
    if (index === -1) {
      missingFieldLabels.push(aliases[0]);
    } else {
      fieldColumnIndex[field] = index;
    }
  }

  if (missingFieldLabels.length > 0) {
    return NextResponse.json(
      {
        error: `檔案缺少必要欄位：${missingFieldLabels.join("、")}，請確認欄位標題後再上傳。`,
      },
      { status: 400 }
    );
  }

  for (const [field, aliases] of Object.entries(OPTIONAL_HEADER_ALIASES)) {
    const index = findHeaderIndex(headers, aliases);
    if (index !== -1) fieldColumnIndex[field] = index;
  }

  const getCell = (row: unknown[], field: string): unknown => {
    const index = fieldColumnIndex[field];
    return index === undefined ? undefined : row[index];
  };

  const assets: Asset[] = dataRows
    .map((row) => {
      const erpCode = toCellText(getCell(row, "erpCode"));
      const sapCode = toCellText(getCell(row, "sapCode"));
      const name = toCellText(getCell(row, "name"));

      const rawCategory = toCellText(getCell(row, "aiCategory")) as AssetCategory;
      const aiCategory = ASSET_CATEGORIES.includes(rawCategory) ? rawCategory : "皆非";

      const rawStatus = toCellText(getCell(row, "status")) as ReviewStatus;
      const status = REVIEW_STATUSES.includes(rawStatus) ? rawStatus : "待人工確認";

      const rawConfidence = getCell(row, "confidence");
      const parsedConfidence =
        typeof rawConfidence === "number"
          ? rawConfidence
          : Number.parseFloat(toCellText(rawConfidence));
      const confidence = Number.isFinite(parsedConfidence)
        ? Math.min(100, Math.max(0, Math.round(parsedConfidence)))
        : 0;

      return { erpCode, sapCode, name, aiCategory, confidence, status };
    })
    // 過濾掉完全空白的列（常見於 Excel 尾端的空白列）
    .filter((asset) => asset.erpCode || asset.sapCode || asset.name);

  if (assets.length === 0) {
    return NextResponse.json(
      { error: "檔案是空的，請確認至少包含一筆有效資料。" },
      { status: 400 }
    );
  }

  return NextResponse.json({ data: assets, total: assets.length });
}
