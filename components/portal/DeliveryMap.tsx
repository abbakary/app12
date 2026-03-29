'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Bike, Clock, Navigation } from 'lucide-react';
import Image from 'next/image';

interface DeliveryMapProps {
  restaurantAddress?: string;
  deliveryAddress?: string;
  estimatedTime?: string;
  isDelivering?: boolean;
  deliveryProgress?: number;
  driverLocation?: {
    lat: number;
    lng: number;
  };
  deliveryPerson?: {
    name: string;
    phone: string;
    avatar: string;
    rating: number;
  };
}

export function DeliveryMap({
  restaurantAddress = 'Restaurant Location',
  deliveryAddress = 'Your Location',
  estimatedTime = '15-25',
  isDelivering = true,
  deliveryProgress: externalProgress = 0,
  driverLocation,
  deliveryPerson,
}: DeliveryMapProps) {
  const [deliveryProgress, setDeliveryProgress] = useState(externalProgress);

  // Simulate delivery progress if not provided externally
  useEffect(() => {
    if (!isDelivering || externalProgress > 0) return;

    const interval = setInterval(() => {
      setDeliveryProgress(prev => {
        if (prev >= 100) return 100;
        return prev + Math.random() * 15;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isDelivering, externalProgress]);

  // Update progress if external progress changes
  useEffect(() => {
    if (externalProgress > 0) {
      setDeliveryProgress(externalProgress);
    }
  }, [externalProgress]);

  return (
    <div className="w-full">
      {/* Map Container */}
      <div className="relative w-full h-80 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 rounded-[32px] overflow-hidden shadow-lg border border-blue-100 dark:border-blue-900/30">
        {/* Map Grid Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full">
            <svg className="w-full h-full" preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6B7280" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
        </div>

        {/* Delivery Route Animation */}
        <div className="absolute inset-0">
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
            {/* Delivery Path */}
            <motion.path
              d="M 20% 30% Q 50% 50%, 80% 70%"
              stroke="#FF6B00"
              strokeWidth="3"
              fill="none"
              strokeDasharray="100"
              initial={{ strokeDashoffset: 100 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 2, repeat: Infinity }}
              strokeLinecap="round"
            />
          </svg>

          {/* Restaurant Location */}
          <motion.div
            className="absolute z-10"
            style={{ left: '20%', top: '30%', transform: 'translate(-50%, -50%)' }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-white dark:bg-gray-900 rounded-2xl shadow-lg flex items-center justify-center border-2 border-green-500">
                <MapPin className="w-6 h-6 text-green-500" />
              </div>
              <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap bg-white/80 dark:bg-gray-900/80 px-2 py-1 rounded-lg">
                Restaurant
              </span>
            </div>
          </motion.div>

          {/* Delivery Person (Moving) */}
          {isDelivering && (
            <motion.div
              className="absolute z-20"
              animate={{
                left: ['20%', '80%'],
                top: ['30%', '70%']
              }}
              transition={{ duration: 8, repeat: Infinity, repeatType: 'reverse' }}
              style={{
                transform: 'translate(-50%, -50%)',
              }}
            >
              <motion.div
                className="relative"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse' }}
              >
                <div className="w-14 h-14 bg-primary rounded-2xl shadow-xl flex items-center justify-center border-2 border-white dark:border-gray-900">
                  <Bike className="w-7 h-7 text-white" />
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Delivery Destination */}
          <motion.div
            className="absolute z-10"
            style={{ left: '80%', top: '70%', transform: 'translate(-50%, -50%)' }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-white dark:bg-gray-900 rounded-2xl shadow-lg flex items-center justify-center border-2 border-blue-500">
                <MapPin className="w-6 h-6 text-blue-500" />
              </div>
              <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap bg-white/80 dark:bg-gray-900/80 px-2 py-1 rounded-lg">
                Your Location
              </span>
            </div>
          </motion.div>
        </div>

        {/* Floating ETA Card */}
        <div className="absolute bottom-4 left-4 right-4 bg-white/95 dark:bg-black/80 backdrop-blur-xl rounded-[24px] border border-white/30 dark:border-gray-800 shadow-2xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Est. Arrival</span>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">{estimatedTime}</span>
                <span className="text-[11px] font-bold text-gray-400">mins</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Progress</span>
              <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-orange-500"
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.min(deliveryProgress, 100)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 mt-6">
        <div className="bg-white dark:bg-gray-900 rounded-[24px] p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em] block mb-2">From</span>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-green-500 flex-shrink-0 mt-1" />
            <p className="text-[13px] font-bold text-gray-700 dark:text-gray-300 line-clamp-2">{restaurantAddress}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-[24px] p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em] block mb-2">To</span>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0 mt-1" />
            <p className="text-[13px] font-bold text-gray-700 dark:text-gray-300 line-clamp-2">{deliveryAddress}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
