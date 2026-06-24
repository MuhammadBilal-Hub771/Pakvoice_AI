import React from 'react'

interface CityDot {
  name: string
  x: number
  y: number
  size?: number
}

const cities: CityDot[] = [
  { name: 'Karachi', x: 170, y: 305, size: 10 },
  { name: 'Lahore', x: 270, y: 190, size: 9 },
  { name: 'Islamabad', x: 260, y: 145, size: 8 },
  { name: 'Peshawar', x: 215, y: 120, size: 7 },
  { name: 'Quetta', x: 110, y: 225, size: 7 },
  { name: 'Faisalabad', x: 260, y: 200, size: 6 },
  { name: 'Multan', x: 250, y: 230, size: 6 },
  { name: 'Rawalpindi', x: 262, y: 155, size: 5 },
  { name: 'Hyderabad', x: 175, y: 285, size: 5 },
  { name: 'Gujranwala', x: 272, y: 180, size: 5 },
]

interface PakistanMapSVGProps {
  className?: string
  selectedCity?: string
  onCitySelect?: (city: string) => void
  showAsStats?: boolean
  cityCounts?: Record<string, number>
}

export const PakistanMapSVG = React.memo(({
  className = '',
  selectedCity,
  onCitySelect,
  showAsStats = false,
  cityCounts,
}: PakistanMapSVGProps) => (
  <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="mapGreen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#0c4d2f" />
        <stop offset="100%" stopColor="#16a34a" />
      </linearGradient>
    </defs>

    {/* Simplified Pakistan outline */}
    <path
      d="M180 30 L200 25 L220 28 L240 35 L260 40 L280 45 L290 55 L295 65 L300 75
         L305 85 L300 95 L295 105 L290 115 L285 125 L280 130 L275 135 L270 140
         L265 145 L260 150 L250 155 L245 160 L240 165 L235 170 L230 175 L225 180
         L220 185 L215 190 L210 195 L205 200 L200 205 L195 210 L190 215 L185 220
         L180 225 L175 230 L170 235 L165 240 L160 245 L155 250 L150 255 L145 260
         L140 265 L135 270 L130 275 L125 280 L120 285 L115 290 L110 295 L105 300
         L100 305 L95 310 L90 315 L85 320 L80 325 L75 330 L70 335 L65 340
         L60 345 L55 350 L60 340 L65 330 L70 320 L75 310 L80 300
         L85 290 L90 280 L95 270 L100 260 L105 250 L110 240 L115 230 L120 220
         L125 210 L130 200 L135 190 L140 180 L145 170 L150 160 L155 150
         L160 140 L165 130 L170 120 L175 110 L180 100 L185 90 L190 80
         L195 70 L200 60 L205 50 L210 40 L215 35 L220 30 L230 25 L240 22
         L250 20 L260 22 L270 25 L280 30 L290 35 L300 45 L310 55 L320 65
         L330 75 L340 85 L345 95 L350 105 L345 110 L340 115 L335 120 L330 125
         L325 130 L320 135 L315 140 L310 145 L305 150 L300 155 L295 160
         L290 165 L285 170 L280 165 L275 160 L270 155 L265 150 L260 145
         L255 140 L250 135 L245 130 L240 125 L235 120 L230 115 L225 110
         L220 105 L215 100 L210 95 L205 90 L200 85 L195 80 L190 75 L185 70
         L180 65 L175 60 L170 55 L165 50 L160 45 L165 40 L170 35 L175 30 Z"
      fill={showAsStats ? 'currentColor' : 'url(#mapGreen)'}
      opacity={showAsStats ? 0.15 : 0.3}
    />

    {/* East/West borders context */}
    <path d="M340 85 L350 75 L355 65" stroke="#16a34a" strokeWidth="1" opacity="0.2" fill="none" />

    {/* City dots */}
    {cities.map((city) => {
      const isSelected = selectedCity === city.name
      const count = cityCounts?.[city.name]
      const maxCount = cityCounts ? Math.max(...Object.values(cityCounts)) : 1
      const size = showAsStats && count ? 5 + (count / maxCount) * 15 : city.size || 6

      return (
        <g
          key={city.name}
          onClick={() => onCitySelect?.(city.name)}
          style={{ cursor: onCitySelect ? 'pointer' : 'default' }}
          className="transition-transform duration-200"
        >
          {showAsStats && count && count > 0 && (
            <text
              x={city.x}
              y={city.y - size - 8}
              textAnchor="middle"
              fill="currentColor"
              fontSize="10"
              opacity="0.7"
            >
              {count}
            </text>
          )}
          <circle
            cx={city.x}
            cy={city.y}
            r={showAsStats ? size / 2 : size / 2}
            fill={isSelected ? '#d4af37' : '#16a34a'}
            stroke="white"
            strokeWidth="2"
            opacity={isSelected ? 1 : 0.8}
          >
            {!showAsStats && (
              <animate
                attributeName="r"
                values={isSelected ? '5;7;5' : '3;4;3'}
                dur="2s"
                repeatCount="indefinite"
              />
            )}
          </circle>
          {isSelected && (
            <circle
              cx={city.x}
              cy={city.y}
              r={8}
              fill="none"
              stroke="#d4af37"
              strokeWidth="1.5"
              opacity="0.5"
            >
              <animate attributeName="r" values="5;12;5" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0;0.5" dur="1.5s" repeatCount="indefinite" />
            </circle>
          )}
          <text
            x={city.x}
            y={city.y + (showAsStats ? size / 2 + 14 : 14)}
            textAnchor="middle"
            fill="currentColor"
            fontSize="9"
            fontWeight={isSelected ? 'bold' : 'normal'}
            opacity={isSelected ? 1 : 0.6}
          >
            {city.name}
          </text>
        </g>
      )
    })}
  </svg>
))
PakistanMapSVG.displayName = 'PakistanMapSVG'
