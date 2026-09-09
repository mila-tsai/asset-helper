export type AssetCategory = "軟體" | "第三方資訊服務" | "皆非";
export type ReviewStatus = "已確認" | "待人工確認" | "已駁回";

export type Asset = {
  erpCode: string;
  sapCode: string;
  name: string;
  aiCategory: AssetCategory;
  confidence: number;
  status: ReviewStatus;
};

export const ASSET_CATEGORIES: AssetCategory[] = ["軟體", "第三方資訊服務", "皆非"];
export const REVIEW_STATUSES: ReviewStatus[] = ["已確認", "待人工確認", "已駁回"];
