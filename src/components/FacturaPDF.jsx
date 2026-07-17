import React from 'react';
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    color: '#1a1a1a',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: '2px solid #1a1a1a',
  },
  leftHeader: { width: '38%' },
  centerHeader: {
    width: '24%',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeft: '1px solid #1a1a1a',
    borderRight: '1px solid #1a1a1a',
    paddingHorizontal: 8,
  },
  rightHeader: { width: '38%', paddingLeft: 12 },
  letterBox: {
    fontSize: 36,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  letterCode: {
    fontSize: 8,
    textAlign: 'center',
    marginTop: 2,
    color: '#666',
  },
  businessName: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  docTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  row: { flexDirection: 'row', marginBottom: 2 },
  bold: { fontWeight: 'bold', fontFamily: 'Helvetica-Bold' },
  label: {
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    color: '#555',
    width: 85,
  },
  clientBox: {
    marginBottom: 14,
    paddingBottom: 10,
    paddingTop: 8,
    borderBottom: '1px solid #ddd',
    backgroundColor: '#fafafa',
    padding: 10,
    borderRadius: 2,
  },
  table: { marginTop: 8, flex: 1 },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1.5px solid #1a1a1a',
    borderTop: '1.5px solid #1a1a1a',
    backgroundColor: '#f0f0f0',
    padding: 7,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottom: '0.5px solid #eee',
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: 6,
    borderBottom: '0.5px solid #eee',
    backgroundColor: '#fafafa',
  },
  colDesc: { flex: 4 },
  colQty: { flex: 1, textAlign: 'center' },
  colPrice: { flex: 1.5, textAlign: 'right' },
  colIVA: { flex: 1, textAlign: 'center' },
  colTotal: { flex: 1.5, textAlign: 'right' },
  totalsBox: {
    marginTop: 12,
    borderTop: '2px solid #1a1a1a',
    paddingTop: 10,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 220,
    marginBottom: 3,
  },
  totalLabel: { fontSize: 9, color: '#555' },
  totalValue: { fontSize: 9, textAlign: 'right' },
  grandTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTop: '1px solid #ddd',
    paddingTop: 10,
  },
  qrCode: { width: 90, height: 90 },
  caeBox: { textAlign: 'right' },
  watermark: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    color: '#999',
    textAlign: 'center',
    paddingVertical: 8,
    borderTop: '1px dashed #ccc',
    marginTop: 10,
  },
});

const formatNumber = (num) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(num);

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const TIPO_LETRA = {
  1: { letra: 'A', codigo: '001' },
  2: { letra: 'A', codigo: '002' },
  3: { letra: 'A', codigo: '003' },
  6: { letra: 'B', codigo: '006' },
  7: { letra: 'B', codigo: '007' },
  8: { letra: 'B', codigo: '008' },
  11: { letra: 'C', codigo: '011' },
};

const CONDICION_IVA_LABELS = {
  1: 'IVA Responsable Inscripto',
  4: 'IVA Sujeto Exento',
  5: 'Consumidor Final',
  6: 'Responsable Monotributo',
  13: 'Monotributista Social',
};

const EMISOR_DEFAULT = {
  nombre: 'ARGENTUM CARNES',
  eslogan: 'CALIDAD PREMIUM',
  domicilio: 'Av. General Paz 1234, CABA',
  cuit: '30-71112223-9',
  condicionIVA: 'Responsable Inscripto',
  inicioActividades: '01/10/2022',
  ingBrutos: '30-71112223-9',
  telefono: '11 4567-8901',
};

