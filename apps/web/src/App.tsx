import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useFormLab } from '@formlab/react'
import './index.css'

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  title: z.string().min(1),
  desc: z.string().optional(),
  amount: z.string().min(1),
  duration: z.string().min(1),
})

type FormValues = z.infer<typeof schema>

const steps = ['Applicant', 'Project', 'Budget', 'Review']

export default function App() {
  const methods = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', title: '', desc: '', amount: '', duration: '' } })
  const lab = useFormLab({ form: methods, formId: 'grant-demo', schemaVersion: 1, exclude: ['secretNote'] })

  const [step, setStep] = useState(0)
  const draft = methods.watch()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
        <div className="font-semibold tracking-tight">FormLab</div>
        <div className="text-xs text-[var(--muted)]">draft: {lab.draftStatus} · submit: {lab.submissionStatus}</div>
      </header>

      <main className="flex-1 grid grid-cols-12 gap-0">
        <section className="col-span-7 border-r border-[var(--border)] p-4 flex flex-col gap-4">
          {lab.restorePreview?.status === 'available' && (
            <div className="border border-[var(--accent)] p-3 text-xs flex items-center justify-between">
              <span>Draft found. Restore?</span>
              <div className="flex gap-2">
                <button className="px-2 py-1 border border-[var(--border)]" onClick={lab.discard}>Discard</button>
                <button className="px-2 py-1 bg-[var(--accent)] text-black" onClick={lab.restore}>Restore</button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs">
            {steps.map((s, i) => (
              <div key={s} className={`px-2 py-1 border ${i === step ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--muted)]'}`}>
                {i + 1}. {s}
              </div>
            ))}
          </div>

          <div className="flex-1 space-y-3">
            {step === 0 && (
              <>
                <Field label="Full name" {...methods.register('name')} />
                <Field label="Email" {...methods.register('email')} />
              </>
            )}
            {step === 1 && (
              <>
                <Field label="Project title" {...methods.register('title')} />
                <Field label="Description" {...methods.register('desc')} />
              </>
            )}
            {step === 2 && (
              <>
                <Field label="Requested amount" {...methods.register('amount')} />
                <Field label="Duration (months)" {...methods.register('duration')} />
              </>
            )}
            {step === 3 && (
              <pre className="bg-[var(--panel)] border border-[var(--border)] p-3 text-xs overflow-auto">{JSON.stringify(draft, null, 2)}</pre>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button className="px-3 py-1.5 text-xs border border-[var(--border)] disabled:opacity-40" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>Back</button>
            {step < steps.length - 1 ? (
              <button className="px-3 py-1.5 text-xs bg-[var(--accent)] text-black" onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}>Next</button>
            ) : (
              <button className="px-3 py-1.5 text-xs bg-[var(--success)] text-black" onClick={lab.submit}>Submit</button>
            )}
          </div>
          {lab.submissionStatus === 'uncertain' && (
            <button className="px-3 py-1.5 text-xs border border-[var(--danger)]" onClick={lab.retry}>Retry pending</button>
          )}
        </section>

        <aside className="col-span-5 p-4 space-y-4">
          <Panel title="Draft state">
            <Row k="status" v={lab.draftStatus} />
            <Row k="submission" v={lab.submissionStatus} />
          </Panel>
          <Panel title="Failure Lab">
            <div className="space-y-2 text-xs">
              <button className="w-full px-3 py-1.5 border border-[var(--border)] hover:border-[var(--danger)]" onClick={lab.submitWithDrop}>Simulate lost response (after commit)</button>
              <div className="text-[var(--muted)]">Status: {lab.submissionStatus}</div>
            </div>
          </Panel>
        </aside>
      </main>
    </div>
  )
}

function Field({ label, ...props }: any) {
  return (
    <label className="block">
      <div className="text-xs text-[var(--muted)] mb-1">{label}</div>
      <input className="w-full bg-[var(--panel)] border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" {...props} />
    </label>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[var(--border)]">
      <div className="px-3 py-2 border-b border-[var(--border)] text-xs font-semibold">{title}</div>
      <div className="p-3">{children}</div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[var(--muted)]">{k}</span>
      <span className="font-mono">{v}</span>
    </div>
  )
}