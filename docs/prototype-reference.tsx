import { useState, useRef, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | 'onboarding'
  | 'journals'
  | 'create-journal'
  | 'journal-detail'
  | 'add-entry'
  | 'employees'
  | 'add-employee'
  | 'settings'

type JournalType = 'fire' | 'safety' | 'vacation' | 'custom'

interface Journal {
  id: string
  name: string
  type: JournalType
  responsible: string
  createdAt: string
  entries: Entry[]
  synced: boolean
}

interface Entry {
  id: string
  employeeId: string
  date: string
  kind: string
  signed: boolean
}

interface Employee {
  id: string
  fullName: string
  position: string
  hiredAt: string
  dismissed: boolean
}

interface Toast {
  id: string
  message: string
  variant: 'success' | 'error'
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', fullName: 'Иванов Иван Иванович', position: 'Монтажник', hiredAt: '01.03.2025', dismissed: false },
  { id: '2', fullName: 'Петров Пётр Петрович', position: 'Сварщик', hiredAt: '15.01.2025', dismissed: false },
  { id: '3', fullName: 'Сидоров Сергей Сергеевич', position: 'Электрик', hiredAt: '10.06.2024', dismissed: false },
  { id: '4', fullName: 'Козлов Антон Владимирович', position: 'Стропальщик', hiredAt: '02.09.2023', dismissed: true },
]

const INITIAL_JOURNALS: Journal[] = [
  {
    id: '1',
    name: 'Журнал инструктажей по ПБ',
    type: 'fire',
    responsible: 'Иванов И.И.',
    createdAt: '01.09.2026',
    synced: true,
    entries: [
      { id: 'e1', employeeId: '1', date: '29.09.2026', kind: 'Первичный', signed: true },
      { id: 'e2', employeeId: '2', date: '28.09.2026', kind: 'Повторный', signed: true },
      { id: 'e3', employeeId: '3', date: '27.09.2026', kind: 'Вводный', signed: false },
      { id: 'e4', employeeId: '1', date: '20.09.2026', kind: 'Внеплановый', signed: true },
      { id: 'e5', employeeId: '2', date: '15.09.2026', kind: 'Целевой', signed: true },
    ],
  },
  {
    id: '2',
    name: 'Журнал учёта охраны труда',
    type: 'safety',
    responsible: 'Иванов И.И.',
    createdAt: '01.09.2026',
    synced: false,
    entries: [
      { id: 'e6', employeeId: '1', date: '29.09.2026', kind: 'Вводный', signed: true },
      { id: 'e7', employeeId: '3', date: '25.09.2026', kind: 'Первичный', signed: false },
    ],
  },
  {
    id: '3',
    name: 'Журнал учёта отпусков',
    type: 'vacation',
    responsible: 'Иванов И.И.',
    createdAt: '01.09.2026',
    synced: true,
    entries: [],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const journalTypeColor: Record<JournalType, string> = {
  fire: '#DC2626',
  safety: '#1E40AF',
  vacation: '#16A34A',
  custom: '#64748B',
}

const journalTypeLabel: Record<JournalType, string> = {
  fire: 'Пожарная безопасность',
  safety: 'Охрана труда',
  vacation: 'Отпуска',
  custom: 'Свой шаблон',
}

function today() {
  const d = new Date()
  return [
    String(d.getDate()).padStart(2, '0'),
    String(d.getMonth() + 1).padStart(2, '0'),
    d.getFullYear(),
  ].join('.')
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconBook({ size = 24, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8M8 11h6" />
    </svg>
  )
}

function IconFire({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A5.5 5.5 0 0 0 12 20a5.5 5.5 0 0 0 5.5-5.5c0-3-2-6-5.5-9-3.5 3-5.5 6-5.5 9zM12 20v-4" />
    </svg>
  )
}

function IconShield({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function IconUmbrella({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7" />
    </svg>
  )
}

function IconPlus({ size = 24, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconChevronRight({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function IconArrowLeft({ size = 24, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  )
}

function IconX({ size = 24, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function IconSettings({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function IconSync({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

function IconUsers({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconFileText({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function IconBarChart({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function IconLock({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function IconDownload({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function IconSearch({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function IconMoreVertical({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="1" fill={color} />
      <circle cx="12" cy="12" r="1" fill={color} />
      <circle cx="12" cy="19" r="1" fill={color} />
    </svg>
  )
}

function IconWifi({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  )
}

function IconCheck({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconAlertTriangle({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconCustom({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

// ─── Shared components ────────────────────────────────────────────────────────

function AppShell({ children, offline }: { children: React.ReactNode; offline: boolean }) {
  return (
    <div className="relative flex flex-col h-full overflow-hidden bg-[#F8FAFC]">
      {offline && (
        <div className="flex items-center gap-2 px-4 py-2 text-[#92400E] bg-[#FEF3C7] text-[13px] leading-snug shrink-0">
          <IconWifi size={15} color="#92400E" />
          <span>Нет интернета. Данные сохраняются локально и синхронизируются позже.</span>
        </div>
      )}
      {children}
    </div>
  )
}

function BottomNav({
  active,
  onNavigate,
}: {
  active: 'journals' | 'employees' | 'reports' | 'settings'
  onNavigate: (screen: Screen) => void
}) {
  const items = [
    { key: 'journals' as const, label: 'Журналы', icon: IconFileText, screen: 'journals' as Screen },
    { key: 'employees' as const, label: 'Сотрудники', icon: IconUsers, screen: 'employees' as Screen },
    { key: 'reports' as const, label: 'Отчёты', icon: IconBarChart, screen: 'journals' as Screen },
    { key: 'settings' as const, label: 'Настройки', icon: IconSettings, screen: 'settings' as Screen },
  ]

  return (
    <div className="shrink-0 flex border-t border-[#E2E8F0] bg-white">
      {items.map(({ key, label, icon: Icon, screen }) => {
        const isActive = active === key
        const color = isActive ? '#1E40AF' : '#94A3B8'
        return (
          <button
            key={key}
            onClick={() => onNavigate(screen)}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
          >
            <Icon size={22} color={color} />
            <span className="text-[11px] font-medium" style={{ color }}>
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function FAB({ onClick, label }: { onClick: () => void; label?: string }) {
  if (label) {
    return (
      <button
        onClick={onClick}
        className="absolute bottom-20 right-4 flex items-center gap-2 px-4 py-0 h-14 rounded-full text-white text-[15px] font-semibold shadow-lg"
        style={{ background: '#EA580C', boxShadow: '0 4px 12px rgba(234,88,12,0.35)' }}
      >
        <IconPlus size={20} color="white" />
        {label}
      </button>
    )
  }
  return (
    <button
      onClick={onClick}
      className="absolute bottom-20 right-4 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg"
      style={{ background: '#EA580C', boxShadow: '0 4px 12px rgba(234,88,12,0.35)' }}
    >
      <IconPlus size={24} color="white" />
    </button>
  )
}

function Input({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  error,
}: {
  label: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  type?: string
  error?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-[#64748B]">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-12 px-4 rounded-[10px] border text-[16px] text-[#0F172A] placeholder:text-[#CBD5E1] outline-none transition-colors"
        style={{
          background: 'white',
          border: error ? '1.5px solid #DC2626' : '1.5px solid #E2E8F0',
        }}
        onFocus={(e) => {
          if (!error) e.currentTarget.style.border = '1.5px solid #1E40AF'
        }}
        onBlur={(e) => {
          if (!error) e.currentTarget.style.border = '1.5px solid #E2E8F0'
        }}
      />
      {error && <span className="text-[12px] text-[#DC2626]">{error}</span>}
    </div>
  )
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="absolute bottom-20 left-4 right-4 flex flex-col gap-2 pointer-events-none z-50">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 px-4 py-3 rounded-[10px] shadow-md pointer-events-auto"
          style={{
            background: t.variant === 'success' ? '#DCFCE7' : '#FEE2E2',
            color: t.variant === 'success' ? '#166534' : '#991B1B',
          }}
          onClick={() => onDismiss(t.id)}
        >
          {t.variant === 'success' ? (
            <IconCheck size={16} color="#16A34A" />
          ) : (
            <IconAlertTriangle size={16} color="#DC2626" />
          )}
          <span className="text-[14px] font-medium">{t.message}</span>
        </div>
      ))}
    </div>
  )
}

function ConfirmModal({
  title,
  body,
  confirmLabel = 'Удалить',
  onConfirm,
  onCancel,
}: {
  title: string
  body: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(15,23,42,0.5)' }}>
      <div className="w-full bg-white rounded-t-[16px] p-6 flex flex-col gap-4" style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
        <div>
          <h3 className="text-[18px] font-semibold text-[#0F172A]">{title}</h3>
          <p className="mt-2 text-[15px] text-[#64748B] leading-snug">{body}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-12 rounded-[10px] border border-[#E2E8F0] text-[16px] font-semibold text-[#64748B]"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-12 rounded-[10px] text-white text-[16px] font-semibold"
            style={{ background: '#DC2626' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Screen: Onboarding ───────────────────────────────────────────────────────

function OnboardingScreen({ onDone }: { onDone: (org: string, responsible: string) => void }) {
  const [org, setOrg] = useState('')
  const [resp, setResp] = useState('')
  const [errors, setErrors] = useState({ org: '', resp: '' })

  function handleStart() {
    const newErrors = { org: '', resp: '' }
    if (!org.trim()) newErrors.org = 'Укажите название организации'
    if (!resp.trim()) newErrors.resp = 'Укажите ответственного'
    if (newErrors.org || newErrors.resp) {
      setErrors(newErrors)
      return
    }
    onDone(org.trim(), resp.trim())
  }

  return (
    <div className="flex flex-col h-full px-4 bg-[#F8FAFC]">
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div
          className="w-24 h-24 rounded-[20px] flex items-center justify-center"
          style={{ background: '#1E40AF' }}
        >
          <IconBook size={48} color="white" />
        </div>
        <div className="text-center">
          <h1 className="text-[28px] font-bold text-[#0F172A] tracking-[-0.5px]">Журналы</h1>
          <p className="mt-2 text-[16px] text-[#64748B] leading-relaxed max-w-[280px]">
            Все журналы в одном месте. Работает без интернета.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 pb-6">
        <Input
          label="Название организации"
          placeholder='ООО «Ромашка»'
          value={org}
          onChange={(v) => { setOrg(v); setErrors((e) => ({ ...e, org: '' })) }}
          error={errors.org}
        />
        <Input
          label="Ответственный за ведение"
          placeholder="Иванов И.И."
          value={resp}
          onChange={(v) => { setResp(v); setErrors((e) => ({ ...e, resp: '' })) }}
          error={errors.resp}
        />
        <div className="mt-2">
          <button
            onClick={handleStart}
            className="w-full h-[52px] rounded-[10px] text-white text-[16px] font-semibold transition-opacity active:opacity-80"
            style={{ background: '#EA580C' }}
          >
            Начать работу
          </button>
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <IconLock size={13} color="#94A3B8" />
          <span className="text-[12px] text-[#94A3B8]">Данные хранятся только на вашем устройстве</span>
        </div>
      </div>
    </div>
  )
}

// ─── Screen: Journal List ─────────────────────────────────────────────────────

function JournalTypeIcon({ type, size = 20 }: { type: JournalType; size?: number }) {
  const color = journalTypeColor[type]
  const bg = color + '18'
  const Icon = type === 'fire' ? IconFire : type === 'safety' ? IconShield : type === 'vacation' ? IconUmbrella : IconCustom
  return (
    <div
      className="flex items-center justify-center rounded-full shrink-0"
      style={{ width: 40, height: 40, background: bg }}
    >
      <Icon size={size} color={color} />
    </div>
  )
}

function JournalListScreen({
  journals,
  employees,
  offline,
  onSelect,
  onCreate,
  onNavigate,
  addToast,
}: {
  journals: Journal[]
  employees: Employee[]
  offline: boolean
  onSelect: (j: Journal) => void
  onCreate: () => void
  onNavigate: (s: Screen) => void
  addToast: (m: string, v: 'success' | 'error') => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-5 pb-3 bg-[#F8FAFC] shrink-0">
        <h1 className="text-[20px] font-semibold text-[#0F172A]">Мои журналы</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate('settings')}>
            <IconSettings color="#64748B" />
          </button>
          <div className="relative">
            <button onClick={() => addToast(offline ? 'Нет подключения к интернету' : 'Данные синхронизированы', offline ? 'error' : 'success')}>
              <IconSync color="#64748B" />
            </button>
            <div
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#F8FAFC]"
              style={{ background: offline ? '#F59E0B' : '#16A34A' }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {journals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 pb-16">
            <div className="w-[120px] h-[120px] flex items-center justify-center">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                <rect x="20" y="16" width="80" height="88" rx="6" stroke="#CBD5E1" strokeWidth="2.5" fill="none" />
                <line x1="36" y1="40" x2="84" y2="40" stroke="#CBD5E1" strokeWidth="2" />
                <line x1="36" y1="54" x2="84" y2="54" stroke="#CBD5E1" strokeWidth="2" />
                <line x1="36" y1="68" x2="68" y2="68" stroke="#CBD5E1" strokeWidth="2" />
                <rect x="14" y="24" width="4" height="72" rx="2" fill="#CBD5E1" />
              </svg>
            </div>
            <h3 className="text-[18px] font-semibold text-[#64748B]">Пока нет журналов</h3>
            <p className="text-[14px] text-[#94A3B8] text-center max-w-[240px]">
              Создайте первый журнал — это займёт 1 минуту
            </p>
            <button
              onClick={onCreate}
              className="mt-2 px-6 h-11 rounded-[10px] border-2 border-[#1E40AF] text-[#1E40AF] text-[15px] font-semibold"
            >
              Создать журнал
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {journals.map((j) => (
              <button
                key={j.id}
                onClick={() => onSelect(j)}
                className="w-full text-left bg-white rounded-[12px] p-4 relative"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
              >
                {!j.synced && (
                  <div className="absolute top-3 right-10 w-2 h-2 rounded-full bg-[#F59E0B]" />
                )}
                <div className="flex items-start gap-3">
                  <JournalTypeIcon type={j.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[17px] font-semibold text-[#0F172A] leading-snug">{j.name}</p>
                    <p className="text-[13px] text-[#64748B] mt-0.5">{journalTypeLabel[j.type]}</p>
                    <div className="mt-2 pt-2 border-t border-[#F1F5F9]">
                      <p className="text-[13px] text-[#64748B]">
                        {j.entries.length} {j.entries.length === 1 ? 'запись' : j.entries.length < 5 ? 'записи' : 'записей'} · {employees.length} сотрудников
                      </p>
                      <p className="text-[13px] text-[#64748B]">Открыт с {j.createdAt}</p>
                    </div>
                    {!j.synced && (
                      <p className="text-[12px] text-[#F59E0B] mt-1 font-medium">Не синхронизировано</p>
                    )}
                  </div>
                  <IconChevronRight size={18} color="#CBD5E1" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav active="journals" onNavigate={onNavigate} />
      <FAB onClick={onCreate} />
    </div>
  )
}

// ─── Screen: Create Journal ───────────────────────────────────────────────────

const JOURNAL_TEMPLATES: { type: JournalType; label: string; icon: React.FC<{ size?: number; color?: string }> }[] = [
  { type: 'fire', label: 'Пожарная безопасность', icon: IconFire },
  { type: 'safety', label: 'Охрана труда', icon: IconShield },
  { type: 'vacation', label: 'Отпуска', icon: IconUmbrella },
  { type: 'custom', label: 'Свой шаблон', icon: IconCustom },
]

function CreateJournalScreen({
  responsible,
  onCreate,
  onBack,
}: {
  responsible: string
  onCreate: (j: Omit<Journal, 'id' | 'entries'>) => void
  onBack: () => void
}) {
  const [selectedType, setSelectedType] = useState<JournalType | null>(null)
  const [name, setName] = useState('')
  const [resp, setResp] = useState(responsible)

  function handleTypeSelect(type: JournalType) {
    setSelectedType(type)
    if (type !== 'custom') setName(journalTypeLabel[type])
    else setName('')
  }

  function handleCreate() {
    if (!selectedType || !name.trim()) return
    onCreate({
      name: name.trim(),
      type: selectedType,
      responsible: resp || responsible,
      createdAt: today(),
      synced: false,
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-5 pb-3 bg-white border-b border-[#E2E8F0] shrink-0">
        <h2 className="text-[18px] font-semibold text-[#0F172A]">Новый журнал</h2>
        <button onClick={onBack}><IconX color="#64748B" /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-6">
        <div>
          <p className="text-[13px] font-medium text-[#64748B] mb-3 uppercase tracking-wide">Выберите тип журнала</p>
          <div className="grid grid-cols-2 gap-3">
            {JOURNAL_TEMPLATES.map(({ type, label, icon: Icon }) => {
              const color = journalTypeColor[type]
              const isSelected = selectedType === type
              return (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  className="relative flex flex-col items-center justify-center gap-3 p-4 rounded-[12px] h-[100px] transition-all"
                  style={{
                    background: isSelected ? '#EFF6FF' : 'white',
                    border: isSelected ? `2px solid ${color}` : '1.5px solid #E2E8F0',
                    boxShadow: isSelected ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  {isSelected && (
                    <div
                      className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: color }}
                    >
                      <IconCheck size={11} color="white" />
                    </div>
                  )}
                  <Icon size={22} color={isSelected ? color : '#64748B'} />
                  <span className="text-[13px] font-medium text-center leading-snug" style={{ color: isSelected ? color : '#0F172A' }}>
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <Input
          label="Название журнала"
          placeholder="Введите название"
          value={name}
          onChange={setName}
        />

        <Input
          label="Ответственный"
          placeholder="Иванов И.И."
          value={resp}
          onChange={setResp}
        />
      </div>

      <div className="px-4 pb-6 pt-2 shrink-0">
        <button
          onClick={handleCreate}
          disabled={!selectedType || !name.trim()}
          className="w-full h-[52px] rounded-[10px] text-white text-[16px] font-semibold transition-opacity"
          style={{ background: selectedType && name.trim() ? '#1E40AF' : '#CBD5E1' }}
        >
          Создать журнал
        </button>
      </div>
    </div>
  )
}

// ─── Screen: Journal Detail ───────────────────────────────────────────────────

function JournalDetailScreen({
  journal,
  employees,
  onBack,
  onAddEntry,
  onDeleteJournal,
  addToast,
}: {
  journal: Journal
  employees: Employee[]
  onBack: () => void
  onAddEntry: () => void
  onDeleteJournal: (id: string) => void
  addToast: (m: string, v: 'success' | 'error') => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [swipedRow, setSwipedRow] = useState<string | null>(null)

  const getEmployee = (id: string) => employees.find((e) => e.id === id)

  return (
    <div className="flex flex-col h-full">
      {confirmDelete && (
        <ConfirmModal
          title="Удалить журнал?"
          body={`Все ${journal.entries.length} записей будут удалены без возможности восстановления.`}
          onConfirm={() => { onDeleteJournal(journal.id); setConfirmDelete(false) }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      {menuOpen && (
        <div className="absolute inset-0 z-40" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute top-14 right-4 bg-white rounded-[12px] py-2 w-52 shadow-xl"
            style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {[
              { label: 'Экспорт в PDF', action: () => { addToast('PDF создаётся…', 'success'); setMenuOpen(false) } },
              { label: 'Закрыть журнал', action: () => { addToast('Журнал закрыт', 'success'); setMenuOpen(false) } },
              { label: 'Удалить журнал', action: () => { setMenuOpen(false); setConfirmDelete(true) }, danger: true },
            ].map(({ label, action, danger }) => (
              <button
                key={label}
                onClick={action}
                className="w-full text-left px-4 py-3 text-[15px] font-medium"
                style={{ color: danger ? '#DC2626' : '#0F172A' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border-b border-[#E2E8F0] px-4 pt-5 pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <button onClick={onBack}><IconArrowLeft size={22} color="#0F172A" /></button>
          <span className="text-[16px] font-semibold text-[#0F172A] truncate mx-3 flex-1 text-center">{journal.name}</span>
          <button onClick={() => setMenuOpen(true)}><IconMoreVertical size={22} color="#64748B" /></button>
        </div>
        <p className="text-[13px] text-[#64748B] mt-2 text-center">
          Открыт с {journal.createdAt} · Ответственный: {journal.responsible}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[14px] text-[#0F172A] font-medium">{journal.entries.length} записей</span>
          <button className="text-[13px] text-[#1E40AF] font-medium flex items-center gap-1">
            Фильтр
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-[#F1F5F9] grid grid-cols-[80px_1fr_90px_36px] px-4 py-2 z-10 border-b border-[#E2E8F0]">
          {['Дата', 'ФИО', 'Вид', ''].map((h) => (
            <span key={h} className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wide">{h}</span>
          ))}
        </div>

        {journal.entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-[16px] text-[#64748B]">Нет записей</p>
            <p className="text-[13px] text-[#94A3B8]">Нажмите + чтобы добавить первую запись</p>
          </div>
        ) : (
          journal.entries.map((entry, i) => {
            const emp = getEmployee(entry.employeeId)
            const isOdd = i % 2 === 1
            const isSwiped = swipedRow === entry.id

            return (
              <div
                key={entry.id}
                className="relative overflow-hidden"
                onClick={() => setSwipedRow(isSwiped ? null : entry.id)}
              >
                {isSwiped && (
                  <div className="absolute right-0 top-0 bottom-0 flex items-stretch z-10">
                    <button className="px-4 bg-[#1E40AF] text-white text-[13px] font-medium">Ред.</button>
                    <button className="px-4 bg-[#DC2626] text-white text-[13px] font-medium">Удал.</button>
                  </div>
                )}
                <div
                  className="grid grid-cols-[80px_1fr_90px_36px] px-4 py-3 items-center transition-transform"
                  style={{ background: isOdd ? '#F8FAFC' : 'white', transform: isSwiped ? 'translateX(-112px)' : 'translateX(0)' }}
                >
                  <span className="text-[14px] text-[#0F172A]">{entry.date.slice(0, 5)}</span>
                  <span className="text-[14px] text-[#0F172A] truncate pr-2">{emp?.fullName.split(' ').slice(0, 2).join(' ') ?? '—'}</span>
                  <span className="text-[13px] text-[#64748B]">{entry.kind}</span>
                  <div className="flex items-center justify-center">
                    {entry.signed ? (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#DCFCE7' }}>
                        <IconCheck size={12} color="#16A34A" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#FEF3C7' }}>
                        <IconAlertTriangle size={12} color="#F59E0B" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="px-4 pb-5 pt-2 flex flex-col gap-3 shrink-0 bg-[#F8FAFC] border-t border-[#E2E8F0]">
        <button
          onClick={() => addToast('Экспорт PDF запущен', 'success')}
          className="w-full h-11 rounded-[10px] border-2 border-[#1E40AF] text-[#1E40AF] text-[15px] font-semibold flex items-center justify-center gap-2"
        >
          <IconDownload size={17} color="#1E40AF" />
          Экспорт в PDF
        </button>
      </div>

      <button
        onClick={onAddEntry}
        className="absolute bottom-6 right-4 flex items-center gap-2 px-4 h-14 rounded-full text-white text-[15px] font-semibold shadow-lg"
        style={{ background: '#EA580C', boxShadow: '0 4px 12px rgba(234,88,12,0.35)' }}
      >
        <IconPlus size={20} color="white" />
        Добавить запись
      </button>
    </div>
  )
}

// ─── Screen: Add Entry ────────────────────────────────────────────────────────

const INSTRUCTION_KINDS = ['Вводный', 'Первичный', 'Повторный', 'Внеплановый', 'Целевой']

function SignatureCanvas({ onSign }: { onSign: (signed: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const [hasSig, setHasSig] = useState(false)

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    isDrawing.current = true
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }, [])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#0F172A'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
    if (!hasSig) { setHasSig(true); onSign(true) }
  }, [hasSig, onSign])

  const stopDraw = useCallback(() => { isDrawing.current = false }, [])

  function clear() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setHasSig(false)
    onSign(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        width={342}
        height={120}
        className="w-full rounded-[10px] touch-none"
        style={{ border: '1.5px dashed #CBD5E1', background: '#FAFAFA' }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
      {!hasSig && (
        <p className="text-center text-[13px] text-[#CBD5E1] -mt-10 pointer-events-none select-none">
          Распишитесь здесь
        </p>
      )}
      <div className="flex items-center justify-between mt-1">
        <button onClick={clear} className="text-[13px] text-[#64748B]">Очистить</button>
        <span className="text-[12px] text-[#94A3B8]">Распишитесь пальцем или стилусом</span>
      </div>
    </div>
  )
}

function AddEntryScreen({
  employees,
  onSave,
  onCancel,
}: {
  employees: Employee[]
  onSave: (entry: Omit<Entry, 'id'>) => void
  onCancel: () => void
}) {
  const [empId, setEmpId] = useState('')
  const [date, setDate] = useState(today())
  const [kind, setKind] = useState('Первичный')
  const [signed, setSigned] = useState(false)
  const [note, setNote] = useState('')
  const [empError, setEmpError] = useState('')

  const isValid = empId && date

  function handleSave() {
    if (!empId) { setEmpError('Выберите сотрудника'); return }
    onSave({ employeeId: empId, date, kind, signed })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-5 pb-3 bg-white border-b border-[#E2E8F0] shrink-0">
        <button onClick={onCancel}><IconX color="#64748B" /></button>
        <span className="text-[16px] font-semibold text-[#0F172A]">Новая запись</span>
        <button
          onClick={handleSave}
          className="text-[15px] font-semibold"
          style={{ color: isValid ? '#1E40AF' : '#CBD5E1' }}
        >
          Сохранить
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#64748B]">Сотрудник</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2"><IconSearch size={16} color="#94A3B8" /></div>
            <select
              value={empId}
              onChange={(e) => { setEmpId(e.target.value); setEmpError('') }}
              className="w-full h-12 pl-10 pr-4 rounded-[10px] text-[16px] text-[#0F172A] appearance-none"
              style={{
                background: 'white',
                border: empError ? '1.5px solid #DC2626' : '1.5px solid #E2E8F0',
              }}
            >
              <option value="">Выберите сотрудника</option>
              {employees.filter((e) => !e.dismissed).map((e) => (
                <option key={e.id} value={e.id}>{e.fullName}</option>
              ))}
            </select>
          </div>
          {empError && <span className="text-[12px] text-[#DC2626]">{empError}</span>}
        </div>

        <Input label="Дата инструктажа" value={date} onChange={setDate} placeholder="ДД.ММ.ГГГГ" />

        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[#64748B]">Вид инструктажа</label>
          <div className="flex flex-col gap-2">
            {INSTRUCTION_KINDS.map((k) => (
              <label key={k} className="flex items-center gap-3 cursor-pointer">
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: kind === k ? '#1E40AF' : '#CBD5E1' }}
                  onClick={() => setKind(k)}
                >
                  {kind === k && <div className="w-2.5 h-2.5 rounded-full bg-[#1E40AF]" />}
                </div>
                <span className="text-[15px] text-[#0F172A]">{k}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#64748B]">Подпись сотрудника</label>
          <SignatureCanvas onSign={setSigned} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#64748B]">Примечание (опционально)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Добавьте комментарий..."
            className="w-full px-4 py-3 rounded-[10px] border border-[#E2E8F0] text-[15px] text-[#0F172A] placeholder:text-[#CBD5E1] resize-none outline-none"
            style={{ background: 'white' }}
          />
        </div>
      </div>

      <div className="px-4 pb-6 pt-2 shrink-0">
        <button
          onClick={handleSave}
          className="w-full h-14 rounded-[10px] text-white text-[16px] font-semibold"
          style={{ background: isValid ? '#1E40AF' : '#CBD5E1' }}
        >
          Сохранить запись
        </button>
      </div>
    </div>
  )
}

// ─── Screen: Employees ────────────────────────────────────────────────────────

function EmployeesScreen({
  employees,
  onAdd,
  onNavigate,
}: {
  employees: Employee[]
  onAdd: () => void
  onNavigate: (s: Screen) => void
}) {
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const filtered = employees.filter(
    (e) => !search || e.fullName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-3 bg-[#F8FAFC] shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-semibold text-[#0F172A]">Сотрудники</h1>
          <button onClick={() => setShowSearch((v) => !v)}>
            <IconSearch size={22} color="#64748B" />
          </button>
        </div>
        {showSearch && (
          <div className="relative mt-3">
            <div className="absolute left-3 top-1/2 -translate-y-1/2"><IconSearch size={16} color="#94A3B8" /></div>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по имени..."
              className="w-full h-10 pl-9 pr-4 rounded-[10px] border border-[#E2E8F0] bg-white text-[15px] text-[#0F172A] outline-none"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3">
        {filtered.map((emp) => (
          <div
            key={emp.id}
            className="bg-white rounded-[12px] p-4"
            style={{
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
              opacity: emp.dismissed ? 0.6 : 1,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-semibold shrink-0"
                style={{ background: emp.dismissed ? '#F1F5F9' : '#E0E7FF', color: emp.dismissed ? '#94A3B8' : '#1E40AF' }}
              >
                {initials(emp.fullName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[16px] font-semibold text-[#0F172A] truncate">{emp.fullName}</p>
                  {emp.dismissed && (
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F1F5F9] text-[#94A3B8]">Уволен</span>
                  )}
                </div>
                <p className="text-[14px] text-[#64748B]">{emp.position}</p>
                <div className="mt-2 pt-2 border-t border-[#F1F5F9]">
                  <p className="text-[13px] text-[#64748B]">В компании с {emp.hiredAt}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <BottomNav active="employees" onNavigate={onNavigate} />
      <FAB onClick={onAdd} />
    </div>
  )
}

// ─── Screen: Add Employee ─────────────────────────────────────────────────────

function AddEmployeeScreen({
  onSave,
  onCancel,
}: {
  onSave: (emp: Omit<Employee, 'id'>) => void
  onCancel: () => void
}) {
  const [fullName, setFullName] = useState('')
  const [position, setPosition] = useState('')
  const [hiredAt, setHiredAt] = useState(today())
  const [errors, setErrors] = useState({ fullName: '', position: '' })

  function handleSave() {
    const e = { fullName: '', position: '' }
    if (!fullName.trim()) e.fullName = 'Укажите ФИО'
    if (!position.trim()) e.position = 'Укажите должность'
    if (e.fullName || e.position) { setErrors(e); return }
    onSave({ fullName: fullName.trim(), position: position.trim(), hiredAt, dismissed: false })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-5 pb-3 bg-white border-b border-[#E2E8F0] shrink-0">
        <button onClick={onCancel}><IconX color="#64748B" /></button>
        <span className="text-[16px] font-semibold text-[#0F172A]">Новый сотрудник</span>
        <div className="w-6" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
        <Input label="ФИО" placeholder="Иванов Иван Иванович" value={fullName} onChange={(v) => { setFullName(v); setErrors((e) => ({ ...e, fullName: '' })) }} error={errors.fullName} />
        <Input label="Должность" placeholder="Монтажник" value={position} onChange={(v) => { setPosition(v); setErrors((e) => ({ ...e, position: '' })) }} error={errors.position} />
        <Input label="Дата приёма" placeholder="ДД.ММ.ГГГГ" value={hiredAt} onChange={setHiredAt} />
      </div>

      <div className="px-4 pb-6 pt-2 shrink-0">
        <button
          onClick={handleSave}
          className="w-full h-[52px] rounded-[10px] text-white text-[16px] font-semibold"
          style={{ background: '#1E40AF' }}
        >
          Сохранить
        </button>
      </div>
    </div>
  )
}

// ─── Screen: Settings ─────────────────────────────────────────────────────────

function SettingsScreen({
  org,
  responsible,
  offline,
  onNavigate,
  addToast,
}: {
  org: string
  responsible: string
  offline: boolean
  onNavigate: (s: Screen) => void
  addToast: (m: string, v: 'success' | 'error') => void
}) {
  const sections = [
    {
      title: 'ОРГАНИЗАЦИЯ',
      items: [
        { label: 'Название', value: org },
        { label: 'Ответственный', value: responsible },
        { label: 'ИНН / Адрес', value: '' },
      ],
    },
    {
      title: 'СИНХРОНИЗАЦИЯ',
      items: [
        { label: 'Статус', value: offline ? 'Офлайн' : 'Синхронизировано', valueColor: offline ? '#F59E0B' : '#16A34A' },
        { label: 'Последняя синхронизация', value: '5 мин назад' },
        { label: 'Синхронизировать сейчас', value: '', action: () => addToast(offline ? 'Нет подключения' : 'Синхронизация завершена', offline ? 'error' : 'success') },
      ],
    },
    {
      title: 'ЭКСПОРТ И РЕЗЕРВНОЕ КОПИРОВАНИЕ',
      items: [
        { label: 'Экспорт всех данных (JSON)', value: '', action: () => addToast('Файл создаётся…', 'success') },
        { label: 'Импорт данных', value: '' },
        { label: 'Резервная копия в облако', value: '' },
      ],
    },
    {
      title: 'О ПРИЛОЖЕНИИ',
      items: [
        { label: 'Версия', value: '1.0.0' },
        { label: 'Политика конфиденциальности', value: '' },
        { label: 'Обратная связь', value: '' },
      ],
    },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-3 bg-[#F8FAFC] shrink-0">
        <h1 className="text-[20px] font-semibold text-[#0F172A]">Настройки</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-6">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-[11px] font-semibold text-[#94A3B8] tracking-widest mb-2">{section.title}</p>
            <div className="bg-white rounded-[12px] overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              {section.items.map((item, i) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                  style={{ borderTop: i > 0 ? '1px solid #F1F5F9' : 'none' }}
                >
                  <span className="text-[15px] text-[#0F172A]">{item.label}</span>
                  <div className="flex items-center gap-2">
                    {item.value && (
                      <span className="text-[14px]" style={{ color: (item as any).valueColor || '#64748B' }}>
                        {item.value}
                      </span>
                    )}
                    <IconChevronRight size={16} color="#CBD5E1" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        <button className="w-full text-[16px] font-semibold text-[#DC2626] py-2">
          Выйти
        </button>
      </div>

      <BottomNav active="settings" onNavigate={onNavigate} />
    </div>
  )
}

// ─── Root App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>('onboarding')
  const [org, setOrg] = useState('')
  const [responsible, setResponsible] = useState('')
  const [journals, setJournals] = useState<Journal[]>(INITIAL_JOURNALS)
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES)
  const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null)
  const [offline, setOffline] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  function addToast(message: string, variant: 'success' | 'error') {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, message, variant }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000)
  }

  function dismissToast(id: string) {
    setToasts((t) => t.filter((x) => x.id !== id))
  }

  function handleOnboardingDone(o: string, r: string) {
    setOrg(o)
    setResponsible(r)
    setScreen('journals')
  }

  function handleCreateJournal(j: Omit<Journal, 'id' | 'entries'>) {
    const newJ: Journal = { ...j, id: Math.random().toString(36).slice(2), entries: [] }
    setJournals((prev) => [newJ, ...prev])
    addToast('Журнал создан', 'success')
    setScreen('journals')
  }

  function handleAddEntry(entry: Omit<Entry, 'id'>) {
    if (!selectedJournal) return
    const newEntry: Entry = { ...entry, id: Math.random().toString(36).slice(2) }
    const updated = { ...selectedJournal, entries: [newEntry, ...selectedJournal.entries], synced: false }
    setJournals((prev) => prev.map((j) => (j.id === selectedJournal.id ? updated : j)))
    setSelectedJournal(updated)
    addToast('Запись сохранена', 'success')
    setScreen('journal-detail')
  }

  function handleDeleteJournal(id: string) {
    setJournals((prev) => prev.filter((j) => j.id !== id))
    addToast('Журнал удалён', 'success')
    setScreen('journals')
  }

  function handleAddEmployee(emp: Omit<Employee, 'id'>) {
    const newEmp: Employee = { ...emp, id: Math.random().toString(36).slice(2) }
    setEmployees((prev) => [newEmp, ...prev])
    addToast('Сотрудник добавлен', 'success')
    setScreen('employees')
  }

  const currentJournal = selectedJournal
    ? (journals.find((j) => j.id === selectedJournal.id) ?? selectedJournal)
    : null

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#E2E8F0]">
      <div
        className="relative w-[390px] h-[844px] overflow-hidden rounded-[40px] bg-[#F8FAFC]"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 0 0 8px #1E293B' }}
      >
        {/* Status bar */}
        <div className="flex items-center justify-between px-6 pt-3 pb-1 bg-transparent relative z-20">
          <span className="text-[13px] font-semibold text-[#0F172A]">9:41</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setOffline((v) => !v)}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: offline ? '#FEF3C7' : '#DCFCE7', color: offline ? '#92400E' : '#166534' }}
            >
              {offline ? '⚡ Офлайн' : '● Онлайн'}
            </button>
          </div>
        </div>

        <AppShell offline={offline}>
          <div className="flex-1 relative overflow-hidden flex flex-col">
            {screen === 'onboarding' && (
              <OnboardingScreen onDone={handleOnboardingDone} />
            )}
            {screen === 'journals' && (
              <JournalListScreen
                journals={journals}
                employees={employees}
                offline={offline}
                onSelect={(j) => { setSelectedJournal(j); setScreen('journal-detail') }}
                onCreate={() => setScreen('create-journal')}
                onNavigate={setScreen}
                addToast={addToast}
              />
            )}
            {screen === 'create-journal' && (
              <CreateJournalScreen
                responsible={responsible}
                onCreate={handleCreateJournal}
                onBack={() => setScreen('journals')}
              />
            )}
            {screen === 'journal-detail' && currentJournal && (
              <JournalDetailScreen
                journal={currentJournal}
                employees={employees}
                onBack={() => setScreen('journals')}
                onAddEntry={() => setScreen('add-entry')}
                onDeleteJournal={handleDeleteJournal}
                addToast={addToast}
              />
            )}
            {screen === 'add-entry' && (
              <AddEntryScreen
                employees={employees}
                onSave={handleAddEntry}
                onCancel={() => setScreen('journal-detail')}
              />
            )}
            {screen === 'employees' && (
              <EmployeesScreen
                employees={employees}
                onAdd={() => setScreen('add-employee')}
                onNavigate={setScreen}
              />
            )}
            {screen === 'add-employee' && (
              <AddEmployeeScreen
                onSave={handleAddEmployee}
                onCancel={() => setScreen('employees')}
              />
            )}
            {screen === 'settings' && (
              <SettingsScreen
                org={org || 'ООО «Ромашка»'}
                responsible={responsible || 'Иванов И.И.'}
                offline={offline}
                onNavigate={setScreen}
                addToast={addToast}
              />
            )}

            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
          </div>
        </AppShell>
      </div>
    </div>
  )
}
