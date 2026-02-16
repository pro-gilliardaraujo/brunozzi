import React from 'react';

interface MapaIframeProps {
  coordenadas: Array<{
    equipamento: number | string;
    hora: string;
    lat: number;
    lng: number;
    status: string;
  }>;
  tipo: 'equipamento' | 'rtk';
}

export function MapaIframe({ coordenadas, tipo }: MapaIframeProps) {
  const [htmlContent, setHtmlContent] = React.useState<string>('');

  React.useEffect(() => {
    if (!coordenadas || coordenadas.length === 0) {
      setHtmlContent('<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:sans-serif;color:#666;">Sem dados de coordenadas</div>');
      return;
    }

    // Calcular centro do mapa
    const lats = coordenadas.map(c => c.lat);
    const lngs = coordenadas.map(c => c.lng);
    const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

    // Agrupar por equipamento ou status
    const grupos: Record<string, typeof coordenadas> = {};
    coordenadas.forEach(coord => {
      const key = tipo === 'equipamento' ? String(coord.equipamento) : coord.status;
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(coord);
    });

    // Cores para equipamentos
    const coresEquipamento = ['#00FFFF', '#FF00FF', '#FFFF00', '#FF4500', '#32CD32', '#1E90FF', '#FF1493', '#ADFF2F'];
    const coresRTK: Record<string, string> = { 'Ligado': 'green', 'Desligado': 'red' };

    // Gerar código JavaScript para as linhas
    let jsLinhas = '';
    Object.entries(grupos).forEach(([key, coords], index) => {
      const cor = tipo === 'equipamento' ? coresEquipamento[index % coresEquipamento.length] : coresRTK[key] || 'gray';
      const positions = coords.map(c => `[${c.lat}, ${c.lng}]`).join(',');
      const label = tipo === 'equipamento' ? `Frota ${key}` : `RTK: ${key}`;
      
      jsLinhas += `
        L.polyline([${positions}], {
          color: '${cor}',
          weight: 2,
          opacity: 0.8
        }).bindTooltip('${label}').addTo(map);
      `;
    });

    // Gerar HTML completo
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { width: 100%; height: 100vh; }
    .leaflet-control-attribution { display: none !important; }
    .legenda {
      position: absolute;
      bottom: 20px;
      right: 20px;
      background: rgba(255,255,255,0.9);
      padding: 10px;
      border-radius: 5px;
      box-shadow: 0 0 5px rgba(0,0,0,0.3);
      z-index: 1000;
      font-family: sans-serif;
      font-size: 12px;
    }
    .legenda-item {
      display: flex;
      align-items: center;
      margin: 5px 0;
    }
    .legenda-cor {
      width: 20px;
      height: 3px;
      margin-right: 8px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="legenda">
    <div style="font-weight:bold;margin-bottom:5px;">${tipo === 'equipamento' ? 'Frotas' : 'Uso do Piloto RTK'}</div>
    ${Object.entries(grupos).map(([key, _], index) => {
      const cor = tipo === 'equipamento' ? coresEquipamento[index % coresEquipamento.length] : coresRTK[key] || 'gray';
      const label = tipo === 'equipamento' ? key : (key === 'Ligado' ? 'Ligado' : 'Desligado');
      return `<div class="legenda-item"><div class="legenda-cor" style="background-color:${cor}"></div><span>${label}</span></div>`;
    }).join('')}
  </div>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([${centerLat}, ${centerLng}], 15);
    
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: ''
    }).addTo(map);
    
    ${jsLinhas}
    
    // Auto-fit bounds
    var bounds = L.latLngBounds([${coordenadas.map(c => `[${c.lat}, ${c.lng}]`).join(',')}]);
    map.fitBounds(bounds, { padding: [20, 20] });
  </script>
</body>
</html>
    `;

    setHtmlContent(html);
  }, [coordenadas, tipo]);

  return (
    <iframe
      srcDoc={htmlContent}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        borderRadius: '8px'
      }}
      title={tipo === 'equipamento' ? 'Mapa de Área Trabalhada' : 'Mapa de Uso GPS'}
    />
  );
}
