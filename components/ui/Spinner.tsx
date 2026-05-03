import { AiOutlineLoading3Quarters } from 'react-icons/ai';

type SpinnerProps = {
  className?: string;
};

export default function Spinner({ className = "" }: SpinnerProps) {
  return (
    <div 
      className={`inline-flex items-center justify-center ${className}`} 
      role="status" 
      aria-label="Loading"
    >
      <AiOutlineLoading3Quarters 
        className="animate-spin text-red-600" 
        style={{ width: '100%', height: '100%' }} 
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
}