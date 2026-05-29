export const MOCK_CLIENTES = [
  { id: '1', nombre: 'Empresa Alpha', email: 'contacto@alpha.com', telefono: '+54 11 1234-5678', createdAt: '2023-10-01' },
  { id: '2', nombre: 'Distribuidora Sur', email: 'ventas@d-sur.com.ar', telefono: '+54 11 8765-4321', createdAt: '2023-10-05' },
  { id: '3', nombre: 'Juan Pérez', email: 'juan.perez@gmail.com', telefono: '+54 9 11 5555-4444', createdAt: '2023-10-10' }
];

export const MOCK_PEDIDOS = [
  { id: '101', clienteId: '1', estado: 'Pendiente', total: 150000.00, createdAt: '2023-10-20' },
  { id: '102', clienteId: '1', estado: 'Pagado', total: 75000.50, createdAt: '2023-10-21' },
  { id: '103', clienteId: '2', estado: 'Enviado', total: 320000.00, createdAt: '2023-10-22' },
  { id: '104', clienteId: '3', estado: 'Entregado', total: 45000.00, createdAt: '2023-10-23' },
  { id: '105', clienteId: '2', estado: 'Cancelado', total: 10000.00, createdAt: '2023-10-24' }
];

// Helper functions to simulate an API
export const getClientes = () => Promise.resolve([...MOCK_CLIENTES]);
export const getPedidos = () => Promise.resolve([...MOCK_PEDIDOS]);
export const getPedidosConClientes = () => {
  const pedidosCompletos = MOCK_PEDIDOS.map(pedido => {
    const cliente = MOCK_CLIENTES.find(c => c.id === pedido.clienteId);
    return { ...pedido, clienteNombre: cliente ? cliente.nombre : 'Desconocido' };
  });
  return Promise.resolve(pedidosCompletos);
};
