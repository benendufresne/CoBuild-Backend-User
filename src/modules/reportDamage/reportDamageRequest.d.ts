declare namespace ReportDamageRequest {
    export interface CreateReport {
        userId?: string;
        userName?: string;
        userEmail?: string;
        userMobile?: string;
        userLocation?: {
            coordinates: number[];
            address: string;
        }
        type: string;
        description: string;
        location?: {
            coordinates: number[];
            address: string;
        };
        media?: Array<{
            media: string;
            mediaType: string;
        }>;
    }

    export interface UpdateReport {
        reportId: string;
        chatId?: string;
        type?: string;
        description?: string;
        location?: {
            coordinates: number[];
            address: string;
        };
        media?: Array<{
            media: string;
            mediaType: string;
        }>;
        status?: string;
    }

    export interface GetReportDetails {
        reportId: string;
    }

    export interface ReportListing extends ListingRequest {
    }
}
