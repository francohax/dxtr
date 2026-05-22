import { DamageCalculator } from "./_components/DamageCalculator";

export default function CalculatorPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Damage Calculator</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Simulate damage at level 50 with base stats.
        </p>
      </div>
      <div className="max-w-xl">
        <DamageCalculator />
      </div>
    </div>
  );
}
