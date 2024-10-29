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
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const SQL = await initiate_postgres(env);

    if (request.method == "GET" && request.url.endsWith("/api/products")) {
      let data_request = await fetch(
        `https://02557f4d-8f03-405d-a4e7-7a6483d26a04.mock.pstmn.io/get`
      );

      if (!data_request.ok) {
        return new Response(
          JSON.stringify({ err: "Failed to fetch data from source." }),
          {
            status: 502,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      let data_result = (await data_request.json()) as {
        products: RawProductsData[];
      };

      if ((data_result.products?.length ?? 0) == 0) {
        return new Response(
          JSON.stringify({ err: "Data source returned 0 rows" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const PRODUCTS_LIST: Products[] = [];

      for (let i = 0; i < data_result.products.length; i++) {
        let current_product = data_result.products[i];
        for (let j = 0; j < current_product.variants.length; j++) {
          let current_variant = current_product.variants[j];
          let new_product: Products = {
            id: current_product.id,
            title: `${current_product.title} - ${current_variant.title}`,
            tags: current_product.tags?.split(",").map((x) => x.trim()),
            created_at: current_product.created_at,
            updated_at: current_product.updated_at,
            sku: current_variant.sku,
          };
          PRODUCTS_LIST.push(new_product);
        }
      }

      const SQL_INSERT_RESULT = await SQL.begin(async (sql_transaction) => {
        const INSERT_QUERY = `
			INSERT INTO products (
				id,
				title,
				tags,
				created_at,
				updated_at,
				sku
			)
			VALUES( $1, $2, $3, $4, $5, $6 )
			RETURNING *
		`;

        let insert_return_response: Products[] = [];
        for (let i = 0; i < PRODUCTS_LIST.length; i++) {
          let current_product = PRODUCTS_LIST[i];
          let result: Products[] = await sql_transaction.unsafe(
            INSERT_QUERY,
            Object.values(current_product)
          );

          insert_return_response = [...insert_return_response, ...result];
        }

        return insert_return_response;
      });

      return new Response(
        JSON.stringify({
          success: "Data successfull retrieved from source and saved",
          result: SQL_INSERT_RESULT,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else if (
      request.method == "POST" &&
      request.url.endsWith("/api/products")
    ) {
      let request_body: { products: RawProductsData[] } =
        (await request.json()) as { products: RawProductsData[] };

      if ((request_body.products?.length ?? 0) == 0) {
        return new Response(
          JSON.stringify({ err: "Data source returned 0 rows" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const PRODUCTS_LIST: Products[] = [];

      for (let i = 0; i < request_body.products.length; i++) {
        let current_product = request_body.products[i];
        for (let j = 0; j < current_product.variants.length; j++) {
          let current_variant = current_product.variants[j];
          let new_product: Products = {
            ProductID: current_product.id,
            Title: `${current_product.title} - ${current_variant.title}`,
            Tags: current_product.tags?.split(",").map((x) => x.trim()),
            CreatedAt: current_product.created_at,
            UpdatedAt: current_product.updated_at,
            ProductCode: current_variant.sku,
          };
          PRODUCTS_LIST.push(new_product);
        }
      }

      const SQL_INSERT_RESULT = await SQL.begin(async (sql_transaction) => {
        const INSERT_QUERY = `
			  INSERT INTO products (
				  id,
				  title,
				  tags,
				  created_at,
				  updated_at,
				  sku
			  )
			  VALUES( $1, $2, $3, $4, $5, $6 )
			  RETURNING *
		  `;

        let insert_return_response: Products[] = [];
        for (let i = 0; i < PRODUCTS_LIST.length; i++) {
          let current_product = PRODUCTS_LIST[i];
          let result: Products[] = await sql_transaction.unsafe(
            INSERT_QUERY,
            Object.values(current_product)
          );

          insert_return_response = [...insert_return_response, ...result];
        }

        for (let i = 0; i < insert_return_response.length; i++) {
          let current = insert_return_response[i] as ProductsFetched;
          let converted = ConvertObjectInterface<
            ProductsFetched,
            ProductsPosted
          >(current, ProductsFetchedToPostedMapping as any);
          console.log(converted);
          insert_return_response[i] = converted;
        }

        return insert_return_response;
      });

      return new Response(
        JSON.stringify({
          success: "Products successfully saved.",
          result: SQL_INSERT_RESULT,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else if (
      request.method == "DELETE" &&
      request.url.includes("/api/products/")
    ) {
      const CURRENT_URL = new URL(request.url);
      const URL_PATH_VARIABLES = CURRENT_URL.pathname
        .replace("/api/products/", "")
        .split("/");

      if (URL_PATH_VARIABLES.length == 0) {
        return new Response(JSON.stringify({ err: "Missing product ID." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      const PRODUCT_ID = URL_PATH_VARIABLES[0];

      const SQL_DELETE_RESULT =
        await SQL`DELETE FROM products where id = ${PRODUCT_ID}`;

      if (SQL_DELETE_RESULT.count == 0) {
        return new Response(
          JSON.stringify({
            err: "Requested record does not exists or no longer available",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: "Product was successfully deleted.",
          records_affected: SQL_DELETE_RESULT.count,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else if (
      request.method == "PUT" &&
      request.url.includes("/api/products/")
    ) {
      const SQL_UPDATE_RESULT = await SQL.begin(async (sql_transaction) => {
        const SQL_RESULT = await sql_transaction`UPDATE products
							SET
								title = CONCAT(title, ' ', sku)
							RETURNING *
						`;

        return { affected_records: SQL_RESULT.count, data: SQL_RESULT };
      });

      if (SQL_UPDATE_RESULT.affected_records == 0) {
        return new Response(
          JSON.stringify({
            err: "Requested record does not exists or no longer available",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: "Product was successfully updated.",
          records_affected: SQL_UPDATE_RESULT.affected_records,
          data: SQL_UPDATE_RESULT.data,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else {
      return new Response(JSON.stringify({ err: "Route not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
