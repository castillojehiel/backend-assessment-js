import { PostgresType, Sql } from "postgres";
import {
  Products,
  ProductsFetched,
  ProductsFetchedToPostedMapping,
  ProductsPosted,
} from "../interface/products";
import { ConvertObjectInterface, FunctionResponse } from "../utils/utils";
import {
  fetchRawProductsData,
  transformRawProductDataToFormat,
  transformRawProductDataToFormat_POST,
} from "./raw-products-controller";
import { RawProductsData } from "../interface/raw-products";

export async function saveNewProducts(
  payload: Products[],
  SQL: Sql<any>
): Promise<FunctionResponse<Products[]>> {
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

    let insert_return_response: Products[] = []; // * main response object

    for (const PRODUCT of payload) {
      let result: Products[] = await sql_transaction.unsafe(
        INSERT_QUERY,
        Object.values(PRODUCT)
      );

      insert_return_response = [...insert_return_response, ...result];
    }

    return {
      count: insert_return_response.length,
      data: insert_return_response,
    };
  });

  return {
    data: SQL_INSERT_RESULT.data,
    affected_records_count: SQL_INSERT_RESULT.count,
  };
}

export function TransformProductDataFromFetchedToPostedFormat(
  data_to_transform: Products[],
  mapping: any
) {
  for (let i = 0; i < data_to_transform.length; i++) {
    let current = data_to_transform[i] as ProductsFetched;
    let converted = ConvertObjectInterface<ProductsFetched, ProductsPosted>(
      current,
      mapping as any
    );

    data_to_transform[i] = converted;
  }

  return data_to_transform;
}

export async function fetchAndInsertProducts(
  request: Request<unknown, CfProperties<unknown>>,
  SQL: Sql<any>,
  options: {
    FETCH_RAW_PRODUCT_DATASOURCE_URL: string;
  }
) {
  try {
    const requested_data = await fetchRawProductsData(
      options.FETCH_RAW_PRODUCT_DATASOURCE_URL
    );
    if (requested_data.err) {
      return new Response(JSON.stringify(requested_data), {
        status: requested_data.code ?? 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const DATA_RESULT = requested_data.data ?? { products: [] };

    // * transforms raw product details to acceptable format
    const PRODUCTS_LIST: Products[] = transformRawProductDataToFormat(
      DATA_RESULT.products
    );
    if (PRODUCTS_LIST.length == 0) {
      return new Response(
        JSON.stringify({
          err: "No Data",
          message: "There is no data to save.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // * insert records to database
    const SQL_INSERT_RESULT = await saveNewProducts(PRODUCTS_LIST, SQL);
    if (SQL_INSERT_RESULT.err) {
      return new Response(JSON.stringify(SQL_INSERT_RESULT), {
        status: SQL_INSERT_RESULT.code ?? 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: "Data successfull retrieved from source and saved",
        affected_records_count: SQL_INSERT_RESULT.affected_records_count,
        data: SQL_INSERT_RESULT.data,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.log(err);
    return new Response(
      JSON.stringify({
        err: "Server Error",
        message: "An unexpected error has occured in the server.",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  } finally {
    await SQL.end;
  }
}

export async function POSTInsertNewProducts(
  request: Request<unknown, CfProperties<unknown>>,
  SQL: Sql<any>
) {
  try {
    let request_body: { products: RawProductsData[] } =
      (await request.json()) as { products: RawProductsData[] };

    if ((request_body.products?.length ?? 0) == 0) {
      return new Response(
        JSON.stringify({
          err: "No request body",
          message: "Please provide new product details for saving.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const PRODUCTS_LIST: Products[] = transformRawProductDataToFormat_POST(
      request_body.products
    );

    const SQL_INSERT_RESULT = await saveNewProducts(PRODUCTS_LIST, SQL);

    let response_data = TransformProductDataFromFetchedToPostedFormat(
      SQL_INSERT_RESULT.data as ProductsFetched[],
      ProductsFetchedToPostedMapping
    );

    return new Response(
      JSON.stringify({
        success: "Products successfully saved.",
        affected_records_count: SQL_INSERT_RESULT.affected_records_count,
        data: response_data,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.log(err);
    return new Response(
      JSON.stringify({
        err: "Server Error",
        message: "An unexpected error has occured in the server.",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  } finally {
    await SQL.end;
  }
}

export async function DeleteProduct(
  request: Request<unknown, CfProperties<unknown>>,
  SQL: Sql<any>
) {
  try {
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
  } catch (err) {
    console.log(err);
    return new Response(
      JSON.stringify({
        err: "Server Error",
        message: "An unexpected error has occured in the server.",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  } finally {
    await SQL.end;
  }
}

export async function UpdateProducts(
  request: Request<unknown, CfProperties<unknown>>,
  SQL: Sql<any>
) {
  try {
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
  } catch (err) {
    console.log(err);
    return new Response(
      JSON.stringify({
        err: "Server Error",
        message: "An unexpected error has occured in the server.",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  } finally {
    await SQL.end;
  }
}
