declare namespace ReqRequest {
    export interface CreateReq {
        name: string;
        reqId?: string;
        requestIdString?: string;
        userName?: string;
        userId: string;

        serviceType?: string;

        categoryName?: string;
        categoryId?: string;
        categoryIdString?: string;

        issueTypeName?: string;
        subIssueName?: string;

        location: {
            coordinates: number[];
            address: string;
        };
        description?: string;
        media?: string;
        mediaType?: string;

    }

    export interface GetReqDetails {
        reqId: string;
    }

    export interface UpdateReqDetails {
        reqId: string;
        name?: string;
        chatId?: string;

        serviceType?: string;

        categoryName?: string;
        categoryId?: string;
        categoryIdString?: string;

        issueTypeName?: string;
        subIssueName?: string;
        issue?: string;

        location?: {
            coordinates?: number[];
            address?: string;
        };
        description?: string;
        media?: string;
        mediaType?: string;
        estimatedDays?: string;
        amount?: number;
        notes?: string;
        status?: string;
        rejectReason?: string;

    }
    export interface ReqList extends ListingRequest {
        userId?: string
        coordinates?: number[];
        isCompleted?: boolean;
        isActive?: boolean;
    }

    export interface ReqListByCategory {
        categoryId?: string;
    }

}
