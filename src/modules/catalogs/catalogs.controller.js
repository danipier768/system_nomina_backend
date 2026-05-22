const { fetchCatalogList } = require("./catalogs.helpers");

// Obtiene el catalogo de cargos para poblar selects del frontend.
const getAllCargos = async (req, res) => {
  try {
    const result = await fetchCatalogList(
      `SELECT id_cargo, nombre_cargo
       FROM cargos 
       ORDER BY nombre_cargo`
    );

    res.json({
      success: true,
      data: result.data,
      count: result.count,
    });
  } catch (error) {
    console.error("Error al obtener cargos:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener cargos",
    });
  }
};

// Obtiene el catalogo de departamentos para poblar selects del frontend.
const getAllDepartamentos = async (req, res) => {
  try {
    const result = await fetchCatalogList(
      `SELECT id_departamento, nombre_departamento 
       FROM departamentos 
       ORDER BY nombre_departamento`
    );

    res.json({
      success: true,
      data: result.data,
      count: result.count,
    });
  } catch (error) {
    console.error("Error al obtener departamentos:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener departamentos",
    });
  }
};

// Obtiene el catalogo de roles para formularios de administracion.
const getAllRoles = async (req, res) => {
  try {
    const result = await fetchCatalogList(
      `SELECT id_rol, nombre_rol 
       FROM roles 
       ORDER BY nombre_rol`
    );

    res.json({
      success: true,
      data: result.data,
      count: result.count,
    });
  } catch (error) {
    console.error("Error al obtener roles:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener roles",
    });
  }
};

module.exports = {
  getAllCargos,
  getAllDepartamentos,
  getAllRoles,
};
