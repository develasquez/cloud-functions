const kms = require('@google-cloud/kms');


module.exports = {
	getKmsSecret: () => new Promise((resolve, reject) => {
		const client = new kms.v1.KeyManagementServiceClient({
			//By default use functions Service Account mail.
		});
		const formattedName = client.cryptoKeyPath('PROJECT_ID', 'global', 'credentials', 'mySqlCredentials');
		const ciphertext = process.env.KEY;
		const request = {
			name: formattedName,
			ciphertext: ciphertext,
		};
		client.decrypt(request)
			.then(responses => {
				const response = responses[0];
				resolve(response.plaintext.toString('utf8'));
			})
			.catch(err => {
				console.error(err);
				reject(err);
			});
	})
}