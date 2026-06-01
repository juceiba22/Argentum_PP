import React, { createContext, useContext, useState } from 'react';

const ActivityContext = createContext();

export const ActivityProvider = ({ children }) => {
  const [activity, setActivity] = useState({
    ultimoCliente: null,
    ultimoPedido: null,
    ultimaActualizacion: null,
  });

  const logCliente = (cliente) => setActivity(prev => ({ ...prev, ultimoCliente: { ...cliente, time: new Date() } }));
  const logPedido = (pedido) => setActivity(prev => ({ ...prev, ultimoPedido: { ...pedido, time: new Date() } }));
  const logActualizacion = (update) => setActivity(prev => ({ ...prev, ultimaActualizacion: { ...update, time: new Date() } }));

  return (
    <ActivityContext.Provider value={{ activity, logCliente, logPedido, logActualizacion }}>
      {children}
    </ActivityContext.Provider>
  );
};

export const useActivity = () => useContext(ActivityContext);
