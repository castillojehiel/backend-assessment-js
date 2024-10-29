export type Products = ProductsFetched | ProductsPosted;

export interface ProductsFetched {
  id: Number;
  title: String;
  tags: String | String[];
  created_at: Date;
  updated_at: Date;
  sku: String;
}

export interface ProductsPosted {
  ProductID: Number;
  Title: String;
  Tags: String | String[];
  CreatedAt: Date;
  UpdatedAt: Date;
  ProductCode: String;
}

export const ProductsFetchedToPostedMapping = {
  id: "ProductID",
  title: "Title",
  tags: "Tags",
  created_at: "CreatedAt",
  updated_at: "UpdatedAt",
  sku: "ProductCode",
};
