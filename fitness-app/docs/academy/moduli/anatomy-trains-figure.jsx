import React, { useState } from 'react';

const AnatomyTrainsFigures = () => {
  const [selectedLine, setSelectedLine] = useState('SBL');
  
  const lines = {
    SBL: {
      name: 'Linea Posteriore Superficiale',
      color: '#0066CC',
      bgColor: '#E6F0FF',
      structures: [
        { name: 'Galea capitis', y: 5 },
        { name: 'Suboccipitali', y: 12, relay: true },
        { name: 'Erettori spinali', y: 25 },
        { name: 'Fascia toracolombare', y: 38 },
        { name: 'Leg. sacrotuberoso', y: 48, relay: true },
        { name: 'Ischiocrurali', y: 58 },
        { name: 'Gastrocnemio', y: 72, relay: true },
        { name: 'Tendine Achille', y: 82 },
        { name: 'Fascia plantare', y: 92 }
      ],
      function: 'Estensione del corpo, postura eretta',
      stretch: 'Downward Dog',
      contract: 'Cobra'
    },
    SFL: {
      name: 'Linea Frontale Superficiale',
      color: '#CC0000',
      bgColor: '#FFE6E6',
      structures: [
        { name: 'Galea anteriore', y: 5 },
        { name: 'SCOM', y: 12 },
        { name: 'Fascia sternale', y: 22 },
        { name: 'Retto addominale', y: 35 },
        { name: 'Pube', y: 48, relay: true, note: 'DIVISIONE' },
        { name: 'Quadricipite', y: 62 },
        { name: 'Rotula', y: 75, relay: true },
        { name: 'Tibiale anteriore', y: 85 },
        { name: 'Estensori dita', y: 95 }
      ],
      function: 'Flessione tronco, protezione anteriore',
      stretch: 'Cobra / Wheel',
      contract: 'Forward Fold'
    },
    LL: {
      name: 'Linea Laterale',
      color: '#009933',
      bgColor: '#E6FFE6',
      structures: [
        { name: 'Splenius', y: 8 },
        { name: 'Scaleni', y: 15 },
        { name: 'Intercostali', y: 28 },
        { name: 'Obliqui', y: 42 },
        { name: 'Cresta iliaca', y: 52, relay: true },
        { name: 'TFL + ITB', y: 65, note: 'NON ALLUNGABILE' },
        { name: 'Peroneali', y: 82 },
        { name: 'Base 5° metatarso', y: 95 }
      ],
      function: 'Flessione laterale, stabilizzazione',
      stretch: 'Gate Pose',
      contract: 'Side Plank'
    },
    SL: {
      name: 'Linea Spirale',
      color: '#FF6600',
      bgColor: '#FFF0E6',
      structures: [
        { name: 'Splenius (dx)', y: 5 },
        { name: 'Romboidi (sx)', y: 15, note: 'INCROCIO' },
        { name: 'Dentato ant. (sx)', y: 25 },
        { name: 'Obliquo est. (sx)', y: 38 },
        { name: 'Obliquo int. (dx)', y: 48, note: 'INCROCIO' },
        { name: 'TFL (dx)', y: 58 },
        { name: 'Tibiale ant. (dx)', y: 72 },
        { name: 'Peroneo lungo (dx)', y: 85 },
        { name: 'Bicipite fem. (dx)', y: 95 }
      ],
      function: 'Rotazione, controllo camminata',
      stretch: 'Revolved Triangle',
      contract: 'Bicycle Crunch'
    },
    DFL: {
      name: 'Linea Frontale Profonda',
      color: '#660099',
      bgColor: '#F0E6FF',
      structures: [
        { name: 'Fascia faringea', y: 5 },
        { name: 'Prevertebrali', y: 12 },
        { name: 'Scaleni', y: 18 },
        { name: 'Mediastino', y: 28 },
        { name: 'DIAFRAMMA', y: 38, relay: true, note: 'CENTRALE' },
        { name: 'PSOAS', y: 50, relay: true, note: 'MUSCOLO ANIMA' },
        { name: 'Pavimento pelvico', y: 60 },
        { name: 'Adduttori', y: 72 },
        { name: 'Tibiale posteriore', y: 85 },
        { name: 'Flessori lunghi', y: 95 }
      ],
      function: 'Core miofasciale, respiro, sostegno viscerale',
      stretch: 'Supported Bridge',
      contract: 'Happy Baby'
    }
  };

  const current = lines[selectedLine];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
        ANATOMY TRAINS - Figure Anatomiche
      </h1>
      <p className="text-center text-gray-500 mb-6">Mind Movement Coach® - Francesco Busanca</p>
      
      {/* Selettore catene */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {Object.entries(lines).map(([key, line]) => (
          <button
            key={key}
            onClick={() => setSelectedLine(key)}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              selectedLine === key 
                ? 'text-white shadow-lg scale-105' 
                : 'text-gray-600 bg-white hover:bg-gray-100'
            }`}
            style={{ 
              backgroundColor: selectedLine === key ? line.color : undefined,
              borderColor: line.color,
              borderWidth: 2
            }}
          >
            {key}
          </button>
        ))}
      </div>

      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
        {/* Figura anatomica */}
        <div 
          className="rounded-xl p-6 shadow-lg"
          style={{ backgroundColor: current.bgColor }}
        >
          <h2 
            className="text-xl font-bold mb-4 text-center"
            style={{ color: current.color }}
          >
            {selectedLine}: {current.name}
          </h2>
          
          {/* Corpo stilizzato con catena */}
          <div className="relative h-96 bg-white rounded-lg overflow-hidden">
            {/* Silhouette corpo */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-20">
              <ellipse cx="50" cy="8" rx="8" ry="6" fill="#333" />
              <rect x="45" y="14" width="10" height="8" fill="#333" />
              <path d="M35 22 Q30 40 35 55 L40 70 L60 70 L65 55 Q70 40 65 22 Z" fill="#333" />
              <path d="M40 70 L38 90 L42 95" stroke="#333" strokeWidth="4" fill="none" />
              <path d="M60 70 L62 90 L58 95" stroke="#333" strokeWidth="4" fill="none" />
            </svg>
            
            {/* Linea della catena */}
            <div 
              className="absolute left-1/2 transform -translate-x-1/2 w-1"
              style={{ 
                backgroundColor: current.color,
                top: '5%',
                height: '90%',
                opacity: 0.6
              }}
            />
            
            {/* Punti strutture */}
            {current.structures.map((struct, i) => (
              <div
                key={i}
                className="absolute transform -translate-x-1/2 flex items-center gap-2"
                style={{ 
                  left: '50%',
                  top: `${struct.y}%`
                }}
              >
                <div 
                  className={`w-4 h-4 rounded-full border-2 ${struct.relay ? 'ring-2 ring-offset-1' : ''}`}
                  style={{ 
                    backgroundColor: struct.relay ? '#FF6600' : current.color,
                    borderColor: struct.relay ? '#FF6600' : current.color,
                    ringColor: '#FF6600'
                  }}
                />
                <span 
                  className="text-xs font-medium whitespace-nowrap bg-white px-1 rounded shadow-sm"
                  style={{ color: struct.relay ? '#FF6600' : current.color }}
                >
                  {struct.name}
                  {struct.note && <span className="text-red-500 ml-1">({struct.note})</span>}
                </span>
              </div>
            ))}
          </div>
          
          {/* Legenda */}
          <div className="mt-4 flex justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: current.color }} />
              <span>Struttura</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-orange-500 ring-2 ring-offset-1 ring-orange-500" />
              <span>Relè</span>
            </div>
          </div>
        </div>

        {/* Info box */}
        <div className="space-y-4">
          {/* Funzione */}
          <div className="bg-white rounded-xl p-4 shadow-lg">
            <h3 className="font-bold text-gray-700 mb-2">📌 FUNZIONE PRINCIPALE</h3>
            <p className="text-gray-600">{current.function}</p>
          </div>

          {/* Posizioni */}
          <div className="grid grid-cols-2 gap-4">
            <div 
              className="rounded-xl p-4 shadow-lg"
              style={{ backgroundColor: current.bgColor }}
            >
              <h3 className="font-bold mb-2" style={{ color: current.color }}>
                🧘 ALLUNGAMENTO
              </h3>
              <p className="text-2xl font-bold text-gray-800">{current.stretch}</p>
            </div>
            <div className="bg-gray-800 text-white rounded-xl p-4 shadow-lg">
              <h3 className="font-bold mb-2">💪 CONTRAZIONE</h3>
              <p className="text-2xl font-bold">{current.contract}</p>
            </div>
          </div>

          {/* Tabella percorso */}
          <div className="bg-white rounded-xl p-4 shadow-lg">
            <h3 className="font-bold text-gray-700 mb-3">🚂 PERCORSO COMPLETO</h3>
            <div className="space-y-1">
              {current.structures.map((struct, i) => (
                <div 
                  key={i}
                  className={`flex items-center gap-2 p-1 rounded ${struct.relay ? 'bg-orange-50' : ''}`}
                >
                  <span className="text-gray-400 text-xs w-4">{i+1}</span>
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: struct.relay ? '#FF6600' : current.color }}
                  />
                  <span className={`text-sm ${struct.relay ? 'font-bold text-orange-600' : 'text-gray-700'}`}>
                    {struct.name}
                  </span>
                  {struct.note && (
                    <span className="text-xs text-red-500 ml-auto">⚠ {struct.note}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mind Movement Integration */}
          <div className="bg-purple-900 text-white rounded-xl p-4 shadow-lg">
            <h3 className="font-bold mb-2">🧠 INTEGRAZIONE MIND MOVEMENT</h3>
            <p className="text-sm text-purple-200">
              {selectedLine === 'SBL' && 'Sequenze 1, 4, 5, 9 • Frequenza 396 Hz'}
              {selectedLine === 'SFL' && 'Sequenze 2, 3, 8 • Frequenza 528 Hz'}
              {selectedLine === 'LL' && 'Ba Duan Jin 1, 3 • Frequenza 639 Hz'}
              {selectedLine === 'SL' && 'Ba Duan Jin 4, 5 • Frequenza 741 Hz'}
              {selectedLine === 'DFL' && 'Sequenze 1, 2, 4, 6, 8 (TUTTE) • Frequenza 256 Hz'}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-8 text-gray-400 text-sm">
        © Mind Movement Coach® - Francesco Busanca | Basato su Anatomy Trains di Thomas Myers
      </div>
    </div>
  );
};

export default AnatomyTrainsFigures;
