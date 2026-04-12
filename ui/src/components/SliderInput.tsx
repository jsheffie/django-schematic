interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  leftLabel?: string;
  rightLabel?: string;
}

export default function SliderInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
  leftLabel,
  rightLabel,
}: Props) {
  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(parseFloat(e.target.value));
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = parseFloat(e.target.value);
    if (!isNaN(raw)) {
      onChange(Math.min(max, Math.max(min, raw)));
    }
  }

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-gray-700">{label}</span>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={handleInput}
          className="w-20 text-xs text-right border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-blue-400"
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleSlider}
        className="w-full h-1.5 accent-blue-500 cursor-pointer"
      />
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between mt-0.5">
          <span className="text-[10px] text-gray-400">{leftLabel}</span>
          <span className="text-[10px] text-gray-400">{rightLabel}</span>
        </div>
      )}
    </div>
  );
}
