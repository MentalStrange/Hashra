const paginateResponse = async (res, query, data, totalRecords) => {
  
  const page = parseInt(query.page) || 1; // Default to page 1 if not provided
  const limit = parseInt(query.limit) || 10; // Default to 10 items per page if not provided
  const skip = (page - 1) * limit;

  const totalPages = Math.ceil(totalRecords / limit);
  const currentPage = page;

  const startIndex = skip;
  const endIndex = Math.min(startIndex + limit - 1, totalRecords - 1);

  const result = {
    status: "success",
    data: data,
    totalRecords: totalRecords,
    totalPages: totalPages,
    currentPage: currentPage,
    endIndex: endIndex,
    limit: limit,
  };

  res.status(200).json(result);
};

export default paginateResponse;
