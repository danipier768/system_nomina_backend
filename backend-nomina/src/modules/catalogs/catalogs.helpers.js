const { pool } = require("../../config/database.js");

// Ejecuta una consulta de catalogo simple y devuelve data mas count.
const fetchCatalogList = async (query) => {
  const [rows] = await pool.query(query);

  return {
    data: rows,
    count: rows.length,
  };
};

module.exports = {
  fetchCatalogList,
};
