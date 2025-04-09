"use strict";

import { BaseDao } from "@modules/baseDao/BaseDao";
import { STATUS, DB_MODEL_REF, USER_TYPE } from "@config/constant";
import { escapeRegex, toObjectId } from "@utils/appUtils";

export class ReportDamageDao extends BaseDao {
    private reportDamageModel: any;
    constructor() {
        super();
        this.reportDamageModel = DB_MODEL_REF.REPORT_DAMAGE;
    }

    /**
     * This function is used to create a report damage by user.
     * @param {ReportDamageRequest.CreateReport} params - Report damage request body.
     * @returns {Promise<IReportDamage>} - Returns newly created report damage data.
     */
    async createReport(params: ReportDamageRequest.CreateReport) {
        try {
            return await this.save(this.reportDamageModel, params);
        } catch (error) {
            console.log("Error", error);
            throw error;
        }
    }


    /**
     * Retrieves report damage details by report ID.
     * @param {ReportDamageRequest.GetReportDetails} params - Contains the report ID.
     * @returns {Promise<IReportDamage>} - Returns the details of the report damage.
     * @throws Will log and throw an error if the retrieval operation fails.
     */
    getReportDetails(params: ReportDamageRequest.GetReportDetails) {
        try {
            return this.findOne(this.reportDamageModel, { _id: params.reportId });
        } catch (error) {
            console.log("Error", error);
            throw error;
        }
    }

    /**
     * Updates an existing report damage with new details.
     * @param {ReportDamageRequest.UpdateReport} params - The details to update the report damage with.
     * @returns {Promise<IReportDamage>} - Returns the updated report damage data.
     * @throws Will log and throw an error if the update operation fails.
     */
    updateReportDetails(params: ReportDamageRequest.UpdateReport) {
        try {
            return this.findOneAndUpdate(this.reportDamageModel, { _id: params.reportId }, params, { new: true });
        } catch (error) {
            console.log("Error", error);
            throw error;
        }
    }



    /**
     * Retrieves a paginated list of report damages based on various filter criteria.
     * @param {ReportDamageRequest.ReportListing} params - The report damage listing filters, including:
     *   - pageNo: The page number for pagination.
     *   - limit: The number of items per page.
     *   - searchKey: Optional search string to filter report damages by name or description.
     *   - sortBy: Optional field name to sort the results by.
     *   - sortOrder: Optional sort order (1 for ascending, -1 for descending).
     *   - fromDate: Optional start date for filtering report damages by creation date.
     *   - toDate: Optional end date for filtering report damages by creation date.
     *   - status: Optional status to filter report damages by.
     * @param {TokenData} tokenData - The user's token data.
     * @returns {Promise<PaginationResult<IReportDamage>>} - Returns a paginated list of report damages, including report details and geolocation distance if applicable.
     * @throws Will throw an error if there is an issue with the database query.
     */
    async reportListing(params: ReportDamageRequest.ReportListing, tokenData: TokenData) {
        try {
            let { pageNo, limit, searchKey, sortBy, sortOrder } = params;
            const aggPipe = [];
            const match: any = {};

            if (params.status)
                match.status = { $in: params.status };
            else
                match.status = { $ne: STATUS.DELETED };

            if (tokenData.userType == USER_TYPE.USER)
                match.userId = toObjectId(tokenData.userId)

            if (searchKey) {
                const safeSearchKey = escapeRegex(searchKey); // Escape special characters
                match["$or"] = [
                    { userName: { $regex: new RegExp(safeSearchKey, "i") } },
                    { description: { $regex: new RegExp(safeSearchKey, "i") } },
                ];
            }

            if (params.fromDate && !params.toDate) match.created = { "$gte": params.fromDate };
            if (params.toDate && !params.fromDate) match.created = { "$lte": params.toDate };
            if (params.fromDate && params.toDate) match.created = { "$gte": params.fromDate, "$lte": params.toDate };

            aggPipe.push({ $match: match });

            let sort: any = {};
            sortBy && sortOrder
                ? (sort = { [sortBy]: sortOrder })
                : (sort = { created: -1 });
            aggPipe.push({ $sort: sort });

            if (params.limit && params.pageNo) {
                const [skipStage, limitStage] = this.addSkipLimit(
                    params.limit,
                    params.pageNo
                );
                aggPipe.push(skipStage, limitStage);
            }

            let project: any = {
                type: 1,
                userId: 1,
                userName: 1,
                userEmail: 1,
                userMobile: 1,
                userLocation: 1,
                location: 1,
                description: 1,
                created: 1,
                chatId: 1,
                status: 1,
                media: 1,
            };

            aggPipe.push({ $project: project });

            return await this.dataPaginate(
                this.reportDamageModel,
                aggPipe,
                limit,
                pageNo,
                {},
                true
            );
        } catch (error) {
            console.log("Error", error);
            throw error;
        }
    }



}

export const reportDamageDao = new ReportDamageDao();
