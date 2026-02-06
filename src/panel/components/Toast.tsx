interface ToastProps {
  message: string
}

export default function Toast({ message }: ToastProps) {
  return (
    <div className="fixed bottom-4 right-4 px-4 py-2 bg-green-600 text-white text-sm rounded shadow-lg animate-fade-in">
      {message}
    </div>
  )
}
