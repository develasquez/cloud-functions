# Google Cloud Functions

Esta prueba de concepto aborda los siguientes aspectos

* __Uso de KMS__: Para el manejo de secretos
* __Uso de Service Account__: para la autorización hacia KMS, solo Decrypter.
* __Uso de Google Cloud SQL__: Nueva funcionalidad de GCF, acceso directo al Cloud SQL sin la necesidad de exponer a Cloud SQL hacia internet. Referencia:  [https://cloud.google.com/functions/docs/sql](https://cloud.google.com/functions/docs/sql)
* __Uso de Google Cloud Sotrage como trigger__: Para iniciar el evento y disparar la function

## Configuración del Proyecto

### Habilitación de la Cuenta de Servicios

Esta cuenta de servicios permitirá a la function desencriptar el secreto.

1. En la consola de GCP ir a IAM & admin / Service accounts.
2. Buscar la cuenta con el mail "[PROJECT_ID]@appspot.gserviceaccount.com".
3. editar (Con el lapicito).
4. Agregar el Role > Cloud KMS > Cloud KMS CryptoKey Decrypter.
5. Agregar el Role > Cloud SQL > Cloud Sql Client.
6. Save.


### Creación del Secreto en KMS

Puedes ejecutar el archivo setup.sh pasando la password de la BD como parametro

	./setup.sh <PASSWORD>

Este archivo ejecuta los siguentes pasos:

_Inicio passos setup.sh_

Se debe asegurar de estar en el proyecto correcto

	gcloud config list;

En caso de ser el proyecto correcto almacene el nombre en una variable local

	export PROJECT_ID=`gcloud config list | grep project | sed 's/project = //'`;

Creamos un grupo de secretos (keyring) y le damos el nombre "credentials"

	export KEYRING=credentials;

	gcloud kms keyrings create $KEYRING --location global;

Creamos la llave con las credenciales de la BD con el nombre "mySqlCredentials"

	export KMS_KEY=mySqlCredentials;
	gcloud kms keys create $KMS_KEY --location global --keyring $KEYRING --purpose encryption;

Creamos el secreto con las credenciales, _reemplazar por las credenciales de tu Cloud SQL_

	export SECRET=<PASSWORD>;
	
	curl -s -X POST "https://cloudkms.googleapis.com/v1/projects/$PROJECT_ID/locations/global/keyRings/$KEYRING/cryptoKeys/$KMS_KEY:encrypt" \
	-d "{\"plaintext\":\"$(echo $SECRET | base64)\"}" \
	-H "Authorization:Bearer $(gcloud auth print-access-token)" \
	-H "Content-Type:application/json" > mySqlCredentials.txt.encrypted
	
Creamos el archivo .env.yaml

	echo KEY: $(cat mySqlCredentials.txt.encrypted | grep ciphertext | sed 's/.* //' | tr -d '"') > .env.yaml


Creamos un bucket para almacenar el secreto y subimos el archivo

	gsutil mb gs://$PROJECT_ID-test-fn

	gsutil cp mySqlCredentials.txt.encrypted gs://$PROJECT_ID-test-fn/

Eliminamos el archivo "mySqlCredentials.txt.encrypted"

	rm mySqlCredentials.txt.encrypted

Creamos un repositorio para dejar los archivos que gatillarán la función

	gsutil mb gs://$PROJECT_ID-file-storage


_Fin pasos setup.sh_


## Configuracion de la Funcion

### Cambios seteo de Proyecto, Llavero y BD

__Debe poseer una instancia de Cloud SQL creada__ la creación no esta en el alcance de este demo.

Creamos el usuario en la BD con permisos al SQL Proxy:

	gcloud sql users create fn --host=cloudsqlproxy~% --instance=[INSTANCE_ID] --password=<PASSWORD>;

En el archivo dbconnection.js se deben reeplazar lo valores:

[PROJECT_ID] => Id del proyecto

'[PROJECT_ID]:[ZONE]:[INSTANCE_ID]' => Nombre de la conexion a la instancia (instance conection name) ejemplo proy-holamundo:us-central1:exampledb

En el archivo secreto.js se deben reemplazar los valores:

[PROJECT_ID] => Id del proyecto

__credentials__ => con el nombre del llavero definitivo 

__mySqlCredentials__ => con el nombre de la llave definitiva

__Si utilizo setup.sh no es necesario cambiar estos dos últimos valores.__

En el archivo package.json reemplazar los valores:

[PROJECT_ID] => Id del proyecto


### Deploy de la función HTTP

Para crear el función que se gatilla desde HTTP en GCP y deployarla use el siguente comando

	npm run deploy-http

Esto entregará el resultado del deploy con estos datos como ejemplo

	availableMemoryMb: 128
	entryPoint: testFunction
	environmentVariables:
	  KEY: <SECRET>
	httpsTrigger:
	  url: https://us-central1-PROJECT_ID.cloudfunctions.net/testFunction
	labels:
	  deployment-tool: cli-gcloud
	name: projects/PROJECT_ID/locations/us-central1/functions/testFunction
	runtime: nodejs8
	serviceAccountEmail: PROJECT_ID@appspot.gserviceaccount.com
	sourceArchiveUrl: gs://PROJECT_ID-test-fn/us-central1-projects/PROJECT_ID/locations/us-central1/functions/testFunction-raqxyozqbtcc.zip
	status: ACTIVE
	timeout: 60s
	updateTime: '2018-07-25T15:51:33Z'
	versionId: '1'

Para poder llamar la función puede hacer

 	curl https://us-central1-PROJECT_ID.cloudfunctions.net/testFunction

Debería ver un resultado como este

	{"dbResult":[{"now":"2018-07-26T20:36:39.000Z"}],"osResult":"2018-07-26T20:36:39.507Z"}


### Deploy de la función Storage

Para crear la función que se gatilla desde un bucket en GCP y deployarla use el siguente comando

	npm run deploy-http

Esto entregará el resultado del deploy con estos datos como ejemplo

	availableMemoryMb: 128
	entryPoint: readFileMetadata
	eventTrigger:
	  eventType: google.storage.object.finalize
	  failurePolicy: {}
	  resource: projects/_/buckets/PROJECT_ID-file-storage
	  service: storage.googleapis.com
	labels:
	  deployment-tool: cli-gcloud
	name: projects/PROJECT_ID/locations/us-central1/functions/readFileMetadata
	runtime: nodejs8
	serviceAccountEmail: PROJECT_ID@appspot.gserviceaccount.com
	sourceArchiveUrl: gs://PROJECT_ID-test-fn/us-central1-projects/PROJECT_ID/locations/us-central1/functions/readFileMetadata-chlhhvyeavzt.zip
	status: ACTIVE
	timeout: 60s
	updateTime: '2018-07-26T18:23:36Z'
	versionId: '1'


Para probar si la funcion podemos dajar un archivo en el bucket con el sieguente comando:

	echo "Hola Functions" > filetest.txt; 

	gsutil cp filetest.txt gs://$PROJECT_ID-file-storage


Para validar vicualice los logs generados por la función:

	gcloud beta functions logs read

Devería ver una salida similar a esta:

	LEVEL  NAME              EXECUTION_ID     TIME_UTC                 LOG
	I      readFileMetadata  152962065603539  2018-07-26 20:26:37.669    Event Type: google.storage.object.finalize
	I      readFileMetadata  152962065603539  2018-07-26 20:26:37.669    bucket: PROJECT_ID-file-storage
	I      readFileMetadata  152962065603539  2018-07-26 20:26:37.669    contentLanguage: en
	I      readFileMetadata  152962065603539  2018-07-26 20:26:37.669    contentType: text/plain
	I      readFileMetadata  152962065603539  2018-07-26 20:26:37.669    crc32c: Yoou1g==
	I      readFileMetadata  152962065603539  2018-07-26 20:26:37.669    etag: CJ2Tuv7MvdwCEAE=
	I      readFileMetadata  152962065603539  2018-07-26 20:26:37.669    generation: 1532636796193181
	I      readFileMetadata  152962065603539  2018-07-26 20:26:37.669    id: PROJECT_ID-file-storage/filetest.txt/1532636796193181
	I      readFileMetadata  152962065603539  2018-07-26 20:26:37.669    kind: storage#object
	I      readFileMetadata  152962065603539  2018-07-26 20:26:37.669    md5Hash: /VFKFpkZCHjFgNn4SbSSmg==
	I      readFileMetadata  152962065603539  2018-07-26 20:26:37.669    mediaLink: https://www.googleapis.com/download/storage/v1/b/PROJECT_ID-file-storage/o/filetest.txt?generation=1532636796193181&alt=media
	I      readFileMetadata  152962065603539  2018-07-26 20:26:37.669    metageneration: 1
	I      readFileMetadata  152962065603539  2018-07-26 20:26:37.669    name: filetest.txt
	I      readFileMetadata  152962065603539  2018-07-26 20:26:37.669    selfLink: https://www.googleapis.com/storage/v1/b/PROJECT_ID-file-storage/o/filetest.txt
	I      readFileMetadata  152962065603539  2018-07-26 20:26:37.669    size: 15
	I      readFileMetadata  152962065603539  2018-07-26 20:26:37.669    storageClass: STANDARD
	I      readFileMetadata  152962065603539  2018-07-26 20:26:37.669    timeCreated: 2018-07-26T20:26:36.192Z
	I      readFileMetadata  152962065603539  2018-07-26 20:26:37.669    timeStorageClassUpdated: 2018-07-26T20:26:36.192Z
	I      readFileMetadata  152962065603539  2018-07-26 20:26:37.669    updated: 2018-07-26T20:26:36.192Z
	D      readFileMetadata  152962065603539  2018-07-26 20:26:37.769  Function execution took 564 ms, finished with status: 'ok'



Si se desea modificar la metadata del archivo ver la siguiente referencia:

[https://cloud.google.com/storage/docs/viewing-editing-metadata](https://cloud.google.com/storage/docs/viewing-editing-metadata)

