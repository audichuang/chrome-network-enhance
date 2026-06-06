interface ToastProps {
  message: string
  type?: 'success' | 'error'
}

export default function Toast({ message, type = 'success' }: ToastProps) {
  const bg = type === 'error' ? 'bg-red-600' : 'bg-green-600'
  return (
    <div className={`fixed bottom-4 right-4 px-4 py-2 ${bg} text-white text-sm rounded shadow-lg animate-fade-in`}>
      {message}
    </div>
  )
}
