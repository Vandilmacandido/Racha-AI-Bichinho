import React from 'react';

interface AdBannerProps {
  location: string;
}

const AdBanner: React.FC<AdBannerProps> = ({ location }) => {
  return (
    <div className="w-full h-20 bg-gray-100 border-t border-b border-gray-200 flex flex-col items-center justify-center my-4 overflow-hidden relative">
      <span className="text-[10px] text-gray-400 absolute top-1 right-2 uppercase tracking-wider">Publicidade</span>
      <div className="text-gray-500 text-sm font-medium flex items-center gap-2">
        <span>Banner de Anúncio ({location})</span>
      </div>
      <div className="text-xs text-gray-400">Espaço reservado para Google AdSense / AdMob</div>
    </div>
  );
};

export default AdBanner;
