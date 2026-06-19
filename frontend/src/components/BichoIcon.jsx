export function BichoIcon({ shape, color, size = 48 }) {
  const eyeY = size * 0.42
  const eyeR = size * 0.06
  const leftEyeX = size * 0.38
  const rightEyeX = size * 0.62

  const eyes = (
    <>
      <circle cx={leftEyeX} cy={eyeY} r={eyeR} fill="#020203" />
      <circle cx={rightEyeX} cy={eyeY} r={eyeR} fill="#020203" />
    </>
  )

  if (shape === 'spiky') {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <polygon
          points={`${size * 0.5},${size * 0.08} ${size * 0.78},${size * 0.22} ${size * 0.92},${size * 0.5} ${size * 0.78},${size * 0.78} ${size * 0.5},${size * 0.92} ${size * 0.22},${size * 0.78} ${size * 0.08},${size * 0.5} ${size * 0.22},${size * 0.22}`}
          fill={color}
        />
        {eyes}
      </svg>
    )
  }

  if (shape === 'square') {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <rect x={size * 0.14} y={size * 0.14} width={size * 0.72} height={size * 0.72} rx={size * 0.16} fill={color} />
        {eyes}
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size * 0.5} cy={size * 0.5} r={size * 0.38} fill={color} />
      {eyes}
    </svg>
  )
}
