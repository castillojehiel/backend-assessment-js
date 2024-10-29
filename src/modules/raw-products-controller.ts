import { Products, ProductsPosted } from "../interface/products";
import { RawProductsData } from "../interface/raw-products";
import { FunctionResponse } from "../utils/utils";

export async function fetchRawProductsData(
  url: string
): Promise<FunctionResponse<{ products: RawProductsData[] }>> {
  try {
    let data_request = await fetch(url);

    if (!data_request.ok) {
      return {
        err: "Failed to fetch data from source.",
        code: 502,
        message: "An error has occured while retrieving data.",
      };
    }

    let data_result = (await data_request.json()) as {
      products: RawProductsData[];
    };

    console.log(data_result);

    if (data_result.products.length == 0) {
      return {
        err: "No Data.",
        code: 400,
        message: "There is no data available.",
      };
    }

    return {
      data: data_result,
    };
  } catch (err) {
    console.error(err);
    return {
      err: err?.toString(),
      code: 502,
      message: "An unexpected error has occured in the server.",
    };
  }
}

export function transformRawProductDataToFormat(
  raw_data: RawProductsData[]
): Products[] {
  let formatted_products_list: Products[] = [];

  for (const CURRENT_PRODUCT of raw_data) {
    for (const CURRENT_VARIANT of CURRENT_PRODUCT.variants) {
      let new_product: Products = {
        id: CURRENT_PRODUCT.id,
        title: `${CURRENT_PRODUCT.title} - ${CURRENT_VARIANT.title}`,
        tags: CURRENT_PRODUCT.tags?.split(",").map((x) => x.trim()),
        created_at: CURRENT_PRODUCT.created_at,
        updated_at: CURRENT_PRODUCT.updated_at,
        sku: CURRENT_VARIANT.sku,
      };

      formatted_products_list.push(new_product);
    }
  }

  return formatted_products_list;
}

export function transformRawProductDataToFormat_POST(
  raw_data: RawProductsData[]
): Products[] {
  let formatted_products_list: Products[] = [];

  for (const CURRENT_PRODUCT of raw_data) {
    for (const CURRENT_VARIANT of CURRENT_PRODUCT.variants) {
      let new_product: Products = {
        ProductID: CURRENT_PRODUCT.id,
        Title: `${CURRENT_PRODUCT.title} - ${CURRENT_VARIANT.title}`,
        Tags: CURRENT_PRODUCT.tags?.split(",").map((x) => x.trim()),
        CreatedAt: CURRENT_PRODUCT.created_at,
        UpdatedAt: CURRENT_PRODUCT.updated_at,
        ProductCode: CURRENT_VARIANT.sku,
      };

      formatted_products_list.push(new_product);
    }
  }

  return formatted_products_list;
}
