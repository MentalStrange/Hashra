export const searchProducts = async (products, search) => {  
  if (search) {
    const filteredProducts = products.filter(product => 
      product.title.toLowerCase().includes(search.toLowerCase())
    );
    return filteredProducts || []; // Return empty array if no products are found
  }
  return products;
};
