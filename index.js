const httpStatus = require('http-status')
const setHeaders = require('./middlewares/setHeaders')
const dbConnection = require('./dbconnection');

/**
 * Generic Cloud Function to be triggered by HTTP.
 *
 * @param {object} req The request information.
 * @param {object} res The response reference.
 */
exports.testFunction = (req, res) =>
   setHeaders(req, res, () => {
      dbConnection.cloudSQLTest().then((response) => {
         return res.status(httpStatus.OK)
            .send({
               dbResult: response.results,
               osResult: new Date()
            });
      }).catch((response) => {
         console.log(response.error);
         return res.status(httpStatus.INTERNAL_SERVER_ERROR)
            .send(response.error);
      });
   });


/**
 * Generic background Cloud Function to be triggered by Cloud Storage.
 *
 * @param {object} data The event payload.
 * @param {object} context The event metadata.
 */
exports.readFileMetadata = (data, context) => {
   const file = data;
   console.log(JSON.stringify(file));
   console.log(`  Event ${context.eventId}`);
   console.log(`  Event Type: ${context.eventType}`);

   console.log(`  bucket: ${file.bucket}`);
   console.log(`  contentLanguage: ${file.contentLanguage}`);
   console.log(`  contentType: ${file.contentType}`);
   console.log(`  crc32c: ${file.crc32c}`);
   console.log(`  etag: ${file.etag}`);
   console.log(`  generation: ${file.generation}`);
   console.log(`  id: ${file.id}`);
   console.log(`  kind: ${file.kind}`);
   console.log(`  md5Hash: ${file.md5Hash}`);
   console.log(`  mediaLink: ${file.mediaLink}`);
   console.log(`  metageneration: ${file.metageneration}`);
   console.log(`  name: ${file.name}`);
   console.log(`  selfLink: ${file.selfLink}`);
   console.log(`  size: ${file.size}`);
   console.log(`  storageClass: ${file.storageClass}`);
   console.log(`  timeCreated: ${file.timeCreated}`);
   console.log(`  timeStorageClassUpdated: ${file.timeStorageClassUpdated}`);
   console.log(`  updated: ${file.updated}`);

};


