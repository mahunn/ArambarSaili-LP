import { ProductShowcase } from "@/components/product/product-showcase";
import { readProductData } from "@/lib/product-store";

export default async function HomePage() {
  const product = await readProductData();
  return <ProductShowcase product={product} />;
}
