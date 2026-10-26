import React from 'react';

/** Lista numerada de passos do manual. */
export default function ManualSteps({ steps }) {
  if (!steps?.length) return null;
  return (
    <ol className="space-y-4">
      {steps.map((step, index) => (
        <li key={index} className="flex gap-4">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-semibold text-white">
            {index + 1}
          </div>
          <div className="pt-1">
            <p className="text-sm font-semibold text-slate-900">{step.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}