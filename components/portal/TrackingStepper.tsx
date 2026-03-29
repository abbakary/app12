'use client';

import { Check, Clock, ChefHat, Bike, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface TrackingStepperProps {
  status: string;
}

const STEPS = [
  { id: 'pending', label: 'Order Received', icon: Clock, description: 'We have received your order' },
  { id: 'preparing', label: 'Preparing', icon: ChefHat, description: 'Chef is preparing your meal' },
  { id: 'ready', label: 'Ready / Out for Delivery', icon: Bike, description: 'Your order is on its way or ready for pickup' },
  { id: 'paid', label: 'Delivered / Picked Up', icon: CheckCircle2, description: 'Enjoy your meal!' },
];

// Map actual database status values to display steps
const STATUS_MAP: Record<string, string> = {
  'pending': 'pending',
  'preparing': 'preparing',
  'in-progress': 'preparing',
  'ready': 'ready',
  'out-for-delivery': 'ready',
  'served': 'ready',
  'paid': 'paid',
  'completed': 'paid',
  'cancelled': 'pending',
};

export function TrackingStepper({ status }: TrackingStepperProps) {
  const mappedStatus = STATUS_MAP[status?.toLowerCase() || ''] || status || 'pending';
  const currentStepIndex = STEPS.findIndex(step => step.id === mappedStatus);
  const normalizedIndex = currentStepIndex === -1 ? 0 : currentStepIndex;

  return (
    <div className="space-y-8 py-8">
      {STEPS.map((step, index) => {
        const isCompleted = index < normalizedIndex;
        const isCurrent = index === normalizedIndex;
        const isLast = index === STEPS.length - 1;
        const Icon = step.icon;

        return (
          <div key={step.id} className="relative flex gap-6">
            {!isLast && (
              <div 
                className={`absolute left-6 top-10 w-0.5 h-12 -ml-px transition-colors duration-500 ${
                  isCompleted ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-800'
                }`} 
              />
            )}

            <div className="relative flex-shrink-0">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: isCompleted || isCurrent ? 'var(--primary)' : 'transparent',
                  borderColor: isCompleted || isCurrent ? 'var(--primary)' : '#e5e7eb',
                  scale: isCurrent ? 1.2 : 1,
                }}
                className={`
                  w-12 h-12 rounded-2xl border-2 flex items-center justify-center z-10 
                  ${isCurrent ? 'shadow-lg shadow-primary/30' : ''}
                `}
              >
                <Icon className={`w-6 h-6 ${isCompleted || isCurrent ? 'text-white' : 'text-gray-300'}`} />
                
                {isCurrent && (
                  <motion.div
                    layoutId="stepper-glow"
                    className="absolute inset-0 bg-primary/20 blur-xl rounded-full -z-10"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}
              </motion.div>
            </div>

            <div className="flex flex-col pt-1">
              <h4 className={`font-black text-[15px] uppercase tracking-wider transition-colors duration-300 ${
                isCurrent ? 'text-primary' : isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-400'
              }`}>
                {step.label}
              </h4>
              <p className={`text-[12px] font-medium transition-colors duration-300 ${
                isCurrent || isCompleted ? 'text-gray-500 dark:text-gray-400' : 'text-gray-300'
              }`}>
                {step.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
