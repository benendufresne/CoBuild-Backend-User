import Joi = require("joi");

export const createReport = Joi.object({
    type: Joi.string().trim().required(),
    description: Joi.string().optional(),
    media: Joi.array().items(
        Joi.object({
            media: Joi.string().required(),
            mediaType: Joi.string().required()
        })
    ).optional(),
    location: Joi.object({
        coordinates: Joi.array().items(Joi.number()).optional(),
        address: Joi.string().optional(),
    }).optional().description("location: {coordinates: [26.5,25.4], address: 'house 1 inner road'}"),
});

export const getReportDetails = Joi.object({
    reportId: Joi.string().trim().required()
});

export const updateReport = Joi.object({
    reportId: Joi.string().trim().required(),
    type: Joi.string().trim().optional(),
    description: Joi.string().optional(),
    media: Joi.array().items(
        Joi.object({
            media: Joi.string().required(),
            mediaType: Joi.string().required()
        })
    ).optional(),
    location: Joi.object({
        coordinates: Joi.array().items(Joi.number()).optional(),
        address: Joi.string().optional(),
    }).optional().description("location: {coordinates: [26.5,25.4], address: 'house 1 inner road'}"),
    status: Joi.string().optional()
});


export const reportListing = Joi.object({
    pageNo: Joi.number().min(1).required(),
    limit: Joi.number().min(1).required(),
    status: Joi.array()
        .items(Joi.string().trim().min(1)).single().optional().description('filter by status'),
    searchKey: Joi.string()
        .allow("")
        .optional()
        .description("Search by name, address"),
    coordinates: Joi.array().items(Joi.number()).optional(),
    sortBy: Joi.string()
        .trim()
        .valid("created", "name")
        .optional()
        .description("Sort by created"),
    sortOrder: Joi.number()
        .valid(1, -1)
        .optional()
        .description("1 for asc, -1 for desc"),
    fromDate: Joi.number().optional().description("in timestamp"),
    toDate: Joi.number().optional().description("in timestamp"),
});

