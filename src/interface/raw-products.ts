export interface RawProductsData {
  id: Number;
  title: string;
  body_html: string | null;
  vendor: string;
  product_type: string;
  created_at: Date;
  handle: string;
  updated_at: Date;
  published_at: Date;
  template_suffix: string | null;
  published_scope: string | null;
  tags: string;
  status: string;
  admin_graphql_api_id: string;
  variants: RawProductsVariantsData[];
  options: RawProductsOptionsData[];
  images: RawProductsImagesData[];
  image: RawProductsImagesData;
}

export interface RawProductsVariantsData {
  id: Number;
  product_id: Number;
  title: string;
  price: Number;
  position: string;
  inventory_policy: string;
  compare_at_price: Number;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  created_at: Date;
  updated_at: Date;
  taxable: Boolean;
  barcode: string;
  fulfillment_service: string;
  grams: Number;
  inventory_management: string;
  requires_shipping: Boolean;
  sku: string;
  weight: Number;
  weight_unit: string;
  inventory_item_id: Number;
  inventory_quantity: Number;
  old_inventory_quantity: Number;
  tax_code: string;
  admin_graphql_api_id: string;
  image_id: string | null;
}

export interface RawProductsOptionsData {
  id: Number;
  product_id: number;
  name: string;
  position: string;
  values: string[];
}

export interface RawProductsImagesData {
  id: Number;
  alt: string;
  position: Number;
  product_id: Number;
  created_at: Date;
  updated_at: Date;
  admin_graphql_api_id: string;
  width: Number;
  height: Number;
  src: string;
  variant_ids: string[];
}
