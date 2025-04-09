"use strict";

import * as _ from "lodash";
import { QueryOptions } from "mongoose";

import * as models from "@modules/models";
import { SERVER } from "@config/environment";
import { stringToBoolean } from "@utils/appUtils";

export class BaseDao {

	/**
	 * Saves a document to the specified model in the database.
	 * @example
	 * save('User', { name: 'John Doe', age: 25 })
	 * Saves a new User document with name and age properties.
	 * @param {ModelNames} model - The name of the model to save the document to.
	 * @param {any} data - The data to save as a document.
	 * @param {any} options - Additional options for the save operation, defaults to an empty object.
	 * @returns {Promise<any>} A Promise that resolves to the saved document or rejects with an error.
	 * @description
	 *   - The function handles different save scenarios: creation, update, and insert.
	 *   - It defaults save options to include lean as true.
	 *   - It returns a Promise that resolves to the saved document or rejects with an error.
	 */
	async save(model: ModelNames, data: any, options = {}) {
		try {
			options = stringToBoolean(SERVER.MONGO.REPLICA || "false") ? options : {};
			const ModelName: any = models[model];
			return (await new ModelName(data).save(options)).toJSON();
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Retrieves documents from a specified model based on different query configurations.
	 * @example
	 * find('User', { age: { $gte: 18 } }, {}, { lean: true }, { age: -1 }, { pageNo: 1, limit: 10 }, { path: 'profile' })
	 * Returns documents from User model with age greater than or equal to 18, sorted by age in descending order, paginated, and populated with profile data, in lean format.
	 * @param {ModelNames} model - The name of the model to retrieve documents from.
	 * @param {any} query - The query object for filtering documents.
	 * @param {any} projection - The fields to include or exclude in the returned documents.
	 * @param {object} options - Additional options for the query, defaults to an empty object.
	 * @param {any} [sort] - Optional sort configuration.
	 * @param {object} [paginate] - Optional pagination configuration with pageNo and limit properties.
	 * @param {any} [populateQuery] - Optional query to populate referenced documents.
	 * @returns {Promise<any>} A Promise that resolves to the retrieved documents or rejects with an error.
	 * @description
	 *   - The function handles different query scenarios: sorting, pagination, and population.
	 *   - It defaults query options to include lean as true.
	 *   - Pagination calculates documents to skip based on pageNo and limit.
	 *   - Uses lodash to manage empty checks for sort, paginate, and populateQuery.
	 */
	async find(model: ModelNames, query: any, projection: any, options = {}, sort?, paginate?, populateQuery?: any) {
		try {
			const ModelName: any = models[model];
			options = { ...options, lean: true };
			if (!_.isEmpty(sort) && !_.isEmpty(paginate) && _.isEmpty(populateQuery)) { // sorting with pagination
				return await ModelName.find(query, projection, options).sort(sort).skip((paginate.pageNo - 1) * paginate.limit).limit(paginate.limit);
			} else if (_.isEmpty(sort) && !_.isEmpty(paginate) && _.isEmpty(populateQuery)) { // pagination
				return await ModelName.find(query, projection, options).skip((paginate.pageNo - 1) * paginate.limit).limit(paginate.limit);
			} else if (_.isEmpty(sort) && _.isEmpty(paginate) && !_.isEmpty(populateQuery)) { // populate
				return await ModelName.find(query, projection, options).populate(populateQuery).exec();
			} else if (_.isEmpty(sort) && !_.isEmpty(paginate) && !_.isEmpty(populateQuery)) { // pagination with populate
				return await ModelName.find(query, projection, options).skip((paginate.pageNo - 1) * paginate.limit).limit(paginate.limit).populate(populateQuery).exec();
			} else if (!_.isEmpty(sort) && _.isEmpty(paginate) && _.isEmpty(populateQuery)) { // only sorting
				return await ModelName.find(query, projection, options).sort(sort).exec();
			} else {
				return await ModelName.find(query, projection, options);
			}
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Finds distinct values for a specified field in the database based on the provided query parameters.
	 * @example
	 * distinct('User', 'name', {age: { $gte: 18 }})
	 * // Returns: ['John', 'Jane', ...]
	 * @param {ModelNames} model - The name of the model to query.
	 * @param {string} path - The path to the field to find distinct values for.
	 * @param {Object} query - The query object used to filter documents.
	 * @returns {Promise<string[]>} A Promise that resolves to an array of distinct values for the specified field.
	 */
	async distinct(model: ModelNames, path: string, query: any) {
		try {
			const ModelName: any = models[model];
			return await ModelName.distinct(path, query);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Finds a single document in the database based on the provided query parameters.
	* @example
	* findOne('User', {name: 'John'})
	* // Returns: { _id: 'abc123', name: 'John', ... }
	* @param {ModelNames} model - The name of the model to query.
	* @param {Object} query - The query object used to match documents.
	* @param {Object} [projection={}] - Specifies the fields to return in the document.
	* @param {Object} [options={}] - Additional options for the query, such as lean.
	* @param {Object} [sort] - Criteria to sort the documents.
	* @param {Object} [populateQuery] - Fields to populate in the returned document.
	* @returns {Promise<Object>} A promise that resolves with the found document or rejects with an error.
	* @description
	*   - Utilizes optional populate and sort parameters to modify results.
	*   - Leverages Mongoose's `lean` option by default to return plain JavaScript objects.
	*   - Uses the `_.isEmpty` method to check for the presence of `sort` and `populateQuery`.
	*   - Catches errors and returns a rejected Promise if an error occurs during the query.
	*/
	async findOne(model: ModelNames, query: any, projection = {}, options = {}, sort?: any, populateQuery?: any) {
		try {
			const ModelName: any = models[model];
			options = { ...options, lean: true };
			if (!_.isEmpty(populateQuery) && _.isEmpty(sort)) { // populate
				return await ModelName.findOne(query, projection, options).populate(populateQuery).exec();
			} else if (!_.isEmpty(sort) && _.isEmpty(populateQuery)) { // populate
				return await ModelName.findOne(query, projection, options).sort(sort).exec();
			} else if (!_.isEmpty(sort) && !_.isEmpty(populateQuery)) { // populate
				return await ModelName.findOne(query, projection, options).sort(sort).populate(populateQuery).exec();
			} else {
				return await ModelName.findOne(query, projection, options);
			}
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Finds a single document in the database based on the provided query parameters
	 * and updates it with the given update object.
	 * @example
	 * findOneAndUpdate('User', {name: 'John'}, {name: 'Jane'})
	 * // Returns: { _id: 'abc123', name: 'Jane', ... }
	 * @param {ModelNames} model - The name of the model to query.
	 * @param {Object} query - The query object used to match documents.
	 * @param {Object} update - The update object used to update the matched document.
	 * @param {Object} [options={}] - Additional options for the query, such as lean.
	 * @returns {Promise<Object>} A promise that resolves with the updated document or rejects with an error.
	 * @description
	 *   - Utilizes Mongoose's `lean` option by default to return plain JavaScript objects.
	 *   - Catches errors and returns a rejected Promise if an error occurs during the query.
	 */
	async findOneAndUpdate(model: ModelNames, query: any, update: any, options = {}) {
		try {
			options = { ...options, lean: true };
			const ModelName: any = models[model];
			return await ModelName.findOneAndUpdate(query, update, options);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Finds a single document in the database based on the provided query parameters
	 * and removes it.
	 * @example
	 * findAndRemove('User', {name: 'John'})
	 * // Returns: { _id: 'abc123', name: 'John', ... }
	 * @param {ModelNames} model - The name of the model to query.
	 * @param {Object} query - The query object used to match documents.
	 * @param {Object} update - The update object used to update the matched document.
	 * @param {Object} [options={}] - Additional options for the query, such as lean.
	 * @returns {Promise<Object>} A promise that resolves with the removed document or rejects with an error.
	 * @description
	 *   - Utilizes Mongoose's `lean` option by default to return plain JavaScript objects.
	 *   - Catches errors and returns a rejected Promise if an error occurs during the query.
	 */
	async findAndRemove(model: ModelNames, query: any, update: any, options: QueryOptions) {
		try {
			const ModelName: any = models[model];
			return await ModelName.findOneAndRemove(query, update, options);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Updates a single document in the database based on the provided query parameters.
	 * @example
	 * updateOne('User', {name: 'John'}, {name: 'Jane'})
	 * // Returns: { _id: 'abc123', name: 'Jane', ... }
	 * @param {ModelNames} model - The name of the model to query.
	 * @param {Object} query - The query object used to match documents.
	 * @param {Object} update - The update object used to update the matched document.
	 * @param {Object} [options={}] - Additional options for the query, such as lean.
	 * @returns {Promise<Object>} A promise that resolves with the updated document or rejects with an error.
	 * @description
	 *   - Utilizes Mongoose's `lean` option by default to return plain JavaScript objects.
	 *   - Catches errors and returns a rejected Promise if an error occurs during the query.
	 */
	async updateOne(model: ModelNames, query: any, update: any, options: any) {
		try {
			const ModelName: any = models[model];
			return await ModelName.updateOne(query, update, options);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Updates multiple documents in the database based on the provided query parameters.
	 * @example
	 * updateMany('User', {age: { $gte: 18 }}, {status: 'active'})
	 * // Returns: { n: 3, nModified: 3, ok: 1 }
	 * @param {ModelNames} model - The name of the model to query.
	 * @param {Object} query - The query object used to match documents.
	 * @param {Object} update - The update object used to update the matched documents.
	 * @param {QueryOptions} options - Additional options for the query, such as lean.
	 * @returns {Promise<Object>} A promise that resolves with the update result or rejects with an error.
	 * @description
	 *   - Performs update operation on all documents matching the query.
	 *   - Returns an object containing the number of documents matched and modified.
	 *   - Catches errors and returns a rejected Promise if an error occurs during the update.
	 */
	async updateMany(model: ModelNames, query: any, update: any, options: QueryOptions) {
		try {
			const ModelName: any = models[model];
			return await ModelName.updateMany(query, update, options);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Removes documents from the database that match the provided query parameters.
	 * @param {ModelNames} model - The name of the model to query.
	 * @param {Object} query - The query object used to match documents for removal.
	 * @returns {Promise<Object>} A promise that resolves when the documents are removed or rejects with an error.
	 * @description
	 *   - Uses the `remove` method to delete documents matching the query.
	 *   - Catches errors and returns a rejected Promise if an error occurs during the removal process.
	 */
	async remove(model: ModelNames, query: any) {
		try {
			const ModelName: any = models[model];
			return await ModelName.remove(query);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Deletes multiple documents from the database that match the provided query parameters.
	 * @param {ModelNames} model - The name of the model to query.
	 * @param {Object} query - The query object used to match documents for removal.
	 * @returns {Promise<Object>} A promise that resolves when the documents are removed or rejects with an error.
	 * @description
	 *   - Uses the `deleteMany` method to delete documents matching the query.
	 *   - Catches errors and returns a rejected Promise if an error occurs during the removal process.
	 */
	async deleteMany(model: ModelNames, query: any) {
		try {
			const ModelName: any = models[model];
			return await ModelName.deleteMany(query);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Deletes a single document from the database that matches the provided query parameters.
	 * @param {ModelNames} model - The name of the model to query.
	 * @param {Object} query - The query object used to match the document for removal.
	 * @returns {Promise<Object>} A promise that resolves when the document is removed or rejects with an error.
	 * @description
	 *   - Uses the `deleteOne` method to delete the first document matching the query.
	 *   - Catches errors and returns a rejected Promise if an error occurs during the removal process.
	 */
	async deleteOne(model: ModelNames, query: any) {
		try {
			const ModelName: any = models[model];
			return await ModelName.deleteOne(query);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Retrieves the count of documents in the database that match the provided query parameters.
	 * @param {ModelNames} model - The name of the model to query.
	 * @param {Object} query - The query object used to match documents for counting.
	 * @returns {Promise<number>} A promise that resolves with the count of matched documents or rejects with an error.
	 * @description
	 *   - Uses the `count` method to get the count of documents matching the query.
	 *   - Catches errors and returns a rejected Promise if an error occurs during the counting process.
	 */
	async count(model: ModelNames, query: any) {
		try {
			const ModelName: any = models[model];
			return await ModelName.count(query);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Retrieves the count of documents in the database that match the provided query parameters.
	 * @param {ModelNames} model - The name of the model to query.
	 * @param {Object} query - The query object used to match documents for counting.
	 * @returns {Promise<number>} A promise that resolves with the count of matched documents or rejects with an error.
	 * @description
	 *   - Uses the `countDocuments` method to get the count of documents matching the query.
	 *   - Catches errors and returns a rejected Promise if an error occurs during the counting process.
	 */
	async countDocuments(model: ModelNames, query: any) {
		try {
			const ModelName: any = models[model];
			return await ModelName.countDocuments(query);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Performs an aggregation operation on a specified model within the database.
	 * @example
	 * sync aggregate('User', [{ $match: { age: { $gte: 21 } } }], { readPreference: 'secondary' })
	 * Resulting aggregate output
	 * @param {ModelNames} model - The name of the model on which to execute the aggregation.
	 * @param {Array} aggPipe - The aggregation pipeline to be executed.
	 * @param {Object} options - (Optional) Additional options for the aggregation operation.
	 * @returns {Promise<any>} A promise that resolves to the result of the aggregation operation.
	 * @description
	 *   - This function uses the `allowDiskUse(true)` option to enable disk use for aggregation operations that exceed memory limits.
	 *   - If an error occurs during execution, the function will return a rejected promise with the error.
	 */
	async aggregate(model: ModelNames, aggPipe, options: any = {}) {
		try {
			const ModelName: any = models[model];
			const aggregation: any = ModelName.aggregate(aggPipe);
			if (options) {
				aggregation.options = options;
			}
			return await aggregation.allowDiskUse(true).exec();
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Inserts a single document into the database based on the provided model and data.
	 * @param {ModelNames} model - The name of the model to insert the document into.
	 * @param {Object} data - The data to be inserted into the model.
	 * @param {Object} options - (Optional) Additional options for the insertion.
	 * @returns {Promise<Object>} A promise that resolves to the inserted document or rejects with an error.
	 * @description
	 *   - Creates a new instance of the model with the provided data.
	 *   - Saves the new instance to the database.
	 *   - Catches errors and returns a rejected Promise if an error occurs during the insertion process.
	 */
	async insert(model: ModelNames, data, options: QueryOptions) {
		try {
			const ModelName: any = models[model];
			const obj = new ModelName(data);
			await obj.save();
			return obj;
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Inserts multiple documents into the database based on the provided model and data.
	 * @param {ModelNames} model - The name of the model to insert the documents into.
	 * @param {Object[]} data - The data to be inserted into the model.
	 * @param {Object} options - (Optional) Additional options for the insertion.
	 * @returns {Promise<Object>} A promise that resolves to the inserted documents or rejects with an error.
	 * @description
	 *   - Uses the `insertMany` method of the Mongoose model to insert the data into the database.
	 *   - Catches errors and returns a rejected Promise if an error occurs during the insertion process.
	 */
	async insertMany(model: ModelNames, data, options: any) {
		try {
			const ModelName: any = models[model];
			return await ModelName.collection.insertMany(data, options);
		} catch (error) {
			return {};
		}
	}

	/**
	 * Retrieves the result of an aggregation operation and then populates the result
	 * with additional data based on the provided model and populate options.
	 * @param {ModelNames} model - The name of the model to perform the aggregation on.
	 * @param {Array} group - The aggregation pipeline to be executed.
	 * @param {Object} populateOptions - (Optional) Additional options for the population.
	 * @returns {Promise<Object>} A promise that resolves to the populated aggregation result.
	 * @description
	 *   - Executes the aggregation pipeline on the specified model.
	 *   - Uses the `populate` method to populate the result with additional data based on the provided populate options.
	 *   - Catches errors and returns a rejected promise if an error occurs during the aggregation or population process.
	 */
	async aggregateDataWithPopulate(model: ModelNames, group, populateOptions) {
		try {
			const ModelName: any = models[model];
			const aggregate = await ModelName.aggregate(group);
			const populate = await ModelName.populate(aggregate, populateOptions);
			return populate;
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Performs a bulk find and update operation.
	 * 
	 * @param bulk - The bulk operation object.
	 * @param query - The query object to find documents to update.
	 * @param update - The update operations to be applied to the documents.
	 * @param options - Options to configure the update operation.
	 * 
	 * @returns {Promise<any>} A promise that resolves to the result of the update operation or rejects with an error.
	 * 
	 * @description
	 *   - Uses the `find` method on the bulk object to locate documents matching the query.
	 *   - Applies the `upsert` option to insert documents if no matching documents are found.
	 *   - Executes the `update` operation with the specified options.
	 *   - Catches errors and returns a rejected promise if an error occurs during the update process.
	 */
	async bulkFindAndUpdate(bulk, query: any, update: any, options: QueryOptions) {
		try {
			return await bulk.find(query).upsert().update(update, options);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Performs a bulk find and update operation with upsert.
	 * 
	 * @param bulk - The bulk operation object.
	 * @param query - The query object to find documents to update.
	 * @param update - The update operations to be applied to the documents.
	 * @param options - Options to configure the update operation.
	 * 
	 * @returns {Promise<any>} A promise that resolves to the result of the update operation or rejects with an error.
	 * 
	 * @description
	 *   - Uses the `find` method on the bulk object to locate documents matching the query.
	 *   - Applies the `upsert` option to insert documents if no matching documents are found.
	 *   - Executes the `updateOne` operation with the specified options.
	 *   - Catches errors and returns a rejected promise if an error occurs during the update process.
	 */
	async bulkFindAndUpdateOne(bulk, query: any, update: any, options: QueryOptions) {
		try {
			return await bulk.find(query).upsert().updateOne(update, options);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Finds a document by its ID and updates it with the provided update operations.
	 * 
	 * @param {ModelNames} model - The name of the model to perform the update on.
	 * @param {any} query - The ID of the document to find and update.
	 * @param {any} update - The update operations to apply to the document.
	 * @param {QueryOptions} options - Options to configure the update operation.
	 * 
	 * @returns {Promise<any>} A promise that resolves to the updated document or rejects with an error.
	 * 
	 * @throws Will log and throw an error if the update operation fails.
	 */
	async findByIdAndUpdate(model: ModelNames, query: any, update: any, options: QueryOptions) {
		try {
			const ModelName: any = models[model];
			return await ModelName.findByIdAndUpdate(query, update, options);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Populates a document or documents with the specified populate query.
	 * 
	 * @param {ModelNames} model - The name of the model to perform the population on.
	 * @param {any} data - The document(s) to populate.
	 * @param {any} populateQuery - The populate query to use when populating the document(s).
	 * 
	 * @returns {Promise<any>} A promise that resolves to the populated document(s) or rejects with an error.
	 * 
	 * @throws Will log and throw an error if the population operation fails.
	 */
	async populate(model: ModelNames, data: any, populateQuery: any) {
		try {
			const ModelName: any = models[model];
			return await ModelName.populate(data, populateQuery);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * @description Add skip and limit to pipleine
	 */
	addSkipLimit = (limit, pageNo) => {
		if (limit) {
			limit = Math.abs(limit);
			// If limit exceeds max limit
			if (limit > 100) {
				limit = 100;
			}
		} else {
			limit = 10;
		}
		if (pageNo && (pageNo !== 0)) {
			pageNo = Math.abs(pageNo);
		} else {
			pageNo = 1;
		}
		let skip = (limit * (pageNo - 1));
		return [
			{ "$skip": skip },
			{ "$limit": limit + 1 }
		];
	}

	paginate = async (model: ModelNames, pipeline: Array<Object>, limit: number, pageNo: number, options: any = {}, pageCount = false) => {
		try {
			pipeline = [...pipeline, ...this.addSkipLimit(limit, pageNo)];
			let ModelName: any = models[model];

			let promiseAll = [];
			if (!_.isEmpty(options)) {
				if (options.collation) {
					promiseAll = [
						ModelName.aggregate(pipeline).collation({ "locale": "en" }).allowDiskUse(true)
					];
				} else {
					promiseAll = [
						ModelName.aggregate(pipeline).allowDiskUse(true)
					];
				}
			} else {
				promiseAll = [
					ModelName.aggregate(pipeline).allowDiskUse(true)
				];
			}

			if (pageCount) {

				for (let index = 0; index < pipeline.length; index++) {
					if ("$skip" in pipeline[index]) {
						pipeline = pipeline.slice(0, index);
					} else {
						// pipeline = pipeline;
					}
				}
				pipeline.push({ "$count": "total" });
				promiseAll.push(ModelName.aggregate(pipeline).allowDiskUse(true));
			}
			let result = await Promise.all(promiseAll);

			let nextHit = 0;
			let total = 0;
			let totalPage = 0;

			if (pageCount) {

				total = result[1] && result[1][0] ? result[1][0]["total"] : 0;
				totalPage = Math.ceil(total / limit);
			}

			let data: any = result[0];
			if (result[0].length > limit) {
				nextHit = pageNo + 1;
				data = result[0].slice(0, limit);
			}
			return {
				"data": data,
				"total": total,
				"pageNo": pageNo,
				"totalPage": totalPage,
				"nextHit": nextHit,
				"limit": limit
			};
		} catch (error) {
			throw new Error(error);
		}
	}


	dataPaginate = async (model: ModelNames, pipeline: Array<Object>, limit: number, pageNo: number, options: any = {}, pageCount = false) => {
		try {
			pipeline = [...pipeline];
			let ModelName: any = models[model];

			let promiseAll = [];
			if (!_.isEmpty(options)) {
				if (options.collation) {
					promiseAll = [
						ModelName.aggregate(pipeline).collation({ "locale": "en" }).allowDiskUse(true)
					];
				} else {
					promiseAll = [
						ModelName.aggregate(pipeline).allowDiskUse(true)
					];
				}
			} else {
				promiseAll = [
					ModelName.aggregate(pipeline).allowDiskUse(true)
				];
			}

			if (pageCount) {

				for (let index = 0; index < pipeline.length; index++) {
					if ("$skip" in pipeline[index]) {
						pipeline = pipeline.slice(0, index);
					} else {
						// pipeline = pipeline;
					}
				}
				pipeline.push({ "$count": "total" });
				promiseAll.push(ModelName.aggregate(pipeline).allowDiskUse(true));
			}
			let result = await Promise.all(promiseAll);

			let nextHit = 0;
			let total = 0;
			let totalPage = 0;

			if (pageCount) {

				total = result[1] && result[1][0] ? result[1][0]["total"] : 0;
				totalPage = Math.ceil(total / limit);
			}

			let data: any = result[0];
			if (result[0].length > limit) {
				nextHit = pageNo + 1;
				data = result[0].slice(0, limit);
			}
			return {
				"data": data,
				"total": total,
				"pageNo": pageNo,
				"totalPage": totalPage,
				"nextHit": nextHit,
				"limit": limit
			};
		} catch (error) {
			throw new Error(error);
		}
	}

	/**
	 * Executes multiple write operations on a model in bulk.
	 * 
	 * @param {ModelNames} model - The name of the model on which bulk operations are to be performed.
	 * @param {any} bulkOperations - An array of bulk operations to execute.
	 * @param {object} [options={}] - Optional settings for the bulk write operation.
	 * 
	 * @returns {Promise<any>} - A promise that resolves to the result of the bulk write operation.
	 * 
	 * @throws {Error} - Throws an error if the bulk write operation fails.
	 */
	async bulkWrite(model: ModelNames, bulkOperations: any, options = {}) {
		try {
			const ModelName: any = models[model];
			return await ModelName.bulkWrite(bulkOperations, options);
		} catch (error) {
			return Promise.reject(error);
		}
	}

}

export const baseDao = new BaseDao();