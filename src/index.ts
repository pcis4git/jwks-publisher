import cluster, { Worker } from 'cluster';
import os from 'os';
import dotenv from 'dotenv';
import express from 'express';
import { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

//Always load environment variables from .env file at very beginning !
dotenv.config();


// if (cluster.isPrimary) {
//   // Step 2: In the master process, fork worker processes for each CPU core
//   const numCPUs = os.cpus().length;
//   for (let i = 0; i < numCPUs; i++) {
//     cluster.fork();
//   }

//   cluster.on('exit', (worker : Worker) => {
//     log(`Worker ${worker.process.pid} died`);
//     cluster.fork();
//   });
// } 
// else { 

    launchExpress();

//}


async function launchExpress() {

  const app = express();

  app.use(cors());
  app.use(bodyParser.json());
  
  app.get('/.well-known/jwks.json', (request: Request, response: Response ) => {
    handleRequest(request, response);
  });
  
  // Wildcard route to handle any other path with default logic
  app.all('*', (request: Request, response: Response) => {
     handleDummyBackend(request, response);
  });

  app.listen(8080, () => {
    console.log(`Server is running on port 8080 with worker ${process.pid}`);
  });
}


async function handleRequest(request: Request, response: Response) {

  const jwksSecretName    = process.env.JWKS_K_NAME;
  const applicationRegion = process.env.APP_REGION;
  let secretValue :string = '';
  
  try {
      const client = new SecretsManagerClient({ region: applicationRegion });
      const input = {
        SecretId: jwksSecretName,
        VersionStage: "AWSCURRENT", 
      };
      const command = new GetSecretValueCommand( input );
      const secretResp  = await client.send( command );
      secretValue = secretResp.SecretString || '';
      
      const jwksObject = JSON.parse(secretValue);
      const keys = jwksObject['keys'];
      console.log('total number of keys are: ' + keys.length );
      
      let publicKeys: any[] = [];
      
      keys.forEach((keyItem: any) => {
        const kid = keyItem['kid'];
        console.log('KID is: ' + kid);
        
        if( 'dq' in keyItem ) {
           console.log( 'remove private key from JWKS with kid ' + kid );
           console.log( 'filtered key contains the following fields: ' + Object.keys(keyItem) );
        }
        else {
          publicKeys.push( keyItem );
          console.log( 'add public key to JWKS with kid ' + kid );
          console.log( 'added public key contains the following fields: ' + Object.keys(keyItem) );
        }
      } );
      
      const jwksResult = { 'keys' : publicKeys };
      const responseBody = JSON.stringify(jwksResult);
      response.setHeader('Content-Type', 'application/json');
      response.setHeader('SupportedBy', 'PCIS');
      response.status(200).send(responseBody);
  }
  catch( error ) {
      console.log(error);
      const errorMsg = {
        message: 'Internal Server Error'
      };
      const responseBody = JSON.stringify(errorMsg);
      response.setHeader('Content-Type', 'application/json');
      response.status(500).send(responseBody);
  }

}

function handleDummyBackend(request: Request, response: Response) {
  response.status(404).send('Not Found');
}