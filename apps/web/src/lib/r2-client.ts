import { Agent as HttpsAgent } from "node:https";
import { S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { r2EndpointHostname, r2S3ClientOptions } from "@/lib/r2-endpoint";

export function createR2S3Client(env: {
  R2_ACCOUNT_ID?: string;
  R2_ENDPOINT?: string;
  R2_JURISDICTION?: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
}): S3Client {
  const options = r2S3ClientOptions(env);
  const servername = r2EndpointHostname(options.endpoint);
  return new S3Client({
    ...options,
    requestHandler: new NodeHttpHandler({
      connectionTimeout: 8_000,
      requestTimeout: 30_000,
      httpsAgent: new HttpsAgent({
        keepAlive: true,
        minVersion: "TLSv1.2",
        servername,
        family: 4,
      }),
    }),
  });
}
