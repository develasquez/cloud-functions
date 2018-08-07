#!/usr/bin/env bash

export PROJECT_ID=`gcloud config list | grep project | sed 's/project = //'`

export KEYRING=credentials;

gcloud kms keyrings create $KEYRING --location global;

export KMS_KEY=mySqlCredentials;
gcloud kms keys create $KMS_KEY --location global --keyring $KEYRING --purpose encryption;

export SECRET=$1;

curl -s -X POST "https://cloudkms.googleapis.com/v1/projects/$PROJECT_ID/locations/global/keyRings/$KEYRING/cryptoKeys/$KMS_KEY:encrypt" \
-d "{\"plaintext\":\"$(echo $SECRET | base64)\"}" \
-H "Authorization:Bearer $(gcloud auth print-access-token)" \
-H "Content-Type:application/json" > mySqlCredentials.txt.encrypted;

echo KEY: $(cat mySqlCredentials.txt.encrypted | grep ciphertext | sed 's/.* //' | tr -d '"') > .env.yaml;

gsutil mb gs://$PROJECT_ID-test-fn;

gsutil cp mySqlCredentials.txt.encrypted gs://$PROJECT_ID-test-fn/;

rm mySqlCredentials.txt.encrypted;

gsutil mb gs://$PROJECT_ID-file-storage


