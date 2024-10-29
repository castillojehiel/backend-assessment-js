/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { initiate_postgres } from "./database/connect";
import {
  Products,
  ProductsFetched,
  ProductsFetchedToPostedMapping,
  ProductsPosted,
} from "./interface/products";
import { RawProductsData } from "./interface/raw-products";
import {
  DeleteProduct,
  fetchAndInsertProducts,
  POSTInsertNewProducts,
  saveNewProducts,
  TransformProductDataFromFetchedToPostedFormat,
  UpdateProducts,
} from "./modules/products-controller";
import {
  fetchRawProductsData,
  transformRawProductDataToFormat,
  transformRawProductDataToFormat_POST,
} from "./modules/raw-products-controller";
import { ConvertObjectInterface } from "./utils/utils";

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
  //
  // Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
  // MY_SERVICE: Fetcher;
  DATABASE_HOST: string;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  DATABASE_NAME: string;
  DATABASE_TYPE: string;
  FETCH_RAW_PRODUCT_DATASOURCE_URL: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const SQL = await initiate_postgres(env);

    if (request.method == "GET" && request.url.endsWith("/api/products")) {
      /**
       * * Fetch raw product data from datasource and inserts into db
       * * METHOD : GET
       * * ROUTE : /api/products
       */
      return await fetchAndInsertProducts(request, SQL, {
        FETCH_RAW_PRODUCT_DATASOURCE_URL: env.FETCH_RAW_PRODUCT_DATASOURCE_URL,
      });
    } else if (
      request.method == "POST" &&
      request.url.endsWith("/api/products")
    ) {
      /**
       * * Insert new Product records via HTTP POST request
       * * METHOD : POST
       * * ROUTE : /api/products
       */
      return await POSTInsertNewProducts(request, SQL);
    } else if (
      request.method == "DELETE" &&
      request.url.includes("/api/products/")
    ) {
      /**
       * * Deletes product record via ID
       * * METHOD : DELETE
       * * ROUTE : /api/products/:product_id
       */
      return await DeleteProduct(request, SQL);
    } else if (
      request.method == "PUT" &&
      request.url.includes("/api/products/")
    ) {
      /**
       * * Updates all products record
       * * - append `sku` column value to 'title' column value
       * * METHOD : PUT
       * * ROUTE : /api/products/:product_id
       */
      return await UpdateProducts(request, SQL);
    } else {
      return new Response(JSON.stringify({ err: "Route not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
