declare const ASSET_TYPES: readonly ["image", "video", "document", "audio", "other"];
declare const DRIVERS: readonly ["local", "s3", "gcs"];
export declare class CreateMediaAssetDto {
    originalName: string;
    storedName: string;
    mimeType: string;
    assetType?: (typeof ASSET_TYPES)[number];
    sizeBytes: number;
    url: string;
    storagePath: string;
    driver?: (typeof DRIVERS)[number];
    altText?: string;
    caption?: string;
    widthPx?: number;
    heightPx?: number;
    blurHash?: string;
}
export declare class UpdateMediaAssetDto {
    altText?: string;
    caption?: string;
}
export {};
//# sourceMappingURL=create-media-asset.dto.d.ts.map