"use strict";

import * as AWS from "aws-sdk";
import * as	fs from "fs";
import * as path from "path";

import * as appUtils from "@utils/appUtils";
import { fileUploadExts, SERVER } from "@config/index";
import { audio, image, video } from "@json/mime-type.json";

export class ImageUtil {

 /**
 * Filters a file based on its extension and MIME type.
 * @example
 * filters(file)
 * true
 * @param {Object} file - The file object containing properties hapi.filename and hapi.headers["content-type"].
 * @returns {boolean} Returns true if the file's extension and MIME type match the allowed criteria, otherwise false.
 * @description
 *   - Utilizes predefined lists of video, image, and audio MIME types.
 *   - Checks if the file's extension and MIME type are allowed.
 */
	private filters(file) {
		const mimetypes = [
			video.filter(v => v.extension === ".mp4")[0].mimetype,
			video.filter(v => v.extension === ".flv")[0].mimetype,
			video.filter(v => v.extension === ".mov")[0].mimetype,
			video.filter(v => v.extension === ".avi")[0].mimetype,
			video.filter(v => v.extension === ".wmv")[0].mimetype,

			image.filter(v => v.extension === ".jpg")[0].mimetype,
			image.filter(v => v.extension === ".jpeg")[0].mimetype,
			image.filter(v => v.extension === ".png")[0].mimetype,
			image.filter(v => v.extension === ".jpg")[0].mimetype,
			image.filter(v => v.extension === ".svg")[0].mimetype,

			audio.filter(v => v.extension === ".mp3")[0].mimetype,
			audio.filter(v => v.extension === ".aac")[0].mimetype,
			audio.filter(v => v.extension === ".aiff")[0].mimetype,
			audio.filter(v => v.extension === ".m4a")[0].mimetype,
			audio.filter(v => v.extension === ".ogg")[0].mimetype,
		];

		if (
			fileUploadExts.indexOf(path.extname(file.hapi.filename.toLowerCase())) !== -1 &&
			mimetypes.indexOf(file.hapi.headers["content-type"]) !== -1
		) {
			return true;
		}
		return false;
	}

	/**
	 * @function uploadImage This Function is used to uploading image to S3 Server
	 */
	private _uploadToS3(fileName, fileBuffer, contentType) {
		try {
			return new Promise((resolve, reject) => {
				const s3 = new AWS.S3();
				s3.upload({
					Key: 'exportFiles/'+String(fileName),
					Body: fileBuffer,
					ContentType: contentType,
					Bucket: SERVER.S3.S3_FILE_BUCKET_NAME,
					ContentDisposition: 'attachment' // make files downloadable
				}, (error, data) => {
					if (error) {
						console.log("Upload failed: ", error);
						reject(error);
					} else
						resolve(data);
				});
			});
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function uploadSingleMediaToS3 This Function is used to upload single image to S3 Server
	 */
	uploadSingleMediaToS3(file) {
		return new Promise((resolve, reject) => {
			if (file) {
				const filePath = `${SERVER.UPLOAD_DIR}${file}`;
				console.log("filePath==========>", filePath);

					fs.readFile(filePath, (error, fileBuffer) => {
						if (error) reject(error);
						this._uploadToS3(file, fileBuffer, "text/csv")
							.then((data: any) => {
								appUtils.deleteFiles(filePath);
								const location = `${SERVER.S3.FILE_BUCKET_URL}exportFiles/${file}`
								resolve(location);
							})
							.catch((error) => {
								reject(error);
							});
					});
			} else {
				reject(new Error("Invalid file type!"));
			}
		});
	}

 /**
 * Deletes a file from an S3 bucket using the provided filename
 * @example
 * deleteFromS3("path/to/file.txt")
 * Promise { <resolved>: { DeleteMarker: ..., VersionId: ... } }
 * @param {string} filename - The name of the file to delete, including any path.
 * @returns {Promise} Promise that resolves with data if deletion is successful or rejects with an error.
 * @description
 *   - The file's true name is extracted from the full path using the last segment after splitting by "/".
 *   - Utilizes AWS SDK's S3 service to delete the specified file.
 *   - The S3 bucket name is derived from a server configuration constant.
 *   - Debug information for the error and data is logged to the console.
 */
	deleteFromS3(filename) {
		filename = filename.split("/").slice(-1)[0];
		const s3 = new AWS.S3({
			params: { Bucket: SERVER.S3.FILE_BUCKET_URL }
		});
		return new Promise(function (resolve, reject) {
			const params = {
				Bucket: SERVER.S3.FILE_BUCKET_URL,
				Key: filename
			};

			s3.deleteObject(params, function (error, data) {
				console.log(error, data);
				if (error) {
					reject(error);
				} else {
					resolve(data);
				}
			});
		});
	}

	/**
	 * Uploads a file to an S3 bucket using the provided filename, file buffer, and content type
	 * @example
	 * uploadToS3("path/to/file.txt", fs.readFileSync("path/to/file.txt"), "text/plain")
	 * Promise { <resolved>: { Location: ..., Bucket: ..., Key: ... } }
	 * @param {string} fileName - The name of the file to upload, including any path.
	 * @param {Buffer} fileBuffer - The file buffer to upload.
	 * @param {string} contentType - The content type of the file to upload.
	 * @returns {Promise} Promise that resolves with data if upload is successful or rejects with an error.
	 * @description
	 *   - Utilizes the _uploadToS3 helper function to upload the file.
	 */
	public uploadToS3(fileName: string, fileBuffer: Buffer, contentType: string): Promise<any> {
		return this._uploadToS3(fileName, fileBuffer, contentType);
	  }
}

export const imageUtil = new ImageUtil();