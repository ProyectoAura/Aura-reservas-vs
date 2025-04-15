import React from "react";
import AgregarStock from "../components/AgregarStock";

const ControlStock = () => {
  return (
    <div className="p-4 text-white">
      <h1 className="text-2xl font-bold mb-4">Gestión de Stock</h1>
      <AgregarStock />
    </div>
  );
};

export default ControlStock;
