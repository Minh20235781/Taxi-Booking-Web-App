interface BookingStepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
  title: string;
}

export function BookingStepIndicator({
  currentStep,
  totalSteps = 6,
  title
}: BookingStepIndicatorProps) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-gray-500 mb-2">
        STEP {currentStep}/{totalSteps}
      </p>
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-2 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-2 bg-black rounded-full transition-all"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}
