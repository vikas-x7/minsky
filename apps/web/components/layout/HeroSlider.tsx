// components/HeroSlider.tsx

'use client';

import { useEffect, useState } from 'react';

const images = [
  'https://i.pinimg.com/1200x/4b/1e/1b/4b1e1bae8554d98a687b75c0c004af56.jpg',
  'https://i.pinimg.com/1200x/5a/f4/b4/5af4b4b3ba2fda0c6c2e40bde6ce1abc.jpg',
  'https://i.pinimg.com/1200x/94/8b/7b/948b7bcf692df185825b3c768ee6b0fb.jpg',
  'https://i.pinimg.com/1200x/9d/c9/64/9dc964eb1a3e974f9b16840ebe6f3eee.jpg',
];

export function HeroSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full  overflow-hidden rounded-[10px]">
      <div
        className="flex h-full transition-transform duration-700 ease-in-out"
        style={{
          transform: `translateX(-${current * 100}%)`,
        }}
      >
        {images.map((image, index) => (
          <img
            key={index}
            src={image}
            alt={`slide-${index}`}
            className="w-full h-full object-cover flex-shrink-0"
          />
        ))}
      </div>
    </div>
  );
}