export const FacturaPDF = ({
  factura,
  qrCodeBase64,
  emisor = EMISOR_DEFAULT,
}) => {
  const tipoInfo = TIPO_LETRA[factura.tipo_cbte] ?? { letra: 'B', codigo: '006' };
  const nroCbte = String(factura.nro_cbte ?? 0).padStart(8, '0');
  const ptoVta = String(factura.punto_venta ?? 1).padStart(5, '0');
  const tieneCAE = Boolean(factura.cae);
  const esFacturaA = factura.tipo_cbte === 1;
  const condIVAReceptor = CONDICION_IVA_LABELS[factura.condicion_iva_receptor ?? 5] ?? 'Consumidor Final';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabecera */}
        <View style={styles.header}>
          <View style={styles.leftHeader}>
            <Text style={styles.businessName}>{emisor.nombre}</Text>
            {emisor.eslogan ? (
              <Text style={{ fontSize: 8, color: '#555', marginBottom: 4 }}>{emisor.eslogan}</Text>
            ) : null}
            <View style={styles.row}>
              <Text style={styles.label}>Domicilio:</Text>
              <Text>{emisor.domicilio}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Cond. IVA:</Text>
              <Text>{emisor.condicionIVA}</Text>
            </View>
            {emisor.telefono ? (
              <View style={styles.row}>
                <Text style={styles.label}>Tel.:</Text>
                <Text>{emisor.telefono}</Text>
              </View>
            ) : null}
          </View>

          {/* Letra del comprobante */}
          <View style={styles.centerHeader}>
            <Text style={styles.letterBox}>{tipoInfo.letra}</Text>
            <Text style={styles.letterCode}>Cód. {tipoInfo.codigo}</Text>
          </View>

          <View style={styles.rightHeader}>
            <Text style={styles.docTitle}>
              FACTURA {tipoInfo.letra}
            </Text>
            <View style={styles.row}>
              <Text style={styles.label}>Número:</Text>
              <Text>
                {ptoVta}-{nroCbte}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Fecha:</Text>
              <Text>{formatDate(factura.fecha_cbte)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>CUIT:</Text>
              <Text>{emisor.cuit}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Ing. Brutos:</Text>
              <Text>{emisor.ingBrutos ?? 'Exento'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Inicio Act.:</Text>
              <Text>{emisor.inicioActividades}</Text>
            </View>
          </View>
        </View>

        {/* Datos del Receptor */}
        <View style={styles.clientBox}>
          <View style={styles.row}>
            <Text style={styles.label}>Sr.(es):</Text>
            <Text>{factura.receptor_nombre ?? 'Consumidor Final'}</Text>
          </View>
          {factura.doc_nro && factura.doc_nro !== '0' && (
            <View style={styles.row}>
              <Text style={styles.label}>CUIT/DNI:</Text>
              <Text>{factura.doc_nro}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Cond. IVA:</Text>
            <Text>{condIVAReceptor}</Text>
          </View>
        </View>

        {/* Tabla de Items */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Producto / Servicio</Text>
            <Text style={styles.colQty}>Cant.</Text>
            <Text style={styles.colPrice}>Precio Unit.</Text>
            {esFacturaA && <Text style={styles.colIVA}>IVA %</Text>}
            <Text style={styles.colTotal}>Subtotal</Text>
          </View>

          {factura.items && factura.items.length > 0 ? (
            factura.items.map((item, idx) => (
              <View
                key={idx}
                style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              >
                <Text style={styles.colDesc}>{item.descripcion}</Text>
                <Text style={styles.colQty}>
                  {Number(item.cantidad).toFixed(2)}
                </Text>
                <Text style={styles.colPrice}>
                  {formatNumber(item.precio_unitario)}
                </Text>
                {esFacturaA && <Text style={styles.colIVA}>21%</Text>}
                <Text style={styles.colTotal}>
                  {formatNumber(item.cantidad * item.precio_unitario)}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <Text style={styles.colDesc}>
                {factura.descripcion ?? 'Venta General'}
              </Text>
              <Text style={styles.colQty}>1.00</Text>
              <Text style={styles.colPrice}>
                {formatNumber(
                  esFacturaA
                    ? factura.imp_neto ?? factura.imp_total
                    : factura.imp_total
                )}
              </Text>
              {esFacturaA && <Text style={styles.colIVA}>21%</Text>}
              <Text style={styles.colTotal}>
                {formatNumber(
                  esFacturaA
                    ? factura.imp_neto ?? factura.imp_total
                    : factura.imp_total
                )}
              </Text>
            </View>
          )}
        </View>

        {/* Totales */}
        <View style={styles.totalsBox}>
          {esFacturaA && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal Neto:</Text>
                <Text style={styles.totalValue}>
                  {formatNumber(factura.imp_neto ?? 0)}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>IVA 21%:</Text>
                <Text style={styles.totalValue}>
                  {formatNumber(factura.imp_iva ?? 0)}
                </Text>
              </View>
            </>
          )}
          <View style={[styles.totalRow, { marginTop: 4 }]}>
            <Text style={styles.grandTotal}>TOTAL:</Text>
            <Text style={styles.grandTotal}>
              {formatNumber(factura.imp_total)}
            </Text>
          </View>
        </View>

        {/* CAE + QR */}
        {tieneCAE ? (
          <View style={styles.footer}>
            <View>
              {qrCodeBase64 && (
                <View>
                  <Image source={{ uri: qrCodeBase64 }} style={styles.qrCode} />
                  <Text
                    style={{ fontSize: 6, color: '#999', marginTop: 2 }}
                  >
                    Consulte validez en www.afip.gob.ar/fe/qr
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.caeBox}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: 'bold',
                  fontFamily: 'Helvetica-Bold',
                  color: '#2d7d46',
                  marginBottom: 4,
                }}
              >
                ✓ Comprobante Autorizado
              </Text>
              <View style={styles.row}>
                <Text style={styles.bold}>CAE: </Text>
                <Text>{factura.cae}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.bold}>Vto. CAE: </Text>
                <Text>{formatDate(factura.cae_fch_vto ?? '')}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.footer}>
            <Text style={styles.watermark}>
              DOCUMENTO NO VÁLIDO COMO FACTURA — Sujeto a autorización ante
              ARCA/AFIP
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
};
export default FacturaPDF;
