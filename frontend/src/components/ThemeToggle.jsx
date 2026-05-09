import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useTheme()
  return (
    <button
      type="button"
      onClick={toggle}
      className={[
        'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur',
        'hover:bg-white',
        'dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900',
        className,
      ].join(' ')}
      aria-label="Toggle theme"
    >
      <span className="h-2 w-2 rounded-full bg-sky-500 dark:bg-emerald-400" />
      {theme === 'dark' ? 'Dark' : 'Light'}
    </button>
  )
}

