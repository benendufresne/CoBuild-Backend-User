import Joi = require("joi");

export const getDashboardDetails = Joi.object({
    duration: Joi.string().optional().description("Yesterday, Last Week, ..."),
    fromDate: Joi.number().required().description("in timestamp"),
    toDate: Joi.number().required().description("in timestamp"),
});
