import Joi = require("joi");

export interface CreateReq {
  name: string;
  categoryName: string;
  categoryId: string;
  categoryIdString: string;
  serviceName: string;
  serviceId: string;
  serviceIdString: string;
  location: {
    coordinates: number[];
    address: string;
  };
  description: string;
  media: string;
}

export const createRequest = Joi.object({
  name: Joi.string().trim().required(),
  serviceType: Joi.string().optional(),
  categoryName: Joi.string().optional(),
  categoryId: Joi.string().optional(),
  categoryIdString: Joi.string().optional(),

  issueTypeName: Joi.string().optional(),
  subIssueName: Joi.string().optional(),

  location: Joi.object({
    coordinates: Joi.array().items(Joi.number()).optional(),
    address: Joi.string().optional(),
  }).optional().description("location: {coordinates: [26.5,25.4], address: 'house 1 inner road'}"),
  description: Joi.string().optional(),
  media: Joi.string().optional(),
  mediaType: Joi.string().optional()

});

export const getRequestDetails = Joi.object({
  reqId: Joi.string().trim().required()
});

export const updateRequest = Joi.object({
  reqId: Joi.string().required(),
  name: Joi.string().trim().optional(),

  serviceType: Joi.string().optional(),

  categoryName: Joi.string().optional(),
  categoryId: Joi.string().optional(),
  categoryIdString: Joi.string().optional(),

  issueTypeName: Joi.string().optional(),
  subIssueName: Joi.string().optional(),

  location: Joi.object({
    coordinates: Joi.array().items(Joi.number()).optional(),
    address: Joi.string().optional(),
  }).optional().description("location: {coordinates: [26.5,25.4], address: 'house 1 inner road'}"),
  description: Joi.string().optional(),
  estimatedDays: Joi.string().optional(),
  amount: Joi.number().optional(),
  notes: Joi.string().optional(),
  rejectReason: Joi.string().optional(),
  media: Joi.string().optional(),
  mediaType: Joi.string().optional(),
  status: Joi.string().optional(),
});


export const reqListing = Joi.object({
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
  isCompleted: Joi.boolean().optional(),
  isActive: Joi.boolean().optional()
});



export const reqListingByCategory = Joi.object({
  categoryId: Joi.string().optional(),
});