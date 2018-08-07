
const mysql = require('mysql');
const secrets = require('./secrets');
const dbCredentials = {
	connectionName: '[PROJECT_ID]:[ZONE]:[INSTANCE_ID]',
	dbName: '<DB_NAME>',
	dbUser: 'fn',
	dbPass: null
};

//Walkaround 1
//https://cloud.google.com/functions/docs/bestpractices/tips 
//#Use global variables to reuse objects in future invocations > There is no guarantee that the state of a Cloud Function will be preserved for future invocations


const getCredentials = () => new Promise((resolve, reject) => {

	//Walkaround 1
	if (!dbCredentials.dbPass) {
		secrets.getKmsSecret().then((response) => {
			dbCredentials.dbPass = response.trim();
			resolve(dbCredentials);
		}).catch(err => {
			reject(err);
		});
	} else {
		resolve(dbCredentials);
	}
});

const dbConnection = {
	pool: null,
	connect: () => new Promise((resolve, reject) => {
		getCredentials().then((credentials) => {
			dbConnection.pool = mysql.createPool({
				connectionLimit: 1,
				socketPath: '/cloudsql/' + credentials.connectionName,
				user: credentials.dbUser,
				password: credentials.dbPass,
				database: credentials.dbName
			});
			resolve(dbConnection.pool);
		});
	}),
	getPool: () => new Promise((resolve, reject) => {
		//Walkaround 1
		if (!dbConnection.pool) {
			dbConnection.connect().then((pool) => {
				resolve(pool);
			});
		} else {
			resolve(dbConnection.pool);
		}
	}),
	cloudSQLTest: () => new Promise((resolve, reject) => {
		dbConnection.getPool().then((pool) => {
			pool.query('SELECT NOW() AS now', (error, results, fields) => {
				if (!error) {
					resolve({
						error: null,
						results,
						fields
					});
				} else {
					reject({
						error
					});
				}
			});
		})
	})
};

module.exports = {
	cloudSQLTest: dbConnection.cloudSQLTest
}